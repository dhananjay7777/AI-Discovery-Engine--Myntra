/**
 * Re-assign dedupe_group across the full normalized corpus (T1.7).
 */
import { writeFileSync } from "fs";
import { join } from "path";
import {
  rebuildDedupeGroups,
  residualNearDupPairRate,
} from "@/lib/corpus/rebuild-dedupe";
import { computeCorpusStats, writeCorpusStatsFile } from "@/lib/corpus/stats";
import {
  CORPUS_PLATFORMS,
  listCorpusPlatforms,
  readAllNormalized,
  readAllRaw,
  readCorpusSources,
  readNormalizedByPlatform,
  writeNormalizedByPlatform,
} from "@/lib/corpus/store";

function main() {
  const sources = readCorpusSources();
  const sourceToPlatform = new Map(sources.map((s) => [s.id, s.platform]));
  const raw = readAllRaw();
  const rawById = new Map(raw.map((r) => [r.id, r]));
  const allDocs = readAllNormalized();

  const before = residualNearDupPairRate(allDocs, rawById);
  const rebuilt = rebuildDedupeGroups(allDocs, rawById);
  const after = residualNearDupPairRate(rebuilt, rawById);

  const byPlatform = new Map<string, typeof rebuilt>();
  for (const doc of rebuilt) {
    const rawDoc = rawById.get(doc.raw_document_id);
    const platform = rawDoc
      ? (sourceToPlatform.get(rawDoc.source_id) ?? "unknown")
      : "unknown";
    const bucket = byPlatform.get(platform) ?? [];
    bucket.push(doc);
    byPlatform.set(platform, bucket);
  }

  for (const platform of new Set([
    ...CORPUS_PLATFORMS,
    ...listCorpusPlatforms("normalized", "published"),
  ])) {
    writeNormalizedByPlatform(platform, byPlatform.get(platform) ?? []);
  }

  const stats = computeCorpusStats("published");
  writeCorpusStatsFile(stats, "published");

  const audit = {
    generated_at: new Date().toISOString(),
    residual_pair_rate_before: before,
    residual_pair_rate_after: after,
    dedupe_groups: stats.dedupe_group_count,
    normalized_documents: stats.document_count,
  };
  const auditPath = join(
    process.cwd(),
    "data",
    "published",
    "corpus",
    "meta",
    "dedupe_audit.json",
  );
  writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf-8");

  console.log(
    `Residual same-author near-dup pair rate: ${(before * 100).toFixed(2)}% → ${(after * 100).toFixed(2)}%`,
  );
  console.log(`Dedupe groups: ${stats.dedupe_group_count}`);
  console.log(`Wrote ${auditPath}`);
}

main();
