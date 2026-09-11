import { afterEach, describe, expect, test } from "@rstest/core";
import { cleanup, render, screen } from "@testing-library/react";

import { BrandMark } from "@/components/branding/brand-mark";

describe("BrandMark", () => {
  afterEach(cleanup);

  test("is decorative beside a text label and reserves its layout size", () => {
    const { container } = render(<BrandMark size={56} />);
    const mark = container.querySelector("span");

    expect(mark?.getAttribute("aria-hidden")).toBe("true");
    expect(mark?.style.width).toBe("56px");
    expect(mark?.style.height).toBe("56px");
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
    expect(mark?.getAttribute("data-tone")).toBe("auto");
  });

  test("can identify a standalone mark without changing geometry across themes", () => {
    const { rerender } = render(<BrandMark label="Creeper" tone="dark" />);
    const source = screen
      .getByRole("img", { name: "Creeper" })
      .getAttribute("src");

    rerender(<BrandMark label="Creeper" tone="light" />);
    const image = screen.getByRole("img", { name: "Creeper" });
    expect(image.getAttribute("src")).toBe(source);
    expect(image.parentElement?.getAttribute("data-tone")).toBe("light");
    expect(image.parentElement?.hasAttribute("aria-hidden")).toBe(false);
  });
});
