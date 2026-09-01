/**
 * Set a phase status, then sync the implementation plan table.
 *
 *   npm run phase:start -- 1
 *   npm run phase:complete -- 0
 */
import { spawnSync } from "child_process";
import { PHASES, writePhaseStatus, type PhaseStatus } from "./phase-status";

const mode = process.argv[2];
const nArg = process.argv[3];

if (mode !== "complete" && mode !== "in_progress" && mode !== "not_started") {
  console.error(
    "Usage: npm run phase:complete -- <n>   or   npm run phase:start -- <n>",
  );
  process.exit(1);
}

const n = parseInt(nArg ?? "", 10);
const phase = PHASES.find((p) => p.n === n);
if (!phase) {
  console.error(`Unknown phase: ${nArg}. Expected 0–7.`);
  process.exit(1);
}

writePhaseStatus(phase.dir, mode as PhaseStatus);
console.log(`Phase ${n} → ${mode}`);

const sync = spawnSync("npm", ["run", "phases:sync"], {
  stdio: "inherit",
  shell: true,
  cwd: process.cwd(),
});

process.exit(sync.status ?? 1);
