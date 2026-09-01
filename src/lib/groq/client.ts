import Groq from "groq-sdk";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodType } from "zod";
import { getGroqApiKey, groqLimits } from "@/config/models";
import { TokenBucketLimiter, withRetry } from "./rate-limiter";
import { UsageTracker } from "./usage";

export interface StructuredCallOptions<T> {
  model: string;
  system: string;
  user: string;
  schema: ZodType<T>;
  schemaName: string;
  estimatedTokens?: number;
}

let client: Groq | null = null;
let limiter: TokenBucketLimiter | null = null;

export function getGroqClient(): Groq {
  if (!client) {
    client = new Groq({ apiKey: getGroqApiKey() });
  }
  return client;
}

export function getRateLimiter(): TokenBucketLimiter {
  if (!limiter) {
    limiter = new TokenBucketLimiter({
      requestsPerMinute: groqLimits.requestsPerMinute,
      tokensPerMinute: groqLimits.tokensPerMinute,
    });
  }
  return limiter;
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
  const bucket = getRateLimiter();
  const jsonSchema = zodToJsonSchema(options.schema, {
    name: options.schemaName,
    $refStrategy: "none",
  });

  // zod-to-json-schema wraps in definitions; extract the schema object
  const schemaBody =
    typeof jsonSchema === "object" && jsonSchema !== null && "definitions" in jsonSchema
      ? (jsonSchema as { definitions: Record<string, unknown> }).definitions[options.schemaName]
      : jsonSchema;

  await bucket.acquire(options.estimatedTokens ?? 500);

  const response = await withRetry(() =>
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
  );

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
