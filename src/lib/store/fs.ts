import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { CollectionMap, CollectionName } from "./schema";
import { COLLECTIONS } from "./schema";

export type StoreNamespace = "published" | "sandbox";

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
  const dir = storeDir(namespace);
  mkdirSync(dir, { recursive: true });
  const path = collectionPath(name, namespace);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(rows, null, 2)}\n`, "utf-8");
  writeFileSync(path, readFileSync(tmp, "utf-8"), "utf-8");
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
