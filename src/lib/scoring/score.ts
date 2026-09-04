import type { Document, EvidenceUnit } from "@/lib/store/schema";
import type { OpportunityArea } from "./areas";
import {
  MIN_COUNTER_QUOTES,
  MIN_SEGMENT_CELL,
  PROXIMITY_WEIGHT,
  SEVERITY_WEIGHT,
  type ScoringWeights,
} from "./weights";
import { clamp01, herfindahl, mean } from "./math";

export interface ScoredArea {
  slug: string;
  label: string;
  hypothesis: string;
  intervention: string;
  is_non_monetary: boolean;
  prevalence: number;
  severity: number;
  segment_concentration: number;
  proximity: number;
  actionability: number;
  source_bias_penalty: number;
  score: number;
  confidence: number;
  document_count: number;
  unit_count: number;
  platform_mix: Record<string, number>;
  segment_label: string;
  source_dependent: boolean;
  recommended: boolean;
  counter_quotes: { unit_id: string; document_id: string; quote: string }[];
  open_questions: string[];
  outcome_node_slugs: string[];
  rationale: string;
  code_slugs: string[];
}

export interface ScoringInput {
  units: EvidenceUnit[];
  /** unit_id → code slugs */
  slugsByUnit: Map<string, string[]>;
  docs: Document[];
  platformByDoc: Map<string, string>;
  weights: ScoringWeights;
  /** Distinct analysis documents after dedupe (counting keys). */
  analysisKeys: string[];
  keyOfDoc: (documentId: string) => string;
}

export function combineScore(
  components: {
    prevalence: number;
    severity: number;
    segment_concentration: number;
    proximity: number;
    actionability: number;
    source_bias_penalty: number;
  },
  weights: ScoringWeights,
): number {
  return clamp01(
    weights.prevalence * components.prevalence +
      weights.severity * components.severity +
      weights.segment_concentration * components.segment_concentration +
      weights.proximity * components.proximity +
      weights.actionability * components.actionability -
      weights.source_bias * components.source_bias_penalty,
  );
}

export function unitsForArea(
  area: OpportunityArea,
  units: EvidenceUnit[],
  slugsByUnit: Map<string, string[]>,
): EvidenceUnit[] {
  const want = new Set(area.code_slugs);
  return units.filter((u) => (slugsByUnit.get(u.id) ?? []).some((s) => want.has(s)));
}

export function documentKeysForUnits(
  areaUnits: EvidenceUnit[],
  keyOfDoc: (documentId: string) => string,
): Set<string> {
  const keys = new Set<string>();
  for (const u of areaUnits) keys.add(keyOfDoc(u.document_id));
  return keys;
}

function severityOf(unit: EvidenceUnit): number {
  return SEVERITY_WEIGHT[unit.severity_signal ?? "none"] ?? SEVERITY_WEIGHT.none;
}

function proximityOf(unit: EvidenceUnit): number {
  return PROXIMITY_WEIGHT[unit.journey_stage ?? "none"] ?? PROXIMITY_WEIGHT.none;
}

function segmentKey(unit: EvidenceUnit): string | null {
  const seg = unit.segment_signals ?? {};
  for (const [k, v] of Object.entries(seg)) {
    if (typeof v === "string" && v.trim()) return `${k}:${v.trim()}`;
  }
  return null;
}

export function scoreArea(area: OpportunityArea, input: ScoringInput): ScoredArea {
  const areaUnits = unitsForArea(area, input.units, input.slugsByUnit);
  const keys = documentKeysForUnits(areaUnits, input.keyOfDoc);
  const denom = Math.max(1, input.analysisKeys.length);
  const prevalence = keys.size / denom;

  const severity = areaUnits.length === 0 ? 0 : mean(areaUnits.map(severityOf));
  const proximity = areaUnits.length === 0 ? 0 : mean(areaUnits.map(proximityOf));

  const segCounts: Record<string, number> = {};
  let labeled = 0;
  for (const u of areaUnits) {
    const key = segmentKey(u);
    if (!key) continue;
    labeled += 1;
    segCounts[key] = (segCounts[key] ?? 0) + 1;
  }
  const thinSegment = labeled < MIN_SEGMENT_CELL;
  const segment_concentration = thinSegment ? 0 : herfindahl(segCounts);
  const segment_label = thinSegment
    ? "segment unclear"
    : Object.entries(segCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "segment unclear";

  const platform_mix: Record<string, number> = {};
  for (const u of areaUnits) {
    const p = input.platformByDoc.get(u.document_id) ?? "unknown";
    platform_mix[p] = (platform_mix[p] ?? 0) + 1;
  }
  const nPlatforms = Math.max(2, new Set(input.platformByDoc.values()).size);
  const hhi = herfindahl(platform_mix);
  const even = 1 / nPlatforms;
  const source_bias_penalty = clamp01((hhi - even) / (1 - even));

  const actionability = area.is_non_monetary ? 1 : 0;

  const components = {
    prevalence,
    severity,
    segment_concentration,
    proximity,
    actionability,
    source_bias_penalty,
  };
  const score = combineScore(components, input.weights);

  const volume = clamp01(Math.log1p(keys.size) / Math.log1p(40));
  const diversity = 1 - source_bias_penalty;
  const confidence = clamp01(0.55 * volume + 0.35 * diversity + 0.1 * (area.is_non_monetary ? 1 : 0.4));

  return {
    slug: area.slug,
    label: area.label,
    hypothesis: area.hypothesis,
    intervention: area.intervention,
    is_non_monetary: area.is_non_monetary,
    ...components,
    score,
    confidence,
    document_count: keys.size,
    unit_count: areaUnits.length,
    platform_mix,
    segment_label,
    source_dependent: false,
    recommended: false,
    counter_quotes: collectCounterQuotes(area, areaUnits, input.units),
    open_questions: area.open_questions,
    outcome_node_slugs: area.outcome_node_slugs,
    rationale: area.rationale,
    code_slugs: area.code_slugs,
  };
}

function collectCounterQuotes(
  area: OpportunityArea,
  supporting: EvidenceUnit[],
  all: EvidenceUnit[],
): ScoredArea["counter_quotes"] {
  const seen = new Set<string>();
  const out: ScoredArea["counter_quotes"] = [];

  const push = (u: EvidenceUnit) => {
    const q = u.quote_verbatim.trim();
    if (!q || seen.has(q)) return;
    seen.add(q);
    out.push({ unit_id: u.id, document_id: u.document_id, quote: q });
  };

  for (const u of supporting) {
    if (
      u.severity_signal === "mild_annoyance" ||
      u.severity_signal === "resolved_by_workaround"
    ) {
      push(u);
    }
  }

  const supportIds = new Set(supporting.map((u) => u.id));
  for (const u of all) {
    if (supportIds.has(u.id)) continue;
    if (area.counter_patterns.some((re) => re.test(u.quote_verbatim))) push(u);
  }

  for (const u of supporting) {
    if (u.unit_type === "workaround") push(u);
  }

  if (out.length < MIN_COUNTER_QUOTES) {
    for (const u of all) {
      if (out.length >= MIN_COUNTER_QUOTES) break;
      if (supportIds.has(u.id)) continue;
      if (u.intent_type === "genuine_intent" && u.severity_signal === "none") push(u);
    }
  }

  return out.slice(0, 8);
}

export function rankRecommended(scored: ScoredArea[], count: number): ScoredArea[] {
  const eligible = [...scored]
    .filter((s) => s.is_non_monetary)
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence || a.slug.localeCompare(b.slug));
  const top = new Set(eligible.slice(0, count).map((s) => s.slug));
  return scored.map((s) => ({ ...s, recommended: top.has(s.slug) }));
}

export function topSlugs(scored: ScoredArea[], n = 3): string[] {
  return [...scored]
    .filter((s) => s.recommended)
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
    .slice(0, n)
    .map((s) => s.slug);
}
