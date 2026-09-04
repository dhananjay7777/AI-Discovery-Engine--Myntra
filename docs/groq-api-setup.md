# Groq API key — setup for this project

The Discovery Engine uses **Groq** as its only LLM (`D-017`). Phase 0 needs a key so the smoke script can call `gpt-oss-20b` and `gpt-oss-120b` with strict JSON schema.

Time: a few minutes. Create a free account at [console.groq.com](https://console.groq.com).

**Never commit the key.** Put it in `.env` now. GitHub Actions and Vercel come later (jobs and Phase 6). Never name it `NEXT_PUBLIC_GROQ_API_KEY`.

---

## 1. Create the key

1. Open [https://console.groq.com/keys](https://console.groq.com/keys) and sign in.
2. Click **Create API Key**.
3. Name it something you will recognize, e.g. `ai-discovery-engine-local`.
4. Copy the key once. Groq will not show it again.

The key usually starts with `gsk_`.

---

## 2. Put it in `.env`

1. Open `.env` in the project root (next to `.env.example`). Create it from `.env.example` if needed.
2. Find `GROQ_API_KEY=` and paste the key after the equals sign. No quotes, no spaces:

```
GROQ_API_KEY=gsk_your_key_here
```

3. Confirm `.env` is gitignored.
4. Confirm `.env.example` still has only the empty name `GROQ_API_KEY=` — never the real value.

The website (`npm run dev`) loads `.env` automatically. Batch scripts load it via `src/scripts/load-env.ts`.

---

## 3. Later: GitHub Actions and Vercel

**Not required to start Phase 0.** Add these when you run CI smoke or deploy.

### GitHub Actions

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

- Name: `GROQ_API_KEY`
- Value: the same key

The `phase0-smoke` workflow already reads this secret.

### Vercel (Phase 6)

Project → **Settings** → **Environment Variables**

- Name: `GROQ_API_KEY`
- Value: the same key
- Production / Preview as needed
- Server-side only — never enable “Expose to the browser”

Redeploy after saving.

---

## 4. Models this project uses

Ids live in `.env` / `src/config/models.ts`, not in call sites (`T0.8`).

| Stage | Env | Default |
| --- | --- | --- |
| Relevance gate (preferred) | `GROQ_GATE_MODEL` | `openai/gpt-oss-20b` |
| Gate pool (independent TPD) | `GROQ_GATE_MODEL_POOL` | `20b`, `qwen3.8-27b`, `safeguard-20b`, `120b` |
| Extraction (preferred) | `GROQ_EXTRACTION_MODEL` | `openai/gpt-oss-120b` |
| Extract fallbacks | `GROQ_EXTRACT_MODEL_POOL` | `120b`, `20b`, `qwen3.8-27b` |
| Agreement slice | `GROQ_AGREEMENT_MODEL` | `qwen/qwen3.8-27b` |

Only models with `strict: true` JSON schema. Do not swap in Llama 3.3 70B (`D-017`). **Do not set the gate pool to a single model** — each model’s 200k TPD is separate, and one model cannot finish the corpus in 2 days (`D-021`).

Rate-limit defaults in `.env` match the published caps: **30 RPM, 8k TPM, 1k requests/day, 200k tokens/day per model**. Jobs use 80% of each cap (`GROQ_BUDGET_HEADROOM`). See [Phase 2 quota plan](./phases/phase-2-extraction/quota-plan.md) and `npm run phase2:plan`.

---

## 5. If the key leaks

1. Delete it in the Groq console.
2. Create a new key.
3. Update `.env`. Update GitHub Actions and Vercel if those are already set.
4. Do not reuse the leaked key.

---

## Checklist

- [ ] Key created at console.groq.com/keys
- [ ] `GROQ_API_KEY` set in local `.env` (no `NEXT_PUBLIC_` prefix)
- [ ] `.env` gitignored; `.env.example` has the name only
- [ ] GitHub Actions secret added when you enable CI smoke
- [ ] Vercel env var added at Phase 6, server-only
