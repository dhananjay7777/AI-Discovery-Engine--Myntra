# Implementation Plan (Phase-Wise)

Build plan for the AI-Powered Discovery Engine. Reads alongside `[problemstatement.md](./problemstatement.md)`, `[architecture.md](./architecture.md)`, and `[decision.md](./decision.md)`.

**Rule of the plan:** a phase is not done when the code runs. It is done when its `eval.md` passes. Each phase links to its own evaluation file with tests and exit criteria.

The **Status** column is generated. Do not edit it by hand. After an eval passes:

```bash
npm run phase:complete -- 0
```

That writes `<!-- phase-status: complete -->` in that phase's `eval.md` and refreshes this table. `npm run phase:start -- 1` marks a phase in progress. CI fails if the table is stale.

---



## Phase map

<!-- phase-map:start -->

| # | Phase            | What it does (plain)                                                                                        | LLM?                       | Produces                                             | Eval                                        | Status      |
| --- | ---------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------- | ------------------------------------------- | ----------- |
| 0 | Foundation       | Get an empty site, JSON store, secrets, and a job runner working before any analysis                        | Smoke test only            | Site + JSON schema, secrets, job runner              | [eval](./phases/phase-0-foundation/eval.md) | Complete    |
| 1 | Corpus           | Collect public comments and reviews from several platforms, then clean and dedupe them                      | No (local embeddings only) | Multi-source public corpus, deduped, with provenance | [eval](./phases/phase-1-corpus/eval.md)     | Complete    |
| 2 | Extraction       | **Analysis pass:** send cleaned documents to Groq — keep relevant ones, pull labeled quotes from the source | Yes — every document       | Relevance gate + verbatim-anchored evidence units    | [eval](./phases/phase-2-extraction/eval.md) | Not started |
| 3 | Codebook         | Name leftover themes, tag every quote, and check how much of the data is covered                            | Yes — cluster names only   | Hybrid taxonomy, units coded, coverage measured      | [eval](./phases/phase-3-codebook/eval.md)   | Not started |
| 4 | Scoring          | Rank the themes as opportunities and show which part of wishlist conversion each would move                 | No (arithmetic)            | Ranked opportunities mapped to the metric tree       | [eval](./phases/phase-4-scoring/eval.md)    | Not started |
| 5 | Web app          | Build the website pages a PM can click through — ranked list, evidence, method                              | No                         | The nine surfaces, drill-down evidence, method page  | [eval](./phases/phase-5-webapp/eval.md)     | Not started |
| 6 | Deploy & harden  | Put it on a public URL, add a small live demo, and lock down cost and secrets                               | Capped demo sample only    | Public URL, live demo run, caps, cost controls       | [eval](./phases/phase-6-deploy/eval.md)     | Not started |
| 7 | Research handoff | Turn the top finding into interview questions, a deck slide, and an evidence export                         | Drafts interview questions | Interview guide, deck slide, export                  | [eval](./phases/phase-7-handoff/eval.md)    | Not started |

<!-- phase-map:end -->


Phases 0–4 are strictly sequential: each consumes the previous phase's output. Phase 5 can start once Phase 3 produces stable coded data, using placeholder scores. Phase 7 depends only on Phase 4.

**Where data meets the LLM.** Phase 1 only collects and cleans. Phase 2 is the analysis pass: every cleaned document goes to `gpt-oss-20b` (relevance gate); documents that pass go to `gpt-oss-120b` (extraction). Phase 3 uses Groq only to name leftover clusters. Phase 4 scores with arithmetic, not another model call.

```
0 ──▶ 1 ──▶ 2 ──▶ 3 ──▶ 4 ──▶ 6 ──▶ 7
                    └──▶ 5 ──┘
```

---



## Phase 0 — Foundation

**Goal.** A working local site, JSON store, Groq client, and smoke path before any analysis exists. Public Vercel URL is Phase 6.

**Build.**

1. Next.js + TypeScript + Tailwind repo, git initialized.
2. Placeholder Overview page (public Vercel URL is Phase 6).
3. JSON store for all core collections in `architecture.md` [§5](./architecture.md#5-data-model-core-collections); empty files committed under `data/published/`.
4. Site reads only; jobs write. App routes must not import the write module (`D-020`).
5. Local secret: `GROQ_API_KEY` in `.env` ([groq-api-setup.md](./groq-api-setup.md)). `.env.example` committed, `.env` ignored. GitHub Actions and Vercel get the same name later — not now.
6. A smoke script that writes a `run` record to JSON and exits — proving the batch path works.
7. Groq client wrapper: model ids from config, `strict: true` structured output, token-bucket throttling, 429 backoff, per-call usage logging (`D-017`, `D-019`).
8. One Groq smoke call per pipeline model (`gpt-oss-20b`, `gpt-oss-120b`) returning schema-valid JSON.
9. Local embedding model produces a 384-dim vector that stores and reads back from JSON (`D-018`).

**Done when** [Phase 0 eval](./phases/phase-0-foundation/eval.md) passes.

---



## Phase 1 — Corpus

**Goal.** A real, multi-source, deduplicated body of public conversation with full provenance. Collection uses public APIs and feeds, not HTML scraping (`D-011`).

**Volume target.** Deferred — collect more over time. One raw document = one review, comment, or post. Initial eval focuses on pipeline correctness, source breadth, and quality rules rather than a fixed 3,000-document floor.

**Quality rules.**

| Rule | Why |
| --- | --- |
| ≥ **6 words** per document (after cleanup) | Drops “good app”, star-only, and emoji-only noise |
| **No emojis** in stored text | Stripped at ingest — no analytic meaning for this engine |
| English + Hinglish retained | `D-015` |

**Build.**

1. Connector interface `fetch(query, window) → RawDocument[]`.
2. Connectors: Play Store reviews, App Store review RSS, Reddit archive API, YouTube comments (Data API), Hacker News Algolia search.
3. Seed query set built around consideration language, not brand sentiment — wishlist, should I buy, fit doubt, size confusion, waiting for sale, worth it, styling, return experience.
4. Normalization: emoji strip, ≥6-word filter, language detection retaining English + Hinglish (`D-015`), boilerplate strip.
5. **Folder layout:** `data/published/corpus/raw/{platform}/`, `corpus/normalized/{platform}/`, `corpus/meta/` — see [`data/README.md`](../data/README.md).
6. Dedupe: exact content hash, then local-embedding cosine ≥ 0.95 collapsed into `dedupe_group` (`D-018`). No Groq calls in this phase.
7. Provenance: permalink, posted-at, collected-at, source, hashed author (`D-011`) on every row.
8. Corpus stats query powering the eventual Corpus explorer.

**Watch for.** App-store sources will dominate on volume and will be mostly delivery and refund complaints. That is expected; Phase 2 gates it and the bias report reports it.

**Done when** [Phase 1 eval](./phases/phase-1-corpus/eval.md) passes.

---



## Phase 2 — Extraction

**Goal.** Turn documents into labeled, verifiable evidence units.

**This is the analysis pass.** Phase 1 does not call Groq. Every cleaned document is sent to `gpt-oss-20b` (relevance gate). Documents that pass are sent to `gpt-oss-120b` (extraction). A 100-unit agreement slice is labeled independently by `qwen/qwen3.8-27b`.

**Build.**

1. Relevance gate on `gpt-oss-20b` with `strict: true`: is this about the pre-purchase consideration window? Store score and decision; keep rejects for the bias report.
2. Extraction on `gpt-oss-120b` with `strict: true` over the axes in `architecture.md` [§4](./architecture.md#stage-4--extract-evidence-units). Schema written to strict-mode rules: every property `required`, `additionalProperties: false`, optionals as nullable unions (`D-017`).
3. Verbatim verifier: re-check `quote_verbatim` against `document.text_clean`; drop on failure; count drops (`D-009`). Constrained decoding guarantees shape, not honesty — this check is what catches invented quotes.
4. Caching by `content_hash + prompt_version + model_id`; model and prompt versions pinned to the `run`.
5. Gold set: hand-label 200 documents for relevance and 200 units for the extraction axes (`D-012`). Build this *before* tuning prompts, or the tuning is just overfitting to a vibe.
6. Agreement slice: 100 units independently labeled by `qwen/qwen3.8-27b` — a different model family, so agreement means something.
7. Checkpointing and throttling: per-document progress, token bucket, 429 backoff, daily request budget, resumable runs (`D-019`).
8. Usage instrumentation: tokens *and* requests per run, plus per-run budget abort (`D-013`).
9. Measure requests-per-document end to end, then close open decision `O-05` — free tier or paid developer tier.

**Done when** [Phase 2 eval](./phases/phase-2-extraction/eval.md) passes.

---



## Phase 3 — Codebook

**Goal.** A taxonomy that ties evidence to the business metric while leaving room for surprises.

Groq is used only to **name and define** inductive clusters. Assignment to the seed codebook is deterministic; clustering embeddings are local (`D-018`).

**Build.**

1. Deductive seed codebook written from the questions in problem statement §4, each code with a real definition and inclusion/exclusion notes.
2. Deterministic assignment of units to seed codes.
3. Inductive layer: embed unmatched units locally (`D-018`), reduce, cluster (HDBSCAN), have `gpt-oss-120b` name and define each cluster, then human-accept or reject (`D-008`).
4. Separate codes for price *level*, price *timing*, and *value* uncertainty — required by `D-010`.
5. Codebook versioning with a merge/split log.
6. Coverage reporting: share of units coded, size of the `other` bucket.

**Done when** [Phase 3 eval](./phases/phase-3-codebook/eval.md) passes.

---



## Phase 4 — Scoring

**Goal.** A defensible ranking, and a link from each opportunity to the metric it would move.

**Build.**

1. Group codes into candidate opportunity areas — one plausible intervention per area.
2. Implement the components in `architecture.md` [§6](./architecture.md#stage-6--score-opportunities): prevalence by distinct document (`D-007`), severity, segment concentration, proximity, non-monetary actionability, source-bias penalty.
3. Confidence computed and stored separately from score (`D-016`).
4. Non-monetary hard filter: flag, exclude from the recommended set, still display (`D-010`).
5. Seed the `outcome_node` tree and write the rationale linking each opportunity to nodes.
6. Stability harness: bootstrap resampling of documents and ±25% weight perturbation.
7. Counter-evidence retrieval per opportunity — quotes that contradict it. Without this the site is a confirmation machine.

**Done when** [Phase 4 eval](./phases/phase-4-scoring/eval.md) passes.

---



## Phase 5 — Web app

**Goal.** A reviewer with only a URL can do everything problem statement §5 demands.

**Build.** The nine surfaces from `architecture.md` [§6](./architecture.md#6-website-surfaces): Overview, Corpus explorer, Opportunity board, Opportunity detail, Segments, Metric tree, Method & limits, Open questions, Live demo run (shell here, wired in Phase 6).

**Priority order.** Opportunity board → Opportunity detail → Method & limits → Metric tree → Overview → Corpus → Segments → Open questions. Board and detail are the product; the rest is support.

**Non-negotiable UI details.**

- Every number is clickable down to the quotes behind it.
- Every quote shows platform, date, and permalink.
- Counter-evidence sits on the same page as the claim, not in an appendix.
- Scoring weights and gold-set accuracy are visible in-product, not just in the deck.

**Done when** [Phase 5 eval](./phases/phase-5-webapp/eval.md) passes.

---



## Phase 6 — Deploy & harden

**Goal.** Safe to leave on the public internet and to hand to a stranger.

**Build.**

1. Full production run; publish run metadata to the UI, including Groq model ids and requests consumed.
2. Live demo route: capped documents and tokens per run, per-IP rate limit, reserved slice of the daily Groq allowance, sandbox namespace, cached repeats (`D-006`, `D-019`).
3. Confirm no secret reaches the browser bundle; published JSON is read-only from the site (`D-020`).
4. Performance: cache aggregates, index hot queries.
5. Cold-open test on a clean device and network.
6. Cost and quota ceilings verified by attempting to breach both.

**Done when** [Phase 6 eval](./phases/phase-6-deploy/eval.md) passes.

---



## Phase 7 — Research handoff

**Goal.** The engine's output becomes the input to primary research, visibly.

**Build.**

1. Select the target opportunity and segment; close open decision `O-01` in `[decision.md](./decision.md#open-decisions)`.
2. Auto-draft an interview guide from the selected opportunity's open questions — non-leading, behavior-first questions.
3. Screener criteria derived from the opportunity's segment signals.
4. Evidence export (quotes + provenance) for the deck.
5. The one-slide "how it works" artifact: sources → processing → opportunity ranking → UI.

**Done when** [Phase 7 eval](./phases/phase-7-handoff/eval.md) passes.

---



## Sequencing guidance

Front-load Phase 0 (including a working Groq key) and the Phase 2 gold set. Ground truth cannot be compressed at the end: building the gold set late means you have already tuned prompts against your own assumptions. The public URL can wait until Phase 6.

Add a third: measure Groq requests-per-document early (Phase 2, step 9). Groq is fast enough that a full run feels cheap, but a daily request ceiling can quietly push a production run across two calendar days. Knowing the real per-document request count before Phase 6 is what keeps that from becoming a deadline problem.

If time runs short, cut corpus breadth (fewer sources, more depth per source) and cut Segments and Corpus explorer polish. Do not cut the verbatim verifier, the gold set, the counter-evidence view, or Method & limits — those four are what make the engine credible rather than decorative.