import { z } from "zod";

/**
 * Relevance gate smoke schema — strict-mode compliant (D-017):
 * all properties required, additionalProperties false, optionals as nullable.
 */
export const relevanceGateSchema = z.object({
  is_relevant: z.boolean(),
  reason: z.string(),
});

export type RelevanceGateResult = z.infer<typeof relevanceGateSchema>;

/**
 * Minimal extraction smoke schema for Phase 0.
 */
export const extractionSmokeSchema = z.object({
  unit_type: z.enum(["job", "blocker", "uncertainty", "workaround", "trigger", "comparison"]),
  quote_verbatim: z.string(),
  decision_factor: z.enum([
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
  ]),
  workaround: z.string().nullable(),
});

export type ExtractionSmokeResult = z.infer<typeof extractionSmokeSchema>;

export const SMOKE_SAMPLE_TEXT =
  "I added this kurta to my wishlist but I'm not sure about the size — should I buy M or L?";
