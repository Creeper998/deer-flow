import { expect, test } from "@playwright/test";

// Opt-in: requires both frontends and the unified local entry to be running.
// No auth bypass, real model calls, note writes, or existing browser session.
test.skip(
  process.env.CREEPER_SITE_E2E !== "1",
  "Local multi-zone stack required",
);
test.setTimeout(60_000);

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/v1/auth/**", (route) => {
    if (route.request().method() !== "GET") return route.abort();
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/setup-status")) {
      return route.fulfill({
        json: { needs_setup: false, registration_enabled: false },
      });
    }
    if (path.endsWith("/providers"))
      return route.fulfill({ json: { providers: [] } });
    return route.fulfill({ status: 401, json: { detail: "Unauthenticated" } });
  });
});

test("personal pages and namespaced images retain their own runtime", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of [
    "/about",
    "/experience",
    "/projects",
    "/notes",
    "/contact",
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("navigation", { name: "Primary" }),
    ).toBeVisible();
    await expect(page.locator('img[src*="cr-solid"]')).toBeVisible();
    const scripts = await page
      .locator("script[src]")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("src")));
    expect(scripts.length).toBeGreaterThan(0);
    expect(scripts.every((src) => src?.startsWith("/_creeper/"))).toBe(true);
  }
  const image = await request.get(
    "/_creeper/_next/image?url=%2F_creeper%2Fpublic%2Fbrand%2Fcr-solid.png&w=96&q=75",
  );
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/");
  expect(errors).toEqual([]);
});

for (const width of [1280, 390]) {
  test(`Agent and login return-home use document navigation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    const navigations: string[] = [];
    page.on("request", (request) => {
      if (
        request.isNavigationRequest() &&
        request.frame() === page.mainFrame()
      ) {
        navigations.push(new URL(request.url()).pathname);
      }
    });
    await page.goto("/");
    await expect(page).toHaveURL(/\/about$/);
    await expect(
      page.getByRole("heading", { name: "Creeper", exact: true }),
    ).toBeVisible();
    if (width < 768)
      await page.getByRole("button", { name: "Toggle menu" }).click();
    const agent = page.getByRole(width < 768 ? "link" : "menuitem", {
      name: "进入 Agent 工作区",
    });
    await agent.click();
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    expect(navigations).toContain("/workspace/chats/new");
    await expect(
      page.getByRole("heading", { name: "Creeper", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Show password" }),
    ).toBeVisible();
    await expect(page.locator('script[src^="/_creeper/"]')).toHaveCount(0);
    await expect(page.locator("canvas")).toHaveCount(0);
    const count = navigations.length;
    await page.getByRole("link", { name: /Back to home/ }).click();
    await expect(page).toHaveURL(/\/about$/);
    expect(navigations.slice(count)).toContain("/");
    await expect(
      page.getByRole("heading", { name: "Creeper", exact: true }),
    ).toBeVisible();
  });
}

test("a successful login with a personal next target loads that zone", async ({
  page,
}) => {
  // Intercept the request before it reaches the real Gateway; no real account.
  await page.route("**/api/v1/auth/login/local", (route) =>
    route.fulfill({ json: {} }),
  );
  await page.goto("/login?next=%2Fabout");
  await page
    .getByRole("textbox", { name: "Email" })
    .fill("integration@test.invalid");
  await page.locator("#password").fill("test-only-not-a-real-password");
  const navigation = page.waitForRequest(
    (request) =>
      request.isNavigationRequest() &&
      new URL(request.url()).pathname === "/about",
  );
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await navigation;
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.locator('script[src^="/_next/"]')).toHaveCount(0);
});
