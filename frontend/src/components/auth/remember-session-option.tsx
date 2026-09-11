"use client";

import { useId } from "react";

import { useI18n } from "@/core/i18n/hooks";

interface RememberSessionOptionProps {
  checked: boolean;
  compact?: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function RememberSessionOption({
  checked,
  compact = false,
  onCheckedChange,
}: RememberSessionOptionProps) {
  const { t } = useI18n();
  const descriptionId = useId();

  return (
    <label
      className="text-muted-foreground flex cursor-pointer items-start gap-2 text-sm"
      title={compact ? t.login.rememberMeDescription : undefined}
    >
      <input
        type="checkbox"
        aria-label={t.login.rememberMe}
        aria-describedby={descriptionId}
        checked={checked}
        onChange={(event) => onCheckedChange(event.currentTarget.checked)}
        className="border-input accent-foreground mt-0.5 size-4 rounded"
      />
      <span>
        <span className="text-foreground block font-medium">
          {t.login.rememberMe}
        </span>
        <span id={descriptionId} className={compact ? "sr-only" : undefined}>
          {t.login.rememberMeDescription}
        </span>
      </span>
    </label>
  );
}
