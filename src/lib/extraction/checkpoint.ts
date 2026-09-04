import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { StoreNamespace } from "@/lib/store/fs";
import { writeJsonAtomic } from "@/lib/store/fs";

export interface Phase2Metrics {
  gate_calls: number;
  gate_cache_hits: number;
  extract_calls: number;
  extract_cache_hits: number;
  agreement_calls: number;
  units_extracted: number;
  units_dropped_verbatim: number;
  units_published: number;
}

export interface Phase2Checkpoint {
  run_id: string;
  namespace: StoreNamespace;
  gated_groups: string[];
  extracted_documents: string[];
  agreement_units: string[];
  metrics: Phase2Metrics;
  status: "in_progress" | "paused" | "completed";
  updated_at: string;
}

function checkpointPath(namespace: StoreNamespace): string {
  return join(process.cwd(), "data", namespace, "phase2_checkpoint.json");
}

export function emptyMetrics(): Phase2Metrics {
  return {
    gate_calls: 0,
    gate_cache_hits: 0,
    extract_calls: 0,
    extract_cache_hits: 0,
    agreement_calls: 0,
    units_extracted: 0,
    units_dropped_verbatim: 0,
    units_published: 0,
  };
}

export function loadCheckpoint(namespace: StoreNamespace): Phase2Checkpoint | null {
  const path = checkpointPath(namespace);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as Phase2Checkpoint;
  } catch {
    return null;
  }
}

export function saveCheckpoint(checkpoint: Phase2Checkpoint): void {
  checkpoint.updated_at = new Date().toISOString();
  writeJsonAtomic(checkpointPath(checkpoint.namespace), checkpoint);
}

export function createCheckpoint(
  runId: string,
  namespace: StoreNamespace,
): Phase2Checkpoint {
  return {
    run_id: runId,
    namespace,
    gated_groups: [],
    extracted_documents: [],
    agreement_units: [],
    metrics: emptyMetrics(),
    status: "in_progress",
    updated_at: new Date().toISOString(),
  };
}
