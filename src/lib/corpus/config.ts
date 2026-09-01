/** Per-source intake caps to keep platform mix within Phase 1 eval bounds (T1.3). */

export const NEAR_DEDUPE_COSINE = 0.95;

/** Minimum words required in a review/comment after cleanup. */
export const MIN_WORD_COUNT = 6;

/** Max documents ingested per platform on a full collection run. */
export const SOURCE_CAPS: Record<string, number> = {
  play_store: 900,
  app_store: 900,
  reddit: 900,
  youtube: 800,
  hacker_news: 800,
};

/** Max items taken from one thread (post / video) to limit viral skew (T1.10). */
export const MAX_PER_THREAD = 25;

/** Delay between Reddit API calls (ms). */
export const REDDIT_DELAY_MS = 1200;

/** Delay between YouTube API calls (ms). */
export const YOUTUBE_DELAY_MS = 300;

/** Myntra app identifiers. */
export const MYNTRA_PLAY_APP_ID = "com.myntra.android";
export const MYNTRA_IOS_APP_ID = "907394059";

/** Fashion-related Play Store apps for broader consideration-language yield. */
export const FASHION_PLAY_APP_IDS = [
  MYNTRA_PLAY_APP_ID,
  "com.ril.ajio",
  "com.flipkart.android",
];
