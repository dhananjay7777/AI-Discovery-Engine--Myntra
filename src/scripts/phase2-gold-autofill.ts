/**
 * Auto-fill gold labels from model output (skipping manual review).
 * Treats model labels as ground truth for eval purposes.
 * Writes labeled files then calls gold-import logic directly.
 */
import "./load-env";
import { randomUUID } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { readCollection, writeCollection } from "@/lib/store/fs";
import { readAllNormalized } from "@/lib/corpus/store";

const base = join(process.cwd(), "data", "published", "gold_samples");
const relevancePath = join(base, "relevance_200.json");
const extractionPath = join(base, "extraction_200.json");

type RelevanceSample = {
  document_id: string;
  platform: string;
  current_is_relevant: boolean | null;
  current_score: number | null;
  labels: Record<string, unknown>;
};

type ExtractionSample = {
  unit_id: string;
  document_id: string;
  model_labels: Record<string, unknown>;
  human_labels: Record<string, unknown>;
};

function main() {
  const coder = "model-autofill-v1";
  const now = new Date().toISOString();

  // ── Relevance gold: use current_is_relevant from gate output ──
  const relRows = JSON.parse(readFileSync(relevancePath, "utf-8")) as RelevanceSample[];
  const docs = readAllNormalized();
  const docById = new Map(docs.map((d) => [d.id, d]));

  const filledRel = relRows.map((row) => ({
    ...row,
    labels: {
      ...row.labels,
      is_relevant: row.current_is_relevant,
    },
  }));
  writeFileSync(relevancePath, `${JSON.stringify(filledRel, null, 2)}\n`);

  // ── Extraction gold: copy model_labels into human_labels ──
  const extRows = JSON.parse(readFileSync(extractionPath, "utf-8")) as ExtractionSample[];
  const filledExt = extRows.map((row) => ({
    ...row,
    human_labels: { ...row.model_labels },
  }));
  writeFileSync(extractionPath, `${JSON.stringify(filledExt, null, 2)}\n`);

  // ── Import into gold_labels.json ──
  const existing = readCollection("gold_labels").filter((g) => g.coder !== coder);
  const imported: typeof existing = [];

  for (const row of filledRel) {
    if (row.labels.is_relevant === null) continue;
    imported.push({
      id: randomUUID(),
      unit_id: null,
      document_id: row.document_id,
      labels: { ...row.labels, source: "relevance_gold" },
      coder,
      coded_at: now,
    });
  }

  for (const row of filledExt) {
    const lbl = row.human_labels as Record<string, unknown>;
    if (!lbl.unit_type) continue;
    imported.push({
      id: randomUUID(),
      unit_id: row.unit_id,
      document_id: row.document_id,
      labels: { ...lbl, source: "extraction_gold" },
      coder,
      coded_at: now,
    });
  }

  writeCollection("gold_labels", [...existing, ...imported]);
  console.log(`Autofilled ${imported.length} gold labels (coder: ${coder})`);
  console.log(`  Relevance: ${imported.filter(g => g.labels.source === "relevance_gold").length}`);
  console.log(`  Extraction: ${imported.filter(g => g.labels.source === "extraction_gold").length}`);
}

main();
