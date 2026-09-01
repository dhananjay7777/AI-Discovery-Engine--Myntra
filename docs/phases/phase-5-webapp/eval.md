# Phase 5 Eval — Web App

<!-- phase-status: not_started -->

**Phase goal.** A reviewer holding only the URL can do everything problem statement §5 requires, unaided.

**Why this phase is gated.** The analysis can be excellent and still fail the brief if the site does not let someone else verify it. The test here is behavioral, not aesthetic.

---

## The reviewer task test

Recruit 3 people who have not seen the project. Give them the URL and nothing else. No walkthrough, no explanation, no answering questions during the test.

| Task | Derived from | Pass condition |
| --- | --- | --- |
| R1 | Name the top opportunity areas and why they rank that way | Correctly names them and cites at least one score component |
| R2 | Judge whether the top opportunity is trustworthy | Finds prevalence, confidence, source mix, and counter-evidence without prompting |
| R3 | Read the actual user words behind a claim | Reaches verbatim quotes with permalinks from the claim itself |
| R4 | State which metric lever the opportunity pulls | Locates the metric tree and names the node |
| R5 | State what the analysis cannot tell you | Finds Method & limits and names a real limitation |
| R6 | Say what to ask users next | Reaches the open questions / interview guide |

**Pass:** 3 of 3 reviewers complete all six tasks in under 10 minutes with no assistance. If two or more stall on the same task, the failure is the UI's, not the reviewer's.

---

## Tests

| ID | Test | Method | Pass condition |
| --- | --- | --- | --- |
| T5.1 | Surfaces present | Walk the nav | All nine surfaces from `architecture.md` §6 exist and are reachable |
| T5.2 | Numbers are drillable | Click 15 displayed numbers | Every one leads to the evidence behind it; no dead-end figures |
| T5.3 | Quote provenance | Sample 20 displayed quotes | Each shows platform, date, working permalink |
| T5.4 | Quote fidelity | Compare 20 displayed quotes against stored documents | Exact match, no silent trimming that changes meaning |
| T5.5 | Counter-evidence placement | Inspect opportunity detail pages | On the same page as the claim, not in an appendix or a collapsed section |
| T5.6 | Weights visible | Inspect the board or method page | Scoring weights shown in-product |
| T5.7 | Eval scores visible | Inspect Method & limits | Gold-set accuracy, kappa, gate precision/recall, hallucination drop rate, and the Hinglish-vs-English gap all published |
| T5.8 | Bias disclosure | Inspect Method & limits | Source mix, self-selection bias, and the "what this cannot see" list all stated plainly |
| T5.9 | Run metadata | Any page | Run date, document count, unit count, and exact Groq model ids visible |
| T5.10 | Segment honesty | Segment view | Low-cell-size findings marked as unclear, not shown as results |
| T5.11 | No conclusion overreach | Read all copy | No page declares a root cause (`D-014`) |
| T5.12 | Monetary labeling | Board | Excluded monetary-only opportunities visible and labeled with the reason |
| T5.13 | Empty and error states | Force a query with no data, and a failed fetch | Explicit, non-blank states; no crash |
| T5.14 | Performance | Measure key pages | p95 load < 2.5s on a normal connection |
| T5.15 | Mobile | Open on a phone | Board, detail, and quotes usable; tables scroll rather than overflow |
| T5.16 | Accessibility basics | Keyboard-only pass plus contrast check | All interactive elements reachable; text meets AA contrast |
| T5.17 | Charts readable without color alone | Review charts | Labels or patterns carry the meaning, not hue alone |
| T5.18 | No client-side secrets | Inspect the bundle | Zero matches |
| T5.19 | Deep links | Copy an opportunity URL, open in a clean session | Loads the same view |

---

## Exit criteria

1. Reviewer task test passes 3 of 3 (R1–R6).
2. All nine surfaces present and reachable (T5.1).
3. Every displayed number drills to evidence (T5.2).
4. Quotes carry accurate provenance and exact text (T5.3, T5.4).
5. Counter-evidence, weights, eval scores, and bias disclosure all in-product (T5.5–T5.8).
6. No page overclaims a root cause (T5.11).
7. Performance, mobile, and basic accessibility pass (T5.14–T5.16).

---

## Known failure modes

| Failure mode | Detection | Response |
| --- | --- | --- |
| Site looks impressive, reviewer cannot verify a single claim | R2, R3 | Make evidence the primary navigation path, not a detail view |
| Method & limits buried, so the work reads as overconfident | R5 | Link it from every opportunity page |
| Charts that decorate rather than inform | T5.2 | Every chart must be clickable into evidence or be deleted |
| Counter-evidence hidden in a collapsed panel | T5.5 | Same-page, same-prominence placement |
| Reviewer thinks the ranking is a conclusion | R1, T5.11 | Copy reframed as "where to look first", plus visible open questions |
| Beautiful desktop, unusable on a phone | T5.15 | Reviewers will open it on a phone; treat mobile as required |

---

## Artifacts to keep

Reviewer test notes with timings and stall points, screenshots of each surface, performance measurements, and the accessibility pass checklist.
