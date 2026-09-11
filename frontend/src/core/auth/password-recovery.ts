const EMAIL_FOR_COMMAND = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export function buildLocalPasswordResetCommand(email: string): string {
  const normalized = email.trim();
  const resetEmail = EMAIL_FOR_COMMAND.test(normalized)
    ? normalized
    : "you@example.com";
  return `make reset-password EMAIL=${resetEmail}`;
}
