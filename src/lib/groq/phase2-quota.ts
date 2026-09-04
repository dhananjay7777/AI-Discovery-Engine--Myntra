/**
 * Phase 2 call plan against published Groq caps for gpt-oss-20b / gpt-oss-120b.
 * Tokens-per-day is the binding constraint, not requests-per-day.
 */
import { groqLimits, gateModelPool, phase2CallBudget, workingGroqLimits } from "@/config/models";
import { readAllNormalized } from "@/lib/corpus/store";

export interface Phase2QuotaPlan {
  generated_at: string;
  corpus: {
    normalized_documents: number;
    unique_dedupe_groups: number;
    documents_to_gate: number;
  };
  caps: ReturnType<typeof workingGroqLimits> & {
    published_rpm: number;
    published_tpm: number;
    published_rpd: number;
    published_tpd: number;
    headroom: number;
  };
  estimates: {
    gate_tokens_per_call: number;
    extract_tokens_per_call: number;
    gate_pass_rate: number;
    expected_extract_calls: number;
    binding_constraint: "tokens_per_day" | "requests_per_day";
  };
  throughput: {
    gate_calls_per_minute: number;
    extract_calls_per_minute: number;
    gate_calls_per_day: number;
    extract_calls_per_day: number;
  };
  calendar: {
    gate_days: number;
    extract_days: number;
    overlapped_calendar_days: number;
    agreement_day_note: string;
  };
  rules: string[];
}

export function uniqueDedupeGroupCount(): number {
  const docs = readAllNormalized();
  const groups = new Set(docs.map((d) => d.dedupe_group ?? d.id));
  return groups.size;
}

export function planPhase2Calls(
  options: { passRate?: number; documentCount?: number } = {},
): Phase2QuotaPlan {
  const working = workingGroqLimits();
  const docs = options.documentCount ?? uniqueDedupeGroupCount();
  const passRate = options.passRate ?? phase2CallBudget.assumedGatePassRate;
  const gateTokens = phase2CallBudget.gateEstimatedTokens;
  const extractTokens = phase2CallBudget.extractEstimatedTokens;

  const gatePerDayByTokens = Math.floor(working.dailyTokenBudget / gateTokens);
  const extractPerDayByTokens = Math.floor(working.dailyTokenBudget / extractTokens);
  const gateCallsPerDay = Math.min(working.dailyRequestBudget, gatePerDayByTokens);
  const extractCallsPerDay = Math.min(
    working.dailyRequestBudget,
    extractPerDayByTokens,
  );

  const gatePerMinByTokens = Math.floor(working.tokensPerMinute / gateTokens);
  const extractPerMinByTokens = Math.floor(working.tokensPerMinute / extractTokens);

  const poolSize = Math.max(1, gateModelPool.length);
  const expectedExtract = Math.ceil(docs * passRate);
  const gateDays = Math.ceil(docs / Math.max(1, gateCallsPerDay * poolSize));
  const extractDays = Math.ceil(expectedExtract / Math.max(1, extractCallsPerDay));
  // Gate pool size sets the wall clock. Extract prefers 120b, which is last in the
  // gate pool, and the measured pass rate is well below the 35% planning assumption.
  const overlapped = gateDays;

  const tpdBindsGate = gatePerDayByTokens <= working.dailyRequestBudget;
  const tpdBindsExtract = extractPerDayByTokens <= working.dailyRequestBudget;

  return {
    generated_at: new Date().toISOString(),
    corpus: {
      normalized_documents: readAllNormalized().length,
      unique_dedupe_groups: docs,
      documents_to_gate: docs,
    },
    caps: {
      ...working,
      published_rpm: groqLimits.requestsPerMinute,
      published_tpm: groqLimits.tokensPerMinute,
      published_rpd: groqLimits.dailyRequestBudget,
      published_tpd: groqLimits.dailyTokenBudget,
      headroom: groqLimits.headroom,
    },
    estimates: {
      gate_tokens_per_call: gateTokens,
      extract_tokens_per_call: extractTokens,
      gate_pass_rate: passRate,
      expected_extract_calls: expectedExtract,
      binding_constraint:
        tpdBindsGate || tpdBindsExtract ? "tokens_per_day" : "requests_per_day",
    },
    throughput: {
      gate_calls_per_minute: Math.min(working.requestsPerMinute, gatePerMinByTokens),
      extract_calls_per_minute: Math.min(
        working.requestsPerMinute,
        extractPerMinByTokens,
      ),
      gate_calls_per_day: gateCallsPerDay,
      extract_calls_per_day: extractCallsPerDay,
    },
    calendar: {
      gate_days: gateDays,
      extract_days: extractDays,
      overlapped_calendar_days: overlapped,
      agreement_day_note:
        "Agreement on qwen is skipped during the 2-day bulk run (--skip-agreement). qwen TPD is used for gating instead (D-021).",
    },
    rules: [
      "One Groq call per unique dedupe_group at the gate (not every near-duplicate row).",
      `Truncate gate input to ${phase2CallBudget.gateMaxDocChars} characters; extract input to ${phase2CallBudget.extractMaxDocChars}.`,
      "Cache by content_hash + prompt_version + model_id — never re-spend on completed documents.",
      "Checkpoint after every document; abort cleanly when every model in the gate pool is out of daily budget.",
      `Gate pool (${gateModelPool.length} independent TPD buckets): ${gateModelPool.join(", ")}.`,
      "Extract prefers gpt-oss-120b, then 20b, then qwen. Do not use a single model for the whole job — that throws away the other buckets.",
      "Do not retry more than 3 times on 429; backoff instead of burning the daily allowance.",
      "Spend at most 80% of each published cap so retries still fit.",
    ],
  };
}
