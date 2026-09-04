/**
 * Write API for batch jobs and scripts only.
 * The Next.js app must not import this module (T0.4).
 */
import { randomUUID } from "crypto";
import { readCollection, writeCollection, type StoreNamespace } from "./fs";
import type { EmbeddingSmoke, EvidenceUnit, Run } from "./schema";

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
    promptVersions?: Record<string, string>;
    documentCount?: number;
    unitCount?: number;
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
    prompt_versions: data.promptVersions ?? null,
    document_count: data.documentCount ?? 0,
    unit_count: data.unitCount ?? 0,
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

export function updateRun(
  runId: string,
  patch: {
    status?: string;
    document_count?: number;
    unit_count?: number;
    request_count?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    estimated_cost_usd?: number;
    prompt_versions?: Record<string, string>;
    timings?: Record<string, number>;
  },
  namespace: StoreNamespace = "published",
): void {
  const runs = readCollection("runs", namespace);
  const idx = runs.findIndex((r) => r.id === runId);
  if (idx < 0) throw new Error(`Run not found: ${runId}`);

  const current = runs[idx];
  runs[idx] = {
    ...current,
    ...patch,
    completed_at: patch.status === "completed" ? new Date().toISOString() : current.completed_at,
  };
  writeCollection("runs", runs, namespace);
}

export function insertEvidenceUnits(
  units: Omit<EvidenceUnit, "id" | "created_at">[],
  namespace: StoreNamespace = "published",
): string[] {
  const now = new Date().toISOString();
  const ids: string[] = [];
  const rows = readCollection("evidence_units", namespace);
  for (const unit of units) {
    const id = randomUUID();
    ids.push(id);
    rows.push({ ...unit, id, created_at: now });
  }
  writeCollection("evidence_units", rows, namespace);
  return ids;
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
