import { REDDIT_SUBREDDITS } from "../queries";
import type { CorpusConnector, FetchWindow, FetchedItem } from "../types";
import { applyThreadCap, fetchJson, sleep } from "./utils";

const META = {
  platform: "reddit",
  collection_method:
    "Arctic Shift Photon Reddit archive API (public historical Reddit data)",
  terms_notes:
    "Uses the public arctic-shift.photon-reddit.com archive API for posts and comments from fashion-related subreddits. No Reddit authentication or HTML scraping.",
};

const BASE = "https://arctic-shift.photon-reddit.com/api";

interface ArcticPost {
  id: string;
  title?: string;
  selftext?: string;
  permalink?: string;
  author?: string;
  created_utc?: number;
}

interface ArcticComment {
  id: string;
  body?: string;
  permalink?: string;
  author?: string;
  created_utc?: number;
  link_id?: string;
}

interface ArcticResponse<T> {
  data?: T[];
}

async function fetchPosts(
  subreddit: string,
  limit: number,
): Promise<FetchedItem[]> {
  const items: FetchedItem[] = [];
  let before: number | undefined;

  while (items.length < limit) {
    await sleep(400);
    const params = new URLSearchParams({
      subreddit,
      limit: String(Math.min(100, limit - items.length)),
      sort: "desc",
    });
    if (before) params.set("before", String(before));

    const response = await fetchJson<ArcticResponse<ArcticPost>>(
      `${BASE}/posts/search?${params.toString()}`,
    ).catch(() => ({ data: [] as ArcticPost[] }));

    const batch = response.data ?? [];
    if (batch.length === 0) break;

    for (const post of batch) {
      const title = post.title?.trim() ?? "";
      const body = post.selftext?.trim() ?? "";
      const text = [title, body].filter(Boolean).join("\n\n");
      if (!text) continue;

      items.push({
        external_id: post.id,
        url: post.permalink
          ? `https://www.reddit.com${post.permalink}`
          : `https://www.reddit.com/r/${subreddit}/comments/${post.id}`,
        author_id: post.author ?? null,
        posted_at: post.created_utc
          ? new Date(post.created_utc * 1000).toISOString()
          : null,
        text_raw: text,
        thread_id: post.id,
      });
      if (items.length >= limit) break;
    }

    const last = batch[batch.length - 1];
    before = last?.created_utc;
    if (batch.length < 100) break;
  }

  return items;
}

async function fetchComments(
  subreddit: string,
  limit: number,
): Promise<FetchedItem[]> {
  const items: FetchedItem[] = [];
  let before: number | undefined;

  while (items.length < limit) {
    await sleep(400);
    const params = new URLSearchParams({
      subreddit,
      limit: String(Math.min(100, limit - items.length)),
      sort: "desc",
    });
    if (before) params.set("before", String(before));

    const response = await fetchJson<ArcticResponse<ArcticComment>>(
      `${BASE}/comments/search?${params.toString()}`,
    ).catch(() => ({ data: [] as ArcticComment[] }));

    const batch = response.data ?? [];
    if (batch.length === 0) break;

    for (const comment of batch) {
      const body = comment.body?.trim();
      if (!body || body === "[deleted]" || body === "[removed]") continue;

      items.push({
        external_id: comment.id,
        url: comment.permalink
          ? `https://www.reddit.com${comment.permalink}`
          : `https://www.reddit.com/r/${subreddit}/comments/${comment.id}`,
        author_id: comment.author ?? null,
        posted_at: comment.created_utc
          ? new Date(comment.created_utc * 1000).toISOString()
          : null,
        text_raw: body,
        thread_id: comment.link_id?.replace(/^t3_/, "") ?? comment.id,
      });
      if (items.length >= limit) break;
    }

    const last = batch[batch.length - 1];
    before = last?.created_utc;
    if (batch.length < 100) break;
  }

  return items;
}

function matchesQuery(text: string, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = text.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export const redditConnector: CorpusConnector = {
  meta: META,

  async fetch(query: string, window: FetchWindow): Promise<FetchedItem[]> {
    const max = window.maxResults ?? 100;
    const isSubreddit = query.startsWith("subreddit:");
    const subreddit = isSubreddit
      ? query.replace("subreddit:", "").trim()
      : null;

    const targets = subreddit ? [subreddit] : [...REDDIT_SUBREDDITS];
    const perTarget = Math.ceil(max / targets.length);
    const items: FetchedItem[] = [];

    for (const sub of targets) {
      const posts = await fetchPosts(sub, Math.ceil(perTarget * 0.4));
      const comments = await fetchComments(sub, Math.ceil(perTarget * 0.6));
      items.push(...posts, ...comments);
    }

    const filtered = isSubreddit
      ? items
      : items.filter((item) => matchesQuery(item.text_raw, query));

    return applyThreadCap(filtered, 25).slice(0, max);
  },
};
