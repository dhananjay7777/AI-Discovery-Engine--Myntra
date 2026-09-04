import { join } from "path";
import {
  listCorpusPlatforms,
  readAllNormalized,
  readNormalizedByPlatform,
} from "@/lib/corpus/store";
import type { StoreNamespace } from "@/lib/store/fs";
import { readCollection, writeCollection, writeJsonAtomic } from "@/lib/store/fs";
import type { Opportunity, OpportunityOutcome } from "@/lib/store/schema";
import { OPPORTUNITY_AREAS } from "./areas";
import { pearson } from "./math";
import { rankRecommended, scoreArea, type ScoredArea, type ScoringInput } from "./score";
import { applySourceDependent, runStability, type StabilityReport } from "./stability";
import { seedOutcomeNodes } from "./tree";
import { DEFAULT_WEIGHTS, RECOMMENDED_COUNT, SCORING_VERSION } from "./weights";

export interface ScoringReport {
  version: string;
  generated_at: string;
  weights: typeof DEFAULT_WEIGHTS;
  recommended_slugs: string[];
  component_correlations: Record<string, Record<string, number>>;
  stability: StabilityReport;
  areas: ScoredArea[];
}

function buildSlugIndex(namespace: StoreNamespace): Map<string, string[]> {
  const codes = readCollection("codes", namespace);
  const idToSlug = new Map(codes.map((c) => [c.id, c.slug]));
  const unitCodes = readCollection("unit_codes", namespace);
  const slugsByUnit = new Map<string, string[]>();
  for (const row of unitCodes) {
    const slug = idToSlug.get(row.code_id);
    if (!slug) continue;
    const list = slugsByUnit.get(row.unit_id) ?? [];
    list.push(slug);
    slugsByUnit.set(row.unit_id, list);
  }
  return slugsByUnit;
}

export function buildScoringInput(namespace: StoreNamespace = "published"): ScoringInput {
  const units = readCollection("evidence_units", namespace);
  const docs = readAllNormalized(namespace);
  const docById = new Map(docs.map((d) => [d.id, d]));
  const platformByDoc = new Map<string, string>();
  for (const platform of listCorpusPlatforms("normalized", namespace)) {
    for (const doc of readNormalizedByPlatform(platform, namespace)) {
      platformByDoc.set(doc.id, platform);
    }
  }
  const keyOfDoc = (documentId: string): string => {
    const doc = docById.get(documentId);
    return doc?.dedupe_group ?? documentId;
  };
  const analysisKeys = [...new Set(units.map((u) => keyOfDoc(u.document_id)))];
  return {
    units,
    slugsByUnit: buildSlugIndex(namespace),
    docs,
    platformByDoc,
    weights: DEFAULT_WEIGHTS,
    analysisKeys,
    keyOfDoc,
  };
}

const COMPONENT_KEYS = [
  "prevalence",
  "severity",
  "segment_concentration",
  "proximity",
  "actionability",
  "source_bias_penalty",
] as const;

export function componentCorrelations(
  scored: ScoredArea[],
): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {};
  for (const a of COMPONENT_KEYS) {
    matrix[a] = {};
    const xa = scored.map((s) => s[a]);
    for (const b of COMPONENT_KEYS) {
      matrix[a][b] = Number(pearson(xa, scored.map((s) => s[b])).toFixed(4));
    }
  }
  return matrix;
}

export function runScoring(namespace: StoreNamespace = "published"): ScoringReport {
  const now = new Date().toISOString();
  const input = buildScoringInput(namespace);
  if (input.units.length === 0) {
    throw new Error("No evidence units — run phase2:extract and phase3:codebook first");
  }

  let scored = rankRecommended(
    OPPORTUNITY_AREAS.map((area) => scoreArea(area, input)),
    RECOMMENDED_COUNT,
  );
  const stability = runStability(input, scored);
  scored = applySourceDependent(scored, stability);
  const correlations = componentCorrelations(scored);

  const opportunities: Opportunity[] = scored.map((s) => ({
    id: s.slug,
    label: s.label,
    hypothesis: s.hypothesis,
    prevalence: s.prevalence,
    severity: s.severity,
    segment_concentration: s.segment_concentration,
    proximity: s.proximity,
    actionability: s.actionability,
    source_bias_penalty: s.source_bias_penalty,
    score: s.score,
    confidence: s.confidence,
    is_non_monetary: s.is_non_monetary,
    created_at: now,
  }));

  const nodes = seedOutcomeNodes(now);
  const links: OpportunityOutcome[] = [];
  for (const s of scored) {
    for (const nodeId of s.outcome_node_slugs) {
      links.push({
        id: `${s.slug}__${nodeId}`,
        opportunity_id: s.slug,
        outcome_node_id: nodeId,
        rationale: s.rationale,
      });
    }
  }

  writeCollection("opportunities", opportunities, namespace);
  writeCollection("outcome_nodes", nodes, namespace);
  writeCollection("opportunity_outcomes", links, namespace);

  const report: ScoringReport = {
    version: SCORING_VERSION,
    generated_at: now,
    weights: DEFAULT_WEIGHTS,
    recommended_slugs: scored.filter((s) => s.recommended).map((s) => s.slug),
    component_correlations: correlations,
    stability,
    areas: scored,
  };
  writeJsonAtomic(join(process.cwd(), "data", namespace, "scoring_report.json"), report);
  return report;
}
