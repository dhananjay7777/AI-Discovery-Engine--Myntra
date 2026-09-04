import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import type { CollectionMap, CollectionName } from "./schema";
import { COLLECTIONS } from "./schema";

export type StoreNamespace = "published" | "sandbox";

function isTransientFsError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return (
    code === "UNKNOWN" ||
    code === "EBUSY" ||
    code === "EPERM" ||
    code === "EACCES" ||
    code === "EAGAIN" ||
    code === "EIO"
  );
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Write JSON with retries — OneDrive often returns UNKNOWN/EBUSY on long jobs. */
export function writeJsonAtomic(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const body = `${JSON.stringify(value, null, 2)}\n`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      writeFileSync(path, body, "utf-8");
      return;
    } catch (error) {
      lastError = error;
      if (!isTransientFsError(error) || attempt === 5) break;
      const delay = 300 * 2 ** attempt;
      console.warn(
        `Retrying write ${path} in ${delay}ms (${(error as { code?: string }).code})`,
      );
      sleepSync(delay);
    }
  }
  throw lastError;
}

export function storeDir(namespace: StoreNamespace = "published"): string {
  return join(process.cwd(), "data", namespace);
}

export function collectionPath(
  name: CollectionName,
  namespace: StoreNamespace = "published",
): string {
  return join(storeDir(namespace), `${name}.json`);
}

export function readCollection<K extends CollectionName>(
  name: K,
  namespace: StoreNamespace = "published",
): CollectionMap[K] {
  const path = collectionPath(name, namespace);
  if (!existsSync(path)) {
    return [] as CollectionMap[K];
  }
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as CollectionMap[K];
}

export function writeCollection<K extends CollectionName>(
  name: K,
  rows: CollectionMap[K],
  namespace: StoreNamespace = "published",
): void {
  writeJsonAtomic(collectionPath(name, namespace), rows);
}

export function assertPublishedCollections(): string[] {
  const missing: string[] = [];
  for (const name of COLLECTIONS) {
    if (!existsSync(collectionPath(name, "published"))) {
      missing.push(name);
    }
  }
  return missing;
}
