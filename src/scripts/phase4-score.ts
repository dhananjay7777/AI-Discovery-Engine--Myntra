/**
 * Phase 4 scoring: rank opportunity areas from coded units. No Groq calls.
 *
 *   npm run phase4:score
 *   npm run phase4:eval
 */
import "./load-env";
import { runScoring } from "@/lib/scoring/pipeline";
import type { StoreNamespace } from "@/lib/store/fs";

function parseArgs() {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--namespace");
  const val = idx >= 0 ? args[idx + 1] : "published";
  return (val === "sandbox" ? "sandbox" : "published") as StoreNamespace;
}

function main() {
  const namespace = parseArgs();
  console.log(`Phase 4 scoring (${namespace})\n`);
  const report = runScoring(namespace);

  console.log(`Weights: ${JSON.stringify(report.weights)}`);
  console.log(`Recommended (${report.recommended_slugs.length}):`);
  const rec = report.areas
    .filter((a) => a.recommended)
    .sort((a, b) => b.score - a.score);
  for (const a of rec) {
    console.log(
      `  ${a.score.toFixed(3)}  conf=${a.confidence.toFixed(3)}  docs=${a.document_count}  ${a.slug}` +
        (a.source_dependent ? "  [source-dependent]" : ""),
    );
  }
  console.log("\nAll areas:");
  for (const a of [...report.areas].sort((x, y) => y.score - x.score)) {
    const flag = a.is_non_monetary ? "" : "  [monetary — not recommended]";
    console.log(
      `  ${a.score.toFixed(3)}  prev=${a.prevalence.toFixed(3)}  ${a.slug}${flag}`,
    );
  }
  console.log("\nStability");
  console.log(
    `  Weight ±25%: ${report.stability.weight_perturbation.top3_unchanged_pct.toFixed(1)}% top-3 unchanged`,
  );
  console.log(
    `  Bootstrap: ${report.stability.bootstrap.top3_stable_pct.toFixed(1)}% draws keep ≥2 of top 3`,
  );
}

main();
