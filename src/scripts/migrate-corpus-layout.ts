/**
 * Migrate legacy flat corpus JSON into per-platform folder layout.
 */
import { readFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import type { Document, RawDocument, Source } from "@/lib/store/schema";
import {
  meetsCorpusQualityBar,
  prepareRawText,
} from "@/lib/corpus/normalize";
import {
  ensureCorpusDirs,
  writeCorpusSources,
  writeNormalizedByPlatform,
  writeRawByPlatform,
} from "@/lib/corpus/store";

const published = join(process.cwd(), "data", "published");

function readLegacy<T>(name: string): T[] {
  const path = join(published, `${name}.json`);
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf-8")) as T[];
}

function main() {
  const sources = readLegacy<Source>("sources");
  const raw = readLegacy<RawDocument>("raw_documents");
  const documents = readLegacy<Document>("documents");

  if (raw.length === 0 && documents.length === 0) {
    console.log("No legacy corpus files to migrate.");
    return;
  }

  const sourceById = new Map(sources.map((s) => [s.id, s.platform]));
  const rawByPlatform = new Map<string, RawDocument[]>();
  const normByPlatform = new Map<string, Document[]>();
  let droppedShort = 0;

  for (const row of raw) {
    const platform = sourceById.get(row.source_id) ?? "unknown";
    const text_raw = prepareRawText(row.text_raw);
    if (!meetsCorpusQualityBar(text_raw)) {
      droppedShort += 1;
      continue;
    }
    const bucket = rawByPlatform.get(platform) ?? [];
    bucket.push({ ...row, text_raw });
    rawByPlatform.set(platform, bucket);
  }

  const rawIdToPlatform = new Map<string, string>();
  for (const [platform, rows] of rawByPlatform) {
    for (const row of rows) {
      rawIdToPlatform.set(row.id, platform);
    }
  }

  for (const doc of documents) {
    const platform = rawIdToPlatform.get(doc.raw_document_id);
    if (!platform) continue;
    const text_clean = prepareRawText(doc.text_clean);
    if (!meetsCorpusQualityBar(text_clean)) continue;
    const bucket = normByPlatform.get(platform) ?? [];
    bucket.push({ ...doc, text_clean });
    normByPlatform.set(platform, bucket);
  }

  ensureCorpusDirs("published");
  writeCorpusSources(sources, "published");

  for (const [platform, rows] of rawByPlatform) {
    writeRawByPlatform(platform, rows, "published");
    console.log(`  raw/${platform}: ${rows.length}`);
  }
  for (const [platform, rows] of normByPlatform) {
    writeNormalizedByPlatform(platform, rows, "published");
    console.log(`  normalized/${platform}: ${rows.length}`);
  }

  for (const legacy of ["raw_documents", "documents", "sources", "corpus_stats"]) {
    const path = join(published, `${legacy}.json`);
    if (existsSync(path)) {
      unlinkSync(path);
      console.log(`  removed legacy ${legacy}.json`);
    }
    const tmp = `${path}.tmp`;
    if (existsSync(tmp)) unlinkSync(tmp);
  }

  console.log(
    `\nMigrated ${raw.length} legacy raw rows → ${droppedShort} dropped (<6 words), emoji stripped where present.`,
  );
}

main();
