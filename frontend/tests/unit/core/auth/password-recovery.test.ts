import { describe, expect, test } from "@rstest/core";

import { buildLocalPasswordResetCommand } from "@/core/auth/password-recovery";

describe("buildLocalPasswordResetCommand", () => {
  test("uses a valid trimmed email", () => {
    expect(buildLocalPasswordResetCommand("  user+bot@example.com ")).toBe(
      "make reset-password EMAIL=user+bot@example.com",
    );
  });

  test.each(["", "not-an-email", "x@y", "x@example.com; touch /tmp/pwned"])(
    "never interpolates unsafe input: %s",
    (email) => {
      expect(buildLocalPasswordResetCommand(email)).toBe(
        "make reset-password EMAIL=you@example.com",
      );
    },
  );
});
