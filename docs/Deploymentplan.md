# Deployment Plan — Vercel

How to put the Discovery Engine on a public URL. The site is a Next.js app that **reads precomputed JSON** from `data/published/`. Pipeline jobs (collect, extract, score) run **locally or in GitHub Actions**, not on Vercel.

Reads alongside [architecture.md](./architecture.md), [groq-api-setup.md](./groq-api-setup.md), and [Phase 6 eval](./phases/phase-6-deploy/eval.md).

---

## What you are deploying

| Ships with the Vercel build | Does not run on Vercel |
| --- | --- |
| Next.js pages (`/`, `/board`, `/corpus`, …) | `npm run phase1:collect`, `phase2:extract`, … |
| `data/published/**` (scores, quotes, corpus stats) | Writing into published JSON |
| `/api/health` | Full corpus refresh |

`next.config.ts` already includes `outputFileTracingIncludes` so `data/published/**` is packed into the serverless bundle. Without that, pages can 500 on a cold open.

**Live demo** (`/demo`) is still a shell until Phase 6 wires it. You can deploy the read-only site now; add Groq and demo caps when that route goes live.

---

## Prerequisites

1. **GitHub repo** with this project pushed (current remote: `origin`).
2. **Local build works:**

```bash
npm install
npm run build
```

3. **Published data is committed** under `data/published/` (findings, opportunities, corpus meta). The public site only shows what is in git.
4. A **[Vercel](https://vercel.com)** account (GitHub sign-in is simplest).
5. Optional for a read-only deploy: `GROQ_API_KEY`. Required later for the live demo and any server route that calls Groq ([setup](./groq-api-setup.md)).

Never commit `.env`. Never name secrets `NEXT_PUBLIC_*` except intentional public values like `NEXT_PUBLIC_APP_NAME`.

---

## Step 1 — Confirm the branch

Deploy from `master` (or your main branch) after a clean push:

```bash
git status
git push -u origin HEAD
```

Vercel will rebuild on every push to the production branch.

---

## Step 2 — Import the project on Vercel

1. Open [vercel.com/new](https://vercel.com/new).
2. **Import** the GitHub repository (`AI-Discovery-Engine--Myntra` or your fork).
3. Framework preset: **Next.js** (auto-detected).
4. Leave defaults unless you need to change them:

| Setting | Value |
| --- | --- |
| Root Directory | `.` (repo root) |
| **Install Command** | `npm install` — **not** `npm run build` |
| **Build Command** | `npm run build` |
| Output Directory | *(default — Next.js)* |
| Node.js | 20.x (or current LTS Vercel offers) |

`vercel.json` at the repo root sets those two commands so a swapped dashboard field cannot skip `npm install`.

5. Do **not** click Deploy yet if you still need to add env vars — open **Environment Variables** first (Step 3), then deploy.

---

## Step 3 — Environment variables

In the Vercel project: **Settings → Environment Variables**.

### Minimum (read-only site)

| Name | Value | Environments | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_NAME` | `Myntra Discovery Engine` | Production, Preview | Safe to expose; optional if you accept the code default |

### When live demo / Groq routes are enabled (Phase 6)

| Name | Value | Environments | Notes |
| --- | --- | --- | --- |
| `GROQ_API_KEY` | `gsk_…` | Production (and Preview only if you test demos there) | **Server only** — do not enable “Expose to Browser” |
| Model / budget overrides | Same names as [`.env.example`](../.env.example) | As needed | Only if you diverge from `src/config/models.ts` defaults |

### Usually **not** needed on Vercel

| Name | Why |
| --- | --- |
| `YOUTUBE_API_KEY` | Collection runs offline / in Actions, not on the public site |
| Embedding model vars | Local jobs only; published embeddings are already in JSON |

After changing secrets, **redeploy** so the new values are picked up.

---

## Step 4 — Deploy

1. Click **Deploy** (first import) or push a commit to trigger a build.
2. Wait for the build log: `npm run build` must finish with no errors.
3. Open the production URL Vercel assigns (`*.vercel.app`).

Optional: **Settings → Domains** to attach a custom domain.

---

## Step 5 — Verify the live site

On a clean browser / device (incognito, no local cache):

| Check | How |
| --- | --- |
| Home loads | Open `/` |
| Findings | `/board` shows ranked ideas |
| Evidence | Open one `/opportunities/[slug]` — quotes, permalinks |
| Corpus | `/corpus` shows source mix |
| Health | `GET /api/health` returns `{ "status": "ok", … }` |
| No secrets | DevTools → Network / Sources: no `GROQ_API_KEY`, no `gsk_` in JS bundles |
| Data matches repo | Spot-check a score or quote against `data/published/` |

If pages render but numbers are empty, the build likely omitted JSON — confirm `outputFileTracingIncludes` in `next.config.ts` and that `data/published` is in the repo (not gitignored).

---

## Step 6 — Updating production later

### Content / findings change

1. Re-run pipeline scripts locally (or Actions).
2. Commit updated files under `data/published/`.
3. Push to the production branch → Vercel redeploys automatically.

### App / UI change

1. Push code changes.
2. Confirm the new deployment in the Vercel dashboard.
3. Use **Instant Rollback** if a bad build ships ([T6.18](./phases/phase-6-deploy/eval.md)).

---

## Step 7 — Phase 6 hardening (after the URL works)

The first public URL is not the end of Phase 6. Still required for “safe to leave on the internet”:

1. Wire `/demo` with document/token caps, per-IP rate limits, and sandbox writes only (`data/sandbox/`).
2. Reserve a Groq quota slice so demos cannot starve pipeline jobs.
3. Confirm no public route can write `data/published/`.
4. Cold-open test on a device that never ran the project.
5. Pass [Phase 6 eval](./phases/phase-6-deploy/eval.md), then `npm run phase:complete -- 6`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `next: command not found` / install log shows `npm run build` | **Install Command** in Vercel is set to `npm run build` | Project Settings → General → Build & Development: Install = `npm install`, Build = `npm run build`. Redeploy. `vercel.json` in the repo also pins this. |
| Build fails on Vercel | Local `npm run build` also fails, or Node mismatch | Fix locally; set Node 20 in Project Settings |
| Site up, empty findings | `data/published` missing from bundle or git | Commit published JSON; keep `outputFileTracingIncludes` |
| 503 on `/api/health` | Store path / tracing | Check function logs; verify published files in deployment |
| Groq errors on demo | Missing or browser-exposed key | Set `GROQ_API_KEY` server-only; redeploy |
| Preview differs from Production | Env vars only on Production | Mirror vars on Preview, or test only against Production |

---

## Checklist

- [ ] `npm run build` succeeds locally
- [ ] Latest `data/published/**` committed and pushed
- [ ] Repo imported on Vercel as Next.js
- [ ] Env vars set (at least app name; `GROQ_API_KEY` when demo is live)
- [ ] Production deploy green
- [ ] Cold-open: pages + `/api/health` OK
- [ ] No secrets in client bundle
- [ ] (Later) Phase 6 demo caps + eval

---

## Quick reference

```bash
# Local proof before deploy
npm install
npm run build

# Ship
git push origin master
# → Vercel builds from the GitHub integration
```

Docs: [groq-api-setup.md](./groq-api-setup.md) · [implementationplan.md](./implementationplan.md) (Phase 6) · [architecture.md](./architecture.md) § hosting.
