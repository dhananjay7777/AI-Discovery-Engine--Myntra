import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { StoreNamespace } from "@/lib/store/fs";
import { writeJsonAtomic } from "@/lib/store/fs";

interface CacheFile {
  entries: Record<string, unknown>;
}

function cachePath(namespace: StoreNamespace): string {
  return join(process.cwd(), "data", namespace, "phase2_cache.json");
}

function loadCache(namespace: StoreNamespace): CacheFile {
  const path = cachePath(namespace);
  if (!existsSync(path)) return { entries: {} };
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as CacheFile;
  } catch {
    return { entries: {} };
  }
}

function saveCache(namespace: StoreNamespace, file: CacheFile): void {
  writeJsonAtomic(cachePath(namespace), file);
}

export function cacheKey(
  contentHash: string,
  promptVersion: string,
  modelId: string,
): string {
  return createHash("sha256")
    .update(`${contentHash}:${promptVersion}:${modelId}`)
    .digest("hex");
}

export function readCache<T>(
  key: string,
  namespace: StoreNamespace = "published",
): T | null {
  const file = loadCache(namespace);
  const hit = file.entries[key];
  return hit !== undefined ? (hit as T) : null;
}

export function writeCache<T>(
  key: string,
  value: T,
  namespace: StoreNamespace = "published",
): void {
  const file = loadCache(namespace);
  file.entries[key] = value;
  saveCache(namespace, file);
}

export function cacheSize(namespace: StoreNamespace = "published"): number {
  return Object.keys(loadCache(namespace).entries).length;
}
