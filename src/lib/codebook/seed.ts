import type { EvidenceUnit } from "@/lib/store/schema";

export const CODEBOOK_VERSION = "codebook-v1";

export interface SeedCodeDef {
  slug: string;
  label: string;
  definition: string;
  inclusion: string;
  exclusion: string;
  outcome_nodes: string[];
  is_non_monetary: boolean;
  match: (unit: EvidenceUnit) => boolean;
}

const SALE_TIMING =
  /\b(sale|discount|offer|wait(?:ing)?|drop|clearance|diwali|festive|end of season|price drop)\b/i;
const VALUE_DOUBT =
  /\b(worth|value|quality for|overpriced|expensive|costly|too much|justify)\b/i;
const PRICE_LEVEL = /\b(expensive|overpriced|costly|price (?:is )?high|can't afford|budget)\b/i;

/** Deductive seed codebook from problem statement §4 and architecture §4 stage 5. */
export const SEED_CODES: SeedCodeDef[] = [
  {
    slug: "fit_size_uncertainty",
    label: "Fit and size uncertainty",
    definition:
      "User doubts whether the garment will fit their body, size chart is unclear, or they hesitate between sizes.",
    inclusion: "Size M vs L, measurements, body-shape fit, brand sizing inconsistency.",
    exclusion: "Pure fabric quality complaints after purchase; delivery issues.",
    outcome_nodes: ["decision_resolution_rate", "fit_size_confidence"],
    is_non_monetary: true,
    match: (u) =>
      u.decision_factor === "fit" ||
      u.decision_factor === "size" ||
      /\b(size|fit|measurement|tight|loose|chart)\b/i.test(u.quote_verbatim),
  },
  {
    slug: "fabric_quality_doubt",
    label: "Fabric and quality doubt",
    definition:
      "User questions material, stitching, durability, or whether quality matches photos before buying.",
    inclusion: "Fabric feel, transparency, stitching, dupatta quality, wash behavior.",
    exclusion: "Post-purchase quality rants only; pure delivery complaints.",
    outcome_nodes: ["decision_resolution_rate", "quality_fabric_confidence"],
    is_non_monetary: true,
    match: (u) =>
      u.decision_factor === "fabric_quality" ||
      /\b(fabric|material|quality|stitch|durab)\b/i.test(u.quote_verbatim),
  },
  {
    slug: "styling_occasion_doubt",
    label: "Styling and occasion doubt",
    definition:
      "User is unsure the item suits an occasion, outfit pairing, or personal style before committing.",
    inclusion: "Occasion wear, pairing, color match, office vs party, trend doubt.",
    exclusion: "Generic 'nice style' praise without hesitation.",
    outcome_nodes: ["decision_resolution_rate", "styling_occasion_confidence"],
    is_non_monetary: true,
    match: (u) =>
      u.decision_factor === "styling" ||
      u.decision_factor === "occasion" ||
      /\b(occasion|pair|outfit|style|wear (?:to|with)|look)\b/i.test(u.quote_verbatim),
  },
  {
    slug: "price_level_concern",
    label: "Price level concern",
    definition:
      "User finds the absolute price too high — a level objection, not timing or value-for-money doubt.",
    inclusion: "Too expensive, over budget, can't afford at current price.",
    exclusion: "Waiting for a sale (price timing); worth-it doubt (value uncertainty).",
    outcome_nodes: [],
    is_non_monetary: false,
    match: (u) =>
      u.decision_factor === "price" &&
      (PRICE_LEVEL.test(u.quote_verbatim) ||
        (u.severity_signal === "abandoned" && !SALE_TIMING.test(u.quote_verbatim))),
  },
  {
    slug: "price_timing_wait_for_sale",
    label: "Price timing — waiting for sale",
    definition:
      "User defers purchase expecting a discount, sale event, or price drop rather than rejecting value outright.",
    inclusion: "Wait for sale, price watch, festive offer, end-of-season.",
    exclusion: "Permanent 'too expensive' with no deferral cue; pure value doubt.",
    outcome_nodes: ["return_to_wishlist_rate"],
    is_non_monetary: false,
    match: (u) =>
      u.intent_type === "price_watch" ||
      (u.decision_factor === "price" && SALE_TIMING.test(u.quote_verbatim)),
  },
  {
    slug: "value_uncertainty_worth_it",
    label: "Value uncertainty — is it worth it?",
    definition:
      "User questions whether quality, brand, or utility justifies the price — distinct from absolute price level or sale timing.",
    inclusion: "Worth it?, value for money, quality vs price, justify spend.",
    exclusion: "Pure sale-waiting; simple 'too expensive' without value framing.",
    outcome_nodes: ["decision_resolution_rate", "save_quality"],
    is_non_monetary: true,
    match: (u) =>
      u.decision_factor === "price" &&
      VALUE_DOUBT.test(u.quote_verbatim) &&
      !SALE_TIMING.test(u.quote_verbatim) &&
      !PRICE_LEVEL.test(u.quote_verbatim),
  },
  {
    slug: "reviews_social_validation",
    label: "Reviews and social validation",
    definition:
      "User seeks ratings, reviews, photos from others, or social proof before buying.",
    inclusion: "Review photos, ratings, influencer, friend opinion, 'has anyone bought'.",
    exclusion: "Generic praise without validation-seeking behavior.",
    outcome_nodes: ["decision_resolution_rate", "social_validation"],
    is_non_monetary: true,
    match: (u) =>
      u.decision_factor === "reviews" ||
      u.decision_factor === "social_validation" ||
      /\b(review|rating|photo|feedback|recommend|trust)\b/i.test(u.quote_verbatim),
  },
  {
    slug: "returns_risk",
    label: "Returns and exchange risk",
    definition:
      "User hesitates because return policy, exchange hassle, or refund experience feels risky.",
    inclusion: "Return policy, exchange size, refund delay, reverse pickup.",
    exclusion: "Post-return rants with no pre-purchase decision context.",
    outcome_nodes: ["checkout_completion"],
    is_non_monetary: true,
    match: (u) =>
      u.decision_factor === "returns_risk" ||
      /\b(return|exchange|refund|reverse pickup)\b/i.test(u.quote_verbatim),
  },
  {
    slug: "delivery_timing",
    label: "Delivery timing before purchase",
    definition:
      "User's pre-purchase hesitation is about when the item will arrive, not post-delivery complaints.",
    inclusion: "Need before date, express delivery, ETA doubt while deciding.",
    exclusion: "Post-delivery delay rants only.",
    outcome_nodes: ["availability_at_return", "checkout_completion"],
    is_non_monetary: true,
    match: (u) =>
      u.decision_factor === "delivery_timing" ||
      (/\b(deliver|arriv|ship|ETA)\b/i.test(u.quote_verbatim) &&
        u.journey_stage !== "post_purchase"),
  },
  {
    slug: "bookmark_vs_intent",
    label: "Bookmark vs genuine intent",
    definition:
      "Wishlist/save behavior driven by inspiration or bookmarking rather than near-term purchase intent.",
    inclusion: "Saving for later inspiration, mood board, 'maybe someday'.",
    exclusion: "Active hesitation on a specific purchase decision.",
    outcome_nodes: ["save_quality"],
    is_non_monetary: true,
    match: (u) =>
      u.intent_type === "bookmark_inspiration" ||
      /\b(bookmark|inspir|save for later|collection|mood board)\b/i.test(u.quote_verbatim),
  },
  {
    slug: "comparison_behavior",
    label: "Comparison and shortlist behavior",
    definition:
      "User actively compares options across products, brands, or platforms before deciding.",
    inclusion: "Compare with AJIO/Amazon, shortlist two items, which one to buy.",
    exclusion: "Single-product doubt without comparison language.",
    outcome_nodes: ["decision_resolution_rate"],
    is_non_monetary: true,
    match: (u) =>
      u.unit_type === "comparison" ||
      /\b(compare|vs\.?|versus|which one|alternative|shortlist)\b/i.test(u.quote_verbatim),
  },
  {
    slug: "checkout_hesitation",
    label: "Post-save checkout hesitation",
    definition:
      "User saved or shortlisted but stalls at checkout or immediately after saving.",
    inclusion: "Added to cart/wishlist but not buying, checkout abandoned.",
    exclusion: "Discovery-stage browsing only.",
    outcome_nodes: ["checkout_completion", "return_to_wishlist_rate"],
    is_non_monetary: true,
    match: (u) =>
      u.journey_stage === "post_save_hesitation" ||
      u.journey_stage === "checkout" ||
      u.journey_stage === "shortlist",
  },
  {
    slug: "workaround_behavior",
    label: "Workaround instead of buying",
    definition:
      "User describes what they do instead of completing the purchase on-platform.",
    inclusion: "Buy elsewhere, visit store, ask friend, screenshot and wait.",
    exclusion: "Generic complaint without an alternative behavior.",
    outcome_nodes: ["decision_resolution_rate"],
    is_non_monetary: true,
    match: (u) =>
      u.unit_type === "workaround" ||
      u.workaround !== null ||
      /\b(instead|offline|store|amazon|flipkart|ajio)\b/i.test(u.quote_verbatim),
  },
  {
    slug: "general_consideration_job",
    label: "General consideration job",
    definition:
      "User describes what they are trying to accomplish while shopping or shortlisting, without naming a specific doubt factor.",
    inclusion: "Browsing goals, outfit planning, finding options, 'looking for'.",
    exclusion: "Clear fit/price/styling doubt already captured elsewhere.",
    outcome_nodes: ["save_quality", "decision_resolution_rate"],
    is_non_monetary: true,
    match: (u) =>
      u.unit_type === "job" &&
      (u.decision_factor === "none" || u.decision_factor === null) &&
      u.intent_type !== "bookmark_inspiration",
  },
  {
    slug: "unstated_blocker",
    label: "Unspecified purchase blocker",
    definition:
      "User signals something is blocking purchase without naming fit, price, or quality explicitly.",
    inclusion: "Can't decide, stuck, not buying yet, something holding me back.",
    exclusion: "Blocker with a clear decision_factor match.",
    outcome_nodes: ["decision_resolution_rate", "return_to_wishlist_rate"],
    is_non_monetary: true,
    match: (u) =>
      u.unit_type === "blocker" &&
      (u.decision_factor === "none" || u.decision_factor === null),
  },
  {
    slug: "general_uncertainty",
    label: "General purchase uncertainty",
    definition:
      "User expresses doubt or hesitation without a specific factor label in the text.",
    inclusion: "Not sure, confused, hesitant, don't know if I should.",
    exclusion: "Uncertainty with explicit fit/price/styling cues.",
    outcome_nodes: ["decision_resolution_rate"],
    is_non_monetary: true,
    match: (u) =>
      u.unit_type === "uncertainty" &&
      (u.decision_factor === "none" || u.decision_factor === null),
  },
  {
    slug: "purchase_trigger",
    label: "Purchase trigger",
    definition:
      "An event, deal signal, or cue that pushes the user toward or away from buying now.",
    inclusion: "Saw an ad, friend bought, festival coming, good deal spotted.",
    exclusion: "Pure price-timing deferral (sale waiting).",
    outcome_nodes: ["return_to_wishlist_rate", "checkout_completion"],
    is_non_monetary: true,
    match: (u) =>
      u.unit_type === "trigger" &&
      u.intent_type !== "price_watch" &&
      !SALE_TIMING.test(u.quote_verbatim),
  },
  {
    slug: "gift_occasion_parking",
    label: "Gift and occasion parking",
    definition:
      "User saves or considers an item for a gift or specific occasion rather than immediate self-purchase.",
    inclusion: "Gift for someone, birthday, wedding shopping, occasion parking.",
    exclusion: "Personal occasion styling doubt (styling_occasion_doubt).",
    outcome_nodes: ["save_quality"],
    is_non_monetary: true,
    match: (u) =>
      u.intent_type === "gift_occasion" ||
      /\b(gift|birthday|wedding|anniversary|for (?:my|her|him))\b/i.test(u.quote_verbatim),
  },
  {
    slug: "other",
    label: "Other / unmatched",
    definition: "Evidence that does not map cleanly to a seed code; candidates for inductive clustering.",
    inclusion: "Borderline or multi-theme quotes after seed rules exhausted.",
    exclusion: "Units that matched any other seed code.",
    outcome_nodes: [],
    is_non_monetary: true,
    match: () => false,
  },
];

export const PRICE_CODE_SLUGS = [
  "price_level_concern",
  "price_timing_wait_for_sale",
  "value_uncertainty_worth_it",
] as const;

export function assignSeedCodes(unit: EvidenceUnit): string[] {
  const matched = SEED_CODES.filter((c) => c.slug !== "other" && c.match(unit)).map(
    (c) => c.slug,
  );
  return matched.length > 0 ? matched : ["other"];
}
