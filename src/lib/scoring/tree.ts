import type { OutcomeNode } from "@/lib/store/schema";

interface NodeSeed {
  slug: string;
  parent: string | null;
  name: string;
  definition: string;
}

const TREE: NodeSeed[] = [
  {
    slug: "wishlist_purchase_rate",
    parent: null,
    name: "30-day wishlist purchase rate",
    definition:
      "Share of users who purchase at least one wishlisted item within 30 days of adding it.",
  },
  {
    slug: "save_quality",
    parent: "wishlist_purchase_rate",
    name: "Save quality",
    definition: "Share of saves that are real purchase intent, not bookmarking or inspiration.",
  },
  {
    slug: "return_to_wishlist_rate",
    parent: "wishlist_purchase_rate",
    name: "Return-to-wishlist rate",
    definition: "Whether users come back to the wishlist after the original save.",
  },
  {
    slug: "decision_resolution_rate",
    parent: "wishlist_purchase_rate",
    name: "Decision resolution rate",
    definition: "Of returners, who resolves remaining doubt and proceeds.",
  },
  {
    slug: "fit_size_confidence",
    parent: "decision_resolution_rate",
    name: "Fit/size confidence",
    definition: "Ability to tell whether the saved item will fit.",
  },
  {
    slug: "quality_fabric_confidence",
    parent: "decision_resolution_rate",
    name: "Quality/fabric confidence",
    definition: "Ability to tell whether material and construction match the listing.",
  },
  {
    slug: "styling_occasion_confidence",
    parent: "decision_resolution_rate",
    name: "Styling/occasion confidence",
    definition: "Ability to picture wearing the item for a real occasion or outfit.",
  },
  {
    slug: "social_validation",
    parent: "decision_resolution_rate",
    name: "Social validation",
    definition: "Peer reviews, photos, and comparison proof that reduce decision risk.",
  },
  {
    slug: "availability_at_return",
    parent: "wishlist_purchase_rate",
    name: "Availability at return",
    definition: "Size and stock still there when the user comes back.",
  },
  {
    slug: "checkout_completion",
    parent: "wishlist_purchase_rate",
    name: "Checkout completion",
    definition: "Ability to finish purchase once the product decision is made.",
  },
];

export function seedOutcomeNodes(now: string): OutcomeNode[] {
  return TREE.map((n) => ({
    id: n.slug,
    parent_id: n.parent,
    name: n.name,
    definition: n.definition,
    created_at: now,
  }));
}

export function outcomeNodeIds(): string[] {
  return TREE.map((n) => n.slug);
}
