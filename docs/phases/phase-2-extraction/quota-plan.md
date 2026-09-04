# Phase 2 Groq quota plan

**Do not use a single model for the whole job.** Groq’s 200k tokens/day cap is **per model**. Putting gate + extract on only `gpt-oss-20b` or only `gpt-oss-120b` throws away every other bucket and turns a 2-day finish into ~6 days.

**Models.** Every Groq model that supports `strict: true` JSON schema has its own copy of these caps:

| Cap | Published | Working (80% headroom) |
| --- | --- | --- |
| Requests / minute | 30 | 24 |
| Tokens / minute | 8,000 | 6,400 |
| Requests / day | 1,000 | 800 |
| Tokens / day | 200,000 | 160,000 |

Jobs never target 100% of a cap. Headroom is for 429 retries (`D-019`).

Regenerate the numbers from the live corpus:

```bash
npm run phase2:plan
```

---

## Binding constraint

**Tokens per day bind first**, then tokens per minute. Requests-per-day (1,000) is not the limiter if prompts stay short.

Measured gate cost on this corpus: **~546 tokens/call**. The job estimates **560** so it stops before the published TPD ceiling.

## Call shape

| Stage | Model pool | Calls | Est. tokens / call | Doc truncate |
| --- | --- | --- | --- | --- |
| Gate | `gpt-oss-20b`, `qwen3.8-27b`, `gpt-oss-safeguard-20b`, then `gpt-oss-120b` | 1 per unique `dedupe_group` | 560 | 600 characters |
| Extract | `gpt-oss-120b` first, then `20b`, then `qwen` | 1 per document the gate keeps | 1,400 | 900 characters |
| Agreement | skipped in the bulk run (`--skip-agreement`) | — | — | — |

The picker drains the model with the **most remaining tokens**. `120b` is last in the gate pool so extraction can keep using it.

## Throughput at working caps (per model)

| Stage | Calls / minute | Calls / day |
| --- | --- | --- |
| Gate | min(24 RPM, 6400/560) ≈ **11** | min(800 RPD, 160000/560) ≈ **285** |
| Extract | min(24 RPM, 6400/1400) = **4** | min(800 RPD, 160000/1400) = **114** |

Four independent gate buckets ≈ **1,140 gate calls / UTC day**. Minute pacing is per model (separate token buckets in the client).

## 2-day sprint (current corpus)

~1,918 unique groups. **292 already gated** (run `eff8a878-…`). **~1,626 remaining.**

| UTC day | What runs | Expected groups |
| --- | --- | --- |
| Rest of 2026-09-01 | 20b is empty; drain `qwen`, `safeguard-20b`, leftover `120b` | ~800 |
| 2026-09-02 | All four buckets reset at midnight UTC | remainder (~800) |

That is enough to finish gating in **two UTC days** without upgrading Groq. Extract volume is small so far (~4% of gated groups produced units); passers extract in the same pass on `120b`.

**Start / resume** (runs until every pooled model hits its daily ceiling):

```bash
npm run phase2:extract -- --skip-agreement
```

Re-run after UTC midnight. Checkpoint: `data/published/phase2_checkpoint.json`. Spend: `data/sandbox/groq_daily_budget.json`.

```
Day 1 (remaining hours)  qwen + safeguard + leftover 120b gate; 120b extract
Day 2 (full UTC day)     20b + qwen + safeguard gate; 120b extract
Agreement                after the bulk run, on leftover qwen quota
```

A paid Groq developer tier is the only way to finish the full corpus in **one** UTC day. Using one model is slower, not faster.

## Hard rules

1. **Checkpoint per document.** A stop at the daily ceiling resumes with zero re-spend on completed hashes (`T2.20`, `T2.22`).
2. **Cache** `content_hash + prompt_version + model_id`. Hits are accepted from any model in the pool.
3. **Abort before the call** if **no** model in the pool can fit the next request.
4. **At most 3 retries** on HTTP 429, with exponential backoff.
5. **Truncate** source text to the character caps above.
6. **Gold-set labeling is human** and consumes no Groq quota (`D-012`).
7. **Do not collapse the pool to one model** to “simplify” — that is the slow path.

## What this does *not* do

It does not raise the Groq plan. Mixed-model gating means a minority of groups are classified by `qwen` or `safeguard-20b` rather than `gpt-oss-20b`; that is accepted for the 2-day deadline (`D-021`). Extraction still prefers `gpt-oss-120b`.
