"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { forwardRef, type ComponentProps, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<ComponentProps<typeof Input>, "type"> & {
  hidePasswordLabel: string;
  showPasswordLabel: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    { className, disabled, hidePasswordLabel, showPasswordLabel, ...props },
    ref,
  ) {
    const [visible, setVisible] = useState(false);
    const toggleLabel = visible ? hidePasswordLabel : showPasswordLabel;

    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          disabled={disabled}
          className={cn("pe-10", className)}
        />
        <button
          type="button"
          aria-label={toggleLabel}
          aria-pressed={visible}
          title={toggleLabel}
          disabled={disabled}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute inset-y-0 end-0 flex w-10 items-center justify-center rounded-e-md transition-colors outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50"
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <EyeOffIcon aria-hidden="true" className="size-4" />
          ) : (
            <EyeIcon aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>
    );
  },
);
