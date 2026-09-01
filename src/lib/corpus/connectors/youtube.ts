import { YOUTUBE_DELAY_MS } from "../config";
import type { CorpusConnector, FetchWindow, FetchedItem } from "../types";
import { applyThreadCap, fetchJson, sleep } from "./utils";

const META = {
  platform: "youtube",
  collection_method: "YouTube Data API v3 (search.list + commentThreads.list)",
  terms_notes:
    "Official YouTube Data API with YOUTUBE_API_KEY. Public video comments only; respects daily search quota.",
};

interface YouTubeSearchResponse {
  items?: Array<{ id?: { videoId?: string } }>;
  nextPageToken?: string;
}

interface YouTubeCommentsResponse {
  items?: Array<{
    id: string;
    snippet?: {
      topLevelComment?: {
        id: string;
        snippet?: {
          textDisplay?: string;
          authorChannelId?: { value?: string };
          publishedAt?: string;
          videoId?: string;
        };
      };
    };
  }>;
  nextPageToken?: string;
}

function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) {
    throw new Error("YOUTUBE_API_KEY is required for YouTube collection");
  }
  return key;
}

export const youtubeConnector: CorpusConnector = {
  meta: META,

  async fetch(query: string, window: FetchWindow): Promise<FetchedItem[]> {
    const max = window.maxResults ?? 100;
    const key = apiKey();
    const items: FetchedItem[] = [];
    const videoIds: string[] = [];
    let searchPageToken: string | undefined;

    while (videoIds.length < 15) {
      await sleep(YOUTUBE_DELAY_MS);
      const params = new URLSearchParams({
        part: "snippet",
        q: query,
        type: "video",
        maxResults: "10",
        order: "relevance",
        key,
      });
      if (searchPageToken) params.set("pageToken", searchPageToken);

      const search = await fetchJson<YouTubeSearchResponse>(
        `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
      );

      for (const item of search.items ?? []) {
        const videoId = item.id?.videoId;
        if (videoId) videoIds.push(videoId);
      }

      searchPageToken = search.nextPageToken;
      if (!searchPageToken) break;
    }

    for (const videoId of videoIds) {
      if (items.length >= max) break;
      let pageToken: string | undefined;

      do {
        await sleep(YOUTUBE_DELAY_MS);
        const params = new URLSearchParams({
          part: "snippet",
          videoId,
          maxResults: "100",
          textFormat: "plainText",
          key,
        });
        if (pageToken) params.set("pageToken", pageToken);

        let comments: YouTubeCommentsResponse;
        try {
          comments = await fetchJson<YouTubeCommentsResponse>(
            `https://www.googleapis.com/youtube/v3/commentThreads?${params.toString()}`,
          );
        } catch {
          break;
        }

        for (const thread of comments.items ?? []) {
          const top = thread.snippet?.topLevelComment;
          const snippet = top?.snippet;
          const text = snippet?.textDisplay?.trim();
          if (!text || !top?.id || !snippet) continue;

          items.push({
            external_id: top.id,
            url: `https://www.youtube.com/watch?v=${videoId}&lc=${top.id}`,
            author_id: snippet.authorChannelId?.value ?? null,
            posted_at: snippet.publishedAt ?? null,
            text_raw: text,
            thread_id: videoId,
          });
          if (items.length >= max) break;
        }

        pageToken = comments.nextPageToken;
      } while (pageToken && items.length < max);
    }

    return applyThreadCap(items, 25).slice(0, max);
  },
};
