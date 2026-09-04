/**
 * Phase 2 extraction job: relevance gate → extract → verbatim verify → cache.
 *
 * Usage:
 *   npm run phase2:extract              # resume or start full run
 *   npm run phase2:extract -- --dry-run --limit 5
 *   npm run phase2:extract -- --namespace sandbox --fresh
 *   npm run phase2:extract -- --skip-agreement
 *   npm run phase2:extract -- --gate-only    # gate pass only (resume extract later)
 *   npm run phase2:extract -- --extract-only # extract already-gated docs only
 *   npm run phase2:extract -- --max-requests 10 --namespace sandbox
 */
import "./load-env";
import { runPhase2Extraction, countGateTargets } from "@/lib/extraction/pipeline";
import type { StoreNamespace } from "@/lib/store/fs";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    fresh: args.includes("--fresh"),
    skipAgreement: args.includes("--skip-agreement"),
    gateOnly: args.includes("--gate-only"),
    extractOnly: args.includes("--extract-only"),
    limit: (() => {
      const idx = args.indexOf("--limit");
      return idx >= 0 ? parseInt(args[idx + 1] ?? "0", 10) : undefined;
    })(),
    maxRequests: (() => {
      const idx = args.indexOf("--max-requests");
      return idx >= 0 ? parseInt(args[idx + 1] ?? "0", 10) : undefined;
    })(),
    maxTokens: (() => {
      const idx = args.indexOf("--max-tokens");
      return idx >= 0 ? parseInt(args[idx + 1] ?? "0", 10) : undefined;
    })(),
    namespace: (() => {
      const idx = args.indexOf("--namespace");
      const val = idx >= 0 ? args[idx + 1] : "published";
      return (val === "sandbox" ? "sandbox" : "published") as StoreNamespace;
    })(),
  };
}

function clearCheckpoint(namespace: StoreNamespace): void {
  const path = join(process.cwd(), "data", namespace, "phase2_checkpoint.json");
  if (existsSync(path)) unlinkSync(path);
}

async function main() {
  const opts = parseArgs();

  if (opts.fresh) {
    clearCheckpoint(opts.namespace);
    console.log("Cleared checkpoint — starting fresh run");
  }

  const targets = countGateTargets();
  console.log(`Phase 2 extraction (${opts.namespace})`);
  console.log(`  Unique dedupe groups to gate: ${targets}`);
  if (opts.dryRun) console.log("  DRY RUN — no Groq calls, no writes");
  if (opts.limit) console.log(`  Limit: ${opts.limit} gate groups / extract docs`);
  if (opts.maxRequests) console.log(`  Run request ceiling: ${opts.maxRequests}`);
  if (opts.maxTokens) console.log(`  Run token ceiling: ${opts.maxTokens}`);
  console.log();

  const result = await runPhase2Extraction({
    namespace: opts.namespace,
    dryRun: opts.dryRun,
    limit: opts.limit,
    skipAgreement: opts.skipAgreement,
    gateOnly: opts.gateOnly,
    extractOnly: opts.extractOnly,
    resume: !opts.fresh,
    maxRequests: opts.maxRequests,
    maxTokens: opts.maxTokens,
  });

  console.log("\n── Result ──");
  console.log("Run id:", result.runId);
  console.log("Status:", result.status);
  console.log("Metrics:", result.metrics);
  if (result.modelUsage && Object.keys(result.modelUsage).length > 0) {
    console.log("Model usage this session:");
    for (const [model, spend] of Object.entries(result.modelUsage)) {
      console.log(`  ${model}: ${spend.requests} req / ${spend.tokens} tok`);
    }
  }

  if (result.status === "paused" || result.status === "in_progress") {
    console.log("\nRun in progress — resume with: npm run phase2:extract");
    process.exit(0);
  } else if (result.status === "completed") {
    console.log("\n✓ Phase 2 extraction job finished");
  }
}

main().catch((err) => {
  console.error("Phase 2 extraction failed:", err);
  process.exit(1);
});
