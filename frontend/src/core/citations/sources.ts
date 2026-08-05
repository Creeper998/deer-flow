export type CitationOccurrence = {
  index: number;
  title: string;
};

export type CitationSource = {
  id: string;
  title: string;
  url: string;
  domain: string;
  count: number;
  occurrences: CitationOccurrence[];
};

// Uses a non-consuming lookbehind (?<!!) to skip image links (![citation:…])
// without eating the boundary char, so back-to-back citations both match. The
// URL sub-pattern consumes either non-paren chars or a balanced (…) group, so
// disambiguation URLs like .../Foo_(a)_(b) survive rather than truncating at
// the first inner paren.
const CITATION_LINK_RE =
  /(?<!!)\[citation:\s*([^\]]+?)\]\((https?:\/\/(?:[^\s()]|\([^\s()]*\))+)\)/gi;

const MARKDOWN_HTTP_LINK_RE =
  /(?<!!)\[([^\]]+?)\]\((https?:\/\/(?:[^\s()]|\([^\s()]*\))+)\)/gi;

const BARE_CITATION_RE =
  /(?<!!|\\)(?:\[citation:\s*([^\]]+?)\](?!\s*\()|【citation:\s*([^】]+?)】)/gi;

const SOURCES_HEADING_RE =
  /^(#{1,6})\s*(?:sources?|references?|来源|参考来源|参考资料|资料来源|引用来源)\s*:?\s*$/gim;

const DOMAIN_SUFFIXES = new Set([
  "au",
  "cn",
  "co",
  "com",
  "edu",
  "gov",
  "hk",
  "io",
  "jp",
  "net",
  "news",
  "org",
  "tw",
  "uk",
  "us",
]);

const GENERIC_CITATION_TITLES = new Set(["source", "来源"]);

export function extractCitationSources(markdown: string): CitationSource[] {
  if (!markdown) {
    return [];
  }

  const searchable = maskCode(markdown);
  const sourcesByUrl = new Map<string, CitationSource>();

  for (const match of searchable.matchAll(CITATION_LINK_RE)) {
    const rawTitle = (match[1] ?? "").trim();
    const rawUrl = match[2] ?? "";
    const url = normalizeUrl(rawUrl);
    if (!url) {
      continue;
    }

    const domain = extractDomain(url);
    const title = normalizeTitle(rawTitle, domain);
    const index = match.index ?? 0;
    const existing = sourcesByUrl.get(url);

    if (existing) {
      existing.count += 1;
      existing.occurrences.push({ index, title });
      continue;
    }

    sourcesByUrl.set(url, {
      id: url,
      title,
      url,
      domain,
      count: 1,
      occurrences: [{ index, title }],
    });
  }

  return Array.from(sourcesByUrl.values());
}

/**
 * Repairs a citation format emitted by some routed models:
 *
 *   claim [citation:Source title]
 *   ...
 *   ## Sources
 *   - [Source title](https://example.com/article)
 *
 * Only links from an explicit Sources/References section are considered. A
 * bare label is linked when its title/domain match is unique, so the renderer
 * never invents a URL or silently picks between ambiguous same-site results.
 */
export function resolveBareCitationLinks(markdown: string): string {
  if (!markdown || !BARE_CITATION_RE.test(maskCode(markdown))) {
    BARE_CITATION_RE.lastIndex = 0;
    return markdown;
  }
  BARE_CITATION_RE.lastIndex = 0;

  const candidates = extractSourceLinkCandidates(markdown);
  if (candidates.length === 0) {
    return markdown;
  }

  const searchable = maskCode(markdown);
  const replacements: Array<{ start: number; end: number; value: string }> = [];

  for (const match of searchable.matchAll(BARE_CITATION_RE)) {
    const label = (match[1] ?? match[2] ?? "").trim();
    const start = match.index ?? 0;
    const candidate = findCitationCandidate(label, candidates);
    if (!label || !candidate) {
      continue;
    }
    replacements.push({
      start,
      end: start + match[0].length,
      value: `[citation:${label}](${candidate.url})`,
    });
  }

  if (replacements.length === 0) {
    return markdown;
  }

  let resolved = markdown;
  for (const replacement of replacements.reverse()) {
    resolved =
      resolved.slice(0, replacement.start) +
      replacement.value +
      resolved.slice(replacement.end);
  }
  return resolved;
}

export function formatCitationMarkdownReference(
  source: CitationSource,
): string {
  return `[${source.title}](${source.url})`;
}

function normalizeTitle(title: string, domain: string): string {
  const compact = title.replace(/\s+/g, " ").trim();
  if (!compact || GENERIC_CITATION_TITLES.has(compact.toLowerCase())) {
    return domain;
  }
  return compact;
}

function normalizeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
}

type SourceLinkCandidate = {
  title: string;
  url: string;
  compactTitle: string;
  tokens: Set<string>;
  sourceKeys: Set<string>;
};

function extractSourceLinkCandidates(markdown: string): SourceLinkCandidate[] {
  const searchable = maskCode(markdown);
  const sectionRanges = findSourcesSectionRanges(searchable);
  const candidatesByUrl = new Map<string, SourceLinkCandidate>();

  for (const [start, end] of sectionRanges) {
    const section = searchable.slice(start, end);
    for (const match of section.matchAll(MARKDOWN_HTTP_LINK_RE)) {
      const rawTitle = (match[1] ?? "").trim();
      const rawUrl = match[2] ?? "";
      const url = normalizeUrl(rawUrl);
      if (!rawTitle || !url || candidatesByUrl.has(url)) {
        continue;
      }

      const title = rawTitle.replace(/^citation:\s*/i, "").trim();
      const domain = extractDomain(url);
      const titleTokens = tokenize(title);
      const domainTokens = tokenize(domain).filter(
        (token) => !DOMAIN_SUFFIXES.has(token),
      );
      const sourceKeys = new Set<string>();
      if (titleTokens[0]) {
        sourceKeys.add(titleTokens[0]);
      }
      for (const token of domainTokens) {
        sourceKeys.add(token);
      }

      candidatesByUrl.set(url, {
        title,
        url,
        compactTitle: compactForMatch(title),
        tokens: new Set([...titleTokens, ...domainTokens]),
        sourceKeys,
      });
    }
  }

  return Array.from(candidatesByUrl.values());
}

function findSourcesSectionRanges(markdown: string): Array<[number, number]> {
  const headings = Array.from(markdown.matchAll(SOURCES_HEADING_RE));
  const ranges: Array<[number, number]> = [];

  for (const heading of headings) {
    const level = (heading[1] ?? "").length;
    const start = (heading.index ?? 0) + heading[0].length;
    const tail = markdown.slice(start);
    const nextHeadingRe = new RegExp(`^#{1,${level}}\\s+`, "m");
    const nextHeading = nextHeadingRe.exec(tail);
    ranges.push([
      start,
      nextHeading ? start + nextHeading.index : markdown.length,
    ]);
  }

  return ranges;
}

function findCitationCandidate(
  label: string,
  candidates: SourceLinkCandidate[],
): SourceLinkCandidate | null {
  const compactLabel = compactForMatch(label);
  const labelTokens = tokenize(label);
  const labelTokenSet = new Set(labelTokens);
  if (!compactLabel || labelTokens.length === 0) {
    return null;
  }

  const directMatches = candidates.filter(
    (candidate) =>
      candidate.compactTitle === compactLabel ||
      (compactLabel.length >= 5 &&
        candidate.compactTitle.includes(compactLabel)) ||
      (candidate.compactTitle.length >= 5 &&
        compactLabel.includes(candidate.compactTitle)),
  );
  if (directMatches.length === 1) {
    return directMatches[0] ?? null;
  }
  if (directMatches.length > 1) {
    return null;
  }

  const labelSourceKeys = new Set<string>([labelTokens[0] ?? ""]);
  if (labelTokens.length >= 2) {
    labelSourceKeys.add(`${labelTokens[0]}${labelTokens[1]}`);
  }

  const scored = candidates
    .map((candidate) => {
      const sourceMatch = setsLooselyIntersect(
        labelSourceKeys,
        candidate.sourceKeys,
      );
      const overlap = labelTokens.filter((token) =>
        candidate.tokens.has(token),
      ).length;
      const latestSpecificity = candidate.tokens.has("latest")
        ? labelTokenSet.has("latest")
          ? 2
          : -1
        : 0;
      return {
        candidate,
        sourceMatch,
        overlap,
        score: (sourceMatch ? 10 : 0) + overlap * 2 + latestSpecificity,
      };
    })
    .filter(({ sourceMatch, overlap }) => sourceMatch || overlap >= 2)
    .sort((left, right) => right.score - left.score);

  const best = scored[0];
  if (!best) {
    return null;
  }

  const sameSourceCount = scored.filter(
    ({ sourceMatch }) => sourceMatch,
  ).length;
  if (best.sourceMatch && sameSourceCount === 1) {
    return best.candidate;
  }

  const runnerUp = scored[1];
  const hasSpecificOverlap = best.overlap >= 2;
  if (hasSpecificOverlap && (!runnerUp || best.score > runnerUp.score)) {
    return best.candidate;
  }

  return null;
}

function setsLooselyIntersect(left: Set<string>, right: Set<string>): boolean {
  for (const leftValue of left) {
    if (!leftValue) {
      continue;
    }
    for (const rightValue of right) {
      if (
        leftValue === rightValue ||
        (leftValue.length >= 4 && rightValue.includes(leftValue)) ||
        (rightValue.length >= 4 && leftValue.includes(rightValue))
      ) {
        return true;
      }
    }
  }
  return false;
}

function tokenize(value: string): string[] {
  const normalizedValue = value.normalize("NFKC").toLowerCase();
  const tokens = new Set(basicTokens(normalizedValue));

  // Common bilingual source labels used by Chinese research answers. These
  // aliases remain intentionally small and factual; they only improve title
  // matching and never supply a URL.
  if (normalizedValue.includes("中央社")) {
    tokens.add("cna");
  }
  if (normalizedValue.includes("美国之音")) {
    tokens.add("voa");
    tokens.add("chinese");
  }
  if (normalizedValue.includes("美伊")) {
    tokens.add("us");
    tokens.add("iran");
  }
  if (normalizedValue.includes("最新")) {
    tokens.add("latest");
  }

  return Array.from(tokens);
}

function normalizeToken(token: string): string {
  if (token === "btc") {
    return "bitcoin";
  }
  return token;
}

function compactForMatch(value: string): string {
  return basicTokens(value.normalize("NFKC").toLowerCase()).join("");
}

function basicTokens(value: string): string[] {
  return Array.from(
    new Set(
      (value.match(/[\p{L}\p{N}]+/gu) ?? [])
        .map(normalizeToken)
        .filter(Boolean),
    ),
  );
}

// Blanks out code regions so example citations inside code aren't scraped as
// real sources, while preserving string length (and newlines) so occurrence
// indices stay aligned with the original markdown.
function maskCode(markdown: string): string {
  return maskInlineCode(maskFencedCodeBlocks(markdown));
}

function maskFencedCodeBlocks(markdown: string): string {
  // Match a fenced block up to its matching closing fence, or — while the
  // message is still streaming — to end of input when the fence is unclosed.
  return markdown.replace(
    /(^|\n)(`{3,}|~{3,})[^\n]*(?:\n[\s\S]*?\n\2[^\n]*(?=\n|$)|[\s\S]*$)/g,
    maskKeepingNewlines,
  );
}

function maskInlineCode(markdown: string): string {
  // Only mask closed spans: an unclosed backtick run renders as literal text,
  // so a citation after it is a real, rendered link and must not be masked.
  return markdown.replace(/(`+)[\s\S]*?\1/g, maskKeepingNewlines);
}

function maskKeepingNewlines(block: string): string {
  return block.replace(/[^\n]/g, " ");
}
