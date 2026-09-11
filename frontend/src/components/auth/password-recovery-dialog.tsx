"use client";

import { CheckIcon, CopyIcon, TerminalIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buildLocalPasswordResetCommand } from "@/core/auth/password-recovery";
import { writeTextToClipboard } from "@/core/clipboard";
import { useI18n } from "@/core/i18n/hooks";

type PasswordRecoveryDialogProps = {
  email: string;
  hasSsoProviders: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PasswordRecoveryDialog({
  email,
  hasSsoProviders,
  open,
  onOpenChange,
}: PasswordRecoveryDialogProps) {
  const { t } = useI18n();
  const [recoveryEmail, setRecoveryEmail] = useState(email);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setRecoveryEmail(email);
      setCopied(false);
    }
  }, [email, open]);

  const command = useMemo(
    () => buildLocalPasswordResetCommand(recoveryEmail),
    [recoveryEmail],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.login.recoveryTitle}</DialogTitle>
          <DialogDescription>{t.login.recoveryDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="recovery-email" className="text-sm font-medium">
              {t.login.email}
            </label>
            <Input
              id="recovery-email"
              type="email"
              value={recoveryEmail}
              placeholder={t.login.emailPlaceholder}
              autoComplete="email"
              onChange={(event) => setRecoveryEmail(event.target.value)}
            />
          </div>

          <div className="bg-muted/60 space-y-3 rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TerminalIcon aria-hidden="true" className="size-4" />
              {t.login.localRecoveryTitle}
            </div>
            <p className="text-muted-foreground text-sm">
              {t.login.localRecoveryDescription}
            </p>
            <div className="bg-background flex items-center gap-2 rounded-lg border p-2">
              <code className="min-w-0 flex-1 overflow-x-auto px-1 text-xs whitespace-nowrap">
                {command}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={
                  copied ? t.login.commandCopied : t.login.copyCommand
                }
                title={copied ? t.login.commandCopied : t.login.copyCommand}
                onClick={() => {
                  void writeTextToClipboard(command).then((success) => {
                    if (success) {
                      setCopied(true);
                    } else {
                      toast.error(t.clipboard.failedToCopyToClipboard);
                    }
                  });
                }}
              >
                {copied ? (
                  <CheckIcon aria-hidden="true" className="size-4" />
                ) : (
                  <CopyIcon aria-hidden="true" className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              {t.login.recoveryCredentialPath}
            </p>
          </div>

          {hasSsoProviders ? (
            <p className="text-muted-foreground text-sm">
              {t.login.recoverySsoDescription}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t.login.backToSignIn}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
