# Decision Log

Every material technical or business decision for the AI-Powered Discovery Engine. Append-only: to change a decision, add a new entry that supersedes the old one and mark the old one `Superseded`.

**Statuses:** `Accepted` · `Proposed` · `Superseded` · `Rejected`

| ID | Decision | Type | Status |
| --- | --- | --- | --- |
| [D-001](#d-001) | Product is Myntra | Business | Accepted |
| [D-002](#d-002) | Engine ships as a deployed website, not a no-code workflow | Business | Accepted |
| [D-003](#d-003) | Next.js + TypeScript + Tailwind on Vercel | Tech | Accepted |
| [D-004](#d-004) | ~~Postgres (Supabase) with pgvector as the single store~~ | Tech | Superseded by D-020 |
| [D-005](#d-005) | ~~Claude for extraction, OpenAI embeddings for clustering~~ | Tech | Superseded by D-017, D-018 |
| [D-006](#d-006) | Precomputed corpus + capped live demo run | Tech | Accepted |
| [D-007](#d-007) | Evidence unit is the unit of analysis; prevalence counted by distinct document | Tech | Accepted |
| [D-008](#d-008) | Hybrid codebook: deductive seed + inductive clusters | Tech | Accepted |
| [D-009](#d-009) | Verbatim anchoring is a hard gate | Tech | Accepted |
| [D-010](#d-010) | Non-monetary actionability is enforced in scoring, not just in prose | Business | Accepted |
| [D-011](#d-011) | Public data only, hashed authors, terms-respecting collection | Business | Accepted |
| [D-012](#d-012) | A human-coded gold set is the eval backbone | Tech | Accepted |
| [D-013](#d-013) | Hard cost ceiling per run | Tech | Accepted |
| [D-014](#d-014) | The engine narrows; interviews decide | Business | Accepted |
| [D-015](#d-015) | English and Hinglish only, India-focused | Business | Accepted |
| [D-016](#d-016) | Score and confidence are reported separately | Tech | Accepted |
| [D-017](#d-017) | Groq is the sole LLM provider; strict-schema models only | Tech | Accepted |
| [D-018](#d-018) | Embeddings computed locally, not via an API | Tech | Accepted |
| [D-019](#d-019) | Jobs are rate-limit aware, checkpointed, and resumable | Tech | Accepted |
| [D-020](#d-020) | JSON file store; no hosted database | Tech | Accepted |

---

## D-001
**Product is Myntra.**

*Type:* Business · *Status:* Accepted · *Date:* 2026-09-01

**Context.** The brief allows Myntra, AJIO, or Nykaa Fashion.

**Decision.** Myntra.

**Rationale.** Largest volume of public conversation in India across Play Store, App Store, Reddit, and YouTube, which matters because the engine's only fuel is public text. Its wishlist feature is well known to users, so people discuss saving and deferring explicitly. Broadest category mix, so fit, styling, and occasion themes all appear.

**Consequences.** Findings will skew to Myntra's demographic. AJIO/Nykaa mentions are kept as comparison evidence only, never counted in Myntra prevalence.

---

## D-002
**The Discovery Engine is a deployed website, not an n8n/Zapier workflow.**

*Type:* Business · *Status:* Accepted · *Date:* 2026-09-01

**Context.** The brief permits no-code workflow tools. A reviewer needs to test the engine from a link.

**Decision.** Build a custom website with its own UI and deploy it publicly. No n8n, Zapier, or Make as the delivery vehicle.

**Rationale.** Ranked opportunities with drill-down evidence, counter-evidence, and a metric tree are a product surface, not a linear automation. A workflow canvas cannot show them, and screenshots of a canvas are not a testable artifact. A URL is.

**Consequences.** More build work: schema, jobs, UI, deployment, cost controls. Accepted because the deliverable is explicitly a link that can be tested.

---

## D-003
**Next.js (App Router) + TypeScript + Tailwind, hosted on Vercel.**

*Type:* Tech · *Status:* Accepted · *Date:* 2026-09-01

**Rationale.** One codebase for UI and server routes; secrets stay server-side; git push deploys; generous free tier. Data-heavy read-only pages are exactly what server components are good at.

**Alternatives.** Streamlit — faster to write, but looks like an internal script and is awkward for drill-down navigation. Separate React SPA + Python API — better ML ergonomics, two deployments and more failure surface for a solo build.

**Consequences.** Pipeline work happens in TypeScript, giving up some Python data-tooling comfort. Clustering therefore runs as a small dedicated job (see `D-005`).

---

## D-004
**~~Postgres via Supabase, with pgvector, as the single store.~~**

*Type:* Tech · *Status:* **Superseded by [D-020](#d-020)** on 2026-09-02

**Original rationale.** Counting distinct documents, joining units to codes, and storing embeddings looked like relational work, so hosted Postgres with pgvector was the default.

**Why superseded.** The engine precomputes a few thousand documents and serves them read-only. That is a file, not a database. Supabase added a second vendor, connection pooling, roles, and a deploy blocker before any analysis existed. Counting still happens in TypeScript; embeddings still live next to the documents as `number[]`.

---

## D-005
**~~Claude with JSON-schema structured output for extraction and labeling; OpenAI `text-embedding-3-small` for clustering.~~**

*Type:* Tech · *Status:* **Superseded by [D-017](#d-017) and [D-018](#d-018)** on 2026-09-01

**Original rationale.** Extraction quality on messy, code-mixed user text is the biggest quality driver, so it would get the stronger model with an enforced schema; embeddings are a commodity, so the cheap model wins.

**Why superseded.** Groq was chosen as the inference provider. The reasoning about *which stage deserves the stronger model* survives and carries over to `D-017`; the vendors do not.

---

## D-006
**Analysis is precomputed in batch jobs; the site serves stored results. A separate, capped live run exists for demonstration.**

*Type:* Tech · *Status:* Accepted · *Date:* 2026-09-01

**Context.** A full run reads thousands of documents and takes minutes to hours. Reviewers open a link and expect a page.

**Decision.** GitHub Actions jobs write results to `data/published/*.json`. The site reads them. A "run it live" route processes a hard-capped sample into `data/sandbox/`.

**Rationale.** Instant pages, no timeouts, no cost exposure, while still proving the pipeline is real rather than a hand-curated deck.

**Consequences.** Demo results never enter the published corpus. Reviewers see both "the analysis" and "the machine".

---

## D-007
**The evidence unit is the unit of analysis. Prevalence is counted as distinct documents, never unit count.**

*Type:* Tech · *Status:* Accepted · *Date:* 2026-09-01

**Context.** One long Reddit comment can express six blockers. Counting units would let a handful of verbose users manufacture a top opportunity.

**Decision.** Extract multiple units per document, but report prevalence as the share of distinct documents (post-dedupe) containing at least one unit for that code. Unit counts are shown only as texture.

**Rationale.** Protects the one number a PM will act on. Also blocks the failure where a model's verbosity, not user reality, sets the ranking.

**Consequences.** Every aggregate query must be written against distinct documents. Enforced in the Phase 4 eval.

---

## D-008
**Hybrid codebook: a deductive seed derived from the brief, plus inductive codes from clustering unmatched units, accepted by a human.**

*Type:* Tech · *Status:* Accepted · *Date:* 2026-09-01

**Rationale.** Pure deductive coding only confirms what the brief already suspects. Pure inductive coding produces clusters that cannot be tied back to the business metric. The hybrid keeps comparability while leaving room for a genuine surprise, which is the whole point of discovery.

**Consequences.** Codebook is versioned, and merges/splits are logged so counts stay comparable between runs. Human acceptance is a real step, not a rubber stamp.

---

## D-009
**Verbatim anchoring is a hard gate: a quote must be an exact substring of a stored document, or it is dropped.**

*Type:* Tech · *Status:* Accepted · *Date:* 2026-09-01

**Rationale.** The engine's entire value is that a PM can click a claim and read the actual sentence a real person wrote. One fabricated quote destroys that. Programmatic verification is cheap; trust is not.

**Consequences.** Some genuine insight is lost when the model paraphrases. The drop rate is tracked as a model-quality metric, and the target for surviving units is zero unverifiable quotes.

---

## D-010
**The non-monetary constraint is enforced inside the scoring function, not merely stated.**

*Type:* Business · *Status:* Accepted · *Date:* 2026-09-01

**Context.** The downstream solution cannot use discounts, coupons, or cashback. Price is nonetheless one of the loudest themes in fashion conversation, so an unconstrained ranking would put "users want it cheaper" on top and waste the whole exercise.

**Decision.** Each opportunity carries an `is_non_monetary` flag and an actionability score. Opportunities addressable only by monetary means are excluded from the recommended set — but still shown, labeled, so the omission is visible and honest.

**Rationale.** Price *uncertainty* (will this drop? is it worth it at this price?) is a legitimate information problem solvable without discounting. Price *level* is not in scope. The engine must separate the two rather than discard everything price-shaped.

**Consequences.** The codebook needs distinct codes for price level, price timing, and value uncertainty.

---

## D-011
**Public data only. Author identifiers hashed on write. Collection respects platform terms.**

*Type:* Business · *Status:* Accepted · *Date:* 2026-09-01

**Decision.** Only publicly visible content, collected via public APIs, feeds, or permitted access. No authenticated scraping, no private groups, no DMs. Usernames are hashed at ingestion and never displayed; quotes are shown with a permalink instead.

**Rationale.** This is a public research artifact. Displaying a stranger's handle next to "she couldn't afford it" is a real harm and adds nothing analytically.

**Consequences.** Some rich sources are excluded. Documented in Method & limits.

---

## D-012
**A human-coded gold set is the backbone of every quality claim.**

*Type:* Tech · *Status:* Accepted · *Date:* 2026-09-01

**Decision.** Hand-label a stratified sample — 200 documents for relevance, 200 units for extraction axes — before trusting any pipeline number. Re-code a 50-item slice after a cooling period to measure the coder's own consistency, and use a second Groq model from a different family (`qwen/qwen3.8-27b`) as an independent labeler for agreement.

**Rationale.** Without ground truth, "the AI found X" is unfalsifiable. With it, the site can publish accuracy per stage, which is the difference between a research instrument and a vibe.

**Consequences.** Real up-front time cost. It is the price of the Method & limits page being worth reading. Gold-set scores are published in the UI.

---

## D-013
**Hard cost ceiling per run, enforced in code.**

*Type:* Tech · *Status:* Accepted · *Date:* 2026-09-01

**Decision.** The cheap model (`gpt-oss-20b`) for the relevance gate, the strong one (`gpt-oss-120b`) only past it. Extraction cached by `content_hash + prompt_version + model_id`. Per-run token budget checked before and during execution; job aborts on breach. Public demo runs additionally capped per IP per hour.

**Rationale.** A public URL with an LLM behind it is an open invoice. Caps make the demo safe to leave online.

**Amendment (2026-09-01).** With Groq as the provider (`D-017`), the dollar ceiling is rarely what binds first — request and token quotas are. The budget check therefore governs both, per `D-019`.

---

## D-014
**The engine narrows the field; user interviews decide the problem.**

*Type:* Business · *Status:* Accepted · *Date:* 2026-09-01

**Decision.** The engine outputs 3–6 ranked opportunities plus explicit open questions. It never declares a root cause. Problem definition happens only after primary research.

**Rationale.** Public conversation is self-selected and skewed toward the angry and the articulate; it is good at revealing *what kinds* of doubt exist and poor at proving which dominates for a chosen segment. Overclaiming here would poison every downstream part of the assignment.

**Consequences.** The UI must be built to surface uncertainty and generate interview questions, not to look conclusive.

---

## D-015
**English and Hinglish only; India-focused conversation.**

*Type:* Business · *Status:* Accepted · *Date:* 2026-09-01

**Rationale.** Matches Myntra's market and keeps extraction quality measurable against a gold set the coder can actually read. Excluding code-mixed Hinglish would drop a large share of authentic consideration talk, so it is retained deliberately.

**Consequences.** Regional-language conversation is out of scope and stated as a limitation.

---

## D-016
**Opportunity score and confidence are separate, separately displayed numbers.**

*Type:* Tech · *Status:* Accepted · *Date:* 2026-09-01

**Context.** A thin-evidence opportunity can score high on severity and proximity. Folding evidence strength into one number hides that.

**Decision.** `score` answers "how promising is this lever?". `confidence` answers "how much should I trust this reading?" — driven by volume, platform diversity, gold-set accuracy for the codes involved, and cross-model agreement. Both appear on the board.

**Rationale.** A PM should be able to pick a high-score / low-confidence area *precisely because* it is worth interviewing about. Collapsing the two removes that judgment.

---

## D-017
**Groq (GroqCloud) is the sole LLM provider. Every pipeline call uses a model that supports strict JSON-schema decoding.**

*Type:* Tech · *Status:* Accepted · *Date:* 2026-09-01 · *Supersedes:* part of [D-005](#d-005)

**Context.** The pipeline makes one cheap high-volume call per document (relevance gate) and one expensive structured call per surviving document (extraction). Throughput and schema reliability matter more than conversational polish.

**Decision.** Groq for all inference, OpenAI-compatible API, with a three-tier model assignment:

| Stage | Model | Mode | Why this tier |
| --- | --- | --- | --- |
| Relevance gate | `openai/gpt-oss-20b` | `strict: true` | Cheapest per token and highest throughput; the gate is a two-field binary decision run over the whole corpus |
| Extraction, cluster naming | `openai/gpt-oss-120b` | `strict: true` | Strongest available model with constrained decoding; 131k context absorbs long Reddit threads whole |
| Cross-model agreement slice | `qwen/qwen3.8-27b` | `strict: true` | Different model family, so agreement is a real independence check rather than self-agreement |

**Rationale.** Groq's throughput turns a multi-hour extraction run into a short one, which matters because the pipeline will be re-run every time the codebook or a prompt changes. Per-token pricing on the `gpt-oss` models is low enough that corpus breadth is not rationed by cost. Most importantly, Groq offers **constrained decoding** on exactly these models, so schema-invalid output stops being a failure mode instead of a retry loop.

**Constraints accepted.**
- Strict mode is available only on the models above; Llama 3.3 70B has no native schema mode and is therefore not used in the pipeline.
- Strict mode restricts the schema: all properties `required`, `additionalProperties: false`. Optional fields are modelled as nullable unions (`workaround: string | null`), never omitted keys.
- Structured outputs cannot be combined with streaming or tool use. Not needed — the live demo streams stage progress from our own server, not model tokens.
- Open-weight models are likely weaker than a frontier model on code-mixed Hinglish. This is measured separately against the gold set (Phase 2, T2.18); if it fails, Hinglish gets few-shot examples or is routed to the 120B model.

**Consequences.** One vendor, one key. Model ids live in config and are recorded per `run`, so a Groq deprecation is a config change rather than a rewrite. Because the model is cheaper and faster than originally planned, the real ceiling shifts from dollars to request quota (`D-019`).

---

## D-018
**Embeddings are computed locally with an open ONNX model, not via an API.**

*Type:* Tech · *Status:* Accepted · *Date:* 2026-09-01 · *Supersedes:* part of [D-005](#d-005)

**Context.** Near-duplicate detection (Phase 1) and inductive clustering (Phase 3) both need embeddings. Groq serves chat and audio models only — its SDKs carry an embeddings stub, but there is no usable embeddings endpoint.

**Decision.** Run `bge-small-en-v1.5` (384-dim) locally inside the batch job via ONNX. Vectors are stored as `number[]` on documents; cosine similarity is TypeScript (`D-020`).

**Rationale.** Adding a second vendor purely for embeddings would mean another key, another rate limit, and another dependency, for a task where a small local model is entirely adequate on a corpus of a few thousand documents. Local also means dedupe and clustering cost nothing and consume no Groq quota, so they can be re-run freely while tuning thresholds.

**Consequences.** Slower than a hosted endpoint, and embedding runs happen in CI rather than serverless. Changing the embedding model invalidates stored vectors, so the model id is versioned alongside the codebook.

---

## D-019
**Batch jobs are rate-limit aware, checkpointed per document, and resumable. Request quota is treated as the binding constraint.**

*Type:* Tech · *Status:* Accepted · *Date:* 2026-09-01

**Context.** Groq's per-token price is low, but its plans cap requests per minute, tokens per minute, and requests per day. A few thousand documents through a gate plus an extraction call can exceed a daily request ceiling well before it approaches any sensible dollar budget. A run that dies at 70% and restarts from zero would burn the next day's allowance too.

**Decision.** Every job writes progress per document, so an interrupted run resumes where it stopped. A token-bucket limiter sized to the account's actual allowance fronts all calls, with exponential backoff and jitter on 429. A daily request budget stops the job cleanly when reached. The public demo gets a reserved slice of the daily allowance so visitor traffic cannot starve a production run.

**Rationale.** The classic failure here is not a surprise invoice — it is a run that cannot finish before a deadline because the allowance was spent on retries. Checkpointing plus throttling converts that from a crisis into a longer wall-clock time.

**Consequences.** A full production run may span more than one day on a low tier; the plan front-loads it accordingly. Every `run` record stores requests used, so quota consumption is observable rather than guessed at.

---

## D-020
**JSON files in the repo are the store. No hosted database.**

*Type:* Tech · *Status:* Accepted · *Date:* 2026-09-02 · *Supersedes:* [D-004](#d-004)

**Context.** Phase 0 originally required Supabase (Postgres + pgvector, read-only vs write roles, pooled connections). The site will be deployed on Vercel at the end. The corpus is a few thousand public documents, analysis is precomputed, and the website is read-only.

**Decision.** Persist everything as versioned JSON under `data/published/`. Jobs write those files. The Next.js app reads them and must not import the write module. Live demo output goes to `data/sandbox/`. Embeddings are `number[]`; cosine similarity is computed in process.

**Rationale.** Supabase solved a problem this project does not have — concurrent writes, ad-hoc SQL, and a separate vector index — while adding a vendor, secrets, and a deploy dependency before any discovery existed. File storage matches "precompute, then serve" (`D-006`), ships with the Vercel build, and keeps counting in TypeScript (`D-007`).

**Alternatives rejected.** SQLite/Turso — still a database to host or a write problem on serverless. Vercel KV/Blob — extra vendor for the same JSON. Stay on Supabase — operational cost with no analytical gain at this scale.

**Consequences.** Aggregations are in-memory over arrays (fine at a few thousand rows). A production re-run is a git commit of updated JSON, not a live mutation. The public demo cannot persist into published collections even if someone finds a write bug in a route, because those routes must not import `store/write`.

---

## Open decisions

| ID | Question | Needed by |
| --- | --- | --- |
| O-01 | Which segment to take into interviews if the top two opportunities skew to different segments | End of Phase 4 |
| O-02 | Whether to include a comparison corpus (AJIO/Nykaa) as a contrast set or leave it out for scope | Phase 1 |
| O-03 | Scoring weights: initial values are judgment; do stability tests justify keeping them or flattening them | Phase 4 eval |
| O-04 | Whether the live demo run accepts arbitrary user-pasted URLs or only a curated source list | Phase 6 |
| O-05 | Whether the free Groq tier's daily request ceiling can carry a full production run, or a paid developer tier is required | End of Phase 2, once real per-document request counts are known |
| O-06 | Whether Hinglish extraction on `gpt-oss-120b` clears the Phase 2 bar, or needs few-shot examples or a separate pass | Phase 2 eval (T2.18) |
