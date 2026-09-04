/**
 * Phase 3 codebook: deductive seed assignment + inductive cluster naming.
 *
 * Usage:
 *   npm run phase3:codebook
 *   npm run phase3:codebook -- --dry-run
 *   npm run phase3:codebook -- --skip-inductive
 */
import "./load-env";
import { runCodebookPipeline } from "@/lib/codebook/pipeline";
import type { StoreNamespace } from "@/lib/store/fs";

function parseArgs() {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--namespace");
  const val = idx >= 0 ? args[idx + 1] : "published";
  return {
    dryRun: args.includes("--dry-run"),
    skipInductive: args.includes("--skip-inductive"),
    namespace: (val === "sandbox" ? "sandbox" : "published") as StoreNamespace,
    minClusterSize: (() => {
      const i = args.indexOf("--min-cluster");
      return i >= 0 ? parseInt(args[i + 1] ?? "5", 10) : 5;
    })(),
  };
}

async function main() {
  const opts = parseArgs();
  console.log(`Phase 3 codebook (${opts.namespace})`);
  if (opts.dryRun) console.log("  DRY RUN");
  if (opts.skipInductive) console.log("  Skipping inductive layer");
  console.log();

  const result = await runCodebookPipeline({
    namespace: opts.namespace,
    dryRun: opts.dryRun,
    skipInductive: opts.skipInductive,
    minClusterSize: opts.minClusterSize,
  });

  console.log("\n── Result ──");
  console.log("Version:", result.version);
  console.log("Seed codes:", result.seedCodes);
  console.log("Inductive proposed:", result.inductiveProposed);
  console.log("Unit-code rows:", result.unitCodes);
  console.log("Coverage:", `${result.coverage.coverage_pct.toFixed(1)}%`);
  console.log("Other bucket:", `${result.coverage.other_pct.toFixed(1)}%`);
}

main().catch((err) => {
  console.error("Phase 3 codebook failed:", err);
  process.exit(1);
});
