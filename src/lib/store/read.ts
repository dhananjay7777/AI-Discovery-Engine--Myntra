/**
 * Read-only store API used by the website.
 * App routes must import from here, never from `./write`.
 */
import { readCollection } from "./fs";
import type { Run } from "./schema";

export function listRuns(): Run[] {
  return readCollection("runs");
}

export function getLatestRun(): Run | null {
  const runs = listRuns();
  if (runs.length === 0) return null;
  return [...runs].sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
}

export function countRuns(): number {
  return listRuns().length;
}

export { computeCorpusStats, writeCorpusStatsFile } from "@/lib/corpus/stats";
export type { CorpusStats, SourceStats, CollectionRunSummary } from "@/lib/corpus/stats";

export { readCollection };
export { COLLECTIONS } from "./schema";
