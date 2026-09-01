import type { Document, RawDocument } from "@/lib/store/schema";
import { NEAR_DEDUPE_COSINE } from "./config";
import { cosineSimilarity } from "@/lib/embeddings/local";

function authorKey(raw: RawDocument | undefined, docId: string): string {
  return raw?.author_hash ?? `__anon_${docId}`;
}

/** Fraction of same-author pairs at ≥ threshold cosine that remain in different dedupe groups. */
export function residualNearDupPairRate(
  documents: Document[],
  rawById: Map<string, RawDocument>,
  threshold = NEAR_DEDUPE_COSINE,
): number {
  const withEmb = documents.filter((d) => d.embedding && d.embedding.length > 0);
  let unmerged = 0;
  let total = 0;

  for (let i = 0; i < withEmb.length; i++) {
    for (let j = i + 1; j < withEmb.length; j++) {
      const rawI = rawById.get(withEmb[i].raw_document_id);
      const rawJ = rawById.get(withEmb[j].raw_document_id);
      if (authorKey(rawI, withEmb[i].id) !== authorKey(rawJ, withEmb[j].id)) {
        continue;
      }

      const sim = cosineSimilarity(
        withEmb[i].embedding as number[],
        withEmb[j].embedding as number[],
      );

      if (sim >= threshold) {
        total += 1;
        if (withEmb[i].dedupe_group !== withEmb[j].dedupe_group) {
          unmerged += 1;
        }
      }
    }
  }

  return total === 0 ? 0 : unmerged / total;
}

class UnionFind {
  private parent = new Map<string, string>();

  find(id: string): string {
    const parent = this.parent.get(id) ?? id;
    if (parent !== id) {
      const root = this.find(parent);
      this.parent.set(id, root);
      return root;
    }
    this.parent.set(id, id);
    return id;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootB, rootA);
    }
  }
}

/**
 * Re-assign dedupe_group using union-find per author (T1.7, T1.8).
 * Representative = earliest created_at in each cluster.
 */
export function rebuildDedupeGroups(
  documents: Document[],
  rawById: Map<string, RawDocument>,
): Document[] {
  const withEmb = documents.filter((d) => d.embedding && d.embedding.length > 0);
  const byAuthor = new Map<string, Document[]>();

  for (const doc of withEmb) {
    const raw = rawById.get(doc.raw_document_id);
    const key = authorKey(raw, doc.id);
    const bucket = byAuthor.get(key) ?? [];
    bucket.push(doc);
    byAuthor.set(key, bucket);
  }

  const groupByDocId = new Map<string, string>();

  for (const peers of byAuthor.values()) {
    if (peers.length === 0) continue;
    const uf = new UnionFind();

    for (let i = 0; i < peers.length; i++) {
      for (let j = i + 1; j < peers.length; j++) {
        const sim = cosineSimilarity(
          peers[i].embedding as number[],
          peers[j].embedding as number[],
        );
        if (sim >= NEAR_DEDUPE_COSINE) {
          uf.union(peers[i].id, peers[j].id);
        }
      }
    }

    const clusters = new Map<string, Document[]>();
    for (const doc of peers) {
      const root = uf.find(doc.id);
      const bucket = clusters.get(root) ?? [];
      bucket.push(doc);
      clusters.set(root, bucket);
    }

    for (const cluster of clusters.values()) {
      const representative = [...cluster].sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      )[0];
      for (const doc of cluster) {
        groupByDocId.set(doc.id, representative.id);
      }
    }
  }

  return documents.map((doc) => ({
    ...doc,
    dedupe_group: groupByDocId.get(doc.id) ?? doc.id,
  }));
}
