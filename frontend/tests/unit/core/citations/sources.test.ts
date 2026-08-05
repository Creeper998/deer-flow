import { describe, expect, it } from "@rstest/core";

import {
  extractCitationSources,
  formatCitationMarkdownReference,
  resolveBareCitationLinks,
} from "@/core/citations/sources";

describe("extractCitationSources", () => {
  it("extracts citation markdown links in first-seen order", () => {
    const markdown = [
      "Deep research needs evidence [citation:Paper A](https://example.com/a).",
      "A second claim cites [citation:Report B](https://news.example.org/report?x=1).",
    ].join("\n");
    const firstIndex = markdown.indexOf("[citation:Paper A]");
    const secondIndex = markdown.indexOf("[citation:Report B]");

    expect(extractCitationSources(markdown)).toEqual([
      {
        id: "https://example.com/a",
        title: "Paper A",
        url: "https://example.com/a",
        domain: "example.com",
        count: 1,
        occurrences: [{ index: firstIndex, title: "Paper A" }],
      },
      {
        id: "https://news.example.org/report?x=1",
        title: "Report B",
        url: "https://news.example.org/report?x=1",
        domain: "news.example.org",
        count: 1,
        occurrences: [{ index: secondIndex, title: "Report B" }],
      },
    ]);
  });

  it("deduplicates repeated citation URLs and preserves occurrence titles", () => {
    const markdown = [
      "First [citation:Original Title](https://example.com/research).",
      "Later [citation:Updated Title](https://example.com/research).",
    ].join("\n");
    const firstIndex = markdown.indexOf("[citation:Original Title]");
    const secondIndex = markdown.indexOf("[citation:Updated Title]");

    expect(extractCitationSources(markdown)).toEqual([
      {
        id: "https://example.com/research",
        title: "Original Title",
        url: "https://example.com/research",
        domain: "example.com",
        count: 2,
        occurrences: [
          { index: firstIndex, title: "Original Title" },
          { index: secondIndex, title: "Updated Title" },
        ],
      },
    ]);
  });

  it("ignores normal links, image links, and citations inside fenced code", () => {
    const markdown = [
      "[Normal](https://example.com/normal)",
      "![citation:Image](https://example.com/image.png)",
      "```md",
      "[citation:Example](https://example.com/example)",
      "```",
      "Real source [citation:Real](https://example.com/real).",
    ].join("\n");
    const realIndex = markdown.indexOf("[citation:Real]");

    expect(extractCitationSources(markdown)).toEqual([
      {
        id: "https://example.com/real",
        title: "Real",
        url: "https://example.com/real",
        domain: "example.com",
        count: 1,
        occurrences: [{ index: realIndex, title: "Real" }],
      },
    ]);
  });

  it("keeps every source when citations are directly adjacent", () => {
    const markdown =
      "[citation:A](https://example.com/a)[citation:B](https://example.com/b)[citation:C](https://example.com/c)";

    expect(extractCitationSources(markdown).map((s) => s.url)).toEqual([
      "https://example.com/a",
      "https://example.com/b",
      "https://example.com/c",
    ]);
  });

  it("keeps URLs that contain multiple balanced parenthetical groups", () => {
    const markdown = "[citation:W](https://en.wikipedia.org/wiki/Foo_(a)_(b))";

    expect(extractCitationSources(markdown)[0]).toMatchObject({
      url: "https://en.wikipedia.org/wiki/Foo_(a)_(b)",
      domain: "en.wikipedia.org",
    });
  });

  it("ignores citations inside inline code spans", () => {
    const markdown =
      "Example: `[citation:X](https://x.com/inline)` then real [citation:Real](https://example.com/real).";

    expect(extractCitationSources(markdown).map((s) => s.url)).toEqual([
      "https://example.com/real",
    ]);
  });

  it("ignores citations inside an unclosed fenced code block", () => {
    const markdown = [
      "Streaming output:",
      "```md",
      "[citation:Streaming](https://example.com/streaming)",
    ].join("\n");

    expect(extractCitationSources(markdown)).toEqual([]);
  });

  it("uses the source domain when the citation label is generic", () => {
    const markdown = "See [citation:Source](https://www.example.com/path).";

    expect(extractCitationSources(markdown)[0]).toMatchObject({
      title: "example.com",
      domain: "example.com",
      url: "https://www.example.com/path",
    });
  });
});

describe("resolveBareCitationLinks", () => {
  it("links OpenRouter-style bare citations to matching Sources entries", () => {
    const markdown = [
      "24h change: -1.4% [citation:Binance US Bitcoin]",
      "The exploit reached 4,500 addresses [citation:CoinDesk Coldcard Attack]",
      "",
      "## Sources",
      "- [CoinDesk – Coldcard attack spreads to 4,500 addresses](https://www.coindesk.com/markets/coldcard-attack)",
      "- [Binance.US – Bitcoin price](https://www.binance.us/price/bitcoin)",
    ].join("\n");

    const resolved = resolveBareCitationLinks(markdown);

    expect(resolved).toContain(
      "[citation:Binance US Bitcoin](https://www.binance.us/price/bitcoin)",
    );
    expect(resolved).toContain(
      "[citation:CoinDesk Coldcard Attack](https://www.coindesk.com/markets/coldcard-attack)",
    );
    expect(extractCitationSources(resolved)).toEqual([
      expect.objectContaining({
        title: "Binance US Bitcoin",
        url: "https://www.binance.us/price/bitcoin",
        count: 1,
      }),
      expect.objectContaining({
        title: "CoinDesk Coldcard Attack",
        url: "https://www.coindesk.com/markets/coldcard-attack",
        count: 1,
      }),
    ]);
  });

  it("uses a source hostname to resolve translated source titles", () => {
    const markdown = [
      "Regional coverage [citation:VOA Chinese]",
      "",
      "### 参考来源",
      "- [美国之音－中东相关新闻](https://www.voachinese.com/a/middle-east-latest/123.html)",
    ].join("\n");

    expect(resolveBareCitationLinks(markdown)).toContain(
      "[citation:VOA Chinese](https://www.voachinese.com/a/middle-east-latest/123.html)",
    );
  });

  it("repairs full-width citation tags emitted in Chinese answers", () => {
    const markdown = [
      "24 h 跌幅【citation:Binance US Bitcoin】，7 d 跌幅【citation:CoinGlass Bitcoin】。",
      "攻击事件【citation:CoinDesk Coldcard Attack】【citation:Fortune Coldcard Hack】。",
      "谈判进展【citation:CNA US-Iran Latest】【citation:VOA Chinese】，后续再次引用【citation:VOA Chinese】。",
      "此前停火【citation:CNA US-Iran】。",
      "",
      "### Sources",
      "- [CoinDesk – Coldcard attack spreads](https://www.coindesk.com/tech/coldcard-attack)",
      "- [Fortune – Bitcoin owners rocked by hack](https://fortune.com/bitcoin-coldcard-hack/)",
      "- [Binance.US – Bitcoin price](https://www.binance.us/price/bitcoin)",
      "- [CoinGlass – Bitcoin](https://www.coinglass.com/currencies/BTC)",
      "- [中央社 – 美伊戰爭](https://www.cna.com.tw/topic/war.aspx)",
      "- [中央社 – 美伊戰爭最新情勢](https://www.cna.com.tw/topic/latest.aspx)",
      "- [美国之音 – 中东相关新闻](https://www.voachinese.com/z/1759)",
    ].join("\n");

    const resolved = resolveBareCitationLinks(markdown);
    const sources = extractCitationSources(resolved);

    expect(resolved).not.toContain("【citation:");
    expect(sources).toHaveLength(7);
    expect(sources.find((source) => source.title === "CNA US-Iran")?.url).toBe(
      "https://www.cna.com.tw/topic/war.aspx",
    );
    expect(
      sources.find((source) => source.title === "CNA US-Iran Latest")?.url,
    ).toBe("https://www.cna.com.tw/topic/latest.aspx");
    expect(
      sources.find((source) => source.title === "VOA Chinese")?.count,
    ).toBe(2);
  });

  it("resolves repeated citations to one source for occurrence statistics", () => {
    const markdown = [
      "First claim [citation:CoinGlass Bitcoin]",
      "Second claim [citation:CoinGlass Bitcoin]",
      "",
      "## Sources",
      "- [CoinGlass – Bitcoin](https://www.coinglass.com/currencies/BTC)",
    ].join("\n");
    const [source] = extractCitationSources(resolveBareCitationLinks(markdown));

    expect(source).toMatchObject({
      url: "https://www.coinglass.com/currencies/BTC",
      count: 2,
    });
  });

  it("leaves already linked, unmatched, ambiguous, and code citations unchanged", () => {
    const markdown = [
      "Existing [citation:Exact](https://example.com/exact)",
      "Unknown [citation:Missing Report]",
      "Ambiguous [citation:CoinDesk]",
      "`[citation:CoinDesk First]`",
      "```md",
      "[citation:CoinDesk Second]",
      "```",
      "",
      "## Sources",
      "- [CoinDesk – First report](https://www.coindesk.com/first)",
      "- [CoinDesk – Second report](https://www.coindesk.com/second)",
    ].join("\n");

    expect(resolveBareCitationLinks(markdown)).toBe(markdown);
  });

  it("does not resolve against ordinary links outside a Sources section", () => {
    const markdown =
      "Read [Report A](https://example.com/a), then cite [citation:Report A].";

    expect(resolveBareCitationLinks(markdown)).toBe(markdown);
  });
});

describe("formatCitationMarkdownReference", () => {
  it("formats a source as a reusable markdown reference", () => {
    const [source] = extractCitationSources(
      "Evidence [citation:Paper A](https://example.com/a).",
    );

    expect(formatCitationMarkdownReference(source!)).toBe(
      "[Paper A](https://example.com/a)",
    );
  });
});
