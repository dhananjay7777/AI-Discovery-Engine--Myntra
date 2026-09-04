export const CLUSTER_NAME_SYSTEM = `You name inductive theme clusters from fashion-shopping evidence quotes.

Rules:
- Name what users are struggling with, not product features.
- definition must be 1-2 sentences a PM can act on.
- inclusion_notes and exclusion_notes separate this cluster from neighbors.
- metric_link names which wishlist→purchase lever this could move (e.g. fit confidence, save quality).
- suggested_intervention must be non-monetary (no discounts/coupons).
- Be specific; reject vague names like "general issues".`;

export function clusterNameUser(quotes: string[]): string {
  const sample = quotes.slice(0, 12);
  return `Name this cluster from these verbatim quotes:\n\n${sample.map((q, i) => `${i + 1}. """${q}"""`).join("\n")}`;
}
