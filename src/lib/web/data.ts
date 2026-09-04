/**
 * Read-only queries for the website. Never import `@/lib/store/write`.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  listCorpusPlatforms,
  normalizedDir,
  readAllRaw,
} from "@/lib/corpus/store";
import { readCorpusStatsFile, type CorpusStats } from "@/lib/corpus/stats";
import type { ScoringReport } from "@/lib/scoring/pipeline";
import type { ScoredArea as Area } from "@/lib/scoring/score";
import { readCollection } from "@/lib/store/fs";
import { getLatestRun } from "@/lib/store/read";
import type { EvidenceUnit, OutcomeNode, RawDocument } from "@/lib/store/schema";

export type { Area };

export interface QuoteView {
  unit_id: string;
  document_id: string;
  quote: string;
  platform: string;
  posted_at: string | null;
  url: string;
  verified: boolean;
}

export interface RunMeta {
  run_id: string | null;
  started_at: string | null;
  document_count: number;
  unit_count: number;
  gate_model: string | null;
  extraction_model: string | null;
  agreement_model: string | null;
  embedding_model: string | null;
}

export interface OpportunityDetail {
  area: Area;
  supporting: QuoteView[];
  counter: QuoteView[];
  severity_mix: Record<string, number>;
}

function publishedPath(name: string): string {
  return join(process.cwd(), "data", "published", name);
}

function readJsonFile<T>(name: string): T | null {
  const path = publishedPath(name);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

export function readScoringReport(): ScoringReport | null {
  return readJsonFile<ScoringReport>("scoring_report.json");
}

export function platformLabel(platform: string): string {
  const map: Record<string, string> = {
    play_store: "Play Store",
    app_store: "App Store",
    reddit: "Reddit",
    youtube: "YouTube",
    hacker_news: "Hacker News",
  };
  return map[platform] ?? platform;
}

export function formatPct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "date unknown";
  return iso.slice(0, 10);
}

export function getRunMeta(): RunMeta {
  const run = getLatestRun();
  const units = readCollection("evidence_units");
  const docs = new Set(units.map((u) => u.document_id));
  return {
    run_id: run?.id ?? null,
    started_at: run?.started_at ?? null,
    document_count: run?.document_count || docs.size,
    unit_count: run?.unit_count || units.length,
    gate_model: run?.gate_model ?? null,
    extraction_model: run?.extraction_model ?? null,
    agreement_model: run?.agreement_model ?? null,
    embedding_model: run?.embedding_model ?? null,
  };
}

export function listScoredAreas(): Area[] {
  return readScoringReport()?.areas ?? [];
}

export function getArea(slug: string): Area | null {
  return listScoredAreas().find((a) => a.slug === slug) ?? null;
}

interface Provenance {
  platformByDoc: Map<string, string>;
  rawByDoc: Map<string, RawDocument>;
  textByDoc: Map<string, string>;
}

let provenanceCache: Provenance | null = null;

function jsonStringField(line: string): string | null {
  const colon = line.indexOf(":");
  if (colon < 0) return null;
  let value = line.slice(colon + 1).trim();
  if (value.endsWith(",")) value = value.slice(0, -1);
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "string" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Index id → platform / raw / text without JSON.parse of embedding arrays
 * (those dominate normalized documents.json and would blow T5.14).
 */
function loadProvenance(): Provenance {
  if (provenanceCache) return provenanceCache;

  const neededText = new Set(
    readCollection("evidence_units").map((u) => u.document_id),
  );
  const platformByDoc = new Map<string, string>();
  const rawIdByDoc = new Map<string, string>();
  const textByDoc = new Map<string, string>();

  for (const platform of listCorpusPlatforms("normalized")) {
    const path = join(normalizedDir("published"), platform, "documents.json");
    if (!existsSync(path)) continue;
    const lines = readFileSync(path, "utf-8").split("\n");
    let id: string | null = null;
    let rawId: string | null = null;
    let textClean: string | null = null;

    const flush = () => {
      if (!id || !rawId) {
        id = rawId = textClean = null;
        return;
      }
      platformByDoc.set(id, platform);
      rawIdByDoc.set(id, rawId);
      if (neededText.has(id) && textClean !== null) {
        textByDoc.set(id, textClean);
      }
      id = rawId = textClean = null;
    };

    for (const line of lines) {
      if (line.startsWith('    "id": ')) {
        if (id) flush();
        id = jsonStringField(line);
      } else if (line.startsWith('    "raw_document_id": ')) {
        rawId = jsonStringField(line);
      } else if (line.startsWith('    "text_clean": ')) {
        textClean = jsonStringField(line);
      }
    }
    flush();
  }

  const rawById = new Map(readAllRaw().map((r) => [r.id, r]));
  const rawByDoc = new Map<string, RawDocument>();
  for (const [docId, rawId] of rawIdByDoc) {
    const raw = rawById.get(rawId);
    if (raw) rawByDoc.set(docId, raw);
  }

  provenanceCache = { platformByDoc, rawByDoc, textByDoc };
  return provenanceCache;
}

export function sampleDisplayedQuotes(limit = 20): QuoteView[] {
  const prov = loadProvenance();
  const areas = listScoredAreas().filter((a) => a.recommended);
  const out: QuoteView[] = [];
  for (const area of areas) {
    const detail = getOpportunityDetail(area.slug);
    if (!detail) continue;
    for (const q of [...detail.counter, ...detail.supporting]) {
      out.push(q);
      if (out.length >= limit) return out;
    }
  }
  if (out.length < limit) {
    for (const unit of readCollection("evidence_units")) {
      if (!unit.verified) continue;
      out.push(toQuoteView(unit, prov));
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function quoteFidelityReport(limit = 20): {
  checked: number;
  mismatched: number;
  missingPermalink: number;
} {
  const quotes = sampleDisplayedQuotes(limit);
  const { textByDoc } = loadProvenance();
  let mismatched = 0;
  let missingPermalink = 0;
  for (const q of quotes) {
    if (!q.url || !/^https?:\/\//i.test(q.url)) missingPermalink += 1;
    const text = textByDoc.get(q.document_id) ?? "";
    if (!text.includes(q.quote)) mismatched += 1;
  }
  return { checked: quotes.length, mismatched, missingPermalink };
}

function toQuoteView(unit: EvidenceUnit, prov: Provenance): QuoteView {
  const raw = prov.rawByDoc.get(unit.document_id);
  return {
    unit_id: unit.id,
    document_id: unit.document_id,
    quote: unit.quote_verbatim,
    platform: prov.platformByDoc.get(unit.document_id) ?? "unknown",
    posted_at: raw?.posted_at ?? null,
    url: raw?.url ?? "",
    verified: unit.verified,
  };
}

function slugsByUnit(): Map<string, string[]> {
  const codes = readCollection("codes");
  const idToSlug = new Map(codes.map((c) => [c.id, c.slug]));
  const map = new Map<string, string[]>();
  for (const row of readCollection("unit_codes")) {
    const slug = idToSlug.get(row.code_id);
    if (!slug) continue;
    const list = map.get(row.unit_id) ?? [];
    list.push(slug);
    map.set(row.unit_id, list);
  }
  return map;
}

export function getOpportunityDetail(slug: string): OpportunityDetail | null {
  const area = getArea(slug);
  if (!area) return null;
  const prov = loadProvenance();
  const units = readCollection("evidence_units");
  const byUnit = slugsByUnit();
  const want = new Set(area.code_slugs);
  const supportingUnits = units.filter((u) =>
    (byUnit.get(u.id) ?? []).some((s) => want.has(s)),
  );
  const severity_mix: Record<string, number> = {};
  for (const u of supportingUnits) {
    const key = u.severity_signal ?? "none";
    severity_mix[key] = (severity_mix[key] ?? 0) + 1;
  }
  const supporting = supportingUnits
    .filter((u) => u.verified)
    .slice(0, 15)
    .map((u) => toQuoteView(u, prov));

  const unitById = new Map(units.map((u) => [u.id, u]));
  const counter = area.counter_quotes
    .map((c) => unitById.get(c.unit_id))
    .filter((u): u is EvidenceUnit => !!u)
    .map((u) => toQuoteView(u, prov));

  return { area, supporting, counter, severity_mix };
}

export function getCorpusStats(): CorpusStats | null {
  return readCorpusStatsFile("published");
}

export function getPhase2Metrics(): Record<string, unknown> | null {
  return readJsonFile<Record<string, unknown>>("phase2_metrics.json");
}

export function getCodebookCoverage(): Record<string, unknown> | null {
  return readJsonFile<Record<string, unknown>>("codebook_coverage.json");
}

export function getOutcomeTree(): {
  nodes: OutcomeNode[];
  byParent: Map<string | null, OutcomeNode[]>;
  opportunitiesByNode: Map<string, Area[]>;
} {
  const nodes = readCollection("outcome_nodes");
  const links = readCollection("opportunity_outcomes");
  const areas = listScoredAreas();
  const areaById = new Map(areas.map((a) => [a.slug, a]));
  const byParent = new Map<string | null, OutcomeNode[]>();
  for (const n of nodes) {
    const key = n.parent_id;
    const list = byParent.get(key) ?? [];
    list.push(n);
    byParent.set(key, list);
  }
  const opportunitiesByNode = new Map<string, Area[]>();
  for (const link of links) {
    const area = areaById.get(link.opportunity_id);
    if (!area) continue;
    const list = opportunitiesByNode.get(link.outcome_node_id) ?? [];
    if (!list.some((a) => a.slug === area.slug)) list.push(area);
    opportunitiesByNode.set(link.outcome_node_id, list);
  }
  return { nodes, byParent, opportunitiesByNode };
}

export function outcomeNodeNames(slugs: string[]): string[] {
  const nodes = readCollection("outcome_nodes");
  const names = new Map(nodes.map((n) => [n.id, n.name]));
  return slugs.map((s) => names.get(s) ?? s);
}

export function segmentCrossTab(): {
  area: Area;
  cells: { signal: string; count: number; unclear: boolean }[];
  unclear: boolean;
}[] {
  const areas = listScoredAreas().filter((a) => a.recommended);
  const units = readCollection("evidence_units");
  const byUnit = slugsByUnit();
  return areas.map((area) => {
    const want = new Set(area.code_slugs);
    const counts: Record<string, number> = {};
    let labeled = 0;
    for (const u of units) {
      if (!(byUnit.get(u.id) ?? []).some((s) => want.has(s))) continue;
      const seg = u.segment_signals ?? {};
      let hit = false;
      for (const [k, v] of Object.entries(seg)) {
        if (typeof v === "string" && v.trim()) {
          const key = `${k}: ${v.trim()}`;
          counts[key] = (counts[key] ?? 0) + 1;
          hit = true;
        }
      }
      if (hit) labeled += 1;
    }
    const unclear = labeled < 8;
    const cells = Object.entries(counts)
      .map(([signal, count]) => ({ signal, count, unclear: count < 8 }))
      .sort((a, b) => b.count - a.count);
    return { area, cells, unclear };
  });
}

export function interviewMarkdown(area: Area): string {
  const lines = [
    `# Interview guide — ${area.label}`,
    "",
    `Hypothesis (not a root cause): ${area.hypothesis}`,
    "",
    "## What we would test",
    area.intervention,
    "",
    "## Behavior-first questions",
    ...area.open_questions.map((q, i) => `${i + 1}. ${q}`),
    "",
    "## Screener cues",
    "- Recently saved fashion items without buying within ~30 days",
    "- Can describe a specific item they hesitated on",
    "- India online fashion shopper (English or Hinglish)",
    "",
    "Generated from public-conversation analysis. Interviews decide.",
    "",
  ];
  return lines.join("\n");
}
