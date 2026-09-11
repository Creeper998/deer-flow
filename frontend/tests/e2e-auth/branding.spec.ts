import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/auth/**", (route) => {
    if (route.request().method() !== "GET") return route.abort();
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/setup-status")) {
      return route.fulfill({
        json: { needs_setup: false, registration_enabled: false },
      });
    }
    if (url.pathname.endsWith("/providers")) {
      return route.fulfill({ json: { providers: [] } });
    }
    return route.fulfill({ status: 401, json: { detail: "Unauthenticated" } });
  });
});

test("login keeps one CR silhouette when switching light and dark", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Creeper", exact: true }),
  ).toBeVisible();

  const mark = page.locator('img[src*="cr-solid"]');
  const markContainer = page.locator('[data-tone="auto"]');
  await expect(mark).toBeVisible();
  await expect(markContainer).toHaveCSS("width", "56px");
  await expect(page.locator("header > div")).toHaveCSS(
    "justify-content",
    "center",
  );
  await expect(page.getByRole("heading", { name: "Creeper" })).toHaveCSS(
    "font-size",
    "36px",
  );
  await expect(
    page.getByText("Sign in to your account", { exact: true }),
  ).toHaveCount(0);
  await expect(mark).toHaveCSS("filter", "none");
  const source = await mark.getAttribute("src");

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(mark).toHaveCSS("filter", "invert(1)");
  await expect(markContainer).toHaveCSS("mix-blend-mode", "screen");
  // Blend the whole clipped mark, not the transformed image inside its layer.
  await expect(mark).toHaveCSS("mix-blend-mode", "normal");
  await expect(mark).toHaveAttribute("src", source!);

  await page.emulateMedia({ forcedColors: "active" });
  await expect(mark).toHaveCSS("filter", "none");
  await expect(markContainer).toHaveCSS("mix-blend-mode", "normal");
  await page.emulateMedia({ forcedColors: "none" });

  await expect(page.locator("main > div").first()).toHaveCSS(
    "max-width",
    "360px",
  );
  await expect(page.locator("main > div").first()).toHaveCSS(
    "backdrop-filter",
    "none",
  );
  await expect(
    page.getByRole("checkbox", { name: "Keep me signed in" }),
  ).toHaveAccessibleDescription(/stores only your email, never your password/i);

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 740 });
    await expect(mark).toBeVisible();
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(fits).toBe(true);
    await expect(
      page.getByRole("button", { name: "Sign In", exact: true }),
    ).toBeVisible();
  }
});

test("login uses a fine input border and preserves keyboard focus cues", async ({
  page,
}) => {
  await page.goto("/login");
  const email = page.getByRole("textbox", { name: "Email" });
  const password = page.locator("#password");

  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.getByRole("heading", { name: "Creeper" }).click();
    const idleBorder = await email.evaluate(
      (el) => getComputedStyle(el).borderColor,
    );

    await email.click();
    await expect(email).toBeFocused();
    await expect(email).toHaveCSS("border-width", "1px");
    await expect(email).toHaveCSS("box-shadow", "none");
    await expect(email).not.toHaveCSS("border-color", idleBorder);

    await page.keyboard.press("Tab");
    await expect(password).toBeFocused();
    await expect(password).toHaveCSS("box-shadow", "none");
    await page.keyboard.press("Tab");
    const reveal = page.getByRole("button", { name: "Show password" });
    await expect(reveal).toBeFocused();
    await expect(reveal).toHaveCSS("outline-style", "solid");
    await expect(reveal).toHaveCSS("outline-width", "2px");
    await expect(reveal).toHaveCSS("box-shadow", "none");

    await page.getByRole("heading", { name: "Creeper" }).click();
    await reveal.click();
    const conceal = page.getByRole("button", { name: "Hide password" });
    await expect(conceal).toHaveCSS("outline-style", "none");
    await conceal.click();
  }

  await page.emulateMedia({ forcedColors: "active" });
  await email.click();
  await expect(email).toHaveCSS("outline-style", "solid");
  await expect(email).toHaveCSS("outline-width", "2px");
});

test("favicon is a small generated PNG rather than the full-size design asset", async ({
  request,
}) => {
  const response = await request.get("/icon");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
  const data = await response.body();
  expect(data.readUInt32BE(16)).toBe(64);
  expect(data.readUInt32BE(20)).toBe(64);
  expect(data.length).toBeLessThan(16_000);
});
