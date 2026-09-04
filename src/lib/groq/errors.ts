/** Groq returned 400 json_validate_failed — skip document and continue the run. */
export function isStructuredOutputValidationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as {
    status?: number;
    error?: { error?: { code?: string } };
  };
  return (
    err.status === 400 &&
    err.error?.error?.code === "json_validate_failed"
  );
}

/** Groq 429 on tokens-per-day (TPD) — pause and resume after UTC midnight. */
export function isGroqDailyTokenLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as {
    status?: number;
    error?: { error?: { type?: string; message?: string } };
  };
  if (err.status !== 429) return false;
  const inner = err.error?.error;
  const message = inner?.message ?? "";
  return inner?.type === "tokens" && /tokens per day|TPD/i.test(message);
}
