/**
 * Generate permalink audit sample for T1.5 (30 documents, stratified by platform).
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { readAllRaw, readCorpusSources } from "@/lib/corpus/store";

function main() {
  const sources = readCorpusSources();
  const sourceToPlatform = new Map(sources.map((s) => [s.id, s.platform]));
  const raw = readAllRaw();

  const byPlatform = new Map<string, typeof raw>();
  for (const row of raw) {
    const platform = sourceToPlatform.get(row.source_id) ?? "unknown";
    const bucket = byPlatform.get(platform) ?? [];
    bucket.push(row);
    byPlatform.set(platform, bucket);
  }

  const sample: Array<{
    id: string;
    platform: string;
    url: string;
    text_preview: string;
    posted_at: string | null;
  }> = [];

  for (const [platform, rows] of byPlatform) {
    if (platform === "unknown" || platform === "stackexchange_fashion") continue;
    const take = Math.min(6, rows.length);
    for (const row of rows.slice(0, take)) {
      sample.push({
        id: row.id,
        platform,
        url: row.url,
        text_preview: row.text_raw.slice(0, 120),
        posted_at: row.posted_at,
      });
    }
  }

  const outPath = join(
    process.cwd(),
    "docs",
    "phases",
    "phase-1-corpus",
    "permalink-audit-sample.json",
  );
  writeFileSync(outPath, `${JSON.stringify(sample, null, 2)}\n`, "utf-8");
  console.log(`Wrote ${sample.length} permalink samples to ${outPath}`);
}

main();
