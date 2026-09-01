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

async function main() {
  await testLimiterDelays();
  await testBackoffOn429();
  console.log("\n✓ Throttle tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
