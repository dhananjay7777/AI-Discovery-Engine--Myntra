/** Visitor-facing labels. Keep jargon on Method; pages import from here. */

export function confidencePhrase(n: number): string {
  if (n >= 0.7) return "Plenty of comments behind this";
  if (n >= 0.45) return "Some comments behind this";
  return "Only a few comments behind this";
}

/** Short card title. Official stored labels stay in the data. */
export function ideaTitle(slug: string, fallback: string): string {
  const map: Record<string, string> = {
    fit_size_confidence: "Will it actually fit?",
    styling_occasion_confidence: "When would I wear this?",
    fabric_quality_proof: "Is the fabric as shown?",
    social_proof_on_shortlist: "Checking other sites first",
    post_save_resolution: "Saved it, then went quiet",
    save_intent_quality: "Saved to remember, not to buy",
    fulfilment_confidence: "Worried about delivery or returns",
    value_uncertainty: "Not sure it is worth the price",
    price_level: "Feels too expensive",
    price_timing: "Waiting for a sale",
  };
  return map[slug] ?? fallback;
}

/** What the app could try — everyday words, no product jargon. */
export function ideaTry(slug: string, fallback: string): string {
  const map: Record<string, string> = {
    fit_size_confidence:
      "Show real measurements and how the size looks on similar bodies — not a coupon.",
    styling_occasion_confidence:
      "Show when you might wear it, and what it goes with, on the saved item.",
    fabric_quality_proof:
      "Show close-up photos of the cloth, and plain notes on feel and thickness, before anyone has to buy.",
    social_proof_on_shortlist:
      "Put reviews, real-people photos, and a simple compare view on the saved list.",
    post_save_resolution:
      "When they come back, help with the leftover doubt — fit, style, or quality — instead of a generic “buy now”.",
    save_intent_quality:
      "Let people mark why they saved it — to buy, to gift, or just to remember.",
    fulfilment_confidence:
      "Show delivery timing and how returns work while they are still looking.",
    value_uncertainty:
      "Show why the price might make sense — materials, how long it lasts — without a discount.",
    price_level: "Nothing the app can try here without a discount. Shown so this is not hidden.",
    price_timing: "Nothing in-scope as a sale. Shown so “waiting for a sale” is not mixed up with “is it worth it”.",
  };
  return map[slug] ?? fallback;
}

/** Why this idea showed up — everyday words. */
export function ideaWhy(slug: string, fallback: string): string {
  const map: Record<string, string> = {
    fit_size_confidence:
      "People say they cannot tell if the saved size will sit well on their body. If that doubt is easier to settle, more people might buy instead of waiting.",
    styling_occasion_confidence:
      "People like the item but cannot picture an occasion or an outfit. That leftover doubt can keep the save sitting there.",
    fabric_quality_proof:
      "Photos do not prove the cloth is as shown. People wait, or they leave to check elsewhere.",
    social_proof_on_shortlist:
      "People leave the app to compare items and read reviews. If that proof sits on the saved list, they may not need to leave.",
    post_save_resolution:
      "After saving, many people never come back to decide. A reminder to buy is not the same as helping with the leftover doubt.",
    save_intent_quality:
      "Some saves are bookmarks or mood boards, not a plan to buy in the next 30 days. Counting those as failed buys can mislead.",
    fulfilment_confidence:
      "Some hesitation is about delivery speed or returns, not the item. That can stop a purchase even after they like it.",
    value_uncertainty:
      "Some people are not asking for a cheaper price. They cannot tell if the quality matches what they would pay.",
    price_level:
      "Some people simply say it costs too much. A discount would be the direct fix, and discounts are out of bounds here.",
    price_timing:
      "Some people wait for a sale. Running more sales is out of bounds here.",
  };
  return map[slug] ?? fallback;
}

export function severityLabel(key: string): string {
  const map: Record<string, string> = {
    none: "No intensity marked",
    mild_annoyance: "Mild annoyance",
    abandoned: "They gave up",
    resolved_by_workaround: "Worked around it",
    still_deferring: "Still putting it off",
  };
  return map[key] ?? key.replace(/_/g, " ");
}

export function firstSentence(text: string): string {
  const trimmed = text.trim();
  const cut = trimmed.search(/[.?!](?:\s|$)/);
  if (cut < 0) return trimmed;
  return trimmed.slice(0, cut + 1);
}

/** One everyday sentence for idea cards. Falls back to the first sentence of the hypothesis. */
export function ideaPlain(slug: string, hypothesis: string): string {
  const map: Record<string, string> = {
    fit_size_confidence: "People pause because they cannot tell if the saved size will actually fit.",
    styling_occasion_confidence:
      "People pause because they cannot picture when or how they would wear it.",
    fabric_quality_proof: "People pause because photos do not prove the fabric is as shown.",
    social_proof_on_shortlist:
      "People leave the app to compare items and read reviews before they buy something they saved.",
    post_save_resolution: "After saving an item, people stay stuck and never come back to decide.",
    save_intent_quality: "Some saves are only bookmarks — not a plan to buy in the next 30 days.",
    fulfilment_confidence: "People worry about delivery or returns even after they like the item.",
    value_uncertainty: "People are not sure the item is worth the price — separate from waiting for a sale.",
    price_level: "The item feels too expensive.",
    price_timing: "People wait for a sale before they buy.",
  };
  return map[slug] ?? firstSentence(hypothesis);
}

/** Shopper-facing names for metric-tree nodes. Official names stay as a subtitle. */
export function metricNodeCopy(id: string): { title: string; shopper: string } | null {
  const map: Record<string, { title: string; shopper: string }> = {
    wishlist_purchase_rate: {
      title: "Buy at least one saved item within 30 days",
      shopper:
        "This is the Growth team’s target. We do not have Myntra’s live rate here — only a map of the steps that have to go right for it to move.",
    },
    save_quality: {
      title: "They saved it to buy, not just to remember",
      shopper:
        "If the wishlist is a bookmark or a mood board, it will not become a purchase in 30 days. That is a different use than a buy list.",
    },
    return_to_wishlist_rate: {
      title: "They come back to the list",
      shopper: "A save that is never opened again cannot become a purchase, no matter how good the product page is.",
    },
    decision_resolution_rate: {
      title: "They settle leftover doubt",
      shopper:
        "They came back, but still are not sure. Fit, fabric, outfit, or other shoppers’ photos — something still blocks the yes.",
    },
    fit_size_confidence: {
      title: "Will it fit?",
      shopper: "They cannot tell whether the saved size will actually sit well on their body.",
    },
    quality_fabric_confidence: {
      title: "Is the fabric as shown?",
      shopper: "Photos and specs do not settle whether the material and make match the listing.",
    },
    styling_occasion_confidence: {
      title: "Can they picture wearing it?",
      shopper: "They like the item but cannot see an occasion, an outfit, or how it sits on them.",
    },
    social_validation: {
      title: "Do other people make it feel safe?",
      shopper: "They want peer photos, reviews, or a comparison before they commit.",
    },
    availability_at_return: {
      title: "Their size is still there",
      shopper: "When they return, the size or the item is gone — so the decision never reaches checkout.",
    },
    checkout_completion: {
      title: "They can finish buying",
      shopper: "The product decision is made, but delivery, returns, or checkout still get in the way.",
    },
  };
  return map[id] ?? null;
}

const SEGMENT_FIELDS: Record<string, string> = {
  first_time_vs_repeat: "First-time or repeat",
  value_vs_premium: "Value or premium",
  occasion_shopper: "Occasion",
  tier_2_3_cues: "Town or city cue",
  gender_cues: "Gender cue",
  age_cues: "Age cue",
};

const SEGMENT_VALUES: Record<string, string> = {
  first_time: "First-time shopper",
  repeat: "Repeat shopper",
  value: "Value / budget",
  premium: "Premium",
  yes: "Yes",
  no: "No",
  gift: "Gift",
  female: "Female",
  male: "Male",
  m: "Male",
  f: "Female",
};

export function parseSegmentSignal(signal: string): { field: string; value: string } {
  const i = signal.indexOf(":");
  if (i < 0) return { field: signal, value: "" };
  return { field: signal.slice(0, i).trim(), value: signal.slice(i + 1).trim() };
}

/** Turn `occasion_shopper: gift` into a line a recruiter can read. */
export function segmentCellPhrase(signal: string): string {
  const { field, value } = parseSegmentSignal(signal);
  const f = SEGMENT_FIELDS[field] ?? field.replace(/_/g, " ");
  if (!value) return f;
  const v = SEGMENT_VALUES[value.toLowerCase()] ?? value;
  return `${f} — ${v}`;
}
