# Data store

JSON collections that replace a hosted database (`D-020`).

## Layout

```
data/
  published/
    corpus/                         # Phase 1 — multi-source public corpus
      raw/                          # Immutable capture, one file per source
        play_store/documents.json
        app_store/documents.json
        reddit/documents.json
        youtube/documents.json
        hacker_news/documents.json
      normalized/                   # Cleaned, deduped, embedded (per source)
        play_store/documents.json
        ...
      meta/
        sources.json                # Platform registry + terms notes
        corpus_stats.json           # Per-source scrape counts, shares, last run (npm run phase1:stats)
    runs.json                       # Phase 0+ analysis run metadata
    evidence_units.json             # Phase 2+
    ...                             # Other analysis collections
  sandbox/                          # Live demo output + groq_daily_budget.json (gitignored)
```

## Corpus quality rules (Phase 1)

- **Minimum length:** reviews/comments must have at least **6 words** after cleanup.
- **No emojis:** stripped at ingest — they carry no analytic meaning for this engine.
- **Language:** English and Hinglish retained (`D-015`).

Counting (prevalence, source mix, scores) is done in TypeScript over these arrays. The LLM never estimates size.

## Commands

```bash
npm run phase1:collect          # Collect + normalize into corpus/
npm run phase1:stats            # Regenerate corpus/meta/corpus_stats.json from disk
npm run phase1:eval             # Run Phase 1 eval checks
npm run phase2:plan             # Print Phase 2 Groq call calendar vs quota
npm run phase1:migrate-layout   # One-time migration from legacy flat JSON
```
