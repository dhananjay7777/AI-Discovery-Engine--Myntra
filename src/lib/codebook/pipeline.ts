import { randomUUID } from "crypto";
import { embedding, models } from "@/config/models";
import { embedTexts } from "@/lib/embeddings/local";
import { structuredCall, createUsageTracker } from "@/lib/groq/client";
import { readCollection, writeCollection, type StoreNamespace } from "@/lib/store/fs";
import type { Code, EvidenceUnit, UnitCode } from "@/lib/store/schema";
import { densityCluster } from "./cluster";
import { CLUSTER_NAME_SYSTEM, clusterNameUser } from "./prompts";
import { clusterNameSchema } from "./schemas";
import {
  assignSeedCodes,
  CODEBOOK_VERSION,
  PRICE_CODE_SLUGS,
  SEED_CODES,
} from "./seed";

export interface CodebookOptions {
  namespace?: StoreNamespace;
  skipInductive?: boolean;
  dryRun?: boolean;
  minClusterSize?: number;
}

export interface CodebookResult {
  version: string;
  seedCodes: number;
  inductiveProposed: number;
  unitCodes: number;
  coverage: ReturnType<typeof computeCoverage>;
}

export interface CodebookLogEntry {
  at: string;
  action: "create" | "merge" | "split" | "accept" | "reject";
  code_slug: string;
  reason: string;
  version: string;
}

function unitEmbedText(unit: EvidenceUnit): string {
  return [
    unit.quote_verbatim,
    unit.unit_type,
    unit.decision_factor,
    unit.intent_type,
    unit.journey_stage,
  ]
    .filter(Boolean)
    .join(" | ");
}

export function computeCoverage(
  units: EvidenceUnit[],
  assignments: Map<string, string[]>,
): {
  total_units: number;
  coded_units: number;
  coverage_pct: number;
  other_units: number;
  other_pct: number;
  per_code: Record<string, number>;
} {
  const perCode: Record<string, number> = {};
  let coded = 0;
  let otherOnly = 0;

  for (const unit of units) {
    const codes = assignments.get(unit.id) ?? ["other"];
    const nonOther = codes.filter((c) => c !== "other");
    if (nonOther.length > 0) coded += 1;
    else otherOnly += 1;
    for (const slug of codes) {
      perCode[slug] = (perCode[slug] ?? 0) + 1;
    }
  }

  const total = units.length || 1;
  return {
    total_units: units.length,
    coded_units: coded,
    coverage_pct: (coded / total) * 100,
    other_units: otherOnly,
    other_pct: (otherOnly / total) * 100,
    per_code: perCode,
  };
}

function seedCodesToRows(version: number): Code[] {
  const now = new Date().toISOString();
  return SEED_CODES.map((s) => ({
    id: randomUUID(),
    slug: s.slug,
    label: s.label,
    definition: `${s.definition}\n\nInclude: ${s.inclusion}\nExclude: ${s.exclusion}`,
    origin: "deductive" as const,
    parent_id: null,
    version,
    status: s.slug === "other" ? "system" : "active",
    created_at: now,
  }));
}

export async function runCodebookPipeline(
  options: CodebookOptions = {},
): Promise<CodebookResult> {
  const namespace = options.namespace ?? "published";
  const dryRun = options.dryRun ?? false;
  const minClusterSize = options.minClusterSize ?? 3;
  const version = 1;
  const now = new Date().toISOString();

  const units = readCollection("evidence_units", namespace);
  if (units.length === 0) {
    throw new Error("No evidence units — run phase2:extract first");
  }

  const seedRows = seedCodesToRows(version);
  const slugToId = new Map(seedRows.map((c) => [c.slug, c.id]));
  const assignments = new Map<string, string[]>();
  const unitCodeRows: UnitCode[] = [];

  for (const unit of units) {
    const slugs = assignSeedCodes(unit);
    assignments.set(unit.id, slugs);
    for (const slug of slugs) {
      const codeId = slugToId.get(slug);
      if (!codeId) continue;
      unitCodeRows.push({
        id: randomUUID(),
        unit_id: unit.id,
        code_id: codeId,
        confidence: 1,
        assigned_by: "model",
        created_at: now,
      });
    }
  }

  const unmatched = units.filter((u) => (assignments.get(u.id) ?? []).includes("other"));
  const inductiveCodes: Code[] = [];
  const log: CodebookLogEntry[] = [
    {
      at: now,
      action: "create",
      code_slug: "*",
      reason: `Seed codebook ${CODEBOOK_VERSION} with ${SEED_CODES.length - 1} deductive codes`,
      version: CODEBOOK_VERSION,
    },
  ];

  if (!options.skipInductive && unmatched.length >= minClusterSize) {
    console.log(`Embedding ${unmatched.length} unmatched units for inductive clustering…`);
    const vectors = dryRun
      ? unmatched.map(() => Array(embedding.dimensions).fill(0))
      : await embedTexts(unmatched.map(unitEmbedText));

    const clustered = densityCluster(
      unmatched.map((u, i) => ({ id: u.id, embedding: vectors[i] })),
      { minClusterSize },
    );

    const realClusters = clustered.filter((c) => !c.isNoise && c.unitIds.length >= minClusterSize);
    console.log(`Found ${realClusters.length} inductive cluster(s) (noise excluded)`);

    const usage = createUsageTracker();
    for (const cluster of realClusters) {
      const clusterUnits = cluster.unitIds
        .map((id) => units.find((u) => u.id === id))
        .filter((u): u is EvidenceUnit => !!u);
      const quotes = clusterUnits.map((u) => u.quote_verbatim);
      const slug = `inductive_cluster_${cluster.clusterId}`;

      let named;
      if (dryRun) {
        named = {
          label: `Cluster ${cluster.clusterId}`,
          definition: "dry-run",
          inclusion_notes: "",
          exclusion_notes: "",
          metric_link: "decision_resolution_rate",
          suggested_intervention: "dry-run",
        };
      } else {
        const { data } = await structuredCall(
          {
            model: models.extraction,
            system: CLUSTER_NAME_SYSTEM,
            user: clusterNameUser(quotes),
            schema: clusterNameSchema,
            schemaName: "cluster_name",
            estimatedTokens: 800,
          },
          usage,
        );
        named = data;
      }

      const codeId = randomUUID();
      inductiveCodes.push({
        id: codeId,
        slug,
        label: named.label,
        definition: `${named.definition} Intervention: ${named.suggested_intervention}`,
        origin: "inductive",
        parent_id: slugToId.get("other") ?? null,
        version,
        status: "proposed",
        created_at: now,
      });

      log.push({
        at: now,
        action: "create",
        code_slug: slug,
        reason: `Inductive cluster ${cluster.clusterId} (${cluster.unitIds.length} units) — pending human accept`,
        version: CODEBOOK_VERSION,
      });

      for (const unitId of cluster.unitIds) {
        const existing = assignments.get(unitId) ?? [];
        const withoutOther = existing.filter((s) => s !== "other");
        assignments.set(unitId, [...withoutOther, slug]);

        unitCodeRows.push({
          id: randomUUID(),
          unit_id: unitId,
          code_id: codeId,
          confidence: 0.85,
          assigned_by: "model",
          created_at: now,
        });
      }
    }
  }

  const coverage = computeCoverage(units, assignments);

  if (!dryRun) {
    writeCollection("codes", [...seedRows, ...inductiveCodes], namespace);
    writeCollection("unit_codes", unitCodeRows, namespace);

    const report = {
      generated_at: now,
      codebook_version: CODEBOOK_VERSION,
      embedding_model: embedding.modelId,
      ...coverage,
      price_codes: PRICE_CODE_SLUGS,
      inductive_proposed: inductiveCodes.length,
      inductive_status: inductiveCodes.map((c) => ({
        slug: c.slug,
        label: c.label,
        status: c.status,
        unit_count: coverage.per_code[c.slug] ?? 0,
      })),
    };

    const { writeJsonAtomic } = await import("@/lib/store/fs");
    const { join } = await import("path");
    writeJsonAtomic(
      join(process.cwd(), "data", namespace, "codebook_coverage.json"),
      report,
    );
    writeJsonAtomic(
      join(process.cwd(), "data", namespace, "codebook_log.json"),
      log,
    );
  }

  return {
    version: CODEBOOK_VERSION,
    seedCodes: SEED_CODES.length - 1,
    inductiveProposed: inductiveCodes.length,
    unitCodes: unitCodeRows.length,
    coverage,
  };
}
