/**
 * Verify token-bucket throttling and 429 backoff (T0.12).
 * Run: npm run test:throttle
 */
import { TokenBucketLimiter, withRetry } from "@/lib/groq/rate-limiter";

async function testLimiterDelays(): Promise<void> {
  const limiter = new TokenBucketLimiter({
    requestsPerMinute: 120,
    tokensPerMinute: 12_000,
  });

  // Drain the full request bucket (starts at 120)
  for (let i = 0; i < 120; i++) {
    await limiter.acquire(50);
  }

  const start = Date.now();
  await limiter.acquire(50);
  const elapsed = Date.now() - start;

  // At 120 rpm, one token refills in ~500ms
  if (elapsed < 200) {
    throw new Error(`Limiter did not delay after bucket exhausted: waited ${elapsed}ms`);
  }
  console.log(`✓ Limiter delayed after bucket exhausted (${elapsed}ms)`);
}

async function testBackoffOn429(): Promise<void> {
  let attempts = 0;
  const start = Date.now();

  await withRetry(
    async () => {
      attempts++;
      if (attempts < 3) {
        const err = new Error("Rate limit") as Error & { status: number };
        err.status = 429;
        throw err;
      }
      return "ok";
    },
    { maxRetries: 5, baseDelayMs: 200 },
  );

  const elapsed = Date.now() - start;
  if (attempts !== 3) {
    throw new Error(`Expected 3 attempts, got ${attempts}`);
  }
  if (elapsed < 400) {
    throw new Error(`Backoff too fast: ${elapsed}ms for 2 retries`);
  }
  console.log(`✓ Backoff retried ${attempts} times over ${elapsed}ms`);
}

async function testDailyBudgetAbort(): Promise<void> {
  const { mkdtempSync, rmSync } = await import("fs");
  const { tmpdir } = await import("os");
  const { join } = await import("path");
  const dir = mkdtempSync(join(tmpdir(), "groq-budget-"));
  process.env.GROQ_BUDGET_PATH = join(dir, "budget.json");

  const { assertDailyBudget, recordDailyUsage, DailyBudgetExceededError } =
    await import("@/lib/groq/budget");

  recordDailyUsage("openai/gpt-oss-20b", 200_000);
  let threw = false;
  try {
    assertDailyBudget("openai/gpt-oss-20b", 500);
  } catch (error) {
    threw = error instanceof DailyBudgetExceededError;
  }
  rmSync(dir, { recursive: true, force: true });
  delete process.env.GROQ_BUDGET_PATH;
  if (!threw) {
    throw new Error("Daily budget did not abort after token ceiling");
  }
  console.log("✓ Daily token budget aborts before the next call");
}

async function testRunBudgetAbort(): Promise<void> {
  const { RunBudget, RunBudgetExceededError } = await import("@/lib/groq/budget");
  const budget = new RunBudget(2, 10_000);
  budget.assertBeforeCall({ requestCount: 0, totalTokens: 0 }, 500);
  budget.assertBeforeCall({ requestCount: 1, totalTokens: 500 }, 500);
  let threw = false;
  try {
    budget.assertBeforeCall({ requestCount: 2, totalTokens: 1000 }, 500);
  } catch (error) {
    threw = error instanceof RunBudgetExceededError;
  }
  if (!threw) {
    throw new Error("Run budget did not abort at request ceiling");
  }
  console.log("✓ Per-run request budget aborts before the next call");
}

async function main() {
  await testLimiterDelays();
  await testBackoffOn429();
  await testDailyBudgetAbort();
  await testRunBudgetAbort();
  console.log("\n✓ Throttle tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
