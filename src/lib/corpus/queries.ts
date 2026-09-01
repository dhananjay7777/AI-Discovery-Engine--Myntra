/**
 * Seed queries focused on consideration language (pre-purchase window).
 * Used across Reddit, YouTube, and Stack Exchange connectors.
 */

export const CONSIDERATION_QUERIES = [
  "myntra wishlist",
  "myntra should I buy",
  "myntra size fit",
  "myntra worth it",
  "waiting for sale myntra",
  "myntra return experience",
  "myntra styling",
  "size chart confusion",
  "fit doubt online shopping",
  "worth buying fashion",
  "add to cart or wait",
  "myntra coupon wait",
  "myntra delivery before event",
  "myntra exchange size",
  "myntra review before buying",
] as const;

export const REDDIT_SUBREDDITS = [
  "myntra",
  "IndianFashionAddicts",
  "indiafashion",
  "OnlineFashion",
  "FashionReps",
] as const;

/** Regex patterns for T1.14 consideration-language yield counting. */
export const CONSIDERATION_PATTERNS: RegExp[] = [
  /\bshould i buy\b/i,
  /\bworth (it|buying)\b/i,
  /\bwishlist\b/i,
  /\bwait(ing)? for (a )?(sale|discount|offer)\b/i,
  /\bsize (chart|guide|issue|confus)/i,
  /\bfit(s|ting)?\b/i,
  /\btoo (small|big|tight|loose|large)\b/i,
  /\breturn (policy|experience|it)\b/i,
  /\bexchange\b/i,
  /\bstyling\b/i,
  /\badd to (cart|bag|wishlist)\b/i,
  /\bbefore (buying|purchase|ordering)\b/i,
  /\blena chahiye\b/i,
  /\bkharidna\b/i,
  /\bsize ka\b/i,
  /\bmyntra\b/i,
];

export function matchesConsiderationLanguage(text: string): boolean {
  return CONSIDERATION_PATTERNS.some((pattern) => pattern.test(text));
}
