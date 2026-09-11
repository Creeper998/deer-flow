import { afterEach, describe, expect, test } from "@rstest/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { PasswordInput } from "@/components/auth/password-input";

describe("PasswordInput", () => {
  afterEach(cleanup);

  test("keeps the password hidden by default and lets the user reveal it", () => {
    const { container } = render(
      <PasswordInput
        aria-label="Password"
        showPasswordLabel="Show password"
        hidePasswordLabel="Hide password"
      />,
    );
    const input = container.querySelector("input");

    expect(input?.getAttribute("type")).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input?.getAttribute("type")).toBe("text");
    expect(
      screen
        .getByRole("button", { name: "Hide password" })
        .getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input?.getAttribute("type")).toBe("password");
  });

  test("disables the visibility button with the input", () => {
    render(
      <PasswordInput
        aria-label="Password"
        disabled
        showPasswordLabel="Show password"
        hidePasswordLabel="Hide password"
      />,
    );

    expect(
      screen
        .getByRole("button", {
          name: "Show password",
        })
        .hasAttribute("disabled"),
    ).toBe(true);
  });
});
