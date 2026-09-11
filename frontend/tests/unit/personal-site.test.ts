import { describe, expect, test } from "@rstest/core";

import { getPersonalSiteRewrites } from "@/personal-site";

describe("optional Creeper multi-zone routing", () => {
  test("leaves the upstream homepage and API routing unchanged by default", () => {
    expect(getPersonalSiteRewrites()).toEqual([]);
    expect(getPersonalSiteRewrites("  ")).toEqual([]);
  });

  test("owns only the explicit personal pages and namespaced assets", () => {
    const routes = getPersonalSiteRewrites(
      " http://host.docker.internal:3101/ ",
    );
    expect(routes.map((route) => route.source)).toEqual([
      "/",
      "/about/:path*",
      "/experience/:path*",
      "/projects/:path*",
      "/notes/:path*",
      "/contact/:path*",
      "/_creeper/:path*",
    ]);
    expect(routes.every((route) => route.locale === false)).toBe(true);
    for (const route of routes) {
      expect(route.destination).toBe(
        `http://host.docker.internal:3101${route.source}`,
      );
    }
  });

  test("rejects malformed, credential-bearing, or non-origin configuration", () => {
    for (const origin of [
      "localhost:3101",
      "file:///tmp/site",
      "http://user:secret@localhost:3101",
      "http://localhost:3101/about",
      "http://localhost:3101/?query=1",
      "http://localhost:3101/#hash",
    ]) {
      expect(() => getPersonalSiteRewrites(origin)).toThrow(
        "CREEPER_SITE_ORIGIN",
      );
    }
  });
});
