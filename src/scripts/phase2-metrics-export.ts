/**
 * Export Phase 2 accuracy and usage metrics for Method & limits (eval exit criterion 10).
 */
import "./load-env";
import { writeFileSync } from "fs";
import { join } from "path";
import { readAllNormalized } from "@/lib/corpus/store";
import { readCollection } from "@/lib/store/fs";
import { loadCheckpoint } from "@/lib/extraction/checkpoint";
import { countGateTargets } from "@/lib/extraction/pipeline";
import { phase2CallBudget } from "@/config/models";
import { cohensKappa } from "@/lib/extraction/metrics";
import { models } from "@/config/models";

function agreementKappa(): { unit_type: number; decision_factor: number; n: number } {
  const units = readCollection("evidence_units");
  const unitById = new Map(units.map((u) => [u.id, u]));
  const qwenLabels = readCollection("gold_labels").filter(
    (g) => g.coder === models.agreement && g.unit_id,
  );

  const primaryA: string[] = [];
  const primaryB: string[] = [];
  const factorA: string[] = [];
  const factorB: string[] = [];

  for (const row of qwenLabels) {
    const unit = unitById.get(row.unit_id!);
    if (!unit) continue;
    const labels = row.labels as Record<string, string>;
    primaryA.push(unit.unit_type ?? "none");
    primaryB.push(labels.unit_type ?? "none");
    factorA.push(unit.decision_factor ?? "none");
    factorB.push(labels.decision_factor ?? "none");
  }

  return {
    unit_type: cohensKappa(primaryA, primaryB),
    decision_factor: cohensKappa(factorA, factorB),
    n: primaryA.length,
  };
}

function main() {
  const documents = readAllNormalized();
  const units = readCollection("evidence_units");
  const runs = readCollection("runs");
  const latestRun = [...runs].sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
  const cp = loadCheckpoint("published");
  const groups = countGateTargets();
  const relevant = documents.filter((d) => d.is_relevant === true).length;
  const irrelevant = documents.filter((d) => d.is_relevant === false).length;
  const extractAvoided = documents.length - relevant;
  const agreement = agreementKappa();

  const report = {
    generated_at: new Date().toISOString(),
    corpus: {
      normalized_documents: documents.length,
      unique_dedupe_groups: groups,
      relevant_documents: relevant,
      irrelevant_documents: irrelevant,
      gate_pass_rate: relevant / documents.length,
    },
    extraction: {
      published_units: units.length,
      units_dropped_verbatim: cp?.metrics.units_dropped_verbatim ?? null,
      pre_drop_hallucination_rate:
        cp && cp.metrics.units_extracted > 0
          ? cp.metrics.units_dropped_verbatim / cp.metrics.units_extracted
          : null,
    },
    gate_savings: {
      extract_calls_without_gate: documents.length,
      extract_calls_with_gate: relevant,
      extract_request_savings_pct: (extractAvoided / documents.length) * 100,
      extract_token_savings_pct:
        ((documents.length - relevant) * phase2CallBudget.extractEstimatedTokens) /
        (documents.length * phase2CallBudget.extractEstimatedTokens) *
        100,
    },
    usage: latestRun
      ? {
          run_id: latestRun.id,
          request_count: latestRun.request_count,
          requests_per_group: latestRun.request_count / groups,
          prompt_tokens: latestRun.prompt_tokens,
          completion_tokens: latestRun.completion_tokens,
          gate_model: latestRun.gate_model,
          extraction_model: latestRun.extraction_model,
          agreement_model: latestRun.agreement_model,
          prompt_versions: latestRun.prompt_versions,
        }
      : null,
    checkpoint: cp
      ? {
          status: cp.status,
          gate_calls: cp.metrics.gate_calls,
          gate_cache_hits: cp.metrics.gate_cache_hits,
          extract_calls: cp.metrics.extract_calls,
          extract_cache_hits: cp.metrics.extract_cache_hits,
          agreement_calls: cp.metrics.agreement_calls,
        }
      : null,
    agreement_slice: {
      size: agreement.n,
      kappa_unit_type: agreement.unit_type,
      kappa_decision_factor: agreement.decision_factor,
      passes_t2_11: agreement.unit_type >= 0.55 && agreement.decision_factor >= 0.55,
    },
    o05_note:
      "Free tier carried full run over ~2 UTC days with model pooling (D-021). " +
      `Measured ~${latestRun ? (latestRun.request_count / groups).toFixed(2) : "n/a"} requests/group.`,
  };

  const outPath = join(process.cwd(), "data", "published", "phase2_metrics.json");
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${outPath}`);
  console.log(JSON.stringify(report, null, 2));
}

main();
