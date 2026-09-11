import { describe, expect, test } from "@rstest/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { RememberSessionOption } from "@/components/auth/remember-session-option";
import { I18nContext } from "@/core/i18n/context";
import { zhCN } from "@/core/i18n/locales/zh-CN";

function renderOption(compact = false) {
  return renderToStaticMarkup(
    createElement(
      I18nContext.Provider,
      { value: { locale: "zh-CN", setLocale: () => undefined, t: zhCN } },
      createElement(RememberSessionOption, {
        checked: true,
        compact,
        onCheckedChange: () => undefined,
      }),
    ),
  );
}

describe("RememberSessionOption", () => {
  test("uses the active locale for setup and login copy", () => {
    const markup = renderOption();

    expect(markup).toContain("保持登录");
    expect(markup).toContain(
      "下次打开 DeerFlow 时尽量保持当前会话，仅保存邮箱，不保存密码。",
    );
    expect(markup).not.toContain("Keep me signed in");
    expect(markup).not.toContain('class="sr-only"');
  });

  test("compact mode preserves its accessible explanation without a paragraph", () => {
    const markup = renderOption(true);

    expect(markup).toContain('aria-label="保持登录"');
    expect(markup).toContain("aria-describedby=");
    expect(markup).toContain('class="sr-only"');
    expect(markup).toContain("仅保存邮箱，不保存密码");
  });
});
