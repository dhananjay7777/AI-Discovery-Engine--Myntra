import { MYNTRA_IOS_APP_ID } from "../config";
import type { CorpusConnector, FetchWindow, FetchedItem } from "../types";
import { fetchJson, sleep } from "./utils";

const META = {
  platform: "app_store",
  collection_method: "Apple iTunes customer review RSS (public JSON feed)",
  terms_notes:
    "Fetches the public RSS JSON feed for Myntra iOS app reviews (id 907394059). No authentication or HTML scraping.",
};

interface AppStoreFeed {
  feed?: {
    entry?: AppStoreEntry | AppStoreEntry[];
  };
}

interface AppStoreEntry {
  id?: { label?: string };
  title?: { label?: string };
  content?: { label?: string };
  updated?: { label?: string };
  author?: { name?: { label?: string }; uri?: { label?: string } };
  link?: { attributes?: { href?: string } } | Array<{ attributes?: { href?: string } }>;
}

function normalizeEntries(
  entry: AppStoreEntry | AppStoreEntry[] | undefined,
): AppStoreEntry[] {
  if (!entry) return [];
  return Array.isArray(entry) ? entry : [entry];
}

function isReviewEntry(entry: AppStoreEntry): boolean {
  const label = entry.id?.label ?? "";
  return /^\d+$/.test(label) && Boolean(entry.content?.label?.trim());
}

export const appStoreConnector: CorpusConnector = {
  meta: META,

  async fetch(_query: string, window: FetchWindow): Promise<FetchedItem[]> {
    const max = window.maxResults ?? 200;
    const items: FetchedItem[] = [];

    for (let page = 1; page <= 20 && items.length < max; page += 1) {
      await sleep(300);
      const url = `https://itunes.apple.com/in/rss/customerreviews/page=${page}/id=${MYNTRA_IOS_APP_ID}/sortby=mostrecent/json`;
      let data: AppStoreFeed;
      try {
        data = await fetchJson<AppStoreFeed>(url);
      } catch {
        break;
      }
      const entries = normalizeEntries(data.feed?.entry).filter(isReviewEntry);

      for (const entry of entries) {
        const text = entry.content?.label?.trim();
        if (!text) continue;

        const link = Array.isArray(entry.link)
          ? entry.link[0]?.attributes?.href
          : entry.link?.attributes?.href;

        items.push({
          external_id: entry.id!.label!,
          url:
            link ??
            `https://apps.apple.com/in/app/id${MYNTRA_IOS_APP_ID}`,
          author_id: entry.author?.name?.label ?? entry.author?.uri?.label ?? null,
          posted_at: entry.updated?.label ?? null,
          text_raw: text,
        });
      }

      if (entries.length === 0) break;
    }

    return items.slice(0, max);
  },
};
