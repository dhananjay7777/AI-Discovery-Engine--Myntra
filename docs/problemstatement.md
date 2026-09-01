# Problem Statement: AI-Powered Discovery Engine

**Product:** Myntra  
**Team:** Growth  
**Form factor:** A standalone website, deployed and publicly accessible  
**Scope:** Part 1 — discover the underlying user problem at scale before proposing any solution  
**Constraint (downstream):** the eventual intervention **cannot** use monetary incentives (discounts, cashback, coupons, or price-matching)

---

## 1. Context

Myntra is a large-scale fashion marketplace. Millions of users browse products, save items they like, and add them to wishlists.

A wishlist is a high-intent but incomplete signal: the user has expressed explicit interest and stopped short of buying. Over time, users accumulate dozens—or hundreds—of wishlisted items. Only a small share converts to a purchase.

The Growth team’s strategic goal is to:

> **Increase the percentage of users who purchase at least one item from their wishlist within 30 days of adding it.**

Improving wishlist-to-purchase conversion would raise purchase frequency, monetize existing demand, and extract more value from intent already present on the platform.

**The underlying user problem is not given.** It must be discovered. The Discovery Engine exists to do that discovery at scale, from public conversations, before any solution is designed.

---

## 2. The Problem This Engine Must Solve

Today, product teams infer why wishlists stall from internal dashboards, a handful of reviews, or anecdotal support tickets. That is too thin for a metric as noisy as wishlist conversion.

Wishlist non-conversion is not one problem. It may be fit anxiety, size uncertainty, styling doubt, price hesitation, social validation, occasion timing, comparison paralysis, or the wishlist being used as a bookmark rather than a buy list. These causes differ by segment. Sentiment scores and star ratings do not separate them.

**Without a product that can read unstructured user conversation at scale, quantify competing opportunity areas, and compare them against the 30-day wishlist conversion metric, the team will pick the wrong problem—and ship the wrong product.**

The Discovery Engine is that product: a website a Growth PM can open, run, and inspect.

---

## 3. What the Engine Must Do

Build and **deploy a website** that analyzes public user feedback about Myntra and online fashion shopping, and produces **decision-grade discovery**—not a review summary, not a private notebook, not an n8n/Zapier workflow.

It must:

1. **Ingest** publicly available conversations about online fashion shopping (Myntra-specific where possible, category-level where useful).
2. **Go beyond sentiment.** Classify *jobs*, *blockers*, *uncertainties*, *workarounds*, and *segment differences*—not just positive vs. negative.
3. **Map findings** to behaviors that can move **wishlist → purchase within 30 days**.
4. **Identify, quantify where possible, and compare** opportunity areas so a PM can choose where to go deep in primary research.
5. **Surface evidence in the UI** (quotes, source, frequency, confidence) so claims are auditable from the site itself.
6. **Be usable by a reviewer with only a URL**—run analysis, browse ranked opportunities, drill into evidence, and see what is still unknown.

### Sources in scope

- App Store reviews  
- Play Store reviews  
- Reddit discussions  
- Fashion and shopping communities  
- Social media conversations  
- YouTube comments  
- Product reviews and Q&A where relevant  
- Other public conversations about online fashion shopping in India  

### Delivery (locked)

| In | Out |
| --- | --- |
| A custom website (frontend + backend as needed), hosted online | n8n, Zapier, or other no-code workflow tools as the product |
| AI models/APIs as the analysis layer | A local-only script, spreadsheet, or slide deck as the engine |
| A public URL that can be tested without setup | Private notebooks or agent chats that cannot be shared |

The site *is* the Discovery Engine. Models, agents, and pipelines sit behind it.

---

## 4. Questions the Engine Must Answer

| Theme | Questions |
| --- | --- |
| Intent | Why do users add fashion products to a wishlist? When is a wishlist genuine purchase intent vs. a bookmark? |
| Blockers | What prevents wishlisted products from being purchased? What causes users to postpone? |
| Uncertainty | What doubts remain after a user has identified a product they like? What information do they still need? |
| Comparison | How do users compare shortlisted products? What do they seek *outside* Myntra before buying? |
| Decision factors | What role do fit, size, styling, price, reviews, occasion, and social validation play? |
| Segments | How do these behaviors differ across user segments (e.g. first-time vs. repeat, value vs. premium, occasion shoppers)? |
| Opportunity | What unmet needs appear consistently? Which of those, if solved *without* monetary incentives, could move 30-day wishlist conversion? |

---

## 5. What “Good” Looks Like

The engine is successful if a Growth PM can open the **deployed website** and, from the product alone:

- Name **3–6 competing opportunity areas** that could influence 30-day wishlist conversion.  
- Rank them with **evidence volume, severity, segment concentration, and actionability** (no discounts).  
- See **representative quotes and source mix**, not only aggregates.  
- Know **what is still unknown** and therefore what primary research must validate.  
- Trace a clear line: **Business metric → user behaviors → evidence → ranked opportunities.**

A sentiment dashboard, a generic “users care about quality and delivery” summary, an unranked list of complaints, or a backend that only works in a local terminal is a failure.

---

## 6. Out of Scope for This Engine

- n8n, Zapier, Make, or similar workflow builders as the delivery vehicle.  
- Designing or shipping the conversion MVP (that follows after discovery + interviews).  
- Offering or simulating discounts, coupons, or other monetary incentives.  
- Claiming a root-cause problem as *the* problem before primary research.  
- Using private or non-public user data.

The engine’s job is discovery, delivered as a live site. Problem definition, solution, and success metrics come after.

---

## 7. How This Feeds the Rest of the Work

```
Business metric (30-day wishlist → purchase)
        ↓
Product outcomes & user behaviors that could move it
        ↓
AI Discovery Engine (deployed website)  ← this problem statement
        ↓
Primary research (5–6 interviews on the chosen segment + opportunity)
        ↓
Problem definition
        ↓
MVP (no monetary incentives) + success metrics + risks
```

The engine’s ranked opportunities are the input to interview design. Interviews confirm or kill the hypothesis. Only then is the problem locked.

---

## 8. Deliverable for This Phase

A **publicly deployed website** that *is* the AI Discovery Engine:

- A URL anyone can open—no n8n instance, no local install, no API-key ritual for the reviewer.  
- In-product output that answers the questions in §4 and meets the bar in §5.  
- A one-slide explanation of how the site works (sources → processing → opportunity ranking → UI).
