/**
 * Token-bucket rate limiter with exponential backoff on 429 (D-019).
 */

export interface RateLimiterOptions {
  requestsPerMinute: number;
  tokensPerMinute: number;
}

export class TokenBucketLimiter {
  private requestTokens: number;
  private tokenTokens: number;
  private readonly maxRequestTokens: number;
  private readonly maxTokenTokens: number;
  private readonly refillRatePerMs: { requests: number; tokens: number };
  private lastRefill: number;

  constructor(options: RateLimiterOptions) {
    this.maxRequestTokens = options.requestsPerMinute;
    this.maxTokenTokens = options.tokensPerMinute;
    this.requestTokens = this.maxRequestTokens;
    this.tokenTokens = this.maxTokenTokens;
    this.lastRefill = Date.now();
    this.refillRatePerMs = {
      requests: options.requestsPerMinute / 60_000,
      tokens: options.tokensPerMinute / 60_000,
    };
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed <= 0) return;
    this.requestTokens = Math.min(
      this.maxRequestTokens,
      this.requestTokens + elapsed * this.refillRatePerMs.requests,
    );
    this.tokenTokens = Math.min(
      this.maxTokenTokens,
      this.tokenTokens + elapsed * this.refillRatePerMs.tokens,
    );
    this.lastRefill = now;
  }

  async acquire(estimatedTokens = 500): Promise<void> {
    while (true) {
      this.refill();
      if (this.requestTokens >= 1 && this.tokenTokens >= estimatedTokens) {
        this.requestTokens -= 1;
        this.tokenTokens -= estimatedTokens;
        return;
      }
      const waitMs = Math.max(
        (1 - this.requestTokens) / this.refillRatePerMs.requests,
        (estimatedTokens - this.tokenTokens) / this.refillRatePerMs.tokens,
        50,
      );
      await sleep(Math.min(waitMs, 5_000));
    }
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1_000;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRateLimitError(error) || attempt === maxRetries) throw error;
      const jitter = Math.random() * 0.3 + 0.85;
      const delay = baseDelayMs * Math.pow(2, attempt) * jitter;
      console.warn(`[groq] 429 rate limit — backing off ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
      await sleep(delay);
    }
  }
  throw lastError;
}

function isRateLimitError(error: unknown): boolean {
  if (error && typeof error === "object" && "status" in error) {
    return (error as { status: number }).status === 429;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
