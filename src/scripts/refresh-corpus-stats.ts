/**
 * Regenerate corpus_stats.json from the current on-disk corpus (no scraping).
 */
import { computeCorpusStats, writeCorpusStatsFile } from "@/lib/corpus/stats";

function main() {
  const stats = computeCorpusStats("published");
  writeCorpusStatsFile(stats, "published");
  console.log("Wrote data/published/corpus/meta/corpus_stats.json\n");
  console.log("Totals:", stats.totals);
  console.log("\nBy source:");
  for (const row of stats.by_source) {
    console.log(
      `  ${row.platform}: ${row.raw_count} raw, ${row.normalized_count} normalized (${(row.share_of_raw * 100).toFixed(1)}%)`,
    );
  }
}

main();
