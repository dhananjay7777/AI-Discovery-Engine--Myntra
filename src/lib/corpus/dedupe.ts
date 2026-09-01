import { cosineSimilarity } from "@/lib/embeddings/local";
import { NEAR_DEDUPE_COSINE } from "./config";

export interface DedupeAssignment {
  dedupe_group: string;
  is_representative: boolean;
}

interface DedupeCandidate {
  id: string;
  dedupe_group: string | null;
  embedding: number[];
  created_at?: string;
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
 * Assign dedupe groups for new documents against existing corpus.
 * Near-dedupe only within the same author_hash (T1.8), union-find per author.
 */
export function assignDedupeGroups(
  existing: Array<{ author_hash: string | null; doc: DedupeCandidate }>,
  incoming: Array<{
    id: string;
    author_hash: string | null;
    embedding: number[];
    created_at?: string;
  }>,
): Map<string, DedupeAssignment> {
  const byAuthor = new Map<
    string,
    Array<{ id: string; embedding: number[]; created_at: string }>
  >();

  const addPeer = (
    authorKey: string,
    peer: { id: string; embedding: number[]; created_at: string },
  ) => {
    const bucket = byAuthor.get(authorKey) ?? [];
    bucket.push(peer);
    byAuthor.set(authorKey, bucket);
  };

  for (const { author_hash, doc } of existing) {
    const key = author_hash ?? `__anon_${doc.id}`;
    addPeer(key, {
      id: doc.id,
      embedding: doc.embedding,
      created_at: doc.created_at ?? "",
    });
  }

  for (const doc of incoming) {
    const key = doc.author_hash ?? `__anon_${doc.id}`;
    addPeer(key, {
      id: doc.id,
      embedding: doc.embedding,
      created_at: doc.created_at ?? new Date().toISOString(),
    });
  }

  const representativeByDoc = new Map<string, string>();

  for (const [authorKey, peers] of byAuthor) {
    const uf = new UnionFind();
    for (const peer of peers) {
      uf.find(peer.id);
    }

    for (let i = 0; i < peers.length; i++) {
      for (let j = i + 1; j < peers.length; j++) {
        const sim = cosineSimilarity(peers[i].embedding, peers[j].embedding);
        if (sim >= NEAR_DEDUPE_COSINE) {
          uf.union(peers[i].id, peers[j].id);
        }
      }
    }

    const clusters = new Map<string, typeof peers>();
    for (const peer of peers) {
      const root = uf.find(peer.id);
      const bucket = clusters.get(root) ?? [];
      bucket.push(peer);
      clusters.set(root, bucket);
    }

    for (const cluster of clusters.values()) {
      const representative = [...cluster].sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      )[0];
      for (const peer of cluster) {
        representativeByDoc.set(peer.id, representative.id);
      }
    }

    void authorKey;
  }

  const assignments = new Map<string, DedupeAssignment>();
  for (const doc of incoming) {
    const group = representativeByDoc.get(doc.id) ?? doc.id;
    assignments.set(doc.id, {
      dedupe_group: group,
      is_representative: group === doc.id,
    });
  }

  return assignments;
}
