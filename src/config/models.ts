/**
 * Model and pipeline configuration.
 * Model ids come from env — never hardcode in call sites (T0.8).
 */
export const models = {
  gate: requireEnv("GROQ_GATE_MODEL", "openai/gpt-oss-20b"),
  extraction: requireEnv("GROQ_EXTRACTION_MODEL", "openai/gpt-oss-120b"),
  agreement: requireEnv("GROQ_AGREEMENT_MODEL", "qwen/qwen3.8-27b"),
} as const;

/**
 * Groq TPD is per model. Gating on one model leaves the others idle and
 * stretches a 2-day deadline into a week. Pool every strict-schema model
 * (D-017 / D-021). Order is the tie-break: keep 120b last so extract can use it.
 */
export const gateModelPool: string[] = parseCsvEnv("GROQ_GATE_MODEL_POOL", [
  models.gate,
  models.agreement,
  "openai/gpt-oss-safeguard-20b",
  models.extraction,
]);

/** Prefer 120b for extraction quality; fall back if that bucket is empty. */
export const extractModelPool: string[] = parseCsvEnv("GROQ_EXTRACT_MODEL_POOL", [
  models.extraction,
  models.gate,
  models.agreement,
]);

export const embedding = {
  modelId: requireEnv("EMBEDDING_MODEL_ID", "Xenova/bge-small-en-v1.5"),
  dimensions: parseInt(requireEnv("EMBEDDING_DIMENSIONS", "384"), 10),
} as const;

/**
 * Published Groq caps for gpt-oss-20b and gpt-oss-120b (per model).
 * Jobs never target 100% of a cap — see `headroom`.
 */
export const groqLimits = {
  requestsPerMinute: parseInt(requireEnv("GROQ_REQUESTS_PER_MINUTE", "30"), 10),
  tokensPerMinute: parseInt(requireEnv("GROQ_TOKENS_PER_MINUTE", "8000"), 10),
  dailyRequestBudget: parseInt(requireEnv("GROQ_DAILY_REQUEST_BUDGET", "1000"), 10),
  dailyTokenBudget: parseInt(requireEnv("GROQ_DAILY_TOKEN_BUDGET", "200000"), 10),
  /** Spend at most this fraction of each cap so 429s and retries have room. */
  headroom: parseFloat(requireEnv("GROQ_BUDGET_HEADROOM", "0.8")),
} as const;

/** Conservative token estimates used to size Phase 2 batches (truncate docs to match). */
export const phase2CallBudget = {
  /** Measured ~546 tokens/call on gpt-oss-20b; pad so the job stops before TPD. */
  gateEstimatedTokens: 560,
  extractEstimatedTokens: 1400,
  agreementEstimatedTokens: 1200,
  gateMaxDocChars: 600,
  extractMaxDocChars: 900,
  assumedGatePassRate: 0.35,
} as const;

export function workingGroqLimits() {
  const h = groqLimits.headroom;
  return {
    requestsPerMinute: Math.max(1, Math.floor(groqLimits.requestsPerMinute * h)),
    tokensPerMinute: Math.max(1, Math.floor(groqLimits.tokensPerMinute * h)),
    dailyRequestBudget: Math.max(1, Math.floor(groqLimits.dailyRequestBudget * h)),
    dailyTokenBudget: Math.max(1, Math.floor(groqLimits.dailyTokenBudget * h)),
  };
}

/** Truncate document text so a Groq call stays near the Phase 2 token estimate. */
export function truncateForGate(text: string): string {
  return truncateChars(text, phase2CallBudget.gateMaxDocChars);
}

export function truncateForExtract(text: string): string {
  return truncateChars(text, phase2CallBudget.extractMaxDocChars);
}

function truncateChars(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

/** Per-million-token pricing for cost estimation (gpt-oss models, USD). */
export const groqPricing = {
  "openai/gpt-oss-20b": { input: 0.075, output: 0.30 },
  "openai/gpt-oss-120b": { input: 0.15, output: 0.60 },
  "qwen/qwen3.8-27b": { input: 0.80, output: 4.0 },
} as const;

function requireEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function parseCsvEnv(key: string, fallback: string[]): string[] {
  const raw = process.env[key];
  const parts = (raw && raw.trim()
    ? raw.split(",")
    : fallback
  ).map((s) => s.trim()).filter(Boolean);
  return [...new Set(parts)];
}

export function getGroqApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to .env — see docs/groq-api-setup.md",
    );
  }
  return key;
}
