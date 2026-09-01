/**
 * Write API for batch jobs and scripts only.
 * The Next.js app must not import this module (T0.4).
 */
import { randomUUID } from "crypto";
import { readCollection, writeCollection, type StoreNamespace } from "./fs";
import type { EmbeddingSmoke, Run } from "./schema";

export function insertRun(
  data: {
    gateModel: string;
    extractionModel: string;
    agreementModel: string;
    embeddingModel: string;
    configHash: string;
    requestCount: number;
    promptTokens: number;
    completionTokens: number;
    estimatedCostUsd: number;
    status: string;
    timings?: Record<string, number>;
  },
  namespace: StoreNamespace = "published",
): string {
  const now = new Date().toISOString();
  const run: Run = {
    id: randomUUID(),
    config_hash: data.configHash,
    gate_model: data.gateModel,
    extraction_model: data.extractionModel,
    agreement_model: data.agreementModel,
    embedding_model: data.embeddingModel,
    prompt_versions: null,
    document_count: 0,
    unit_count: 0,
    request_count: data.requestCount,
    prompt_tokens: data.promptTokens,
    completion_tokens: data.completionTokens,
    estimated_cost_usd: data.estimatedCostUsd,
    timings: data.timings ?? null,
    status: data.status,
    started_at: now,
    completed_at: data.status === "completed" ? now : null,
  };

  const runs = readCollection("runs", namespace);
  runs.push(run);
  writeCollection("runs", runs, namespace);
  return run.id;
}

export function insertEmbeddingSmoke(
  textSample: string,
  embedding: number[],
  namespace: StoreNamespace = "published",
): string {
  const row: EmbeddingSmoke = {
    id: randomUUID(),
    text_sample: textSample,
    embedding,
    created_at: new Date().toISOString(),
  };
  const rows = readCollection("embedding_smoke", namespace);
  rows.push(row);
  writeCollection("embedding_smoke", rows, namespace);
  return row.id;
}

export function getEmbeddingSmoke(
  id: string,
  namespace: StoreNamespace = "published",
): EmbeddingSmoke | undefined {
  return readCollection("embedding_smoke", namespace).find((row) => row.id === id);
}

export { writeCollection };
