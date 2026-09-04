import { groqPricing } from "@/config/models";

export interface UsageRecord {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  requestCount: number;
}

export class UsageTracker {
  private records: UsageRecord[] = [];
  private totalRequests = 0;

  record(
    model: string,
    usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number },
  ): UsageRecord {
    const promptTokens = usage.prompt_tokens ?? 0;
    const completionTokens = usage.completion_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;
    const estimatedCostUsd = estimateCost(model, promptTokens, completionTokens);
    this.totalRequests += 1;

    const record: UsageRecord = {
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUsd,
      requestCount: this.totalRequests,
    };
    this.records.push(record);
    return record;
  }

  getRecords(): UsageRecord[] {
    return [...this.records];
  }

  getTotals() {
    return this.records.reduce(
      (acc, r) => ({
        promptTokens: acc.promptTokens + r.promptTokens,
        completionTokens: acc.completionTokens + r.completionTokens,
        totalTokens: acc.totalTokens + r.totalTokens,
        estimatedCostUsd: acc.estimatedCostUsd + r.estimatedCostUsd,
        requestCount: this.totalRequests,
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0, requestCount: 0 },
    );
  }

  /** Requests and tokens spent per model in this run. */
  getPerModelTotals(): Record<string, { requests: number; tokens: number }> {
    const byModel: Record<string, { requests: number; tokens: number }> = {};
    for (const r of this.records) {
      const current = byModel[r.model] ?? { requests: 0, tokens: 0 };
      byModel[r.model] = {
        requests: current.requests + 1,
        tokens: current.tokens + r.totalTokens,
      };
    }
    return byModel;
  }
}

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = groqPricing[model as keyof typeof groqPricing];
  if (!pricing) return 0;
  return (promptTokens / 1_000_000) * pricing.input + (completionTokens / 1_000_000) * pricing.output;
}
