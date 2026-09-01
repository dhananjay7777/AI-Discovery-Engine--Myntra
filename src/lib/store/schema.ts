/**
 * Canonical collections for the Discovery Engine.
 * These replace the former Postgres tables (D-020).
 * Counting still happens in TypeScript over these arrays — the LLM never estimates size.
 */
export const COLLECTIONS = [
  "evidence_units",
  "codes",
  "unit_codes",
  "opportunities",
  "outcome_nodes",
  "opportunity_outcomes",
  "gold_labels",
  "runs",
  "embedding_smoke",
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

export interface Source {
  id: string;
  platform: string;
  collection_method: string | null;
  terms_notes: string | null;
  created_at: string;
}

export interface RawDocument {
  id: string;
  source_id: string;
  external_id: string;
  url: string;
  author_hash: string | null;
  posted_at: string | null;
  text_raw: string;
  content_hash: string;
  collected_at: string;
}

export interface Document {
  id: string;
  raw_document_id: string;
  text_clean: string;
  lang: string | null;
  dedupe_group: string | null;
  is_relevant: boolean | null;
  relevance_score: number | null;
  embedding: number[] | null;
  created_at: string;
}

export interface EvidenceUnit {
  id: string;
  document_id: string;
  quote_verbatim: string;
  char_start: number;
  char_end: number;
  unit_type: string | null;
  intent_type: string | null;
  decision_factor: string | null;
  journey_stage: string | null;
  severity_signal: string | null;
  segment_signals: Record<string, unknown> | null;
  workaround: string | null;
  model: string | null;
  prompt_version: string | null;
  verified: boolean;
  created_at: string;
}

export interface Code {
  id: string;
  slug: string;
  label: string;
  definition: string | null;
  origin: "deductive" | "inductive" | null;
  parent_id: string | null;
  version: number;
  status: string;
  created_at: string;
}

export interface UnitCode {
  id: string;
  unit_id: string;
  code_id: string;
  confidence: number | null;
  assigned_by: "model" | "human" | null;
  created_at: string;
}

export interface Opportunity {
  id: string;
  label: string;
  hypothesis: string | null;
  prevalence: number | null;
  severity: number | null;
  segment_concentration: number | null;
  proximity: number | null;
  actionability: number | null;
  source_bias_penalty: number | null;
  score: number | null;
  confidence: number | null;
  is_non_monetary: boolean;
  created_at: string;
}

export interface OutcomeNode {
  id: string;
  parent_id: string | null;
  name: string;
  definition: string | null;
  created_at: string;
}

export interface OpportunityOutcome {
  id: string;
  opportunity_id: string;
  outcome_node_id: string;
  rationale: string | null;
}

export interface GoldLabel {
  id: string;
  unit_id: string | null;
  document_id: string | null;
  labels: Record<string, unknown>;
  coder: string;
  coded_at: string;
}

export interface Run {
  id: string;
  config_hash: string | null;
  gate_model: string | null;
  extraction_model: string | null;
  agreement_model: string | null;
  embedding_model: string | null;
  prompt_versions: Record<string, string> | null;
  document_count: number;
  unit_count: number;
  request_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_usd: number;
  timings: Record<string, number> | null;
  status: string;
  started_at: string;
  completed_at: string | null;
}

export interface EmbeddingSmoke {
  id: string;
  text_sample: string;
  embedding: number[];
  created_at: string;
}

export type CollectionMap = {
  evidence_units: EvidenceUnit[];
  codes: Code[];
  unit_codes: UnitCode[];
  opportunities: Opportunity[];
  outcome_nodes: OutcomeNode[];
  opportunity_outcomes: OpportunityOutcome[];
  gold_labels: GoldLabel[];
  runs: Run[];
  embedding_smoke: EmbeddingSmoke[];
};
