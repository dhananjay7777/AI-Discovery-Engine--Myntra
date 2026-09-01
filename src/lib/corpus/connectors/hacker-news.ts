import type { CorpusConnector, FetchWindow, FetchedItem } from "../types";
import { fetchJson, sleep } from "./utils";

const META = {
  platform: "hacker_news",
  collection_method: "Hacker News Algolia public search API",
  terms_notes:
    "Uses the public hn.algolia.com API for stories and comments mentioning fashion shopping topics. No authentication.",
};

interface HnHit {
  objectID: string;
  comment_text?: string;
  story_title?: string;
  story_text?: string;
  title?: string;
  url?: string;
  author?: string;
  created_at?: string;
  created_at_i?: number;
  story_id?: number;
}

interface HnResponse {
  hits?: HnHit[];
  nbPages?: number;
}

function hitToItem(hit: HnHit, kind: "comment" | "story"): FetchedItem | null {
  const text =
    kind === "comment"
      ? hit.comment_text?.replace(/&#x2F;/g, "/").replace(/&amp;/g, "&").trim()
      : [hit.title, hit.story_text].filter(Boolean).join("\n\n").trim();

  if (!text) return null;

  const storyId = hit.story_id ?? hit.objectID;
  const url =
    kind === "comment"
      ? `https://news.ycombinator.com/item?id=${hit.objectID}`
      : hit.url && hit.url.startsWith("http")
        ? hit.url
        : `https://news.ycombinator.com/item?id=${storyId}`;

  if (!url.startsWith("http")) return null;

  return {
    external_id: `${kind}-${hit.objectID}`,
    url,
    author_id: hit.author ?? null,
    posted_at: hit.created_at ?? (hit.created_at_i
      ? new Date(hit.created_at_i * 1000).toISOString()
      : null),
    text_raw: text,
    thread_id: String(storyId),
  };
}

export const hackerNewsConnector: CorpusConnector = {
  meta: META,

  async fetch(query: string, window: FetchWindow): Promise<FetchedItem[]> {
    const max = window.maxResults ?? 80;
    const items: FetchedItem[] = [];

    for (const tag of ["comment", "story"] as const) {
      for (let page = 0; page < 5 && items.length < max; page += 1) {
        await sleep(300);
        const params = new URLSearchParams({
          query,
          tags: tag,
          hitsPerPage: "50",
          page: String(page),
        });

        const data = await fetchJson<HnResponse>(
          `https://hn.algolia.com/api/v1/search?${params.toString()}`,
        );

        for (const hit of data.hits ?? []) {
          const item = hitToItem(hit, tag === "comment" ? "comment" : "story");
          if (item) items.push(item);
          if (items.length >= max) break;
        }

        if ((data.nbPages ?? 0) <= page + 1) break;
      }
    }

    return items.slice(0, max);
  },
};
