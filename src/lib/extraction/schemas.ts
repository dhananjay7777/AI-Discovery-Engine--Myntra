import { z } from "zod";

export const unitTypeEnum = z.enum([
  "job",
  "blocker",
  "uncertainty",
  "workaround",
  "trigger",
  "comparison",
]);

export const intentTypeEnum = z.enum([
  "genuine_intent",
  "bookmark_inspiration",
  "price_watch",
  "gift_occasion",
  "none",
]);

export const decisionFactorEnum = z.enum([
  "fit",
  "size",
  "fabric_quality",
  "styling",
  "price",
  "reviews",
  "occasion",
  "social_validation",
  "returns_risk",
  "delivery_timing",
  "none",
]);

export const journeyStageEnum = z.enum([
  "discovery",
  "shortlist",
  "post_save_hesitation",
  "checkout",
  "post_purchase",
  "none",
]);

export const severitySignalEnum = z.enum([
  "abandoned",
  "still_deferring",
  "bought_elsewhere",
  "resolved_by_workaround",
  "mild_annoyance",
  "none",
]);

/** Strict-mode segment signals — all keys required, values nullable. */
export const segmentSignalsSchema = z.object({
  first_time_vs_repeat: z.string().nullable(),
  value_vs_premium: z.string().nullable(),
  occasion_shopper: z.string().nullable(),
  tier_2_3_cues: z.string().nullable(),
  gender_cues: z.string().nullable(),
  age_cues: z.string().nullable(),
});

export type SegmentSignals = z.infer<typeof segmentSignalsSchema>;

export const relevanceGateSchema = z.object({
  is_relevant: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

export type RelevanceGateResult = z.infer<typeof relevanceGateSchema>;

export const evidenceUnitSchema = z.object({
  quote_verbatim: z.string(),
  char_start: z.number().int().min(0),
  char_end: z.number().int().min(0),
  unit_type: unitTypeEnum,
  intent_type: intentTypeEnum,
  decision_factor: decisionFactorEnum,
  journey_stage: journeyStageEnum,
  severity_signal: severitySignalEnum,
  segment_signals: segmentSignalsSchema,
  workaround: z.string().nullable(),
});

export type ExtractedUnit = z.infer<typeof evidenceUnitSchema>;

export const extractionResponseSchema = z.object({
  units: z.array(evidenceUnitSchema),
});

export type ExtractionResponse = z.infer<typeof extractionResponseSchema>;

/** Agreement re-label — same axes, no quote fields. */
export const agreementLabelSchema = z.object({
  unit_type: unitTypeEnum,
  intent_type: intentTypeEnum,
  decision_factor: decisionFactorEnum,
  journey_stage: journeyStageEnum,
  severity_signal: severitySignalEnum,
  segment_signals: segmentSignalsSchema,
});

export type AgreementLabel = z.infer<typeof agreementLabelSchema>;
