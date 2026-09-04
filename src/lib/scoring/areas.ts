export interface OpportunityArea {
  slug: string;
  label: string;
  hypothesis: string;
  intervention: string;
  code_slugs: string[];
  /** Outcome-node slugs from the metric tree. */
  outcome_node_slugs: string[];
  rationale: string;
  is_non_monetary: boolean;
  open_questions: string[];
  /** Quote patterns that challenge this opportunity's claim. */
  counter_patterns: RegExp[];
}

/**
 * One plausible intervention per area. Price level / sale-waiting are scored
 * and displayed but excluded from the recommended set (D-010).
 */
export const OPPORTUNITY_AREAS: OpportunityArea[] = [
  {
    slug: "fit_size_confidence",
    label: "Fit and size confidence before purchase",
    hypothesis:
      "Users stall on saved fashion items because they cannot tell whether a size will fit. Reducing that uncertainty could raise decision-resolution among returners — a hypothesis to validate in interviews, not a declared root cause.",
    intervention:
      "Size/fit tools on PDP and wishlist (measurements, model stats, size-on-you cues). Not discounts.",
    code_slugs: ["fit_size_uncertainty"],
    outcome_node_slugs: ["fit_size_confidence", "decision_resolution_rate"],
    rationale:
      "Assumed mechanism: clearer fit information at save or return-to-wishlist reduces deferral. Evidence is fit/size language in consideration text. We do not estimate a conversion lift.",
    is_non_monetary: true,
    open_questions: [
      "When users say 'size', do they mean chart confusion, brand inconsistency, or body-shape fit?",
      "Would they return to a wishlisted item if a size-on-you cue appeared, or do they already decide elsewhere?",
      "Which garment categories concentrate the hesitation (ethnic wear vs western vs footwear)?",
    ],
    counter_patterns: [
      /\b(true to size|fits well|perfect fit|size (?:is )?fine|no size (?:issue|problem))\b/i,
    ],
  },
  {
    slug: "styling_occasion_confidence",
    label: "Styling and occasion confidence",
    hypothesis:
      "Saved items stall when users cannot picture an occasion or outfit pairing. Occasion context on the save — not a price cut — is the intervention to test. Hypothesis for interviews, not a root cause.",
    intervention:
      "Occasion tags, outfit pairing, and 'wear with' suggestions on saved items.",
    code_slugs: ["styling_occasion_doubt", "gift_occasion_parking"],
    outcome_node_slugs: ["styling_occasion_confidence", "decision_resolution_rate"],
    rationale:
      "Assumed mechanism: occasion/styling doubt is a decision-resolution leak. Gift/occasion parking also lowers save quality. No effect size is claimed.",
    is_non_monetary: true,
    open_questions: [
      "Is the doubt 'will this suit the event' or 'will this suit me'?",
      "Do occasion shoppers return to the wishlist as the date approaches, or start a new search?",
      "Would pairing suggestions change the save, or only the browse?",
    ],
    counter_patterns: [
      /\b(love the (?:style|look)|looks great|outfit (?:sorted|ready)|know (?:what|how) to wear)\b/i,
    ],
  },
  {
    slug: "fabric_quality_proof",
    label: "Fabric and quality proof before buying",
    hypothesis:
      "Users hesitate because product photos do not resolve material, stitching, or durability questions. Quality evidence on the PDP could move fabric-confidence — a hypothesis to validate, not assumed.",
    intervention:
      "Close-up fabric media, material specs, and wash/feel cues before checkout. Not coupons.",
    code_slugs: ["fabric_quality_doubt"],
    outcome_node_slugs: ["quality_fabric_confidence", "decision_resolution_rate"],
    rationale:
      "Assumed mechanism: unresolved quality doubt blocks decision resolution. Evidence is fabric/quality language in units. Magnitude unknown.",
    is_non_monetary: true,
    open_questions: [
      "Which quality cue is missing — fabric feel, transparency, stitching, or color accuracy?",
      "Do users trust brand-owned close-ups, or only peer photos?",
      "Is quality doubt concentrated in a price band or category?",
    ],
    counter_patterns: [
      /\b(good quality|nice fabric|as (?:shown|expected)|quality is (?:good|fine))\b/i,
    ],
  },
  {
    slug: "social_proof_on_shortlist",
    label: "Social proof and comparison on the shortlist",
    hypothesis:
      "Users look off-platform for reviews and comparisons before buying a saved item. In-context social proof on the wishlist could keep decision-making on-site — a hypothesis, not a proven cause.",
    intervention:
      "Review photos, Q&A, and comparison aids on wishlist/shortlist views.",
    code_slugs: ["reviews_social_validation", "comparison_behavior"],
    outcome_node_slugs: ["social_validation", "decision_resolution_rate"],
    rationale:
      "Assumed mechanism: missing social proof and comparison tools send users out, lowering resolution and return-to-save. We do not claim how large that leak is.",
    is_non_monetary: true,
    open_questions: [
      "Do they leave Myntra for reviews, photos, or price comparison?",
      "Whose proof matters — peer reviews, influencer, or a trusted friend?",
      "Is comparison across Myntra SKUs or across Amazon/AJIO/Flipkart?",
    ],
    counter_patterns: [
      /\b(don't (?:need|trust) reviews|bought without (?:reading|reviews)|reviews (?:don't|do not) matter)\b/i,
    ],
  },
  {
    slug: "post_save_resolution",
    label: "Post-save stall and unresolved doubt",
    hypothesis:
      "After saving or shortlisting, users remain stuck without a named factor. A return path that helps resolve doubt (not a reminder-to-buy coupon) is a hypothesis to research, not a root cause.",
    intervention:
      "Post-save surfaces that reopen the specific doubt (fit, style, quality) rather than a generic nudge.",
    code_slugs: [
      "checkout_hesitation",
      "unstated_blocker",
      "general_uncertainty",
      "purchase_trigger",
      "workaround_behavior",
    ],
    outcome_node_slugs: ["return_to_wishlist_rate", "checkout_completion"],
    rationale:
      "Assumed mechanism: post-save hesitation and unnamed blockers sit on return-to-wishlist and checkout nodes. Workaround-off-platform is a severity marker of the same stall. No root cause asserted.",
    is_non_monetary: true,
    open_questions: [
      "When they save and leave, what would make them come back within 30 days?",
      "Is the stall forgetting, unresolved doubt, or waiting for a non-product event?",
      "What do they do instead — another app, a store visit, or nothing?",
    ],
    counter_patterns: [
      /\b(bought (?:it|immediately)|went ahead|easy checkout|no hesitation)\b/i,
    ],
  },
  {
    slug: "save_intent_quality",
    label: "Save quality: bookmark vs purchase intent",
    hypothesis:
      "A share of saves are bookmarks or inspiration, not near-term intent. Treating all saves as buy-intent inflates the conversion denominator. Separating intent at save time is the hypothesis to test.",
    intervention:
      "Intent labeling at save (buy later vs inspire/bookmark) so later surfaces target real intent.",
    code_slugs: ["bookmark_vs_intent", "general_consideration_job"],
    outcome_node_slugs: ["save_quality"],
    rationale:
      "Assumed mechanism: bookmark-like saves cannot convert in 30 days; improving save quality (or segmenting it) changes the metric definition as much as the product. Interviews must confirm the mix.",
    is_non_monetary: true,
    open_questions: [
      "What prompt at save would they actually use — buy, gift, inspire, price-watch?",
      "Do bookmark saves ever convert, just on a longer clock?",
      "Would hiding bookmark saves from 'buy now' reminders feel helpful or punitive?",
    ],
    counter_patterns: [
      /\b(going to buy|will purchase|need this|not (?:just )?saving)\b/i,
    ],
  },
  {
    slug: "fulfilment_confidence",
    label: "Delivery timing and returns risk at decision",
    hypothesis:
      "Some pre-purchase hesitation is about ETA or exchange hassle, not the product. Making those policies visible at decision time is a hypothesis that could help checkout completion — to validate with users, not a root cause.",
    intervention:
      "ETA and return/exchange clarity on PDP and wishlist, before they bounce.",
    code_slugs: ["returns_risk", "delivery_timing"],
    outcome_node_slugs: ["availability_at_return", "checkout_completion"],
    rationale:
      "Assumed mechanism: delivery/return uncertainty blocks checkout even after product doubt is resolved. Cell counts may be thin; treat as a secondary hypothesis.",
    is_non_monetary: true,
    open_questions: [
      "Is the fear late delivery for an occasion, or reverse-pickup hassle after a size miss?",
      "Would a clearer return window change the save-to-buy path?",
      "How often is stock/size gone when they return to the wishlist?",
    ],
    counter_patterns: [
      /\b(fast delivery|easy return|exchange (?:was )?easy|arrived (?:on time|quickly))\b/i,
    ],
  },
  {
    slug: "value_uncertainty",
    label: "Value uncertainty — is it worth it?",
    hypothesis:
      "Hypothesis: some users are not asking for a lower price; they cannot tell whether quality justifies the current price. Worth-it signals (not coupons) are in-scope under D-010.",
    intervention:
      "Quality-for-price evidence (materials, durability, peer value comments) without discounting.",
    code_slugs: ["value_uncertainty_worth_it"],
    outcome_node_slugs: ["decision_resolution_rate", "save_quality"],
    rationale:
      "Assumed mechanism: value uncertainty is distinct from price level and sale-waiting. It stays in the recommended pool because it is solvable without monetary incentives. Evidence volume is small — confidence should reflect that.",
    is_non_monetary: true,
    open_questions: [
      "What would make it 'worth it' — fabric, brand, longevity, or versatility?",
      "Do they compare to a specific alternative or to a mental price anchor?",
      "Would a quality guarantee change the decision more than a sale wait?",
    ],
    counter_patterns: [
      /\b(worth it|good value|reasonable price|value for money)\b/i,
    ],
  },
  {
    slug: "price_level",
    label: "Price level — too expensive",
    hypothesis:
      "Hypothesis: users reject the absolute price. The only direct fix is discounting, which is out of scope. Shown for honesty, excluded from the recommended set (D-010).",
    intervention: "None in-scope — monetary only.",
    code_slugs: ["price_level_concern"],
    outcome_node_slugs: [],
    rationale:
      "Out of scope for recommended interventions. Kept visible so the ranking cannot hide a price-level finding.",
    is_non_monetary: false,
    open_questions: [
      "Is 'expensive' vs a competitor, vs last season, or vs income?",
      "Would non-price value proof change this, or is it a hard budget cap?",
      "Which categories drive the level objection?",
    ],
    counter_patterns: [/\b(affordable|cheap|good price|not expensive)\b/i],
  },
  {
    slug: "price_timing",
    label: "Price timing — waiting for a sale",
    hypothesis:
      "Hypothesis: users defer for a discount event. Sale-waiting is scored and shown, not recommended as a discount program (D-010). Distinct from value uncertainty.",
    intervention: "None in-scope as a discount mechanic; optional non-price 'why buy now' proof only.",
    code_slugs: ["price_timing_wait_for_sale"],
    outcome_node_slugs: ["return_to_wishlist_rate"],
    rationale:
      "Present in scoring so price timing is not swept into price level. Excluded from recommended because the obvious intervention is monetary.",
    is_non_monetary: false,
    open_questions: [
      "Do they have a sale calendar in mind, or an open-ended wait?",
      "If the item sold out, would they buy a substitute at full price?",
      "Is wait-for-sale a cover for unresolved fit/quality doubt?",
    ],
    counter_patterns: [
      /\b(bought at (?:full )?price|didn't wait|did not wait|full price)\b/i,
    ],
  },
];
