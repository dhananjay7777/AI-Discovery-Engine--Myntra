/**
 * Scoring weights — set before seeing ranked results (T4.6).
 * Formula: score = w_prev·prev + w_sev·sev + w_seg·seg + w_prox·prox + w_act·act − w_bias·bias
 */
export const SCORING_VERSION = "scoring-v1";

export interface ScoringWeights {
  prevalence: number;
  severity: number;
  segment_concentration: number;
  proximity: number;
  actionability: number;
  source_bias: number;
}

/** Default weights. Prevalence dominates; bias is subtracted. */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  prevalence: 0.3,
  severity: 0.2,
  segment_concentration: 0.1,
  proximity: 0.2,
  actionability: 0.15,
  source_bias: 0.15,
};

export const RECOMMENDED_COUNT = 5;
export const MIN_COUNTER_QUOTES = 3;
export const MIN_OPEN_QUESTIONS = 3;
export const MIN_SEGMENT_CELL = 8;
export const BOOTSTRAP_DRAWS = 500;
export const BOOTSTRAP_SEED = 20260903;
export const WEIGHT_PERTURB = 0.25;

export const SEVERITY_WEIGHT: Record<string, number> = {
  abandoned: 1,
  bought_elsewhere: 0.9,
  still_deferring: 0.65,
  resolved_by_workaround: 0.45,
  mild_annoyance: 0.25,
  none: 0.12,
};

export const PROXIMITY_WEIGHT: Record<string, number> = {
  post_save_hesitation: 1,
  checkout: 0.85,
  shortlist: 0.7,
  discovery: 0.4,
  post_purchase: 0.12,
  none: 0.28,
};
