import Groq from "groq-sdk";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodType } from "zod";
import { getGroqApiKey, workingGroqLimits } from "@/config/models";
import { TokenBucketLimiter, withRetry } from "./rate-limiter";
import { UsageTracker } from "./usage";
import { assertDailyBudget, recordDailyUsage, markDailyBudgetExhausted, DailyBudgetExceededError, type RunBudget } from "./budget";
import { isGroqDailyTokenLimitError } from "./errors";

export interface StructuredCallOptions<T> {
  model: string;
  system: string;
  user: string;
  schema: ZodType<T>;
  schemaName: string;
  estimatedTokens?: number;
  runBudget?: RunBudget;
}

let client: Groq | null = null;
const limiters = new Map<string, TokenBucketLimiter>();

export function getGroqClient(): Groq {
  if (!client) {
    client = new Groq({ apiKey: getGroqApiKey() });
  }
  return client;
}

export function getRateLimiter(model = "default"): TokenBucketLimiter {
  const existing = limiters.get(model);
  if (existing) return existing;
  const working = workingGroqLimits();
  const created = new TokenBucketLimiter({
    requestsPerMinute: working.requestsPerMinute,
    tokensPerMinute: working.tokensPerMinute,
  });
  limiters.set(model, created);
  return created;
}

export function createUsageTracker(): UsageTracker {
  return new UsageTracker();
}

/**
 * Call Groq with strict JSON-schema structured output (D-017).
 */
export async function structuredCall<T>(
  options: StructuredCallOptions<T>,
  usageTracker?: UsageTracker,
): Promise<{ data: T; usage: ReturnType<UsageTracker["record"]> }> {
  const groq = getGroqClient();
  const bucket = getRateLimiter(options.model);
  const jsonSchema = zodToJsonSchema(options.schema, {
    name: options.schemaName,
    $refStrategy: "none",
  });

  // zod-to-json-schema wraps in definitions; extract the schema object
  const schemaBody =
    typeof jsonSchema === "object" && jsonSchema !== null && "definitions" in jsonSchema
      ? (jsonSchema as { definitions: Record<string, unknown> }).definitions[options.schemaName]
      : jsonSchema;

  const estimated = options.estimatedTokens ?? 500;
  options.runBudget?.assertBeforeCall(
    usageTracker?.getTotals() ?? { requestCount: 0, totalTokens: 0 },
    estimated,
  );
  assertDailyBudget(options.model, estimated);
  await bucket.acquire(estimated);

  let response;
  try {
    response = await withRetry(
      () =>
        groq.chat.completions.create({
          model: options.model,
          messages: [
            { role: "system", content: options.system },
            { role: "user", content: options.user },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: options.schemaName,
              schema: schemaBody as Record<string, unknown>,
              strict: true,
            },
          },
          temperature: 0,
        }),
      { maxRetries: 3, baseDelayMs: 2_000 },
    );
  } catch (error) {
    if (isGroqDailyTokenLimitError(error)) {
      markDailyBudgetExhausted(options.model);
      const remaining = { requests: 0, tokens: 0 };
      throw new DailyBudgetExceededError(options.model, "tokens", remaining);
    }
    throw error;
  }

  const usedTokens =
    response.usage?.total_tokens ??
    (response.usage?.prompt_tokens ?? 0) + (response.usage?.completion_tokens ?? 0);
  recordDailyUsage(options.model, usedTokens || (options.estimatedTokens ?? 500));

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`Empty response from Groq model ${options.model}`);
  }

  const parsed = JSON.parse(content) as unknown;
  const data = options.schema.parse(parsed);

  const usage = usageTracker?.record(options.model, {
    prompt_tokens: response.usage?.prompt_tokens,
    completion_tokens: response.usage?.completion_tokens,
    total_tokens: response.usage?.total_tokens,
  }) ?? {
    model: options.model,
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
    totalTokens: response.usage?.total_tokens ?? 0,
    estimatedCostUsd: 0,
    requestCount: 1,
  };

  return { data, usage };
}
