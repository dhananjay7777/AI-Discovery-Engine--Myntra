# Phase 1 Eval — Corpus

<!-- phase-status: complete -->

**Phase goal.** A real, multi-source, deduplicated corpus of public conversation with complete provenance.

**Why this phase is gated.** Every downstream number inherits this corpus's biases. A corpus that is 90% Play Store reviews will produce a confident, well-designed, wrong answer about delivery complaints.

**Note.** The ≥ 3,000 volume floor and ≥ 500 consideration-language floor are **deferred** while collection continues. Automated eval marks them as deferred and does not fail the run.

---

## Tests

| ID | Test | Method | Pass condition |
| --- | --- | --- | --- |
| T1.1 | Volume | Count rows | ≥ 3,000 raw documents collected **(deferred)** |
| T1.2 | Source breadth | Group by platform | ≥ 4 distinct platforms represented |
| T1.3 | Source balance | Share per platform | No single platform > 60% of the corpus; ≥ 3 platforms at ≥ 10% each |
| T1.4 | Provenance completeness | Null check on url, posted_at, collected_at, source, content_hash | 100% populated |
| T1.5 | Permalink validity | Sample 30 documents, open each link | ≥ 28 resolve to the quoted content |
| T1.6 | Exact dedupe | Count duplicate content hashes surviving | Zero |
| T1.7 | Near dedupe | Sample 200 pairs at cosine ≥ 0.95, using local `bge-small-en-v1.5` vectors (`D-018`) | ≥ 90% are genuine near-duplicates; residual near-dup rate in the counted corpus < 2% |
| T1.8 | Over-collapse check | Sample 50 collapsed groups | ≤ 5% collapsed distinct opinions that should have been kept separate |
| T1.9 | Language handling | Sample 100 documents | Language label correct ≥ 90%; Hinglish retained, not discarded |
| T1.10 | Time spread | Histogram by posted_at | No single month > 40% of documents **(deferred while corpus grows)** |
| T1.11 | Author privacy | Inspect stored rows and any API response | No raw usernames or handles anywhere (`D-011`) |
| T1.12 | Terms compliance | Review each connector's access method | All public endpoints/APIs; no authenticated scraping; notes recorded per source |
| T1.13 | Re-run idempotence | Run collection twice on the same window | Second run adds no duplicate rows |
| T1.14 | Consideration-language yield | Count documents matching seed consideration queries | ≥ 500 documents **(deferred)** |
| T1.15 | Minimum word count | Inspect all raw + normalized rows | Every stored document has ≥ 6 words after cleanup |
| T1.16 | No emojis | Regex scan on raw + normalized text | Zero emoji characters in stored corpus |

---

## Exit criteria

1. ≥ 4 platforms, no platform above 60% (T1.2–T1.3). Volume floor deferred (T1.1).
2. Provenance 100% complete; sampled permalinks resolve (T1.4, T1.5).
3. Dedupe verified in both directions — duplicates removed, distinct opinions preserved (T1.6–T1.8).
4. Quality rules enforced: ≥ 6 words, no emojis (T1.15–T1.16).
5. No raw author identifiers stored (T1.11).
6. Collection method for each source documented as terms-compliant (T1.12).
7. Collection is idempotent and re-runnable (T1.13).
8. Corpus stored under `data/published/corpus/{raw,normalized}/{platform}/` with stats in `corpus/meta/`.
9. Corpus stats query produces the numbers the Corpus explorer will display.

---

## Known failure modes

| Failure mode | Detection | Response |
| --- | --- | --- |
| Play/App Store volume swamps everything | T1.3 | Cap per-source intake; report share in Method & limits regardless |
| Corpus is all post-delivery complaints, no consideration talk | T1.14 | Rewrite seed queries toward consideration language before proceeding |
| Aggressive dedupe deletes real distinct voices | T1.8 | Raise the cosine threshold; never dedupe across different authors on text alone |
| Collector silently returns fewer results over time (API changes) | T1.13 plus per-run counts | Per-source count alerts in the run log |
| Recency skew from one viral thread | T1.10 | Cap documents per thread; record the cap |
| Emoji-only or ultra-short reviews pollute the corpus | T1.15, T1.16 | Strip emojis and drop rows under 6 words at ingest |

---

## Artifacts to keep

Corpus stats snapshot (`corpus/meta/corpus_stats.json`), dedupe audit sample, per-connector access notes, and the run id this corpus belongs to.
