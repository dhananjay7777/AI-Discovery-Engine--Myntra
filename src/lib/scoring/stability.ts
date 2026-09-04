import { OPPORTUNITY_AREAS } from "./areas";
import { mulberry32 } from "./math";
import { rankRecommended, scoreArea, topSlugs, type ScoredArea, type ScoringInput } from "./score";
import {
  BOOTSTRAP_DRAWS,
  BOOTSTRAP_SEED,
  RECOMMENDED_COUNT,
  WEIGHT_PERTURB,
  type ScoringWeights,
} from "./weights";

export interface StabilityReport {
  weight_perturbation: {
    trials: number;
    top3_unchanged_pct: number;
    pass: boolean;
  };
  bootstrap: {
    draws: number;
    top3_stable_pct: number;
    pass: boolean;
  };
  leave_one_platform_out: {
    platform: string;
    entered: string[];
    left: string[];
    source_dependent_slugs: string[];
  }[];
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

function rescore(input: ScoringInput, weights: ScoringWeights): ScoredArea[] {
  const raw = OPPORTUNITY_AREAS.map((area) => scoreArea(area, { ...input, weights }));
  return rankRecommended(raw, RECOMMENDED_COUNT);
}

export function runStability(baseInput: ScoringInput, base: ScoredArea[]): StabilityReport {
  const baselineTop = topSlugs(base, 3);
  const weightKeys = Object.keys(baseInput.weights) as (keyof ScoringWeights)[];

  let unchanged = 0;
  let trials = 0;
  for (const key of weightKeys) {
    for (const factor of [1 + WEIGHT_PERTURB, 1 - WEIGHT_PERTURB]) {
      trials += 1;
      const weights = { ...baseInput.weights, [key]: baseInput.weights[key] * factor };
      const scored = rescore(baseInput, weights);
      if (sameSet(topSlugs(scored, 3), baselineTop)) unchanged += 1;
    }
  }

  const rand = mulberry32(BOOTSTRAP_SEED);
  const keys = baseInput.analysisKeys;
  const n = keys.length;
  let stableDraws = 0;
  for (let d = 0; d < BOOTSTRAP_DRAWS; d++) {
    const sample: string[] = [];
    for (let i = 0; i < n; i++) sample.push(keys[Math.floor(rand() * n)]!);
    const allowed = new Set(sample);
    const sampleUnits = baseInput.units.filter((u) =>
      allowed.has(baseInput.keyOfDoc(u.document_id)),
    );
    const scored = rescore(
      {
        ...baseInput,
        units: sampleUnits,
        analysisKeys: [...allowed],
      },
      baseInput.weights,
    );
    const top = topSlugs(scored, 3);
    const overlap = top.filter((s) => baselineTop.includes(s)).length;
    if (overlap >= 2) stableDraws += 1;
  }

  const platforms = [...new Set(baseInput.platformByDoc.values())].sort();
  const loo: StabilityReport["leave_one_platform_out"] = [];
  const sourceDependent = new Set<string>();
  for (const platform of platforms) {
    const keptUnits = baseInput.units.filter(
      (u) => baseInput.platformByDoc.get(u.document_id) !== platform,
    );
    const keptKeys = [
      ...new Set(keptUnits.map((u) => baseInput.keyOfDoc(u.document_id))),
    ];
    if (keptUnits.length === 0) continue;
    const scored = rescore(
      { ...baseInput, units: keptUnits, analysisKeys: keptKeys },
      baseInput.weights,
    );
    const top = topSlugs(scored, 3);
    const entered = top.filter((s) => !baselineTop.includes(s));
    const left = baselineTop.filter((s) => !top.includes(s));
    for (const s of [...entered, ...left]) sourceDependent.add(s);
    loo.push({ platform, entered, left, source_dependent_slugs: [...entered, ...left] });
  }

  return {
    weight_perturbation: {
      trials,
      top3_unchanged_pct: trials === 0 ? 0 : (unchanged / trials) * 100,
      pass: trials === 0 ? false : unchanged / trials >= 0.8,
    },
    bootstrap: {
      draws: BOOTSTRAP_DRAWS,
      top3_stable_pct: (stableDraws / BOOTSTRAP_DRAWS) * 100,
      pass: stableDraws / BOOTSTRAP_DRAWS >= 0.8,
    },
    leave_one_platform_out: loo,
  };
}

export function applySourceDependent(
  scored: ScoredArea[],
  report: StabilityReport,
): ScoredArea[] {
  const flagged = new Set(
    report.leave_one_platform_out.flatMap((r) => r.source_dependent_slugs),
  );
  return scored.map((s) => ({ ...s, source_dependent: flagged.has(s.slug) }));
}
