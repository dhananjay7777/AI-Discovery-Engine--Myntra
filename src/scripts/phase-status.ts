import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export const PHASES = [
  { n: 0, dir: "phase-0-foundation" },
  { n: 1, dir: "phase-1-corpus" },
  { n: 2, dir: "phase-2-extraction" },
  { n: 3, dir: "phase-3-codebook" },
  { n: 4, dir: "phase-4-scoring" },
  { n: 5, dir: "phase-5-webapp" },
  { n: 6, dir: "phase-6-deploy" },
  { n: 7, dir: "phase-7-handoff" },
] as const;

export type PhaseStatus = "not_started" | "in_progress" | "complete";

export const STATUS_LABEL: Record<PhaseStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
};

const STATUS_RE = /<!--\s*phase-status:\s*(not_started|in_progress|complete)\s*-->/;

export function evalPath(dir: string): string {
  return join(process.cwd(), "docs", "phases", dir, "eval.md");
}

export function readPhaseStatus(dir: string): PhaseStatus {
  const text = readFileSync(evalPath(dir), "utf-8");
  const match = text.match(STATUS_RE);
  if (!match) {
    throw new Error(`Missing phase-status marker in docs/phases/${dir}/eval.md`);
  }
  return match[1] as PhaseStatus;
}

export function writePhaseStatus(dir: string, status: PhaseStatus): void {
  const path = evalPath(dir);
  const text = readFileSync(path, "utf-8");
  if (!STATUS_RE.test(text)) {
    throw new Error(`Missing phase-status marker in ${path}`);
  }
  writeFileSync(path, text.replace(STATUS_RE, `<!-- phase-status: ${status} -->`));
}
