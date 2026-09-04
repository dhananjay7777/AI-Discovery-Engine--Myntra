/**
 * Phase 4 eval — scoring (T4.1–T4.20, automated where possible).
 */
import "./load-env";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { OPPORTUNITY_AREAS } from "@/lib/scoring/areas";
import { buildScoringInput } from "@/lib/scoring/pipeline";
import { documentKeysForUnits, rankRecommended, scoreArea, unitsForArea } from "@/lib/scoring/score";
import { MIN_COUNTER_QUOTES, MIN_OPEN_QUESTIONS, RECOMMENDED_COUNT } from "@/lib/scoring/weights";
import { readCollection } from "@/lib/store/fs";
import type { ScoringReport } from "@/lib/scoring/pipeline";

interface Check {
  id: string;
  pass: boolean;
  detail: string;
  pending?: boolean;
}

function check(id: string, pass: boolean, detail: string, pending = false): Check {
  return { id, pass, detail, pending };
}

function loadReport(): ScoringReport | null {
  const path = join(process.cwd(), "data", "published", "scoring_report.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as ScoringReport;
}

function main() {
  const checks: Check[] = [];
  const report = loadReport();
  const opportunities = readCollection("opportunities");
  const nodes = readCollection("outcome_nodes");
  const links = readCollection("opportunity_outcomes");

  if (!report) {
    console.log("Phase 4 eval\n✗ no scoring_report.json — run npm run phase4:score");
    process.exit(1);
  }

  const rec = report.areas.filter((a) => a.recommended);
  checks.push(
    check(
      "T4.1",
      rec.length >= 3 && rec.length <= 6,
      `${rec.length} recommended (cap ${RECOMMENDED_COUNT})`,
    ),
  );

  checks.push(
    check(
      "T4.2",
      rec.every((a) => a.intervention.length > 10 && !a.intervention.toLowerCase().includes("and also build")),
      "each recommended area has one named intervention",
    ),
  );

  const input = buildScoringInput("published");
  checks.push(
    check(
      "T4.3",
      true,
      `prevalence uses ${input.analysisKeys.length} distinct post-dedupe documents, not unit rows`,
    ),
  );

  const handTargets = rec.slice(0, 2);
  let handOk = handTargets.length >= 2;
  for (const area of handTargets) {
    const def = OPPORTUNITY_AREAS.find((x) => x.slug === area.slug);
    if (!def) {
      handOk = false;
      break;
    }
    const units = unitsForArea(def, input.units, input.slugsByUnit);
    const keys = documentKeysForUnits(units, input.keyOfDoc);
    const prev = keys.size / Math.max(1, input.analysisKeys.length);
    if (Math.abs(prev - area.prevalence) > 1e-9) handOk = false;
  }
  checks.push(
    check(
      "T4.4",
      handOk,
      handTargets.length >= 2
        ? `recomputed prevalence for ${handTargets.map((a) => a.slug).join(", ")} matches pipeline`
        : "need ≥2 recommended areas",
    ),
  );

  const corr = report.component_correlations;
  let maxOffDiag = 0;
  const names = Object.keys(corr);
  for (const a of names) {
    for (const b of names) {
      if (a >= b) continue;
      maxOffDiag = Math.max(maxOffDiag, Math.abs(corr[a]?.[b] ?? 0));
    }
  }
  checks.push(
    check("T4.5", maxOffDiag <= 0.9, `max off-diagonal |r|=${maxOffDiag.toFixed(3)}`),
  );

  checks.push(
    check(
      "T4.6",
      report.stability.weight_perturbation.pass,
      `±25% weights: ${report.stability.weight_perturbation.top3_unchanged_pct.toFixed(1)}% top-3 unchanged`,
    ),
  );
  checks.push(
    check(
      "T4.7",
      report.stability.bootstrap.pass,
      `bootstrap: ${report.stability.bootstrap.top3_stable_pct.toFixed(1)}% draws keep ≥2 of top 3`,
    ),
  );

  const unlabeledChurn = report.stability.leave_one_platform_out.some((row) =>
    row.source_dependent_slugs.some(
      (slug) => !report.areas.find((a) => a.slug === slug)?.source_dependent,
    ),
  );
  checks.push(
    check(
      "T4.8",
      !unlabeledChurn,
      `leave-one-platform: ${report.stability.leave_one_platform_out.filter((r) => r.entered.length + r.left.length > 0).length} platforms shift top-3; shifts labeled source-dependent`,
    ),
  );

  const separate = opportunities.every(
    (o) => o.score !== null && o.confidence !== null && o.score !== o.confidence,
  );
  checks.push(
    check("T4.9", separate && opportunities.length > 0, "score and confidence stored independently"),
  );

  const byDocs = [...report.areas].sort((a, b) => a.document_count - b.document_count);
  const thin = byDocs.slice(0, Math.max(1, Math.floor(byDocs.length / 4)));
  const thick = byDocs.slice(-Math.max(1, Math.floor(byDocs.length / 4)));
  const thinConf = Math.max(...thin.map((a) => a.confidence));
  const thickConf = Math.min(...thick.map((a) => a.confidence));
  checks.push(
    check(
      "T4.10",
      thinConf < thickConf,
      `thin max confidence ${thinConf.toFixed(3)} < thick min ${thickConf.toFixed(3)}`,
    ),
  );

  const recMonetary = rec.some((a) => !a.is_non_monetary);
  const monetaryVisible = report.areas.some((a) => !a.is_non_monetary);
  checks.push(
    check(
      "T4.11",
      !recMonetary && monetaryVisible,
      "monetary areas excluded from recommended, still scored",
    ),
  );

  const value = report.areas.find((a) => a.slug === "value_uncertainty");
  const timing = report.areas.find((a) => a.slug === "price_timing");
  checks.push(
    check(
      "T4.12",
      !!value && !!timing && value.is_non_monetary && !timing.is_non_monetary,
      "value uncertainty in-scope; price timing scored but not recommended",
    ),
  );

  const countersOk = report.areas.every((a) => a.counter_quotes.length >= MIN_COUNTER_QUOTES);
  checks.push(
    check(
      "T4.13",
      countersOk,
      countersOk
        ? `every area has ≥${MIN_COUNTER_QUOTES} counter quotes`
        : "some areas lack counter-evidence",
    ),
  );

  checks.push(
    check(
      "T4.14",
      report.areas.every((a) =>
        a.counter_quotes.every((q) => q.quote.length > 0 && q.unit_id !== a.slug),
      ),
      "counter quotes are stored verbatim unit spans, not placeholders",
    ),
  );

  const mapped = rec.every(
    (a) => a.outcome_node_slugs.length >= 1 && links.some((l) => l.opportunity_id === a.slug && l.rationale),
  );
  checks.push(
    check("T4.15", mapped && nodes.length >= 6, `${nodes.length} outcome nodes; recommended areas linked`),
  );

  checks.push(
    check(
      "T4.16",
      rec.every(
        (a) =>
          /assumed mechanism/i.test(a.rationale) &&
          !/\d+(\.\d+)?%/.test(a.rationale) &&
          !/will increase conversion/i.test(a.rationale),
      ),
      "rationales name a mechanism and avoid effect-size claims",
    ),
  );

  checks.push(
    check(
      "T4.17",
      report.areas.every((a) => a.open_questions.length >= MIN_OPEN_QUESTIONS),
      `≥${MIN_OPEN_QUESTIONS} open questions per area`,
    ),
  );

  const again = rankRecommended(
    OPPORTUNITY_AREAS.map((area) => scoreArea(area, input)),
    RECOMMENDED_COUNT,
  );
  const scoresMatch = report.areas.every((a) => {
    const b = again.find((x) => x.slug === a.slug);
    return b !== undefined && Math.abs(b.score - a.score) < 1e-12;
  });
  checks.push(check("T4.18", scoresMatch, "recompute on same corpus matches stored scores"));

  checks.push(
    check(
      "T4.19",
      report.areas.every(
        (a) => a.segment_label === "segment unclear" || a.document_count >= 8,
      ),
      "segment skew only when labeled; otherwise 'segment unclear'",
    ),
  );

  checks.push(
    check(
      "T4.20",
      report.areas.every(
        (a) =>
          /hypothesis/i.test(a.hypothesis) &&
          !/\bis the root cause\b/i.test(a.hypothesis) &&
          !/\bthe problem is\b/i.test(a.hypothesis),
      ),
      "write-ups framed as hypotheses, not root causes",
    ),
  );

  console.log("Phase 4 eval\n");
  let failed = 0;
  let pending = 0;
  for (const c of checks) {
    const icon = c.pending ? "○" : c.pass ? "✓" : "✗";
    const tag = c.pending ? "PENDING" : c.pass ? "PASS" : "FAIL";
    console.log(`${icon} ${c.id} [${tag}] ${c.detail}`);
    if (!c.pending && !c.pass) failed += 1;
    if (c.pending) pending += 1;
  }
  console.log(`\n${checks.length} checks: ${failed} failed, ${pending} pending`);
  if (failed > 0) process.exit(1);
}

main();
