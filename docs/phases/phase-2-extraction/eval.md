# Phase 2 Eval — Extraction

<!-- phase-status: complete -->

**Phase goal.** Documents become labeled evidence units whose quotes are provably real.

**Why this phase is gated.** This is where hallucination enters and where the analysis either earns trust or quietly loses it. A fabricated quote on a public site is unrecoverable.

**Prerequisite.** The gold set must be built *before* prompt tuning (`D-012`). Tuning against intuition and then labeling afterwards measures nothing.

---

## Gold set

| Set | Size | Sampling | Labeled by |
| --- | --- | --- | --- |
| Relevance | 200 documents | Stratified by platform and gate score band, including borderline cases | Human |
| Extraction | 200 units | Stratified by platform and unit type | Human |
| Consistency slice | 50 items | Random from the above, re-coded after ≥ 48 hours | Same human |
| Agreement slice | 100 units | Random | `qwen/qwen3.8-27b`, independently — a different family from the extraction model |

---

## Tests

| ID | Test | Method | Pass condition |
| --- | --- | --- | --- |
| T2.1 | Relevance precision | Gate output vs gold | ≥ 0.85 |
| T2.2 | Relevance recall | Gate output vs gold | ≥ 0.80 |
| T2.3 | Gate saving | Compare tokens *and requests* with and without the gate | ≥ 50% of extraction spend and request volume avoided |
| T2.4 | Verbatim verification | Programmatic substring check on every unit | 100% of *published* units verify; zero unverifiable survive (`D-009`) |
| T2.5 | Hallucination rate | Share of extracted units failing T2.4 before the drop | Recorded and reported; > 5% triggers prompt revision before proceeding |
| T2.6 | Span accuracy | Sample 50 units | ≥ 90% of spans capture a complete, self-contained thought |
| T2.7 | Schema validity | All extraction responses | 100% parse against the JSON schema. With `strict: true` this should be exactly 100%; any failure means the schema violates strict-mode rules, not that the model erred (`D-017`) |
| T2.8 | Primary-axis accuracy | `unit_type` and `decision_factor` vs gold | ≥ 0.75 accuracy each |
| T2.9 | Label agreement | Cohen's kappa, model vs human gold | ≥ 0.60 on primary axes |
| T2.10 | Coder self-consistency | Consistency slice vs original labels | ≥ 0.80 agreement — if the coder disagrees with themselves, model scores are meaningless |
| T2.11 | Cross-model agreement | Agreement slice: `gpt-oss-120b` vs `qwen3.8-27b` | ≥ 0.55 kappa; large gaps flagged as low confidence downstream |
| T2.12 | Intent-type separation | Gold labels for genuine intent vs bookmarking | ≥ 0.70 accuracy — this distinction is central to the brief |
| T2.13 | Segment-signal precision | Sample 50 units with segment labels | ≥ 0.80 precision; unsupported inferences (e.g. guessing age from tone) rejected |
| T2.14 | Over-extraction check | Units per document distribution | Median ≤ 3; documents yielding > 8 units manually reviewed |
| T2.15 | Cache correctness | Re-run unchanged documents | Zero new model calls; identical outputs |
| T2.16 | Version pinning | Inspect `run` row | Groq model ids and prompt versions recorded; changing either invalidates cache |
| T2.17 | Budget abort | Set an artificially low ceiling and run | Job aborts cleanly, partial results not published (`D-013`) |
| T2.18 | Hinglish handling | 30 Hinglish units vs gold | Accuracy within 10 points of English units. This is the main open-weight risk; failure triggers `O-06` |
| T2.19 | Rate-limit survival | Run a bulk batch large enough to hit 429s | Limiter throttles, backoff engages, run completes without data loss (`D-019`) |
| T2.20 | Resumability | Kill the job at ~50% and restart | Resumes from the checkpoint; no duplicate units; no re-spent requests on completed documents |
| T2.21 | Requests per document | Measure over a full batch | Recorded, and multiplied out against the plan's daily allowance; closes `O-05` |
| T2.22 | Daily budget stop | Set a low daily request **or token** budget | Job stops cleanly at the ceiling with progress preserved |

---

## Exit criteria

1. Relevance gate meets T2.1–T2.2.
2. Zero unverifiable quotes in published data; pre-drop hallucination rate measured and under 5% (T2.4, T2.5).
3. Primary-axis accuracy ≥ 0.75 with kappa ≥ 0.60 (T2.8, T2.9).
4. Coder self-consistency ≥ 0.80, establishing the gold set as usable (T2.10).
5. Intent-type accuracy ≥ 0.70 (T2.12).
6. Caching, version pinning, and budget abort all verified (T2.15–T2.17).
7. Hinglish within 10 points of English, or `O-06` closed with a documented mitigation (T2.18).
8. Run survives rate limits and resumes from a checkpoint after a kill (T2.19, T2.20).
9. Requests-per-document measured and `O-05` closed — free tier confirmed sufficient, or the paid tier taken (T2.21).
10. Per-stage accuracy numbers exported for the Method & limits page.

---

## Known failure modes

| Failure mode | Detection | Response |
| --- | --- | --- |
| Model paraphrases instead of quoting | T2.4 drop rate | Tighten prompt to "copy exactly"; require character offsets; drop failures |
| Gate rejects real consideration talk that lacks the word "wishlist" | T2.2 recall | Broaden gate definition to deferral and doubt language generally |
| Model infers segments from nothing | T2.13 | Require an explicit textual cue per segment label; else null |
| Everything is labeled "fit" because fit is the obvious answer | Confusion matrix on `decision_factor` | Sharpen code definitions; add negative examples |
| Splitting one thought into many units inflating counts | T2.14 | Cap and review; prevalence is document-based anyway (`D-007`) |
| Gold set built from convenient, easy documents | Review sampling method | Stratify explicitly, include borderline cases |
| Trusting `strict: true` as a truth guarantee | T2.4, T2.5 | It guarantees shape only; the verbatim verifier is the honesty check |
| Open-weight model mangles Hinglish, silently dropping a segment | T2.18 | Few-shot Hinglish examples, or route code-mixed text to the 120B model; report the gap either way |
| Daily request allowance exhausted, run stalls near a deadline | T2.21, T2.22 | Measure early, gate before extract, cache aggressively, upgrade tier if the math does not work |
| Retry storm on 429 burns the remaining allowance | T2.19 | Exponential backoff with jitter and a hard retry cap, not a tight retry loop |

---

## Artifacts to keep

Gold set files with labels, confusion matrices per axis, kappa calculations, hallucination-rate log, tokens and requests per run, requests-per-document measurement, and the Groq model ids and prompt versions used.
