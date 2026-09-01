/**
 * Model and pipeline configuration.
 * Model ids come from env — never hardcode in call sites (T0.8).
 */
export const models = {
  gate: requireEnv("GROQ_GATE_MODEL", "openai/gpt-oss-20b"),
  extraction: requireEnv("GROQ_EXTRACTION_MODEL", "openai/gpt-oss-120b"),
  agreement: requireEnv("GROQ_AGREEMENT_MODEL", "qwen/qwen3.8-27b"),
} as const;

export const embedding = {
  modelId: requireEnv("EMBEDDING_MODEL_ID", "Xenova/bge-small-en-v1.5"),
  dimensions: parseInt(requireEnv("EMBEDDING_DIMENSIONS", "384"), 10),
} as const;

export const groqLimits = {
  requestsPerMinute: parseInt(requireEnv("GROQ_REQUESTS_PER_MINUTE", "30"), 10),
  tokensPerMinute: parseInt(requireEnv("GROQ_TOKENS_PER_MINUTE", "6000"), 10),
  dailyRequestBudget: parseInt(requireEnv("GROQ_DAILY_REQUEST_BUDGET", "14400"), 10),
} as const;

/** Per-million-token pricing for cost estimation (gpt-oss models, USD). */
export const groqPricing = {
  "openai/gpt-oss-20b": { input: 0.075, output: 0.30 },
  "openai/gpt-oss-120b": { input: 0.15, output: 0.60 },
  "qwen/qwen3.8-27b": { input: 0.80, output: 4.0 },
} as const;

function requireEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
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
