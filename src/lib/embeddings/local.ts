import { pipeline } from "@xenova/transformers";
import { embedding as embeddingConfig } from "@/config/models";

type FeaturePipeline = Awaited<ReturnType<typeof pipeline>>;

let embedder: FeaturePipeline | null = null;

async function loadEmbedderWithRetry(): Promise<FeaturePipeline> {
  const delays = [2000, 5000, 10000, 20000];
  let lastError: unknown;

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await pipeline("feature-extraction", embeddingConfig.modelId, {
        quantized: true,
      });
    } catch (error) {
      lastError = error;
      if (attempt < delays.length) {
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      }
    }
  }

  throw lastError;
}

/**
 * Local ONNX embeddings via @xenova/transformers (D-018).
 * No API call — runs in batch jobs and CI.
 */
export async function getEmbedder(): Promise<FeaturePipeline> {
  if (!embedder) {
    embedder = await loadEmbedderWithRetry();
  }
  return embedder;
}

export async function embedText(text: string): Promise<number[]> {
  const model = await getEmbedder();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output = await (model as any)(text, { pooling: "mean", normalize: true });

  const tensor = output as { data: Float32Array | number[] };
  const vector = Array.from(tensor.data);

  if (vector.length !== embeddingConfig.dimensions) {
    throw new Error(
      `Expected ${embeddingConfig.dimensions}-dim embedding, got ${vector.length}`,
    );
  }

  return vector;
}

export async function embedTexts(texts: string[], batchSize = 25): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchVectors = await Promise.all(batch.map(embedText));
    vectors.push(...batchVectors);
    if (i > 0 && i % 100 === 0) {
      console.log(`  embedded ${Math.min(i + batchSize, texts.length)}/${texts.length}`);
    }
  }
  return vectors;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
