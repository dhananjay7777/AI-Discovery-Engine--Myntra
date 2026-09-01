# Phase 6 Eval — Deploy & Harden

<!-- phase-status: not_started -->

**Phase goal.** The engine is safe to leave on the public internet and safe to hand to a stranger who will click everything.

**Why this phase is gated.** A public URL with model APIs behind it is an open invoice and an open attack surface. This phase is what makes "deployed" mean deployed rather than demoed.

---

## Tests

| ID | Test | Method | Pass condition |
| --- | --- | --- | --- |
| T6.1 | Cold-open | Open the URL on a clean device, new network, no cache, logged out of everything | Full site works; nothing requires setup |
| T6.2 | Production run published | Inspect the site | Data comes from a complete production run with metadata shown |
| T6.3 | Live demo run works | Trigger it as an anonymous visitor | Completes end-to-end and shows stage-by-stage progress |
| T6.4 | Demo latency | Time 5 demo runs | Completes in < 90s, or streams progress so the wait is legible |
| T6.5 | Demo caps enforced | Attempt to exceed document and token caps | Hard stop with a clear message, no silent overrun (`D-013`) |
| T6.5a | Demo cannot starve the pipeline | Exhaust the demo's reserved quota slice, then run a pipeline job | Pipeline job still has allowance; demo degrades to cached results (`D-019`) |
| T6.5b | Groq 429 during a demo | Force a rate limit mid-demo | Visitor sees an honest "busy, try again" state, not a crash or a blank page |
| T6.6 | Rate limiting | Fire rapid repeated demo requests from one IP | Throttled with an explanatory response, not a crash |
| T6.7 | Sandbox isolation | Run the demo, then inspect published data | Demo output written to the sandbox namespace only; published corpus untouched (`D-006`) |
| T6.8 | Cost and quota ceiling | Attempt to breach the per-run token budget and the daily request budget | Both abort cleanly; partial results not published |
| T6.9 | Cost and quota projection | Estimate tokens, requests, and dollars for 100 demo runs | Within the stated ceilings on both dimensions; documented |
| T6.10a | Model availability | Confirm the configured Groq model ids are live | Ids resolve against the models endpoint; a deprecation shows up as a config change, not a broken site |
| T6.10 | Secret exposure | Inspect client bundle, network tab, and public API responses | No keys, no connection strings, no service tokens |
| T6.11 | Write protection | Attempt writes through every public route; inspect published JSON | All rejected; published collections unchanged |
| T6.12 | Injection resistance | Submit hostile input to the demo (prompt injection, oversized payload, malformed URL) | Input validated; injected instructions do not change pipeline behavior; no crash. Strict schema limits the blast radius but is not the defense — treating fetched text as data is |
| T6.13 | Malicious URL handling | Submit a private/internal address to the demo input | Rejected by allowlist or validation (relates to open decision `O-04`) |
| T6.14 | Failure transparency | Kill a dependency mid-run | Clear error state; no partial results presented as complete |
| T6.15 | Uptime | Monitor across 48 hours | No unexplained downtime; a health check exists |
| T6.16 | Load | 20 concurrent readers | Pages stay under 3s; no errors |
| T6.17 | Data integrity after deploy | Compare published aggregates on the site against the JSON files | Identical |
| T6.18 | Rollback | Deploy a bad build, then revert | Previous version restorable in minutes |
| T6.19 | Reproducibility from the outside | Follow the site's own method description | An outsider could describe how a number was produced |

---

## Exit criteria

1. Cold-open passes on a clean device and network (T6.1).
2. Site serves a complete production run with visible metadata (T6.2).
3. Live demo runs for an anonymous visitor, within caps, isolated to the sandbox (T6.3–T6.7).
4. Token and request ceilings both verified by attempting to breach them; 100-run projection documented (T6.8, T6.9).
5. Demo traffic cannot exhaust the allowance a production run needs (T6.5a).
6. Configured Groq model ids verified live (T6.10a).
7. No secrets exposed; no public write path (T6.10, T6.11).
8. Hostile and malformed input handled safely (T6.12, T6.13).
9. Stable across 48 hours and under 20 concurrent readers (T6.15, T6.16).
10. Open decision `O-04` in [`decision.md`](../../decision.md#open-decisions) closed.

---

## Known failure modes

| Failure mode | Detection | Response |
| --- | --- | --- |
| Demo becomes a free Groq endpoint for strangers | T6.5, T6.6, T6.9 | Caps, per-IP limits, caching, curated input options |
| Demo traffic exhausts the daily allowance before a re-run | T6.5a | Reserved quota slice for the pipeline; demo falls back to cached results |
| A configured Groq model is deprecated and the demo 400s | T6.10a | Config-driven ids, production-tier models, availability check in the health endpoint |
| Prompt injection via pasted content redirects the pipeline | T6.12 | Treat all fetched text as data, never as instructions; validate structured output |
| Demo writes into the published corpus and corrupts findings | T6.7 | Separate `data/sandbox/` namespace; demo routes must not call published write |
| Works on the build machine, breaks in the serverless runtime | T6.1 | Test only against production, on a device that never ran the project |
| Long demo run looks broken and reviewer leaves | T6.4 | Stream progress per stage; state the expected duration up front |
| Reviewer opens it the day after and the site is down | T6.15 | Health check plus a static fallback for the published run |

---

## Artifacts to keep

Production URL, run metadata, cap and rate-limit configuration, cost projection, security check results, load test output, and the cold-open test notes.
