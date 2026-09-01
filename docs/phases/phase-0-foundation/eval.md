# Phase 0 Eval — Foundation

<!-- phase-status: complete -->

**Phase goal.** A working site and end-to-end data path exist before any analysis is built. Public Vercel deploy is Phase 6.

**Prerequisite.** `GROQ_API_KEY` in local `.env` — [groq-api-setup.md](../../groq-api-setup.md).

**Why this phase is gated.** Secrets, the store layout, and the Groq client fail in surprising ways. Discovering that on the final day is the standard way projects like this ship as a screenshot instead of a link.

---

## Tests

| ID | Test | Method | Pass condition |
| --- | --- | --- | --- |
| T0.1 | Site loads locally | `npm run build` then `npm start`; open `/` | Placeholder Overview renders, HTTP 200 |
| T0.2 | Schema present | `npm run phase0:verify-store` | All core collections from `architecture.md` §5 exist as JSON files |
| T0.3 | Job path works | `npm run phase0:smoke` (or the GitHub Actions job) | Inserts a `run` record into `data/published/runs.json`; exits 0 |
| T0.4 | Site cannot write | `npm run phase0:verify-store` | No file under `src/app` imports `@/lib/store/write` |
| T0.5 | No secret in the browser | Search the production client bundle for key prefixes and env names | Zero matches |
| T0.6 | Groq strict schema works | Smoke call to `gpt-oss-20b` and `gpt-oss-120b` with `strict: true` | Both return schema-valid JSON; no 400 on the schema |
| T0.7 | Strict-mode schema rules honored | Review the smoke schema | All properties `required`, `additionalProperties: false`, optionals as nullable unions (`D-017`) |
| T0.8 | Model ids are config, not code | Grep for hardcoded model strings | Ids come from config and are recorded on the `run` |
| T0.9 | Local embeddings round-trip | Smoke embed step | 384-dim vector stored in JSON and read back with cosine ≥ 0.999 (`D-018`) |
| T0.10 | Clean clone builds | Fresh clone, install, build using only `.env.example` names | Build succeeds; missing-secret failures are explicit, not silent |
| T0.11 | Usage instrumentation exists | Inspect the smoke call's log | Prompt/completion tokens, request count, and estimated cost all recorded |
| T0.12 | Throttle and backoff exist | Force a 429 with a burst, or simulate one | Limiter delays rather than fails; backoff with jitter observed (`D-019`) |

---

## Exit criteria

All of the following, no exceptions:

1. Overview builds and serves locally (T0.1). Public URL waits for Phase 6.
2. All published JSON collections exist (T0.2).
3. A batch job writes a `run` record (T0.3).
4. App routes cannot write the published store (T0.4).
5. No secret appears in any client-side artifact.
6. A strict-schema Groq call succeeds on both pipeline models and is usage-logged (T0.6, T0.11).
7. Local embeddings produce and round-trip a vector through JSON (T0.9).
8. Throttling and 429 backoff are in place before any bulk work begins (T0.12).

---

## Known failure modes

| Failure mode | Detection | Response |
| --- | --- | --- |
| Missing Groq key | Smoke exits with `GROQ_API_KEY is not set` | Follow [groq-api-setup.md](../../groq-api-setup.md); do not put the key in git |
| Secrets committed to git | T0.5 plus history scan | Rotate immediately; keys only in `.env`, Actions, and Vercel |
| JSON files missing from the Vercel serverless bundle | Phase 6 cold-open | `outputFileTracingIncludes` for `data/published/**` |
| Site route silently imports the write module | T0.4 | Keep write functions in `store/write.ts` only; CI runs verify-store |
| Reaching for Groq's embeddings endpoint because the SDK exposes one | T0.9 | It is a non-functional stub; embeddings are local (`D-018`) |
| Picking a Groq model without strict schema support | T0.6 | Only `gpt-oss-20b`, `gpt-oss-120b`, `qwen3.8-27b` support it; others need a tool-call workaround, so avoid them |
| Model id hardcoded, breaking when Groq deprecates it | T0.8 | Config-driven ids, recorded per run |
| Building the throttle after hitting a wall mid-run | T0.12 | Limiter and backoff ship in Phase 0, not Phase 2 |

---

## Artifacts to keep

Smoke-call response, a `run` record in `data/published/runs.json`, and the store verification log.
