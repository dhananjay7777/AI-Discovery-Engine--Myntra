/**
 * Per-model daily Groq budget (requests + tokens).
 * Caps are applied with headroom so jobs stop before the published ceiling (D-019).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { groqLimits, workingGroqLimits } from "@/config/models";

export class RunBudgetExceededError extends Error {
  constructor(
    public readonly reason: "requests" | "tokens",
    public readonly limit: number,
    public readonly spent: number,
  ) {
    super(
      `Per-run Groq ${reason} budget exhausted ` +
        `(spent ${spent} of ${limit}). Job paused; checkpoint preserved.`,
    );
    this.name = "RunBudgetExceededError";
  }
}

/** Optional per-run ceiling (D-013). Checked before each Groq call. */
export class RunBudget {
  constructor(
    public readonly maxRequests?: number,
    public readonly maxTokens?: number,
  ) {}

  assertBeforeCall(
    spent: { requestCount: number; totalTokens: number },
    estimatedTokens = 500,
  ): void {
    if (
      this.maxRequests !== undefined &&
      spent.requestCount >= this.maxRequests
    ) {
      throw new RunBudgetExceededError(
        "requests",
        this.maxRequests,
        spent.requestCount,
      );
    }
    if (
      this.maxTokens !== undefined &&
      spent.totalTokens + estimatedTokens > this.maxTokens
    ) {
      throw new RunBudgetExceededError(
        "tokens",
        this.maxTokens,
        spent.totalTokens,
      );
    }
  }
}

export class DailyBudgetExceededError extends Error {
  constructor(
    public readonly model: string,
    public readonly reason: "requests" | "tokens",
    public readonly remaining: { requests: number; tokens: number },
  ) {
    super(
      `Daily Groq ${reason} budget exhausted for ${model} ` +
        `(remaining ${remaining.requests} requests / ${remaining.tokens} tokens). ` +
        `Resume tomorrow (UTC).`,
    );
    this.name = "DailyBudgetExceededError";
  }
}

interface ModelSpend {
  requests: number;
  tokens: number;
}

interface BudgetFile {
  date: string;
  models: Record<string, ModelSpend>;
}

function utcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function budgetPath(): string {
  return (
    process.env.GROQ_BUDGET_PATH ??
    join(process.cwd(), "data", "sandbox", "groq_daily_budget.json")
  );
}

function emptyFile(date: string): BudgetFile {
  return { date, models: {} };
}

function loadFile(): BudgetFile {
  const path = budgetPath();
  const today = utcDate();
  if (!existsSync(path)) return emptyFile(today);
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as BudgetFile;
    if (parsed.date !== today) return emptyFile(today);
    return parsed;
  } catch {
    return emptyFile(today);
  }
}

function saveFile(file: BudgetFile): void {
  const path = budgetPath();
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(file, null, 2)}\n`, "utf-8");
  writeFileSync(path, readFileSync(tmp, "utf-8"), "utf-8");
}

function spendFor(file: BudgetFile, model: string): ModelSpend {
  return file.models[model] ?? { requests: 0, tokens: 0 };
}

export function remainingDailyBudget(model: string): {
  requests: number;
  tokens: number;
} {
  const working = workingGroqLimits();
  const spent = spendFor(loadFile(), model);
  return {
    requests: Math.max(0, working.dailyRequestBudget - spent.requests),
    tokens: Math.max(0, working.dailyTokenBudget - spent.tokens),
  };
}

export function pickModelWithBudget(
  pool: string[],
  estimatedTokens: number,
  strategy: "most-remaining" | "preference" = "most-remaining",
): string {
  const unique = [...new Set(pool.filter(Boolean))];
  const candidates = unique.filter((model) => {
    const remaining = remainingDailyBudget(model);
    return remaining.requests >= 1 && remaining.tokens >= estimatedTokens;
  });
  if (candidates.length === 0) {
    const remaining = remainingDailyBudget(unique[0] ?? "unknown");
    throw new DailyBudgetExceededError(
      unique.join(" | ") || "model-pool",
      remaining.requests < 1 ? "requests" : "tokens",
      remaining,
    );
  }
  if (strategy === "preference") return candidates[0];
  return [...candidates].sort((a, b) => {
    const tokenDelta =
      remainingDailyBudget(b).tokens - remainingDailyBudget(a).tokens;
    if (tokenDelta !== 0) return tokenDelta;
    return unique.indexOf(a) - unique.indexOf(b);
  })[0];
}

export function assertDailyBudget(model: string, estimatedTokens: number): void {
  const remaining = remainingDailyBudget(model);
  if (remaining.requests < 1) {
    throw new DailyBudgetExceededError(model, "requests", remaining);
  }
  if (remaining.tokens < estimatedTokens) {
    throw new DailyBudgetExceededError(model, "tokens", remaining);
  }
}

export function recordDailyUsage(model: string, tokens: number): void {
  const file = loadFile();
  const current = spendFor(file, model);
  file.models[model] = {
    requests: current.requests + 1,
    tokens: current.tokens + Math.max(0, tokens),
  };
  saveFile(file);
}

/** Mark a model's UTC-day budget exhausted after a Groq TPD 429. */
export function markDailyBudgetExhausted(model: string): void {
  const working = workingGroqLimits();
  const file = loadFile();
  const current = spendFor(file, model);
  file.models[model] = {
    requests: Math.max(current.requests, working.dailyRequestBudget),
    tokens: working.dailyTokenBudget,
  };
  saveFile(file);
}

export function publishedGroqCaps() {
  return {
    requestsPerMinute: groqLimits.requestsPerMinute,
    tokensPerMinute: groqLimits.tokensPerMinute,
    dailyRequestBudget: groqLimits.dailyRequestBudget,
    dailyTokenBudget: groqLimits.dailyTokenBudget,
    headroom: groqLimits.headroom,
    working: workingGroqLimits(),
  };
}
