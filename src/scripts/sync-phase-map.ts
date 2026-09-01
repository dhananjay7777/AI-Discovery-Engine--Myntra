/**
 * Sync the Status column in docs/implementationplan.md from
 * `<!-- phase-status: ... -->` markers in each eval.md.
 *
 *   npm run phases:sync
 *   npm run phases:sync -- --check
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { PHASES, readPhaseStatus, STATUS_LABEL } from "./phase-status";

const PLAN = join(process.cwd(), "docs", "implementationplan.md");
const START = "<!-- phase-map:start -->";
const END = "<!-- phase-map:end -->";

function splitRow(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return [];
  return trimmed
    .slice(1, trimmed.endsWith("|") ? -1 : undefined)
    .split("|")
    .map((cell) => cell.trim());
}

function padRow(cells: string[], widths: number[]): string {
  return `| ${cells.map((c, i) => c.padEnd(widths[i], " ")).join(" | ")} |`;
}

function renderTable(template: string): string {
  const lines = template.split(/\r?\n/).filter((l) => l.trim().startsWith("|"));
  if (lines.length < 3) {
    throw new Error("phase-map block must contain a markdown table");
  }

  const header = splitRow(lines[0]);
  const statusIdx = header.findIndex((h) => h.toLowerCase() === "status");
  if (statusIdx === -1) {
    throw new Error('phase-map table needs a "Status" column');
  }

  const nIdx = header.findIndex((h) => h === "#");
  if (nIdx === -1) {
    throw new Error('phase-map table needs a "#" column');
  }

  const dataLines = lines.slice(2);
  const updated = dataLines.map((line) => {
    const cells = splitRow(line);
    const n = parseInt(cells[nIdx], 10);
    const phase = PHASES.find((p) => p.n === n);
    if (!phase) {
      throw new Error(`Unknown phase number in map: ${cells[nIdx]}`);
    }
    cells[statusIdx] = STATUS_LABEL[readPhaseStatus(phase.dir)];
    return cells;
  });

  const allRows = [header, ...updated];
  const widths = header.map((_, col) =>
    Math.max(...allRows.map((row) => (row[col] ?? "").length)),
  );
  const divider = `| ${widths.map((w) => "-".repeat(Math.max(w, 3))).join(" | ")} |`;

  return [padRow(header, widths), divider, ...updated.map((row) => padRow(row, widths))].join(
    "\n",
  );
}

const plan = readFileSync(PLAN, "utf-8");
const start = plan.indexOf(START);
const end = plan.indexOf(END);
if (start === -1 || end === -1 || end < start) {
  throw new Error("docs/implementationplan.md is missing phase-map start/end markers");
}

const before = plan.slice(0, start + START.length);
const block = plan.slice(start + START.length, end);
const after = plan.slice(end);
const nextBlock = `\n\n${renderTable(block)}\n\n`;
const next = `${before}${nextBlock}${after}`;
const check = process.argv.includes("--check");

if (check) {
  if (next !== plan) {
    console.error("Phase map Status column is stale. Run: npm run phases:sync");
    process.exit(1);
  }
  console.log("✓ Phase map Status column matches eval.md markers");
} else if (next === plan) {
  console.log("Phase map already up to date");
} else {
  writeFileSync(PLAN, next);
  console.log("Updated Status column in docs/implementationplan.md");
  for (const phase of PHASES) {
    console.log(`  ${phase.n}: ${STATUS_LABEL[readPhaseStatus(phase.dir)]}`);
  }
}
