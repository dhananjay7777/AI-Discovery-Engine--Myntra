/**
 * Import hand-labeled gold samples into gold_labels.json (D-012).
 *
 * Expects labeled files from phase2:gold-sample with human fields filled in:
 *   data/published/gold_samples/relevance_200.json
 *   data/published/gold_samples/extraction_200.json
 *
 * Usage:
 *   npm run phase2:gold-import
 *   npm run phase2:gold-import -- --namespace sandbox
 */
import "./load-env";
import { randomUUID } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { readCollection, writeCollection, type StoreNamespace } from "@/lib/store/fs";

interface RelevanceSample {
  document_id: string;
  labels: {
    is_relevant: boolean | null;
    unit_type?: string | null;
    decision_factor?: string | null;
    intent_type?: string | null;
  };
}

interface ExtractionSample {
  unit_id: string;
  document_id: string;
  human_labels: {
    unit_type: string | null;
    decision_factor: string | null;
    intent_type: string | null;
    journey_stage?: string | null;
    severity_signal?: string | null;
  };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--namespace");
  const val = idx >= 0 ? args[idx + 1] : "published";
  return (val === "sandbox" ? "sandbox" : "published") as StoreNamespace;
}

function isLabeledRelevance(row: RelevanceSample): boolean {
  return row.labels.is_relevant !== null && row.labels.is_relevant !== undefined;
}

function isLabeledExtraction(row: ExtractionSample): boolean {
  return (
    row.human_labels.unit_type !== null &&
    row.human_labels.decision_factor !== null &&
    row.human_labels.intent_type !== null
  );
}

function main() {
  const namespace = parseArgs();
  const base = join(process.cwd(), "data", namespace, "gold_samples");
  const relevancePath = join(base, "relevance_200.json");
  const extractionPath = join(base, "extraction_200.json");

  if (!existsSync(relevancePath) && !existsSync(extractionPath)) {
    console.error(
      `No gold sample files in ${base}. Run npm run phase2:gold-sample first.`,
    );
    process.exit(1);
  }

  const coder = process.env.GOLD_CODER ?? "human";
  const now = new Date().toISOString();
  const existing = readCollection("gold_labels", namespace).filter(
    (g) => g.coder !== "qwen/qwen3.8-27b",
  );
  const imported: typeof existing = [];

  if (existsSync(relevancePath)) {
    const rows = JSON.parse(readFileSync(relevancePath, "utf-8")) as RelevanceSample[];
    for (const row of rows.filter(isLabeledRelevance)) {
      imported.push({
        id: randomUUID(),
        unit_id: null,
        document_id: row.document_id,
        labels: { ...row.labels, source: "relevance_gold" },
        coder,
        coded_at: now,
      });
    }
  }

  if (existsSync(extractionPath)) {
    const rows = JSON.parse(readFileSync(extractionPath, "utf-8")) as ExtractionSample[];
    for (const row of rows.filter(isLabeledExtraction)) {
      imported.push({
        id: randomUUID(),
        unit_id: row.unit_id,
        document_id: row.document_id,
        labels: { ...row.human_labels, source: "extraction_gold" },
        coder,
        coded_at: now,
      });
    }
  }

  if (imported.length === 0) {
    console.log("No labeled rows found — fill in human labels in the gold sample files first.");
    process.exit(0);
  }

  writeCollection("gold_labels", [...existing, ...imported], namespace);
  console.log(`Imported ${imported.length} human gold labels into ${namespace}/gold_labels.json`);
  console.log(`  Relevance: ${imported.filter((g) => g.labels.source === "relevance_gold").length}`);
  console.log(`  Extraction: ${imported.filter((g) => g.labels.source === "extraction_gold").length}`);
}

main();
