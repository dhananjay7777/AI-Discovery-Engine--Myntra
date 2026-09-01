# Phase 3 Eval — Codebook

<!-- phase-status: not_started -->

**Phase goal.** A hybrid taxonomy that ties evidence to the wishlist-conversion metric while still allowing a genuine surprise to surface.

**Why this phase is gated.** The codebook determines what the analysis is *capable* of finding. A purely deductive one can only confirm the brief's existing hunches; a purely inductive one produces clusters no one can act on.

---

## Tests

| ID | Test | Method | Pass condition |
| --- | --- | --- | --- |
| T3.1 | Seed codes are definable | Review each seed code | Every code has a definition plus inclusion and exclusion notes |
| T3.2 | Coverage | Share of relevant units assigned ≥ 1 code | ≥ 90% |
| T3.3 | Other-bucket size | Share of units in `other` | ≤ 10% |
| T3.4 | Code distinctness | Human review of the 10 largest codes | No two codes need the same intervention; overlapping pairs merged |
| T3.5 | Code granularity | Distribution of code sizes | No single code holds > 35% of units; codes with < 10 units either merged or kept with a documented reason |
| T3.6 | Inductive yield | Count human-accepted inductive codes | ≥ 3 accepted codes not derivable from the seed set — evidence the engine discovers rather than confirms |
| T3.7 | Inductive quality | Human review of every proposed cluster | Each accepted cluster is coherent on a 20-quote read; incoherent clusters rejected, not renamed |
| T3.7a | Clustering is quota-free | Inspect the clustering job | Embeddings computed locally; re-running cluster parameters consumes no Groq requests (`D-018`) |
| T3.8 | Price code separation | Inspect the price-related codes | Distinct codes exist for price level, price timing, and value uncertainty (`D-010`) |
| T3.9 | Assignment accuracy | 150 units, code assignment vs human | ≥ 0.75 accuracy |
| T3.10 | Assignment agreement | Kappa on the same sample | ≥ 0.60 |
| T3.11 | Multi-code handling | Sample 50 multi-coded units | Multiple codes justified; not the model hedging across everything |
| T3.12 | Stability across runs | Re-code a fixed 200-unit sample twice | ≥ 85% identical assignments |
| T3.13 | Versioning | Inspect the codebook collection and log | Version recorded; every merge and split logged with a reason. Embedding model id versioned alongside, since changing it invalidates stored vectors (`D-018`) |
| T3.14 | Metric relevance | Review each code | Every code has a written, plausible link to at least one node of the wishlist→purchase tree, or is explicitly marked out-of-scope |
| T3.15 | Segment cross-tab viability | Cross-tab codes by segment signal | Enough cell density to say something; sparse cells flagged rather than reported as findings |

---

## Exit criteria

1. Coverage ≥ 90% with the `other` bucket ≤ 10% (T3.2, T3.3).
2. At least 3 human-accepted inductive codes (T3.6).
3. Price level, price timing, and value uncertainty separated (T3.8).
4. Assignment accuracy ≥ 0.75, kappa ≥ 0.60 (T3.9, T3.10).
5. Re-run stability ≥ 85% (T3.12).
6. Codebook versioned with a merge/split log (T3.13).
7. Every in-scope code mapped to at least one metric-tree node (T3.14).

---

## Known failure modes

| Failure mode | Detection | Response |
| --- | --- | --- |
| One giant "fit and size" code absorbing everything | T3.5 | Split by the actual uncertainty — measurement, brand inconsistency, fabric stretch, body-shape fit |
| Fifty tiny codes no one can act on | T3.5, T3.4 | Merge by intervention, not by wording |
| Inductive clusters accepted because the model named them well | T3.7 | Read 20 quotes per cluster before accepting; rejection is a valid outcome |
| Codes drift between runs, invalidating comparisons | T3.12, T3.13 | Freeze the codebook version before the production run |
| Price collapses into "wants discount" and gets excluded wholesale | T3.8 | Keep the three-way split; value uncertainty is in scope, price level is not |
| Segment findings from three quotes | T3.15 | Minimum cell size before any segment claim is displayed |

---

## Artifacts to keep

Versioned codebook with definitions, the inductive cluster review log with accept/reject reasons, coverage report, confusion matrix for assignment, and the code → metric-node mapping table.
