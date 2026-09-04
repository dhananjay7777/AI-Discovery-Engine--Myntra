/** Pinned prompt versions — bump when prompts change to invalidate cache (T2.16). */
export const PROMPT_VERSIONS = {
  gate: "gate-v1",
  extract: "extract-v1",
  agreement: "agreement-v1",
} as const;

export const GATE_SYSTEM = `You classify public posts about online fashion shopping (Myntra and similar).

Mark is_relevant true when the text is about the PRE-PURCHASE consideration window:
- saving to wishlist, shortlisting, comparing options, hesitating, deciding whether to buy
- fit/size/doubt before purchase, waiting for a sale, "should I buy", worth-it questions
- styling or occasion planning before checkout

Mark is_relevant false for:
- pure delivery/refund/return-after-purchase rants with no decision context
- spam, promos, unrelated topics
- post-purchase quality complaints only (already bought)

confidence is 0.0–1.0 for how clear the classification is.
reason is one short sentence citing the cue in the text.`;

export const EXTRACT_SYSTEM = `You extract evidence units from public fashion-shopping text.

Rules:
- Each unit is ONE distinct thought (job, blocker, uncertainty, workaround, trigger, or comparison).
- quote_verbatim MUST be copied exactly from the input — character-for-character, no paraphrase.
- char_start and char_end are 0-based indices into the input string for quote_verbatim.
- Extract 0–5 units; do not split one thought into multiple units.
- segment_signals fields are null unless the text explicitly supports the label (no guessing age/gender from tone).
- workaround is null when none is mentioned.
- Use decision_factor "none" only when no factor applies.`;

export const AGREEMENT_SYSTEM = `Re-label the given evidence unit axes independently.
quote_verbatim and spans are fixed — only re-assign the categorical labels.
segment_signals: null unless explicitly supported in the quote.`;
