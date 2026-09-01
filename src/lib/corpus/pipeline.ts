import { randomUUID } from "crypto";
import { embedTexts } from "@/lib/embeddings/local";
import type { StoreNamespace } from "@/lib/store/fs";
import type { Document, RawDocument } from "@/lib/store/schema";
import { FASHION_PLAY_APP_IDS, SOURCE_CAPS } from "./config";
import { ALL_CONNECTORS } from "./connectors";
import { assignDedupeGroups } from "./dedupe";
import { hashAuthor, hashContent } from "./hash";
import {
  isRetainedLanguage,
  meetsCorpusQualityBar,
  normalizeText,
  prepareRawText,
} from "./normalize";
import { CONSIDERATION_QUERIES, REDDIT_SUBREDDITS } from "./queries";
import { ensureSources } from "./sources";
import {
  computeCorpusStats,
  indexRawDocuments,
  rawKey,
  writeCorpusStatsFile,
} from "./stats";
import {
  appendNormalizedByPlatform,
  appendRawByPlatform,
  ensureCorpusDirs,
  readAllNormalized,
  readAllRaw,
  readNormalizedByPlatform,
  readRawByPlatform,
} from "./store";
import type { CorpusConnector, FetchedItem } from "./types";

export interface CollectOptions {
  dryRun?: boolean;
  skipEmbed?: boolean;
  namespace?: StoreNamespace;
  /** Skip these platforms entirely (e.g. hacker_news during balance runs). */
  excludePlatforms?: string[];
  /**
   * Stop immediately once any other platform's count exceeds this platform's
   * current total (checked after each new document).
   */
  stopWhenBeatsPlatform?: string;
}

export interface CollectResult {
  runId: string;
  ingested: number;
  skippedDuplicate: number;
  skippedQuality: number;
  documentsCreated: number;
  perPlatform: Record<string, number>;
  stats: ReturnType<typeof computeCorpusStats>;
}

interface QueryPlan {
  connector: CorpusConnector;
  queries: string[];
  cap: number;
}

function buildQueryPlans(): QueryPlan[] {
  const plans: QueryPlan[] = [];

  for (const connector of ALL_CONNECTORS) {
    const cap = SOURCE_CAPS[connector.meta.platform] ?? 500;
    let queries: string[] = [];

    switch (connector.meta.platform) {
      case "play_store":
        queries = FASHION_PLAY_APP_IDS.map((id) => `app:${id}`);
        break;
      case "app_store":
        queries = ["myntra-reviews"];
        break;
      case "reddit":
        queries = REDDIT_SUBREDDITS.map((sub) => `subreddit:${sub}`);
        break;
      case "youtube":
        queries = [...CONSIDERATION_QUERIES];
        break;
      case "hacker_news":
        queries = [
          ...CONSIDERATION_QUERIES,
          "online shopping fit",
          "fashion ecommerce",
          "myntra flipkart",
        ];
        break;
      default:
        queries = [...CONSIDERATION_QUERIES];
    }

    plans.push({ connector, queries, cap });
  }

  return plans;
}

function toRawDocument(
  item: FetchedItem,
  sourceId: string,
  collectedAt: string,
): RawDocument {
  const text_raw = prepareRawText(item.text_raw);
  return {
    id: randomUUID(),
    source_id: sourceId,
    external_id: item.external_id,
    url: item.url,
    author_hash: hashAuthor(item.author_id),
    posted_at: item.posted_at,
    text_raw,
    content_hash: hashContent(text_raw),
    collected_at: collectedAt,
  };
}

async function collectFromConnector(
  plan: QueryPlan,
  sourceId: string,
  existingIndex: Map<string, RawDocument>,
  existingHashes: Set<string>,
  perPlatformCount: Record<string, number>,
  options?: {
    queries?: string[];
    shouldStop?: () => boolean;
  },
): Promise<{ newRows: RawDocument[]; skipped: number; skippedQuality: number; stopped: boolean }> {
  const platform = plan.connector.meta.platform;
  const newRows: RawDocument[] = [];
  let skipped = 0;
  let skippedQuality = 0;
  let stopped = false;
  const collectedAt = new Date().toISOString();
  const queryList = options?.queries ?? plan.queries;
  const perQueryBudget = Math.ceil(plan.cap / queryList.length);

  for (const query of queryList) {
    if (stopped || options?.shouldStop?.()) {
      stopped = true;
      break;
    }
    if ((perPlatformCount[platform] ?? 0) >= plan.cap) break;

    const remaining = plan.cap - (perPlatformCount[platform] ?? 0);
    const maxResults = Math.min(perQueryBudget, remaining);
    if (maxResults <= 0) break;

    let items: FetchedItem[];
    try {
      const fetchQuery =
        platform === "reddit" && query.startsWith("subreddit:")
          ? query
          : query;

      items = await plan.connector.fetch(fetchQuery, { maxResults });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[${platform}] query "${query}" failed: ${message}`);
      continue;
    }

    for (const item of items) {
      if (stopped || options?.shouldStop?.()) {
        stopped = true;
        break;
      }
      if ((perPlatformCount[platform] ?? 0) >= plan.cap) break;
      if (!item.url?.startsWith("http") || !item.posted_at || !item.text_raw?.trim()) {
        continue;
      }

      const prepared = prepareRawText(item.text_raw);
      if (!meetsCorpusQualityBar(prepared)) {
        skippedQuality += 1;
        continue;
      }

      const contentHash = hashContent(prepared);
      if (existingHashes.has(contentHash)) {
        skipped += 1;
        continue;
      }

      const row = toRawDocument({ ...item, text_raw: prepared }, sourceId, collectedAt);
      const key = rawKey(sourceId, row.external_id);
      if (existingIndex.has(key)) {
        skipped += 1;
        continue;
      }

      newRows.push(row);
      existingIndex.set(key, row);
      existingHashes.add(contentHash);
      perPlatformCount[platform] = (perPlatformCount[platform] ?? 0) + 1;

      if (options?.shouldStop?.()) {
        stopped = true;
        break;
      }
    }
  }

  return { newRows, skipped, skippedQuality, stopped };
}

function beatsPlatform(
  perPlatform: Record<string, number>,
  baselinePlatform: string,
): boolean {
  const baseline = perPlatform[baselinePlatform] ?? 0;
  return Object.entries(perPlatform).some(
    ([platform, count]) => platform !== baselinePlatform && count > baseline,
  );
}

/** Interleave queries across platforms so growth is balanced (closest to overtaking first). */
function interleaveQueries(
  plans: QueryPlan[],
  perPlatform: Record<string, number>,
  baselinePlatform: string,
): Array<{ plan: QueryPlan; query: string }> {
  const tasks: Array<{ plan: QueryPlan; query: string; deficit: number }> = [];
  const baseline = perPlatform[baselinePlatform] ?? 0;

  for (const plan of plans) {
    for (const query of plan.queries) {
      const deficit = baseline - (perPlatform[plan.connector.meta.platform] ?? 0);
      tasks.push({ plan, query, deficit });
    }
  }

  tasks.sort((a, b) => a.deficit - b.deficit);
  return tasks.map(({ plan, query }) => ({ plan, query }));
}

async function processDocuments(
  rawRows: RawDocument[],
  platform: string,
  skipEmbed: boolean,
  namespace: StoreNamespace,
): Promise<Document[]> {
  if (rawRows.length === 0) return [];

  const batchSize = 50;
  const allDocuments: Document[] = [];

  for (let offset = 0; offset < rawRows.length; offset += batchSize) {
    const chunk = rawRows.slice(offset, offset + batchSize);
    const docs = await processDocumentChunk(
      chunk,
      platform,
      skipEmbed,
      namespace,
      allDocuments,
    );
    allDocuments.push(...docs);
    console.log(
      `  [${platform}] processed ${Math.min(offset + batchSize, rawRows.length)}/${rawRows.length}`,
    );
  }

  return allDocuments;
}

async function processDocumentChunk(
  rawRows: RawDocument[],
  platform: string,
  skipEmbed: boolean,
  namespace: StoreNamespace,
  priorDocuments: Document[],
): Promise<Document[]> {
  if (rawRows.length === 0) return [];

  const existingDocs = [
    ...readAllNormalized(namespace),
    ...priorDocuments,
  ];
  const existingRaw = readAllRaw(namespace);
  const rawById = new Map(existingRaw.map((r) => [r.id, r]));

  const existingForDedupe = existingDocs
    .filter((d) => d.embedding)
    .map((d) => {
      const raw = rawById.get(d.raw_document_id);
      return {
        author_hash: raw?.author_hash ?? null,
        doc: {
          id: d.id,
          dedupe_group: d.dedupe_group,
          embedding: d.embedding as number[],
          created_at: d.created_at,
        },
      };
    });

  const normalized = rawRows
    .map((raw) => {
      const { text_clean, lang } = normalizeText(raw.text_raw);
      return { raw, text_clean, lang };
    })
    .filter(
      (row) =>
        isRetainedLanguage(row.lang) && meetsCorpusQualityBar(row.text_clean),
    );

  const embeddings = skipEmbed
    ? normalized.map(() => new Array(384).fill(0))
    : await embedTexts(normalized.map((n) => n.text_clean));

  const pending = normalized.map((n, i) => ({
    raw: n.raw,
    docId: randomUUID(),
    text_clean: n.text_clean,
    lang: n.lang,
    embedding: embeddings[i],
  }));

  const now = new Date().toISOString();
  const assignments = assignDedupeGroups(
    existingForDedupe,
    pending.map((p) => ({
      id: p.docId,
      author_hash: p.raw.author_hash,
      embedding: p.embedding,
      created_at: now,
    })),
  );

  return pending.map((p) => ({
    id: p.docId,
    raw_document_id: p.raw.id,
    text_clean: p.text_clean,
    lang: p.lang,
    dedupe_group: assignments.get(p.docId)?.dedupe_group ?? p.docId,
    is_relevant: null,
    relevance_score: null,
    embedding: skipEmbed ? null : p.embedding,
    created_at: now,
  }));
}

function pendingRawDocuments(
  platform: string,
  namespace: StoreNamespace,
): RawDocument[] {
  const raw = readRawByPlatform(platform, namespace);
  const docs = readNormalizedByPlatform(platform, namespace);
  const processed = new Set(docs.map((d) => d.raw_document_id));
  return raw.filter((row) => !processed.has(row.id));
}

function groupByPlatform(
  rows: RawDocument[],
  sourceIdToPlatform: Map<string, string>,
): Map<string, RawDocument[]> {
  const grouped = new Map<string, RawDocument[]>();
  for (const row of rows) {
    const platform = sourceIdToPlatform.get(row.source_id) ?? "unknown";
    const bucket = grouped.get(platform) ?? [];
    bucket.push(row);
    grouped.set(platform, bucket);
  }
  return grouped;
}

export async function runCorpusCollection(
  options: CollectOptions = {},
): Promise<CollectResult> {
  const namespace = options.namespace ?? "published";
  ensureCorpusDirs(namespace);
  const sources = ensureSources(namespace);
  const rawDocuments = readAllRaw(namespace);
  const existingIndex = indexRawDocuments(rawDocuments);
  const existingHashes = new Set(rawDocuments.map((r) => r.content_hash));
  const perPlatform: Record<string, number> = {};
  const sourceIdToPlatform = new Map(
    sources.entries().map(([, s]) => [s.id, s.platform]),
  );

  for (const raw of rawDocuments) {
    const platform = sourceIdToPlatform.get(raw.source_id) ?? "unknown";
    perPlatform[platform] = (perPlatform[platform] ?? 0) + 1;
  }

  const exclude = new Set(options.excludePlatforms ?? []);
  const stopBaseline = options.stopWhenBeatsPlatform;
  const plans = buildQueryPlans().filter(
    (p) => !exclude.has(p.connector.meta.platform),
  );
  const allNewRaw: RawDocument[] = [];
  let skippedDuplicate = 0;
  let skippedQuality = 0;
  let collectionStopped = false;

  if (stopBaseline) {
    const baselineCount = perPlatform[stopBaseline] ?? 0;
    console.log(
      `Balance mode: collecting until a non-${stopBaseline} source exceeds ${baselineCount} (${stopBaseline} current max)`,
    );

    const tasks = interleaveQueries(plans, perPlatform, stopBaseline);
    for (const { plan, query } of tasks) {
      if (collectionStopped || beatsPlatform(perPlatform, stopBaseline)) {
        collectionStopped = true;
        break;
      }

      const source = sources.get(plan.connector.meta.platform);
      if (!source) continue;

      const { newRows, skipped, skippedQuality: qualitySkips, stopped } =
        await collectFromConnector(
          plan,
          source.id,
          existingIndex,
          existingHashes,
          perPlatform,
          {
            queries: [query],
            shouldStop: () => beatsPlatform(perPlatform, stopBaseline),
          },
        );

      allNewRaw.push(...newRows);
      skippedDuplicate += skipped;
      skippedQuality += qualitySkips;

      if (newRows.length > 0) {
        console.log(
          `  [${plan.connector.meta.platform}] +${newRows.length} (${perPlatform[plan.connector.meta.platform]} total)`,
        );
      }

      if (stopped || beatsPlatform(perPlatform, stopBaseline)) {
        collectionStopped = true;
        const leader = Object.entries(perPlatform)
          .filter(([p]) => p !== stopBaseline)
          .sort((a, b) => b[1] - a[1])[0];
        console.log(
          `\nStopped: ${leader?.[0]} now at ${leader?.[1]} (>${baselineCount} ${stopBaseline})`,
        );
        break;
      }
    }
  } else {
    for (const plan of plans) {
      const source = sources.get(plan.connector.meta.platform);
      if (!source) continue;

      console.log(
        `Collecting from ${plan.connector.meta.platform} (cap ${plan.cap})...`,
      );

      const { newRows, skipped, skippedQuality: qualitySkips } =
        await collectFromConnector(
          plan,
          source.id,
          existingIndex,
          existingHashes,
          perPlatform,
        );
      allNewRaw.push(...newRows);
      skippedDuplicate += skipped;
      skippedQuality += qualitySkips;
      console.log(
        `  +${newRows.length} new, ${skipped} dupes, ${qualitySkips} quality skips (${perPlatform[plan.connector.meta.platform] ?? 0} total)`,
      );
    }
  }

  let documentsCreated = 0;

  if (!options.dryRun) {
    const byPlatform = groupByPlatform(allNewRaw, sourceIdToPlatform);
    for (const [platform, rows] of byPlatform) {
      appendRawByPlatform(platform, rows, namespace);
    }

    for (const connector of ALL_CONNECTORS) {
      const platform = connector.meta.platform;
      const toProcess = pendingRawDocuments(platform, namespace);
      if (toProcess.length === 0) continue;

      console.log(`Normalizing ${toProcess.length} raw documents for ${platform}...`);
      const documents = await processDocuments(
        toProcess,
        platform,
        options.skipEmbed ?? false,
        namespace,
      );
      documentsCreated += appendNormalizedByPlatform(platform, documents, namespace);
    }
  }

  const runId = randomUUID();
  const lastRun = options.dryRun
    ? null
    : {
        run_id: runId,
        completed_at: new Date().toISOString(),
        ingested: allNewRaw.length,
        skipped_duplicate: skippedDuplicate,
        skipped_quality: skippedQuality,
        ingested_by_platform: Object.fromEntries(
          Object.entries(
            groupByPlatform(allNewRaw, sourceIdToPlatform),
          ).map(([platform, rows]) => [platform, rows.length]),
        ),
      };
  const stats = computeCorpusStats(namespace, lastRun);
  if (!options.dryRun) {
    writeCorpusStatsFile(stats, namespace);
  }

  return {
    runId,
    ingested: allNewRaw.length,
    skippedDuplicate,
    skippedQuality,
    documentsCreated: options.dryRun ? 0 : documentsCreated,
    perPlatform,
    stats,
  };
}
