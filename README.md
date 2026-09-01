# AI-Powered Discovery Engine (Myntra)

A deployed website that turns public conversation about online fashion shopping into ranked, evidence-backed opportunity areas for wishlist conversion.

## Stack

- **Web:** Next.js 15, TypeScript, Tailwind CSS
- **Store:** JSON files in `data/published/` (no hosted database)
- **Inference:** Groq (`gpt-oss-20b` gate, `gpt-oss-120b` extraction)
- **Embeddings:** Local ONNX (`bge-small-en-v1.5`)
- **Hosting:** Vercel (Phase 6)
- **Jobs:** GitHub Actions + local scripts

## Quick start

```bash
cp .env.example .env
```

1. Add `GROQ_API_KEY` to `.env` — [docs/groq-api-setup.md](docs/groq-api-setup.md).
2. `YOUTUBE_API_KEY` is only needed when collecting comments — [docs/youtube-api-setup.md](docs/youtube-api-setup.md).

```bash
npm install
npm run dev
```

## Phase 0

Put `GROQ_API_KEY` in `.env` ([setup](docs/groq-api-setup.md)). Then `npm run dev`. Public Vercel deploy is **Phase 6**.

| Script | Purpose | Needs Groq key? |
| --- | --- | --- |
| `npm run phase0:verify-store` | JSON collections exist; app cannot write published data | No |
| `npm run phase0:smoke` | Strict-schema calls + embedding round-trip + run insert | Yes |
| `npm run test:throttle` | Token-bucket limiter + 429 backoff | No |

## Deploy (Phase 6)

Push to GitHub, import in Vercel, set `GROQ_API_KEY` as a **server-only** env var. The published corpus ships with the repo as JSON.

## GitHub Actions

When you enable the `phase0-smoke` workflow, add one repo secret: `GROQ_API_KEY`.

## Docs

Index: [`docs/README.md`](docs/README.md).
