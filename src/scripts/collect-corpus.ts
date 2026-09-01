/**
 * Phase 1 corpus collection — public APIs only, no Groq calls.
 */
import "./load-env";
import { runCorpusCollection } from "@/lib/corpus/pipeline";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const skipEmbed = process.argv.includes("--skip-embed");
  const balance = process.argv.includes("--balance");

  console.log("Starting corpus collection...");
  if (dryRun) console.log("(dry run — no writes)");
  if (balance) console.log("(balance mode — skip hacker_news, stop when another source overtakes it)");

  const result = await runCorpusCollection({
    dryRun,
    skipEmbed,
    ...(balance
      ? {
          excludePlatforms: ["hacker_news"],
          stopWhenBeatsPlatform: "hacker_news",
        }
      : {}),
  });

  console.log("\nCollection summary:");
  console.log(`  Run id:         ${result.runId}`);
  console.log(`  Ingested:       ${result.ingested}`);
  console.log(`  Skipped dupes:  ${result.skippedDuplicate}`);
  console.log(`  Quality skips:  ${result.skippedQuality}`);
  console.log(`  Raw total:      ${result.stats.raw_document_count}`);
  console.log(`  Normalized:     ${result.stats.document_count}`);
  console.log(`  Consideration:  ${result.stats.consideration_language_count}`);
  console.log("  Platform mix:", result.stats.platform_counts);
  console.log("  Stats written:  data/published/corpus/meta/corpus_stats.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
