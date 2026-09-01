# Architecture: AI-Powered Discovery Engine (Myntra)

Companion to [`problemstatement.md`](./problemstatement.md). Decisions referenced as `D-00x` are recorded in [`decision.md`](./decision.md).

---

## 1. What this system is

A deployed website that turns public conversation about online fashion shopping into a **ranked, evidence-backed set of opportunity areas** that could move:

> % of users who purchase at least one wishlisted item within 30 days of adding it.

It is a **research instrument**, not a chatbot and not a sentiment dashboard. Its output must be auditable: every claim traces to a real, quotable, publicly posted sentence.

### Design principles

1. **Counting beats vibes.** The LLM extracts and labels; arithmetic produces the numbers. We never ask a model "how big is this problem?" (`D-007`)
2. **No quote without a source.** A quote that is not a verbatim substring of a stored document is dropped, not shown. (`D-009`)
3. **Precompute, then serve.** Analysis runs as batch jobs; the site reads results. Reviewers get instant pages, plus one small live run to prove it works. (`D-006`)
4. **Bias is a first-class output.** App-store reviews over-represent delivery and refund anger; Reddit over-represents articulate power users. The site states this rather than hiding it.
5. **The engine narrows, interviews decide.** Output is a ranked shortlist plus open questions — not a declared root cause. (`D-014`)

---

## 2. System at a glance

```
                    ┌──────────────────── OFFLINE / BATCH ────────────────────┐
                    │                                                          │
  Public sources    │   1 Collect      2 Normalize     3 Relevance   4 Extract │
  ──────────────    │  ┌─────────┐    ┌──────────┐    ┌──────────┐  ┌────────┐ │
  Play Store   ─────┼─▶│connector│───▶│ clean    │───▶│ gate     │─▶│ LLM    │ │
  App Store    ─────┼─▶│ layer   │    │ dedupe   │    │ (cheap   │  │ struct.│ │
  Reddit       ─────┼─▶│         │    │ lang     │    │  model)  │  │ output │ │
  YouTube      ─────┼─▶│         │    │ provenance│   │          │  │        │ │
  Communities  ─────┼─▶└─────────┘    └──────────┘    └──────────┘  └───┬────┘ │
                    │                                                    │      │
                    │   7 Map to metric   6 Score      5 Codebook        │      │
                    │  ┌────────────┐   ┌─────────┐   ┌──────────────┐   │      │
                    │  │ outcome    │◀──│ opportunity◀─│ deductive seed│◀─┘      │
                    │  │ tree link  │   │ scoring  │   │ + inductive   │         │
                    │  └─────┬──────┘   └─────────┘   │ clusters      │         │
                    │        │                         └──────────────┘         │
                    └────────┼─────────────────────────────────────────────────┘
                             │
                    ┌────────▼──────────── JSON FILE STORE ────────────────────┐
                    │  data/published/corpus/  (raw + normalized per source)   │
                    │  data/published/*.json   (units, codes, scores, runs)    │
                    │  data/sandbox/           (live demo only)                │
                    └────────┬─────────────────────────────────────────────────┘
                             │  read-only
                    ┌────────▼──────────── WEBSITE (Next.js) ──────────────────┐
                    │  Overview · Corpus · Opportunity board · Opportunity     │
                    │  detail · Segments · Metric tree · Method & limits ·     │
                    │  Open questions → interview guide · Live demo run        │
                    └──────────────────────────────────────────────────────────┘
                                        public URL
```

---

## 3. Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Web app | Next.js (App Router) + TypeScript + Tailwind | One codebase for UI and server routes; fast to deploy (`D-003`) |
| Hosting | Vercel | Public URL, zero-config CI from git, server-side secrets |
| Store | JSON files in `data/published/` (git) | Corpus is a few thousand docs; precompute-then-serve; no extra vendor (`D-020`) |
| Inference | **Groq (GroqCloud)**, OpenAI-compatible API | Sole LLM provider: very fast, cheap per token, strict schema decoding on the models we use (`D-017`) |
| Relevance gate model | `openai/gpt-oss-20b`, `strict: true` | Cheapest per token, highest throughput; the gate is a high-volume binary call |
| Extraction model | `openai/gpt-oss-120b`, `strict: true` | Constrained decoding guarantees schema-valid units; 131k context handles long threads |
| Agreement labeler | `qwen/qwen3.8-27b`, `strict: true` | Different model family, so cross-model agreement means something (used only on the eval slice) |
| Embeddings | Local ONNX model (`bge-small-en-v1.5`, 384-dim) in the batch job | Groq serves no embeddings endpoint; local keeps it free, offline, and single-vendor (`D-018`) |
| Batch jobs | TypeScript scripts run via GitHub Actions (cron + manual), checkpointed | Long pipelines must not run inside a web request, and must survive rate limits (`D-006`, `D-019`) |
| Charts | Recharts | Sufficient for share-of-voice and score comparisons |

### Groq constraints the design has to respect

1. **Strict schema is model-specific.** Constrained decoding (`strict: true`) is available on `gpt-oss-20b`, `gpt-oss-120b`, and `qwen3.8-27b`. Every pipeline call uses one of these, so schema-invalid output is a non-event rather than a retry loop.
2. **Strict mode restricts the schema.** All properties must be `required` with `additionalProperties: false`. Optional fields are therefore modelled as nullable unions (`workaround: string | null`), never as absent keys.
3. **No streaming or tool use with structured outputs.** The pipeline never needs both in one call; the live demo streams *stage progress* from the server, not model tokens.
4. **Rate limits, not cost, are the binding constraint.** Free-tier requests-per-day ceilings will stop a full run long before the dollar budget does. Jobs are checkpointed, resumable, and throttled (`D-019`).
5. **No embeddings endpoint.** Clustering embeddings are computed locally (`D-018`).

Collection uses public endpoints and libraries (Play Store scraper, App Store review RSS, Reddit public JSON, YouTube Data API). Nothing behind a login; nothing that violates a platform's terms (`D-011`). API keys: [Groq](./groq-api-setup.md) for Phase 0 smoke and later analysis; [YouTube](./youtube-api-setup.md) for Phase 1 comments.

---

## 4. Pipeline stages

### Stage 1 — Collect
Per-source connectors implementing one interface: `fetch(query, window) → RawDocument[]`. Each raw document stores platform, external id, permalink, posted-at, collected-at, raw text, and a content hash. Author identity is hashed on write and never displayed (`D-011`).

Queries are seeded around consideration language, not brand sentiment: *wishlist, saved for later, should I buy, fit doubt, size confusion, waiting for sale, is it worth it, return experience, styling*.

### Stage 2 — Normalize
Whitespace and emoji removal (emojis carry no analytic meaning), language detection (English and Hinglish retained, `D-015`), boilerplate stripping, minimum **6 words** per document, exact-hash dedupe, then near-duplicate collapse via embedding cosine ≥ 0.95 into a `dedupe_group`. One document per group survives counting.

### Stage 3 — Relevance gate
`gpt-oss-20b` answers, in a strict two-field schema: *is this about the pre-purchase consideration window — shortlisting, saving, hesitating, comparing, deciding?* Post-delivery quality rants and pure delivery complaints are marked irrelevant but retained for the bias report. Gating before extraction is the main lever on both spend and request count.

### Stage 4 — Extract evidence units
`gpt-oss-120b` with `strict: true` returns units against a fixed schema. The unit of analysis is the **evidence unit**: one verbatim span expressing one thing (`D-007`). A single Reddit comment can yield several. Each unit is labeled on independent axes:

| Axis | Values (indicative) |
| --- | --- |
| `unit_type` | job, blocker, uncertainty, workaround, trigger, comparison behavior |
| `intent_type` | genuine purchase intent, bookmark/inspiration, price watch, gift/occasion parking |
| `decision_factor` | fit, size, fabric/quality, styling, price, reviews, occasion, social validation, returns risk, delivery timing |
| `journey_stage` | discovery, shortlist, post-save hesitation, checkout, post-purchase |
| `severity_signal` | abandoned, still deferring, bought elsewhere, resolved by workaround, mild annoyance |
| `segment_signals` | first-time vs repeat, value vs premium, occasion shopper, tier-2/3 cues, gender, age cues |
| `workaround` | free text — what they do instead |

Every unit carries `quote_verbatim` plus `char_start`/`char_end`. A post-extraction verifier re-checks the span against the stored document; failures are dropped and counted as a model-error metric (`D-009`). Constrained decoding guarantees the *shape* of the output, not its truth — the verifier is what guards against invented quotes, and an open-weight model makes it more necessary, not less.

### Stage 5 — Codebook
Hybrid (`D-008`):
- **Deductive seed** — a starting codebook derived from the questions in §4 of the problem statement, so results are comparable to the business metric from day one.
- **Inductive layer** — units that fit no seed code are embedded locally with `bge-small-en-v1.5` (`D-018`), clustered (HDBSCAN over reduced vectors), and each cluster is named and defined by `gpt-oss-120b`, then accepted or rejected by a human. Accepted clusters become codes with written definitions.

Codes are versioned. Merges and splits are recorded so counts remain comparable across runs.

### Stage 6 — Score opportunities
An opportunity area is a cluster of codes that plausibly shares one intervention. Each is scored on normalized 0–1 components:

```
score = w_prev · prevalence
      + w_sev  · severity
      + w_seg  · segment_concentration
      + w_prox · proximity_to_wishlist_decision
      + w_act  · actionability_non_monetary
      − w_bias · source_bias_penalty
```

- **prevalence** — share of *distinct documents* touching the opportunity, never unit count, so one verbose commenter cannot inflate it (`D-007`).
- **severity** — distribution of `severity_signal`, weighted toward abandonment and buying elsewhere.
- **segment_concentration** — Herfindahl-style measure; a problem concentrated in one nameable segment is more actionable than a diffuse one.
- **proximity** — journey-stage weighting; post-save hesitation counts most, post-purchase least.
- **actionability_non_monetary** — hard filter plus a score. Anything solvable only by discounting is flagged and excluded from the recommended set (`D-010`).
- **source_bias_penalty** — reduces score when evidence comes overwhelmingly from one platform.

**confidence** is reported separately from score: a function of evidence volume, platform diversity, gold-set accuracy for the codes involved, and agreement between two models on a sample. Score says "how promising"; confidence says "how much to trust it".

Weights are explicit config, printed in the UI, and stress-tested in the Phase 4 eval.

### Stage 7 — Map to the metric
A stored `outcome_node` tree decomposes wishlist → purchase, roughly:

```
30-day wishlist purchase rate
├── save quality (share of saves that are real intent, not bookmarking)
├── return-to-wishlist rate (do users ever come back to it)
├── decision resolution rate (of returners, who resolves doubt)
│   ├── fit/size confidence
│   ├── quality/fabric confidence
│   ├── styling/occasion confidence
│   └── social validation
├── availability at return (size/stock still there)
└── checkout completion
```

Each opportunity links to one or more nodes with a written rationale, so the site can show *which lever* an opportunity pulls. This is what turns discovery output into a PM argument.

---

## 5. Data model (core collections)

JSON under `data/published/`. Corpus files are split by pipeline stage and source platform; downstream analysis collections stay as flat JSON arrays. Counting is TypeScript over these arrays, never an LLM estimate.

### Corpus layout (`data/published/corpus/`)

| Path | Purpose | Key fields |
| --- | --- | --- |
| `raw/{platform}/documents.json` | Immutable capture per source | source_id, external_id, url, author_hash, posted_at, text_raw, content_hash, collected_at |
| `normalized/{platform}/documents.json` | Cleaned, deduped | raw_document_id, text_clean, lang, dedupe_group, is_relevant, relevance_score, embedding |
| `meta/sources.json` | Platform registry | platform, collection_method, terms_notes |
| `meta/corpus_stats.json` | Explorer aggregates | volume, platform mix, date histogram |

Platforms: `play_store`, `app_store`, `reddit`, `youtube`, `hacker_news`.

**Corpus quality rules:** at least 6 words after cleanup; emojis stripped at ingest.

### Analysis collections (`data/published/*.json`)

| Collection | Purpose | Key fields |
| --- | --- | --- |
| `evidence_units` | Unit of analysis | document_id, quote_verbatim, char_start/end, unit_type, intent_type, decision_factor, journey_stage, severity_signal, segment_signals, workaround, model, prompt_version, verified |
| `codes` | Codebook | slug, label, definition, origin (deductive/inductive), parent_id, version, status |
| `unit_codes` | Labels | unit_id, code_id, confidence, assigned_by (model/human) |
| `opportunities` | Scored areas | label, hypothesis, component scores, score, confidence, is_non_monetary |
| `outcome_nodes` | Metric tree | parent_id, name, definition |
| `opportunity_outcomes` | Link + rationale | opportunity_id, outcome_node_id, rationale |
| `gold_labels` | Human ground truth | unit_id/document_id, labels, coder, coded_at |
| `runs` | Reproducibility | config_hash, model versions, prompt versions, counts, cost, timings |

Every displayed number is derived from a `run`, so the site can show "as of run X, N documents, M units". Embeddings are `number[]` on the document (384-dim); cosine similarity is computed in TypeScript.

---

## 6. Website surfaces

| Surface | Question it answers | Must contain |
| --- | --- | --- |
| Overview | What is this and how does it work? | Pipeline diagram, corpus size, run date, the one-slide story |
| Corpus explorer | What was actually read? | Source mix, volume over time, dedupe stats, relevance pass rate |
| Opportunity board | Where should we look first? | 3–6 ranked opportunities, component score breakdown, confidence, non-monetary flag |
| Opportunity detail | Why should I believe this? | Definition, prevalence, severity mix, segment skew, 8–15 verbatim quotes with permalinks, **counter-evidence**, open questions |
| Segments | Who has this problem? | Cross-tab of opportunity × segment signal |
| Metric tree | Which lever does this pull? | Interactive decomposition, opportunities attached to nodes |
| Method & limits | What is this analysis worth? | Sampling approach, gate accuracy, gold-set scores, known biases, what the engine cannot see |
| Open questions | What do I ask users next? | Auto-drafted interview guide for the selected opportunity, exportable |
| Live demo run | Does it really run? | Paste a public URL or run a capped sample; watch stages execute end-to-end |

The **counter-evidence** and **Method & limits** surfaces are non-negotiable. They are what separate a research instrument from a confirmation machine.

---

## 7. Deployment and runtime

- **Site**: Vercel (Phase 6), public and read-only. No API keys reach the browser. Published JSON is traced into the serverless bundle.
- **Store**: `data/published/corpus/` for corpus (per-source `raw/` and `normalized/` folders); flat `data/published/*.json` for analysis outputs. The website imports the read API only. Batch jobs write files. Live demo writes `data/sandbox/` and never the published corpus (`D-020`).
- **Jobs**: GitHub Actions — manual `workflow_dispatch` for full runs, cron for incremental collection. Secrets live in Actions and Vercel only. Every job is checkpointed per document, so a run halted by a Groq rate limit resumes instead of restarting (`D-019`).
- **Throttling**: a token-bucket limiter sized to the account's requests-per-minute and tokens-per-minute allowance, with exponential backoff and jitter on HTTP 429, and a daily-request budget that stops the job cleanly rather than burning the allowance on retries.
- **Live demo run**: server-side route, hard-capped (documents per run, tokens per run, requests per IP per hour) and short-circuited by cache on repeat inputs. Demo results are written to a sandbox namespace, never into the published corpus. The demo shares the same Groq allowance as the pipeline, so it gets a reserved slice of the daily budget — a curious visitor must not be able to starve a production run.
- **Caching**: gate and extraction results keyed by `content_hash + prompt_version + model_id`. Re-runs after a prompt or model change recompute; re-runs otherwise consume neither tokens nor requests.
- **Cost and quota control**: 20B for the gate, 120B only past it, 27B only on the eval slice; per-run token budget and per-day request budget both enforced in code (`D-013`, `D-019`).

---

## 8. Failure modes this architecture defends against

| Failure mode | Defense |
| --- | --- |
| Fabricated quotes | Verbatim span verification, hard drop (`D-009`) |
| Inflated prevalence from one loud user | Distinct-document counting, dedupe groups (`D-007`) |
| App-store complaint bias swamping consideration insight | Relevance gate, source-bias penalty, published source mix |
| Model drift between runs | Pinned Groq model ids + prompt versions per `run`, config hash |
| Groq deprecates or renames a model mid-project | Model id in config, not in code; a run records the exact id; gate and extraction models chosen from production-tier models |
| Rate limit kills a long run halfway | Per-document checkpointing, resumable jobs, throttling, 429 backoff (`D-019`) |
| Schema-invalid model output | `strict: true` constrained decoding on all pipeline models; schema written to strict-mode rules (`D-017`) |
| Taxonomy sprawl | Versioned codebook, human acceptance of inductive codes, coverage and "other"-bucket thresholds |
| Score that flatters a favorite hypothesis | Published weights, bootstrap and weight-perturbation stability tests |
| Discount-shaped conclusions | Non-monetary hard filter in scoring (`D-010`) |
| Reviewer cannot reproduce anything | Run metadata, permalinks, exportable evidence |
| Cost or quota blowout on a public demo | Caps, caching, per-IP limits, reserved daily quota slice, sandbox namespace |
| Weaker Hinglish handling on an open-weight model | Hinglish measured separately against the gold set; few-shot examples added, or Hinglish routed to the larger model (`D-017`) |

---

## 9. Deliberately out of scope

Real Myntra internal data, private user data, authenticated scraping, the conversion MVP itself, and any monetary-incentive mechanic. The engine reads public conversation and ranks opportunities; nothing more.
