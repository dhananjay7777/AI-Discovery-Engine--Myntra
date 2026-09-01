import gplay from "google-play-scraper";
import { FASHION_PLAY_APP_IDS } from "../config";
import type { CorpusConnector, FetchWindow, FetchedItem } from "../types";

const META = {
  platform: "play_store",
  collection_method: "google-play-scraper npm package (public Play Store pages)",
  terms_notes:
    "Reads publicly listed app reviews via the unofficial google-play-scraper library. No authentication. Myntra and peer fashion apps only.",
};

export const playStoreConnector: CorpusConnector = {
  meta: META,

  async fetch(query: string, window: FetchWindow): Promise<FetchedItem[]> {
    const max = window.maxResults ?? 200;
    const appId = FASHION_PLAY_APP_IDS.find((id) => query.includes(id)) ??
      FASHION_PLAY_APP_IDS[0];
    const items: FetchedItem[] = [];
    let token: string | undefined;

    while (items.length < max) {
      const batchSize = Math.min(200, max - items.length);
      const result = await gplay.reviews({
        appId,
        sort: 2, // NEWEST
        num: batchSize,
        paginate: true,
        nextPaginationToken: token,
      });

      for (const review of result.data) {
        if (!review.text?.trim()) continue;
        items.push({
          external_id: review.id,
          url: review.url ?? `https://play.google.com/store/apps/details?id=${appId}&reviewId=${review.id}`,
          author_id: review.userName ?? null,
          posted_at: review.date ? new Date(review.date).toISOString() : null,
          text_raw: review.text,
        });
      }

      token = result.nextPaginationToken ?? undefined;
      if (!token || result.data.length === 0) break;
    }

    return items.slice(0, max);
  },
};
