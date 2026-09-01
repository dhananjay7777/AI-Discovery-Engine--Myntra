# Phase 1 connector access notes (T1.12)

| Platform | Method | Terms / compliance |
| --- | --- | --- |
| `play_store` | `google-play-scraper` npm package reading public Play Store review pages | Unofficial library; public data only; Myntra + peer fashion apps (`com.myntra.android`, `com.ril.ajio`, `com.flipkart.android`). No authentication. |
| `app_store` | Apple iTunes customer review RSS JSON (`itunes.apple.com/.../rss/customerreviews/...`) | Public feed published by Apple for Myntra iOS app (`907394059`); no HTML scraping or login. |
| `reddit` | Arctic Shift Photon Reddit archive API (`arctic-shift.photon-reddit.com`) | Public historical Reddit archive; fashion-related subreddits; author display names hashed on ingest (`author_hash`). |
| `youtube` | YouTube Data API v3 (`search.list`, `commentThreads.list`) with `YOUTUBE_API_KEY` | Official API; public comments only. Search quota capped per run. |
| `hacker_news` | Hacker News Algolia public search API (`hn.algolia.com`) | Public search API for stories and comments about fashion shopping and ecommerce; permalinks to news.ycombinator.com. |

All connectors avoid authenticated scraping and store hashed author identifiers only (`D-011`).
