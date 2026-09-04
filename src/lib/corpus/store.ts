/**
 * Corpus file layout under data/{namespace}/corpus/:
 *   raw/{platform}/documents.json       — immutable capture per source
 *   normalized/{platform}/documents.json — cleaned + deduped per source
 *   meta/sources.json
 *   meta/corpus_stats.json
 */
import { existsSync, mkdirSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import type { Document, RawDocument, Source } from "@/lib/store/schema";
import type { StoreNamespace } from "@/lib/store/fs";
import { writeJsonAtomic } from "@/lib/store/fs";
import { ALL_CONNECTORS } from "./connectors";

export const CORPUS_PLATFORMS = ALL_CONNECTORS.map((c) => c.meta.platform);

export function corpusDir(namespace: StoreNamespace = "published"): string {
  return join(process.cwd(), "data", namespace, "corpus");
}

export function corpusMetaDir(namespace: StoreNamespace = "published"): string {
  return join(corpusDir(namespace), "meta");
}

export function corpusStatsPath(namespace: StoreNamespace = "published"): string {
  return join(corpusMetaDir(namespace), "corpus_stats.json");
}

export function rawDir(namespace: StoreNamespace = "published"): string {
  return join(corpusDir(namespace), "raw");
}

export function normalizedDir(namespace: StoreNamespace = "published"): string {
  return join(corpusDir(namespace), "normalized");
}

function platformFile(
  stage: "raw" | "normalized",
  platform: string,
  namespace: StoreNamespace = "published",
): string {
  const base = stage === "raw" ? rawDir(namespace) : normalizedDir(namespace);
  return join(base, platform, "documents.json");
}

function readJsonFile<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf-8")) as T[];
}

function writeJsonFile<T>(path: string, rows: T[]): void {
  writeJsonAtomic(path, rows);
}

export function listCorpusPlatforms(
  stage: "raw" | "normalized",
  namespace: StoreNamespace = "published",
): string[] {
  const base = stage === "raw" ? rawDir(namespace) : normalizedDir(namespace);
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

export function readRawByPlatform(
  platform: string,
  namespace: StoreNamespace = "published",
): RawDocument[] {
  return readJsonFile<RawDocument>(platformFile("raw", platform, namespace));
}

export function readNormalizedByPlatform(
  platform: string,
  namespace: StoreNamespace = "published",
): Document[] {
  return readJsonFile<Document>(platformFile("normalized", platform, namespace));
}

export function readAllRaw(namespace: StoreNamespace = "published"): RawDocument[] {
  const platforms = new Set([
    ...CORPUS_PLATFORMS,
    ...listCorpusPlatforms("raw", namespace),
  ]);
  const all: RawDocument[] = [];
  for (const platform of platforms) {
    all.push(...readRawByPlatform(platform, namespace));
  }
  return all;
}

export function readAllNormalized(
  namespace: StoreNamespace = "published",
): Document[] {
  const platforms = new Set([
    ...CORPUS_PLATFORMS,
    ...listCorpusPlatforms("normalized", namespace),
  ]);
  const all: Document[] = [];
  for (const platform of platforms) {
    all.push(...readNormalizedByPlatform(platform, namespace));
  }
  return all;
}

export function writeRawByPlatform(
  platform: string,
  rows: RawDocument[],
  namespace: StoreNamespace = "published",
): void {
  writeJsonFile(platformFile("raw", platform, namespace), rows);
}

export function writeNormalizedByPlatform(
  platform: string,
  rows: Document[],
  namespace: StoreNamespace = "published",
): void {
  writeJsonFile(platformFile("normalized", platform, namespace), rows);
}

export function appendRawByPlatform(
  platform: string,
  incoming: RawDocument[],
  namespace: StoreNamespace = "published",
): number {
  const existing = readRawByPlatform(platform, namespace);
  const index = new Map(
    existing.map((r) => [`${r.source_id}:${r.external_id}`, r]),
  );
  let added = 0;
  for (const row of incoming) {
    const key = `${row.source_id}:${row.external_id}`;
    if (!index.has(key)) {
      existing.push(row);
      index.set(key, row);
      added += 1;
    }
  }
  if (added > 0) {
    writeRawByPlatform(platform, existing, namespace);
  }
  return added;
}

export function appendNormalizedByPlatform(
  platform: string,
  incoming: Document[],
  namespace: StoreNamespace = "published",
): number {
  const existing = readNormalizedByPlatform(platform, namespace);
  const seen = new Set(existing.map((d) => d.raw_document_id));
  const toAdd = incoming.filter((d) => !seen.has(d.raw_document_id));
  if (toAdd.length > 0) {
    writeNormalizedByPlatform(platform, [...existing, ...toAdd], namespace);
  }
  return toAdd.length;
}

export function readCorpusSources(namespace: StoreNamespace = "published"): Source[] {
  const path = join(corpusMetaDir(namespace), "sources.json");
  return readJsonFile<Source>(path);
}

export function writeCorpusSources(
  sources: Source[],
  namespace: StoreNamespace = "published",
): void {
  writeJsonFile(join(corpusMetaDir(namespace), "sources.json"), sources);
}

export function ensureCorpusDirs(namespace: StoreNamespace = "published"): void {
  mkdirSync(corpusMetaDir(namespace), { recursive: true });
  const sourcesPath = join(corpusMetaDir(namespace), "sources.json");
  if (!existsSync(sourcesPath)) {
    writeJsonFile(sourcesPath, []);
  }
  for (const platform of CORPUS_PLATFORMS) {
    const rawPath = platformFile("raw", platform, namespace);
    const normPath = platformFile("normalized", platform, namespace);
    mkdirSync(join(rawPath, ".."), { recursive: true });
    mkdirSync(join(normPath, ".."), { recursive: true });
    if (!existsSync(rawPath)) writeJsonFile(rawPath, []);
    if (!existsSync(normPath)) writeJsonFile(normPath, []);
  }
}

export function assertCorpusLayout(namespace: StoreNamespace = "published"): string[] {
  const missing: string[] = [];
  ensureCorpusDirs(namespace);
  const metaSources = join(corpusMetaDir(namespace), "sources.json");
  if (!existsSync(metaSources)) {
    missing.push("corpus/meta/sources.json");
  }
  for (const platform of CORPUS_PLATFORMS) {
    const rawPath = platformFile("raw", platform, namespace);
    if (!existsSync(rawPath)) {
      missing.push(`corpus/raw/${platform}/documents.json`);
    }
    const normPath = platformFile("normalized", platform, namespace);
    if (!existsSync(normPath)) {
      missing.push(`corpus/normalized/${platform}/documents.json`);
    }
  }
  return missing;
}
