import type { FetchedItem } from "../types";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Cap items per thread_id to limit viral-thread skew (T1.10). */
export function applyThreadCap(
  items: FetchedItem[],
  maxPerThread: number,
): FetchedItem[] {
  const counts = new Map<string, number>();
  const kept: FetchedItem[] = [];

  for (const item of items) {
    const thread = item.thread_id ?? item.external_id;
    const count = counts.get(thread) ?? 0;
    if (count >= maxPerThread) continue;
    counts.set(thread, count + 1);
    kept.push(item);
  }

  return kept;
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json() as Promise<T>;
}
