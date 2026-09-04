import { cosineSimilarity } from "@/lib/embeddings/local";

export interface ClusterResult {
  clusterId: number;
  unitIds: string[];
  isNoise: boolean;
}

/**
 * Greedy density clustering (HDBSCAN-like) on cosine similarity — no Groq, no npm HDBSCAN.
 */
export function densityCluster(
  items: { id: string; embedding: number[] }[],
  options: { minClusterSize?: number; minSimilarity?: number } = {},
): ClusterResult[] {
  const minClusterSize = options.minClusterSize ?? 3;
  const minSim = options.minSimilarity ?? 0.78;
  const n = items.length;
  if (n === 0) return [];

  const neighbors: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = cosineSimilarity(items[i].embedding, items[j].embedding);
      if (sim >= minSim) {
        neighbors[i].push(j);
        neighbors[j].push(i);
      }
    }
  }

  const core = new Set<number>();
  for (let i = 0; i < n; i++) {
    if (neighbors[i].length + 1 >= minClusterSize) core.add(i);
  }

  const visited = new Set<number>();
  const clusters: ClusterResult[] = [];
  let clusterId = 0;

  for (const seed of core) {
    if (visited.has(seed)) continue;
    const queue = [seed];
    const members = new Set<number>();
    visited.add(seed);

    while (queue.length > 0) {
      const idx = queue.pop()!;
      members.add(idx);
      for (const nb of neighbors[idx]) {
        if (!visited.has(nb) && (core.has(nb) || members.size > 0)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }

    if (members.size >= minClusterSize) {
      clusters.push({
        clusterId: clusterId++,
        unitIds: [...members].map((i) => items[i].id),
        isNoise: false,
      });
    }
  }

  const assigned = new Set(clusters.flatMap((c) => c.unitIds));
  const noise = items.filter((item) => !assigned.has(item.id)).map((item) => item.id);
  if (noise.length > 0) {
    clusters.push({ clusterId: -1, unitIds: noise, isNoise: true });
  }

  return clusters;
}
