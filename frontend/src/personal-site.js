/**
 * Explicit route ownership for the optional Creeper frontend zone.
 * Never proxy a catch-all: auth, workspace, API and DeerFlow's assets stay here.
 * @param {string} [configuredOrigin]
 */
export function getPersonalSiteRewrites(configuredOrigin) {
  if (!configuredOrigin?.trim()) return [];

  let origin;
  try {
    origin = new URL(configuredOrigin.trim());
  } catch {
    throw new Error("CREEPER_SITE_ORIGIN must be an HTTP(S) origin");
  }
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  ) {
    throw new Error(
      "CREEPER_SITE_ORIGIN must be an HTTP(S) origin without credentials or a path",
    );
  }

  return [
    "/",
    "/about/:path*",
    "/experience/:path*",
    "/projects/:path*",
    "/notes/:path*",
    "/contact/:path*",
    "/_creeper/:path*",
  ].map((source) => ({
    source,
    destination: `${origin.origin}${source}`,
    // These are App Router routes, not translated copies of the legacy homepage.
    locale: false,
  }));
}
