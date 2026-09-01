import type { StoreNamespace } from "@/lib/store/fs";
import type { RawDocument, Source } from "@/lib/store/schema";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { matchesConsiderationLanguage } from "./queries";
import {
  corpusMetaDir,
  corpusStatsPath,
  readAllNormalized,
  readAllRaw,
  readCorpusSources,
} from "./store";

export interface SourceStats {
  platform: string;
  source_id: string;
  collection_method: string | null;
  terms_notes: string | null;
  raw_count: number;
  normalized_count: number;
  share_of_raw: number;
  consideration_language_count: number;
  first_collected_at: string | null;
  last_collected_at: string | null;
}

export interface CollectionRunSummary {
  run_id: string;
  completed_at: string;
  ingested: number;
  skipped_duplicate: number;
  skipped_quality: number;
  ingested_by_platform: Record<string, number>;
}

export interface CorpusStats {
  generated_at: string;
  totals: {
    raw_documents: number;
    normalized_documents: number;
    dedupe_groups: number;
    consideration_language: number;
  };
  /** Per-source scrape counts and metadata — primary view for collection reporting. */
  by_source: SourceStats[];
  /** @deprecated Use by_source[].raw_count — kept for API compatibility */
  platform_counts: Record<string, number>;
  /** @deprecated Use by_source[].share_of_raw */
  platform_shares: Record<string, number>;
  consideration_language_count: number;
  raw_document_count: number;
  document_count: number;
  language_counts: Record<string, number>;
  month_histogram: Record<string, number>;
  dedupe_group_count: number;
  sources: Array<{
    platform: string;
    collection_method: string | null;
    terms_notes: string | null;
  }>;
  last_collection_run: CollectionRunSummary | null;
}

function maxIso(dates: string[]): string | null {
  if (dates.length === 0) return null;
  return dates.reduce((a, b) => (a > b ? a : b));
}

function minIso(dates: string[]): string | null {
  if (dates.length === 0) return null;
  return dates.reduce((a, b) => (a < b ? a : b));
}

export function readCorpusStatsFile(
  namespace: StoreNamespace = "published",
): CorpusStats | null {
  const path = corpusStatsPath(namespace);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as CorpusStats;
}

export function writeCorpusStatsFile(
  stats: CorpusStats,
  namespace: StoreNamespace = "published",
): void {
  mkdirSync(corpusMetaDir(namespace), { recursive: true });
  const path = corpusStatsPath(namespace);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(stats, null, 2)}\n`, "utf-8");
  writeFileSync(path, readFileSync(tmp, "utf-8"), "utf-8");
}

export function computeCorpusStats(
  namespace: StoreNamespace = "published",
  lastRun?: CollectionRunSummary | null,
): CorpusStats {
  const sources = readCorpusSources(namespace);
  const rawDocuments = readAllRaw(namespace);
  const documents = readAllNormalized(namespace);

  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const rawByPlatform = new Map<string, RawDocument[]>();
  const normCountByPlatform = new Map<string, number>();

  for (const raw of rawDocuments) {
    const platform = sourceById.get(raw.source_id)?.platform ?? "unknown";
    const bucket = rawByPlatform.get(platform) ?? [];
    bucket.push(raw);
    rawByPlatform.set(platform, bucket);
  }

  for (const doc of documents) {
    const raw = rawDocuments.find((r) => r.id === doc.raw_document_id);
    const platform = raw
      ? (sourceById.get(raw.source_id)?.platform ?? "unknown")
      : "unknown";
    normCountByPlatform.set(platform, (normCountByPlatform.get(platform) ?? 0) + 1);
  }

  const totalRaw = rawDocuments.length || 1;
  const platformCounts: Record<string, number> = {};
  const platformShares: Record<string, number> = {};
  const monthHistogram: Record<string, number> = {};
  let considerationCount = 0;

  const by_source: SourceStats[] = sources.map((source: Source) => {
    const rows = rawByPlatform.get(source.platform) ?? [];
    const collectedDates = rows.map((r) => r.collected_at).filter(Boolean);
    const consideration = rows.filter((r) =>
      matchesConsiderationLanguage(r.text_raw),
    ).length;

    platformCounts[source.platform] = rows.length;
    platformShares[source.platform] = rows.length / totalRaw;

    return {
      platform: source.platform,
      source_id: source.id,
      collection_method: source.collection_method,
      terms_notes: source.terms_notes,
      raw_count: rows.length,
      normalized_count: normCountByPlatform.get(source.platform) ?? 0,
      share_of_raw: rows.length / totalRaw,
      consideration_language_count: consideration,
      first_collected_at: minIso(collectedDates),
      last_collected_at: maxIso(collectedDates),
    };
  });

  // Include platforms present in data but missing from sources registry
  for (const [platform, rows] of rawByPlatform) {
    if (sources.some((s) => s.platform === platform)) continue;
    const collectedDates = rows.map((r) => r.collected_at).filter(Boolean);
    platformCounts[platform] = rows.length;
    platformShares[platform] = rows.length / totalRaw;
    by_source.push({
      platform,
      source_id: rows[0]?.source_id ?? "",
      collection_method: null,
      terms_notes: null,
      raw_count: rows.length,
      normalized_count: normCountByPlatform.get(platform) ?? 0,
      share_of_raw: rows.length / totalRaw,
      consideration_language_count: rows.filter((r) =>
        matchesConsiderationLanguage(r.text_raw),
      ).length,
      first_collected_at: minIso(collectedDates),
      last_collected_at: maxIso(collectedDates),
    });
  }

  for (const raw of rawDocuments) {
    if (raw.posted_at) {
      const month = raw.posted_at.slice(0, 7);
      monthHistogram[month] = (monthHistogram[month] ?? 0) + 1;
    }
    if (matchesConsiderationLanguage(raw.text_raw)) {
      considerationCount += 1;
    }
  }

  const languageCounts: Record<string, number> = {};
  for (const doc of documents) {
    const lang = doc.lang ?? "unknown";
    languageCounts[lang] = (languageCounts[lang] ?? 0) + 1;
  }

  const dedupeGroups = new Set(
    documents.map((d) => d.dedupe_group).filter(Boolean),
  );

  return {
    generated_at: new Date().toISOString(),
    totals: {
      raw_documents: rawDocuments.length,
      normalized_documents: documents.length,
      dedupe_groups: dedupeGroups.size,
      consideration_language: considerationCount,
    },
    by_source: by_source.sort((a, b) => b.raw_count - a.raw_count),
    platform_counts: platformCounts,
    platform_shares: platformShares,
    consideration_language_count: considerationCount,
    raw_document_count: rawDocuments.length,
    document_count: documents.length,
    language_counts: languageCounts,
    month_histogram: monthHistogram,
    dedupe_group_count: dedupeGroups.size,
    sources: sources.map((s: Source) => ({
      platform: s.platform,
      collection_method: s.collection_method,
      terms_notes: s.terms_notes,
    })),
    last_collection_run: lastRun ?? readCorpusStatsFile(namespace)?.last_collection_run ?? null,
  };
}

export function rawKey(sourceId: string, externalId: string): string {
  return `${sourceId}:${externalId}`;
}

export function indexRawDocuments(
  rawDocuments: RawDocument[],
): Map<string, RawDocument> {
  const map = new Map<string, RawDocument>();
  for (const raw of rawDocuments) {
    map.set(rawKey(raw.source_id, raw.external_id), raw);
  }
  return map;
}
