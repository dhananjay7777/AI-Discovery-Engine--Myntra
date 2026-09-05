# AI-Powered Discovery Engine (Myntra)

A website that reads public comments about online fashion shopping and ranks a few ideas for why saved items sit unbought. The ideas are starting points for talking to shoppers — not finished answers.

Phases **0–5 are complete**. The site, published corpus, extraction, codebook, and scores ship in this repo. Public Vercel deploy is **Phase 6**. Interview handoff is **Phase 7**.

## What you can open

```bash
cp .env.example .env   # GROQ_API_KEY only needed for extraction / smoke jobs
npm install
npm run dev
```

Then visit [http://localhost:3000](http://localhost:3000).

| Page | What it is |
| --- | --- |
| `/` Home | How to use the site, where the comments came from, short list of ideas |
| `/board` Findings | Suggested order to look first, with scores |
| `/opportunities/[slug]` | One idea: comments for and against, quotes with permalinks |
| `/questions` | What to ask a real shopper |
| `/corpus` Comments | Sources, volumes, and provenance |
| `/metric-tree` Path | Five steps from save to buy, and which ideas sit on each |
| `/segments` Who | Who to talk to, only where the comments say so |
| `/method` Limits | What this cannot tell you |
| `/demo` Try it | Placeholder — live sample is Phase 6 |

## Stack

- **Web:** Next.js 15, TypeScript, Tailwind CSS
- **Store:** JSON files in `data/published/` (no hosted database)
- **Inference:** Groq (`gpt-oss-20b` gate, `gpt-oss-120b` extraction)
- **Embeddings:** Local ONNX (`bge-small-en-v1.5`)
- **Hosting:** Vercel (Phase 6)
- **Jobs:** Local scripts; GitHub Actions for smoke when enabled

## Pipeline scripts

Put `GROQ_API_KEY` in `.env` ([setup](docs/groq-api-setup.md)). `YOUTUBE_API_KEY` is only needed when collecting comments ([setup](docs/youtube-api-setup.md)).

### Phases 0–1

| Script | Purpose | Needs Groq key? |
| --- | --- | --- |
| `npm run phase0:verify-store` | JSON collections exist; app cannot write published data | No |
| `npm run phase0:smoke` | Strict-schema calls + embedding round-trip + run insert | Yes |
| `npm run test:throttle` | Token-bucket limiter + 429 backoff | No |
| `npm run phase1:eval` | Corpus quality checks | No |

### Phase 2 — extraction

Plan the Groq calendar first, then run extraction (multi-day, checkpointed):

| Script | Purpose | Needs Groq key? |
| --- | --- | --- |
| `npm run phase2:plan` | Print quota-safe call calendar for current corpus | No |
| `npm run phase2:extract` | Gate (pooled models) → extract → verify; pauses at each model’s UTC cap | Yes |
| `npm run phase2:eval` | Automated Phase 2 checks | No |
| `npm run phase2:gold-sample` | Export stratified samples for human gold set | No |

```bash
npm run phase2:plan
npm run phase2:extract -- --skip-agreement   # bulk run; resumes after UTC midnight
npm run phase2:extract -- --limit 5          # smoke test on 5 groups
```

See [quota plan](docs/phases/phase-2-extraction/quota-plan.md).

### Phases 3–5

| Script | Purpose | Needs Groq key? |
| --- | --- | --- |
| `npm run phase3:codebook` | Name leftover themes and code units | Yes |
| `npm run phase3:eval` | Codebook coverage checks | No |
| `npm run phase4:score` | Rank opportunities onto the save-to-buy path | No |
| `npm run phase4:eval` | Scoring checks | No |
| `npm run phase5:eval` | Site surfaces, provenance, mobile nav | No |

Phase map and status: [docs/implementationplan.md](docs/implementationplan.md).

## Deploy (Phase 6)

Step-by-step: [docs/Deploymentplan.md](docs/Deploymentplan.md). Short version: push to GitHub, import in Vercel, set `GROQ_API_KEY` as a **server-only** env var when the live demo is wired. The published corpus ships with the repo as JSON.

## GitHub Actions

When you enable the `phase0-smoke` workflow, add one repo secret: `GROQ_API_KEY`.

## Docs

Index: [`docs/README.md`](docs/README.md).
