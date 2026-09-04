/**
 * Sample stratified documents/units for the Phase 2 gold set (D-012).
 * Outputs JSON for human labeling — does not call Groq.
 */
import "./load-env";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { readAllNormalized, readAllRaw } from "@/lib/corpus/store";
import { readCollection } from "@/lib/store/fs";
import { listCorpusPlatforms, readNormalizedByPlatform } from "@/lib/corpus/store";

const RELEVANCE_SIZE = 200;
const EXTRACTION_SIZE = 200;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function stratifiedSample<T>(
  buckets: Map<string, T[]>,
  total: number,
): T[] {
  const keys = [...buckets.keys()];
  const perBucket = Math.max(1, Math.floor(total / keys.length));
  const picked: T[] = [];
  for (const key of keys) {
    picked.push(...shuffle(buckets.get(key) ?? []).slice(0, perBucket));
  }
  return shuffle(picked).slice(0, total);
}

function main() {
  const rawById = new Map(readAllRaw().map((r) => [r.id, r]));
  const platformByDoc = new Map<string, string>();
  for (const platform of listCorpusPlatforms("normalized")) {
    for (const doc of readNormalizedByPlatform(platform)) {
      platformByDoc.set(doc.id, platform);
    }
  }

  const docs = readAllNormalized();
  const relevanceBuckets = new Map<string, typeof docs>();
  for (const doc of docs) {
    const platform = platformByDoc.get(doc.id) ?? "unknown";
    const band =
      doc.relevance_score === null
        ? "ungated"
        : doc.relevance_score >= 0.7
          ? "high"
          : doc.relevance_score >= 0.4
            ? "borderline"
            : "low";
    const key = `${platform}:${band}`;
    const list = relevanceBuckets.get(key) ?? [];
    list.push(doc);
    relevanceBuckets.set(key, list);
  }

  const relevanceSample = stratifiedSample(relevanceBuckets, RELEVANCE_SIZE).map((doc) => ({
    document_id: doc.id,
    platform: platformByDoc.get(doc.id),
    text_clean: doc.text_clean,
    current_is_relevant: doc.is_relevant,
    current_score: doc.relevance_score,
    url: rawById.get(doc.raw_document_id)?.url,
    labels: {
      is_relevant: null,
      unit_type: null,
      decision_factor: null,
      intent_type: null,
    },
  }));

  const units = readCollection("evidence_units");
  const unitBuckets = new Map<string, typeof units>();
  for (const unit of units) {
    const platform = platformByDoc.get(unit.document_id) ?? "unknown";
    const key = `${platform}:${unit.unit_type ?? "unknown"}`;
    const list = unitBuckets.get(key) ?? [];
    list.push(unit);
    unitBuckets.set(key, list);
  }

  const extractionSample = stratifiedSample(unitBuckets, EXTRACTION_SIZE).map((unit) => ({
    unit_id: unit.id,
    document_id: unit.document_id,
    platform: platformByDoc.get(unit.document_id),
    quote_verbatim: unit.quote_verbatim,
    model_labels: {
      unit_type: unit.unit_type,
      decision_factor: unit.decision_factor,
      intent_type: unit.intent_type,
      journey_stage: unit.journey_stage,
      severity_signal: unit.severity_signal,
    },
    human_labels: {
      unit_type: null,
      decision_factor: null,
      intent_type: null,
      journey_stage: null,
      severity_signal: null,
    },
  }));

  const outDir = join(process.cwd(), "data", "published", "gold_samples");
  mkdirSync(outDir, { recursive: true });

  const relevancePath = join(outDir, "relevance_200.json");
  const extractionPath = join(outDir, "extraction_200.json");

  writeFileSync(relevancePath, `${JSON.stringify(relevanceSample, null, 2)}\n`);
  writeFileSync(extractionPath, `${JSON.stringify(extractionSample, null, 2)}\n`);

  console.log(`Wrote ${relevanceSample.length} relevance samples → ${relevancePath}`);
  console.log(`Wrote ${extractionSample.length} extraction samples → ${extractionPath}`);
  console.log("\nLabel these by hand, then import into gold_labels.json");
}

main();
