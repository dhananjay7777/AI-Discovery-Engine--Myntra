import { randomUUID } from "crypto";
import type { StoreNamespace } from "@/lib/store/fs";
import type { Source } from "@/lib/store/schema";
import { ALL_CONNECTORS } from "./connectors";
import { readCorpusSources, writeCorpusSources } from "./store";

export function ensureSources(
  namespace: StoreNamespace = "published",
): Map<string, Source> {
  const existing = readCorpusSources(namespace);
  const byPlatform = new Map(existing.map((s) => [s.platform, s]));
  const now = new Date().toISOString();
  let changed = false;

  for (const connector of ALL_CONNECTORS) {
    if (!byPlatform.has(connector.meta.platform)) {
      const source: Source = {
        id: randomUUID(),
        platform: connector.meta.platform,
        collection_method: connector.meta.collection_method,
        terms_notes: connector.meta.terms_notes,
        created_at: now,
      };
      existing.push(source);
      byPlatform.set(source.platform, source);
      changed = true;
    }
  }

  if (changed) {
    writeCorpusSources(existing, namespace);
  }

  return byPlatform;
}
