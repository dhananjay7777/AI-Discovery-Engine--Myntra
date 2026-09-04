import { randomUUID } from "crypto";
import {
  embedding,
  extractModelPool,
  gateModelPool,
  models,
  phase2CallBudget,
  truncateForExtract,
  truncateForGate,
} from "@/config/models";
import {
  readAllNormalized,
  readAllRaw,
  readNormalizedByPlatform,
  writeNormalizedByPlatform,
  listCorpusPlatforms,
} from "@/lib/corpus/store";
import type { Document, EvidenceUnit, RawDocument } from "@/lib/store/schema";
import type { StoreNamespace } from "@/lib/store/fs";
import { readCollection, writeCollection } from "@/lib/store/fs";
import { structuredCall, createUsageTracker } from "@/lib/groq/client";
import type { UsageTracker } from "@/lib/groq/usage";
import { DailyBudgetExceededError, RunBudget, RunBudgetExceededError, pickModelWithBudget } from "@/lib/groq/budget";
import { isStructuredOutputValidationError } from "@/lib/groq/errors";
import { cacheKey, readCache, writeCache } from "./cache";
import {
  createCheckpoint,
  loadCheckpoint,
  saveCheckpoint,
  type Phase2Checkpoint,
  type Phase2Metrics,
} from "./checkpoint";
import { PROMPT_VERSIONS, GATE_SYSTEM, EXTRACT_SYSTEM, AGREEMENT_SYSTEM } from "./prompts";
import {
  relevanceGateSchema,
  extractionResponseSchema,
  agreementLabelSchema,
  type RelevanceGateResult,
  type ExtractionResponse,
} from "./schemas";
import { verifyUnits } from "./verify";
import { insertRun, updateRun } from "@/lib/store/write";

export interface Phase2Options {
  namespace?: StoreNamespace;
  limit?: number;
  dryRun?: boolean;
  skipAgreement?: boolean;
  gateOnly?: boolean;
  extractOnly?: boolean;
  resume?: boolean;
  /** Per-run request ceiling for budget-abort tests (D-013 / T2.17). */
  maxRequests?: number;
  /** Per-run token ceiling for budget-abort tests (D-013 / T2.17). */
  maxTokens?: number;
}

export interface Phase2Result {
  runId: string;
  status: "completed" | "paused" | "in_progress" | "dry_run";
  metrics: Phase2Metrics;
  checkpoint: Phase2Checkpoint;
  modelUsage?: Record<string, { requests: number; tokens: number }>;
}

interface DocWithMeta {
  doc: Document;
  platform: string;
  raw: RawDocument;
  groupId: string;
}

function buildDocIndex(): DocWithMeta[] {
  const rawById = new Map(readAllRaw("published").map((r) => [r.id, r]));
  const rows: DocWithMeta[] = [];

  for (const platform of listCorpusPlatforms("normalized", "published")) {
    for (const doc of readNormalizedByPlatform(platform, "published")) {
      const raw = rawById.get(doc.raw_document_id);
      if (!raw) continue;
      const groupId = doc.dedupe_group ?? doc.id;
      rows.push({ doc, platform, raw, groupId });
    }
  }
  return rows;
}

function groupByDedupe(rows: DocWithMeta[]): Map<string, DocWithMeta[]> {
  const map = new Map<string, DocWithMeta[]>();
  for (const row of rows) {
    const list = map.get(row.groupId) ?? [];
    list.push(row);
    map.set(row.groupId, list);
  }
  return map;
}

function pickRepresentative(group: DocWithMeta[]): DocWithMeta {
  const canonical = group.find((g) => g.doc.id === g.groupId);
  return canonical ?? group[0];
}

function readCached<T>(
  contentHash: string,
  promptVersion: string,
  pool: string[],
  namespace: StoreNamespace,
): T | null {
  for (const model of pool) {
    const hit = readCache<T>(cacheKey(contentHash, promptVersion, model), namespace);
    if (hit) return hit;
  }
  return null;
}

let lastGateModel: string | undefined;
let lastExtractModel: string | undefined;

async function runGate(
  text: string,
  contentHash: string,
  usage: UsageTracker,
  namespace: StoreNamespace,
  metrics: Phase2Metrics,
  dryRun: boolean,
  runBudget?: RunBudget,
): Promise<RelevanceGateResult> {
  const cached = readCached<RelevanceGateResult>(
    contentHash,
    PROMPT_VERSIONS.gate,
    gateModelPool,
    namespace,
  );
  if (cached) {
    metrics.gate_cache_hits += 1;
    return cached;
  }
  if (dryRun) {
    return { is_relevant: false, confidence: 0, reason: "dry-run" };
  }

  const truncated = truncateForGate(text);
  while (true) {
    let model: string;
    try {
      model = pickModelWithBudget(
        gateModelPool,
        phase2CallBudget.gateEstimatedTokens,
        "most-remaining",
      );
    } catch (error) {
      throw error;
    }
    lastGateModel = model;

    try {
      const { data } = await structuredCall(
        {
          model,
          system: GATE_SYSTEM,
          user: `Classify this text:\n\n"""${truncated}"""`,
          schema: relevanceGateSchema,
          schemaName: "relevance_gate",
          estimatedTokens: phase2CallBudget.gateEstimatedTokens,
          runBudget,
        },
        usage,
      );
      metrics.gate_calls += 1;
      writeCache(cacheKey(contentHash, PROMPT_VERSIONS.gate, model), data, namespace);
      return data;
    } catch (error) {
      if (error instanceof DailyBudgetExceededError) {
        console.log(`Gate budget exhausted for ${model} — trying next model`);
        continue;
      }
      throw error;
    }
  }
}

async function runExtract(
  text: string,
  contentHash: string,
  usage: UsageTracker,
  namespace: StoreNamespace,
  metrics: Phase2Metrics,
  dryRun: boolean,
  runBudget?: RunBudget,
): Promise<{ data: ExtractionResponse; model: string }> {
  const cached = readCached<ExtractionResponse>(
    contentHash,
    PROMPT_VERSIONS.extract,
    extractModelPool,
    namespace,
  );
  if (cached) {
    metrics.extract_cache_hits += 1;
    return { data: cached, model: models.extraction };
  }
  if (dryRun) {
    return { data: { units: [] }, model: models.extraction };
  }

  const truncated = truncateForExtract(text);
  while (true) {
    let model: string;
    try {
      model = pickModelWithBudget(
        extractModelPool,
        phase2CallBudget.extractEstimatedTokens,
        "preference",
      );
    } catch (error) {
      throw error;
    }
    if (model !== lastExtractModel) {
      console.log(`Extract model → ${model}`);
      lastExtractModel = model;
    }

    try {
      const { data } = await structuredCall(
        {
          model,
          system: EXTRACT_SYSTEM,
          user: `Extract evidence units from:\n\n"""${truncated}"""`,
          schema: extractionResponseSchema,
          schemaName: "extraction_response",
          estimatedTokens: phase2CallBudget.extractEstimatedTokens,
          runBudget,
        },
        usage,
      );
      metrics.extract_calls += 1;
      writeCache(cacheKey(contentHash, PROMPT_VERSIONS.extract, model), data, namespace);
      return { data, model };
    } catch (error) {
      if (error instanceof DailyBudgetExceededError) {
        console.log(`Extract budget exhausted for ${model} — trying next model`);
        continue;
      }
      throw error;
    }
  }
}

function applyGateToDocuments(
  group: DocWithMeta[],
  gate: RelevanceGateResult,
): void {
  const byPlatform = new Map<string, Map<string, Document>>();
  for (const row of group) {
    const updated: Document = {
      ...row.doc,
      is_relevant: gate.is_relevant,
      relevance_score: gate.confidence,
    };
    if (!byPlatform.has(row.platform)) {
      byPlatform.set(row.platform, new Map());
    }
    byPlatform.get(row.platform)!.set(row.doc.id, updated);
  }
  for (const [platform, updates] of byPlatform) {
    const docs = readNormalizedByPlatform(platform, "published");
    const next = docs.map((d) => updates.get(d.id) ?? d);
    writeNormalizedByPlatform(platform, next, "published");
  }
}

function markExtractedSkip(
  row: DocWithMeta,
  extractedSet: Set<string>,
  checkpoint: Phase2Checkpoint,
  dryRun: boolean,
): void {
  if (extractedSet.has(row.doc.id)) return;
  extractedSet.add(row.doc.id);
  checkpoint.extracted_documents.push(row.doc.id);
  if (!dryRun) saveCheckpoint(checkpoint);
}

async function extractRow(
  row: DocWithMeta,
  usage: UsageTracker,
  namespace: StoreNamespace,
  checkpoint: Phase2Checkpoint,
  extractedSet: Set<string>,
  dryRun: boolean,
  runBudget?: RunBudget,
): Promise<void> {
  if (extractedSet.has(row.doc.id)) return;

  try {
    const response = await runExtract(
      row.doc.text_clean,
      row.raw.content_hash,
      usage,
      namespace,
      checkpoint.metrics,
      dryRun,
      runBudget,
    );
    checkpoint.metrics.units_extracted += response.data.units.length;

    const { verified, dropped } = verifyUnits(row.doc.text_clean, response.data.units);
    checkpoint.metrics.units_dropped_verbatim += dropped;

    if (!dryRun && verified.length > 0) {
      const published = persistUnits(row.doc.id, verified, namespace, response.model);
      checkpoint.metrics.units_published += published.length;
    }
  } catch (error) {
    if (error instanceof DailyBudgetExceededError) throw error;
    if (error instanceof RunBudgetExceededError) throw error;
    if (isStructuredOutputValidationError(error)) {
      console.warn(
        `Extract JSON validation failed for document ${row.doc.id} — skipping`,
      );
    } else {
      throw error;
    }
  }

  extractedSet.add(row.doc.id);
  checkpoint.extracted_documents.push(row.doc.id);
  if (!dryRun) saveCheckpoint(checkpoint);
}

async function extractGroupIfGated(
  group: DocWithMeta[],
  gate: RelevanceGateResult,
  usage: UsageTracker,
  namespace: StoreNamespace,
  checkpoint: Phase2Checkpoint,
  extractedSet: Set<string>,
  dryRun: boolean,
  runBudget?: RunBudget,
): Promise<void> {
  for (const row of group) {
    if (extractedSet.has(row.doc.id)) continue;
    if (!gate.is_relevant) {
      markExtractedSkip(row, extractedSet, checkpoint, dryRun);
      continue;
    }
    await extractRow(row, usage, namespace, checkpoint, extractedSet, dryRun, runBudget);
  }
}

async function extractAlreadyGatedGroup(
  group: DocWithMeta[],
  usage: UsageTracker,
  namespace: StoreNamespace,
  checkpoint: Phase2Checkpoint,
  extractedSet: Set<string>,
  dryRun: boolean,
  runBudget?: RunBudget,
): Promise<void> {
  for (const row of group) {
    if (extractedSet.has(row.doc.id)) continue;
    if (row.doc.is_relevant === null) continue;
    if (row.doc.is_relevant !== true) {
      markExtractedSkip(row, extractedSet, checkpoint, dryRun);
      continue;
    }
    await extractRow(row, usage, namespace, checkpoint, extractedSet, dryRun, runBudget);
  }
}

function persistUnits(
  documentId: string,
  units: ReturnType<typeof verifyUnits>["verified"],
  namespace: StoreNamespace,
  model: string,
): EvidenceUnit[] {
  const now = new Date().toISOString();
  const existing = readCollection("evidence_units", namespace);
  const filtered = existing.filter((u) => u.document_id !== documentId);
  const created: EvidenceUnit[] = units.map((u) => ({
    id: randomUUID(),
    document_id: documentId,
    quote_verbatim: u.quote_verbatim,
    char_start: u.char_start,
    char_end: u.char_end,
    unit_type: u.unit_type,
    intent_type: u.intent_type,
    decision_factor: u.decision_factor,
    journey_stage: u.journey_stage,
    severity_signal: u.severity_signal,
    segment_signals: u.segment_signals,
    workaround: u.workaround,
    model,
    prompt_version: PROMPT_VERSIONS.extract,
    verified: true,
    created_at: now,
  }));
  writeCollection("evidence_units", [...filtered, ...created], namespace);
  return created;
}

async function runAgreementSlice(
  units: EvidenceUnit[],
  checkpoint: Phase2Checkpoint,
  usage: UsageTracker,
  namespace: StoreNamespace,
  dryRun: boolean,
): Promise<void> {
  const pending = units.filter((u) => !checkpoint.agreement_units.includes(u.id));
  if (pending.length === 0) return;

  const labels = readCollection("gold_labels", namespace);
  for (const unit of pending) {
    if (dryRun) {
      checkpoint.agreement_units.push(unit.id);
      continue;
    }
    try {
      const { data } = await structuredCall(
        {
          model: models.agreement,
          system: AGREEMENT_SYSTEM,
          user: `Quote: """${unit.quote_verbatim}"""\n\nRe-label this unit.`,
          schema: agreementLabelSchema,
          schemaName: "agreement_label",
          estimatedTokens: phase2CallBudget.agreementEstimatedTokens,
        },
        usage,
      );
      checkpoint.metrics.agreement_calls += 1;
      labels.push({
        id: randomUUID(),
        unit_id: unit.id,
        document_id: unit.document_id,
        labels: { ...data, source: "agreement_slice" },
        coder: models.agreement,
        coded_at: new Date().toISOString(),
      });
      checkpoint.agreement_units.push(unit.id);
      saveCheckpoint(checkpoint);
    } catch (error) {
      if (error instanceof DailyBudgetExceededError) throw error;
      console.warn(`Agreement failed for unit ${unit.id}:`, error);
    }
  }
  writeCollection("gold_labels", labels, namespace);
}

function sampleAgreementUnits(allUnits: EvidenceUnit[], size: number): EvidenceUnit[] {
  if (allUnits.length <= size) return allUnits;
  const shuffled = [...allUnits].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, size);
}

export async function runPhase2Extraction(
  options: Phase2Options = {},
): Promise<Phase2Result> {
  const namespace = options.namespace ?? "published";
  const dryRun = options.dryRun ?? false;
  const usage = createUsageTracker();
  const runBudget =
    options.maxRequests !== undefined || options.maxTokens !== undefined
      ? new RunBudget(options.maxRequests, options.maxTokens)
      : undefined;

  let checkpoint =
    !dryRun && options.resume !== false ? loadCheckpoint(namespace) : null;

  let runId: string;
  if (checkpoint?.status === "in_progress" || checkpoint?.status === "paused") {
    runId = checkpoint.run_id;
    checkpoint.status = "in_progress";
    console.log(`Resuming run ${runId} (${checkpoint.gated_groups.length} groups gated)`);
  } else if (dryRun) {
    runId = "dry-run";
    checkpoint = createCheckpoint(runId, namespace);
  } else {
    runId = insertRun(
      {
        gateModel: models.gate,
        extractionModel: models.extraction,
        agreementModel: models.agreement,
        embeddingModel: embedding.modelId,
        configHash: PROMPT_VERSIONS.gate + PROMPT_VERSIONS.extract,
        requestCount: 0,
        promptTokens: 0,
        completionTokens: 0,
        estimatedCostUsd: 0,
        status: "in_progress",
      },
      namespace,
    );
    checkpoint = createCheckpoint(runId, namespace);
    saveCheckpoint(checkpoint);
  }

  const allRows = buildDocIndex();
  const groups = groupByDedupe(allRows);
  const gatedSet = new Set(checkpoint.gated_groups);
  const extractedSet = new Set(checkpoint.extracted_documents);
  const limit = options.limit ?? Infinity;

  let gateProcessed = 0;
  let extractProcessed = 0;

  try {
    // ── Interleaved gate + extract (uses both model quotas same UTC day) ──
    for (const [groupId, group] of groups) {
      const alreadyGated = gatedSet.has(groupId);

      if (!options.extractOnly && !alreadyGated) {
        if (gateProcessed >= limit) break;

        const rep = pickRepresentative(group);
        let gate: RelevanceGateResult;
        try {
          gate = await runGate(
            rep.doc.text_clean,
            rep.raw.content_hash,
            usage,
            namespace,
            checkpoint.metrics,
            dryRun,
            runBudget,
          );
        } catch (error) {
          if (error instanceof DailyBudgetExceededError) throw error;
          if (error instanceof RunBudgetExceededError) throw error;
          if (isStructuredOutputValidationError(error)) {
            console.warn(
              `Gate JSON validation failed for group ${groupId} — treating as irrelevant`,
            );
            gate = {
              is_relevant: false,
              confidence: 0,
              reason: "gate_json_validation_failed",
            };
          } else {
            throw error;
          }
        }
        if (!dryRun) {
          applyGateToDocuments(group, gate);
        }
        gatedSet.add(groupId);
        checkpoint.gated_groups.push(groupId);
        gateProcessed += 1;
        if (!dryRun) saveCheckpoint(checkpoint);

        if (!options.gateOnly && !dryRun) {
          await extractGroupIfGated(
            group,
            gate,
            usage,
            namespace,
            checkpoint,
            extractedSet,
            dryRun,
            runBudget,
          );
        }

        if (gateProcessed % 25 === 0) {
          console.log(
            `Gate: ${checkpoint.gated_groups.length}/${groups.size}` +
              ` (${checkpoint.metrics.gate_calls} calls, ${checkpoint.metrics.gate_cache_hits} cache hits)` +
              ` | Units: ${checkpoint.metrics.units_published}` +
              (lastGateModel ? ` | last gate: ${lastGateModel}` : ""),
          );
        }
        continue;
      }

      // Resume: gated earlier but extract may be pending (or --extract-only)
      if (!options.gateOnly && alreadyGated) {
        if (extractProcessed >= limit) continue;
        const before = checkpoint.metrics.extract_calls;
        await extractAlreadyGatedGroup(
          group,
          usage,
          namespace,
          checkpoint,
          extractedSet,
          dryRun,
          runBudget,
        );
        if (checkpoint.metrics.extract_calls > before) {
          extractProcessed += 1;
        }
      }
    }

    // Catch-up: any gated relevant docs missed above
    if (!options.gateOnly) {
      for (const row of buildDocIndex()) {
        if (extractedSet.has(row.doc.id)) continue;
        if (row.doc.is_relevant === null) continue;
        if (extractProcessed >= limit) break;
        if (row.doc.is_relevant !== true) {
          markExtractedSkip(row, extractedSet, checkpoint, dryRun);
          continue;
        }
        await extractRow(row, usage, namespace, checkpoint, extractedSet, dryRun, runBudget);
        extractProcessed += 1;
        if (extractProcessed % 10 === 0) {
          console.log(
            `Extract: ${checkpoint.extracted_documents.length} docs` +
              ` (${checkpoint.metrics.extract_calls} calls, ${checkpoint.metrics.units_published} units)`,
          );
        }
      }
    }

    // ── Agreement slice: 100 random units (only when gate + extract done) ──
    if (
      !options.skipAgreement &&
      !dryRun &&
      checkpoint.gated_groups.length >= groups.size
    ) {
      const allUnits = readCollection("evidence_units", namespace);
      const slice = sampleAgreementUnits(allUnits, 100);
      await runAgreementSlice(slice, checkpoint, usage, namespace, dryRun);
    }

    if (!dryRun) {
      const gateDone = checkpoint.gated_groups.length >= groups.size;
      const allDocs = buildDocIndex();
      const extractDone = allDocs.every(
        (r) => r.doc.is_relevant === null || extractedSet.has(r.doc.id),
      );
      checkpoint.status =
        gateDone && extractDone ? "completed" : "in_progress";
      saveCheckpoint(checkpoint);

      const totals = usage.getTotals();
      updateRun(
        runId,
        {
          status: checkpoint.status === "completed" ? "completed" : "in_progress",
          document_count: checkpoint.extracted_documents.length,
          unit_count: checkpoint.metrics.units_published,
          request_count: totals.requestCount,
          prompt_tokens: totals.promptTokens,
          completion_tokens: totals.completionTokens,
          estimated_cost_usd: totals.estimatedCostUsd,
          prompt_versions: {
            gate: PROMPT_VERSIONS.gate,
            extract: PROMPT_VERSIONS.extract,
            agreement: PROMPT_VERSIONS.agreement,
          },
        },
        namespace,
      );
    }

    return {
      runId,
      status: dryRun
        ? "dry_run"
        : checkpoint.status === "completed"
          ? "completed"
          : "in_progress",
      metrics: checkpoint.metrics,
      checkpoint,
      modelUsage: usage.getPerModelTotals(),
    };
  } catch (error) {
    if (!dryRun) {
      checkpoint.status = "paused";
      saveCheckpoint(checkpoint);

      const totals = usage.getTotals();
      updateRun(
        runId,
        {
          status: "paused",
          document_count: checkpoint.extracted_documents.length,
          unit_count: checkpoint.metrics.units_published,
          request_count: totals.requestCount,
          prompt_tokens: totals.promptTokens,
          completion_tokens: totals.completionTokens,
          estimated_cost_usd: totals.estimatedCostUsd,
          prompt_versions: {
            gate: PROMPT_VERSIONS.gate,
            extract: PROMPT_VERSIONS.extract,
            agreement: PROMPT_VERSIONS.agreement,
          },
        },
        namespace,
      );
    }

    if (error instanceof DailyBudgetExceededError) {
      console.log(`\nPaused at daily budget: ${error.message}`);
      return {
        runId,
        status: "paused",
        metrics: checkpoint.metrics,
        checkpoint,
        modelUsage: usage.getPerModelTotals(),
      };
    }
    if (error instanceof RunBudgetExceededError) {
      console.log(`\nPaused at run budget: ${error.message}`);
      return {
        runId,
        status: "paused",
        metrics: checkpoint.metrics,
        checkpoint,
        modelUsage: usage.getPerModelTotals(),
      };
    }
    throw error;
  }
}

export function countGateTargets(): number {
  return groupByDedupe(buildDocIndex()).size;
}

export function countRelevantDocuments(): number {
  return readAllNormalized("published").filter((d) => d.is_relevant === true).length;
}
