/**
 * Phase 0 smoke test: Groq strict-schema calls, local embedding round-trip, run insert.
 */
import "./load-env";
import { createHash } from "crypto";
import { models, embedding } from "@/config/models";
import { insertEmbeddingSmoke, getEmbeddingSmoke, insertRun } from "@/lib/store/write";
import { structuredCall, createUsageTracker } from "@/lib/groq/client";
import {
  relevanceGateSchema,
  extractionSmokeSchema,
  SMOKE_SAMPLE_TEXT,
} from "@/lib/groq/schemas";
import { cosineSimilarity, embedText } from "@/lib/embeddings/local";

async function main() {
  const timings: Record<string, number> = {};
  const usageTracker = createUsageTracker();
  const t0 = Date.now();

  console.log("── Groq smoke: relevance gate ──");
  const gateStart = Date.now();
  const gate = await structuredCall(
    {
      model: models.gate,
      system:
        "You classify whether text is about pre-purchase consideration (wishlist, hesitation, comparing, deciding). Respond with JSON only.",
      user: `Classify this text:\n\n"${SMOKE_SAMPLE_TEXT}"`,
      schema: relevanceGateSchema,
      schemaName: "relevance_gate",
      estimatedTokens: 300,
    },
    usageTracker,
  );
  timings.gate_ms = Date.now() - gateStart;
  console.log("Gate result:", gate.data);
  console.log("Gate usage:", gate.usage);

  console.log("\n── Groq smoke: extraction ──");
  const extractStart = Date.now();
  const extraction = await structuredCall(
    {
      model: models.extraction,
      system:
        "Extract one evidence unit from the text. quote_verbatim must be an exact substring of the input. workaround is null if none mentioned.",
      user: `Extract from:\n\n"${SMOKE_SAMPLE_TEXT}"`,
      schema: extractionSmokeSchema,
      schemaName: "extraction_smoke",
      estimatedTokens: 500,
    },
    usageTracker,
  );
  timings.extraction_ms = Date.now() - extractStart;
  console.log("Extraction result:", extraction.data);
  console.log("Extraction usage:", extraction.usage);

  if (!SMOKE_SAMPLE_TEXT.includes(extraction.data.quote_verbatim)) {
    throw new Error("quote_verbatim is not a substring of the source text");
  }

  console.log("\n── Local embedding round-trip ──");
  const embedStart = Date.now();
  const vector = await embedText(SMOKE_SAMPLE_TEXT);
  console.log(`Embedding dimensions: ${vector.length}`);
  timings.embed_ms = Date.now() - embedStart;

  const smokeId = insertEmbeddingSmoke(SMOKE_SAMPLE_TEXT, vector);
  const readBack = getEmbeddingSmoke(smokeId);
  if (!readBack) {
    throw new Error("Embedding smoke row not found after write");
  }
  if (readBack.embedding.length !== vector.length) {
    throw new Error(
      `Round-trip dimension mismatch: ${readBack.embedding.length} vs ${vector.length}`,
    );
  }

  const similarity = cosineSimilarity(vector, readBack.embedding);
  if (similarity < 0.999) {
    throw new Error(`Round-trip vector mismatch, cosine: ${similarity}`);
  }
  console.log("✓ JSON embedding round-trip OK (cosine:", similarity, ")");

  const totals = usageTracker.getTotals();
  timings.total_ms = Date.now() - t0;

  const configHash = createHash("sha256")
    .update(JSON.stringify({ models, embedding }))
    .digest("hex")
    .slice(0, 16);

  const runId = insertRun({
    gateModel: models.gate,
    extractionModel: models.extraction,
    agreementModel: models.agreement,
    embeddingModel: embedding.modelId,
    configHash,
    requestCount: totals.requestCount,
    promptTokens: totals.promptTokens,
    completionTokens: totals.completionTokens,
    estimatedCostUsd: totals.estimatedCostUsd,
    status: "completed",
    timings,
  });

  console.log("\n── Run recorded ──");
  console.log("Run id:", runId);
  console.log("Totals:", totals);
  console.log("Timings:", timings);
  console.log("\n✓ Phase 0 smoke passed");
}

main().catch((err) => {
  console.error("Phase 0 smoke failed:", err);
  process.exit(1);
});
