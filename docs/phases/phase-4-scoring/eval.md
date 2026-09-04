# Phase 4 Eval — Scoring

<!-- phase-status: complete -->

**Phase goal.** A ranked shortlist of opportunity areas, each linked to the metric it would move, each stable enough to bet interview time on.

**Why this phase is gated.** This is the output a PM acts on. If the ranking flips when a weight moves 10%, it is not a finding — it is an opinion with decimals.

---

## Tests

| ID | Test | Method | Pass condition |
| --- | --- | --- | --- |
| T4.1 | Shortlist size | Count recommended opportunities | 3–6, per problem statement §5 |
| T4.2 | One intervention per area | Human review | Each opportunity could plausibly be addressed by a single coherent product change |
| T4.3 | Prevalence is document-based | Read the query | Counted over distinct post-dedupe documents, never unit rows (`D-007`) |
| T4.4 | Prevalence hand-check | Recompute two opportunities manually | Matches pipeline output exactly |
| T4.5 | Component independence | Correlation matrix of components | No two components correlate > 0.9; if they do, one is redundant |
| T4.6 | Weight perturbation | ±25% on each weight, one at a time | Top 3 unchanged in ≥ 80% of perturbations |
| T4.7 | Bootstrap stability | 500 resamples of documents | Top 3 membership stable in ≥ 80% of resamples |
| T4.8 | Single-source leave-one-out | Drop each platform in turn, rescore | No opportunity enters or leaves the top 3 solely from removing one platform; if it does, it is labeled source-dependent in the UI |
| T4.9 | Confidence is separate | Inspect schema and UI data | `score` and `confidence` stored and displayed independently (`D-016`) |
| T4.10 | Confidence discriminates | Compare confidence for thin vs thick evidence areas | Thin-evidence opportunities score measurably lower confidence |
| T4.11 | Non-monetary filter | Inspect flags | Monetary-only opportunities excluded from the recommended set but still visible and labeled (`D-010`) |
| T4.12 | Value uncertainty retained | Check that price-timing and value-uncertainty codes survive the filter | Present in scoring, not swept out with price level |
| T4.13 | Counter-evidence exists | Every opportunity | ≥ 3 genuine contradicting or complicating quotes retrieved per opportunity |
| T4.14 | Counter-evidence is real | Human review | Quotes actually challenge the claim; not strawmen |
| T4.15 | Metric mapping | Every opportunity | Linked to ≥ 1 `outcome_node` with a written rationale |
| T4.16 | Mapping honesty | Review rationales | Each states the assumed mechanism, and no rationale claims an effect size the evidence cannot support |
| T4.17 | Open questions | Every opportunity | ≥ 3 specific unknowns listed that only user research can resolve (`D-014`) |
| T4.18 | Reproducibility | Re-run scoring on the same corpus and codebook | Identical scores |
| T4.19 | Segment attribution | Opportunities with a segment skew | Skew backed by minimum cell size; otherwise reported as "segment unclear" |
| T4.20 | No conclusion overreach | Read all opportunity write-ups | None asserts a root cause; all are framed as hypotheses to validate |

---

## Exit criteria

1. 3–6 recommended opportunities, each one intervention wide (T4.1, T4.2).
2. Prevalence document-based and hand-verified (T4.3, T4.4).
3. Ranking survives weight perturbation, bootstrap, and leave-one-platform-out (T4.6–T4.8).
4. Confidence separate from score and actually discriminating (T4.9, T4.10).
5. Non-monetary filter enforced without discarding value uncertainty (T4.11, T4.12).
6. Counter-evidence and open questions present for every opportunity (T4.13, T4.17).
7. Every opportunity mapped to the metric tree with an honest rationale (T4.15, T4.16).
8. Scoring reproducible (T4.18).
9. Open decision `O-03` in [`decision.md`](../../decision.md#open-decisions) closed with stability evidence.

---

## Known failure modes

| Failure mode | Detection | Response |
| --- | --- | --- |
| Weights reverse-engineered to promote a favored hypothesis | T4.6, published weights | Set weights before seeing results; publish them; report perturbation outcomes |
| "Users want lower prices" tops the ranking | T4.11 | Hard filter; separate price level from price timing and value uncertainty |
| Top opportunity is an artifact of Play Store review volume | T4.8 | Source-bias penalty plus explicit source-dependent labeling |
| Prevalence quietly counted on units | T4.3, T4.4 | Code review of the aggregate query; hand-check |
| Ranking that looks precise but is noise | T4.7 | Report confidence bands; if unstable, present as a tie rather than a rank |
| Counter-evidence quietly omitted because it weakens the story | T4.13, T4.14 | Mandatory field; an opportunity without counter-evidence cannot publish |
| Score is impressive but the mechanism to the metric is hand-waved | T4.16 | Rationale must name the behavior that changes and the node it moves |

---

## Artifacts to keep

Scoring config with weights, component score table, perturbation and bootstrap results, leave-one-platform-out table, counter-evidence sets, opportunity → metric-node mapping with rationales, and the open-questions list per opportunity.
