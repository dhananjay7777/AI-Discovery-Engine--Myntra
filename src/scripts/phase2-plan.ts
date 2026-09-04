/**
 * Print the Phase 2 Groq call schedule for the current corpus.
 * Does not call Groq.
 */
import "./load-env";
import { planPhase2Calls } from "@/lib/groq/phase2-quota";
import { publishedGroqCaps, remainingDailyBudget } from "@/lib/groq/budget";
import { extractModelPool, gateModelPool, models } from "@/config/models";

function main() {
  const plan = planPhase2Calls();
  const caps = publishedGroqCaps();

  console.log("Phase 2 Groq quota plan\n");
  console.log("Published caps (per model: gpt-oss-20b and gpt-oss-120b)");
  console.log(`  ${caps.requestsPerMinute} RPM · ${caps.tokensPerMinute} TPM`);
  console.log(`  ${caps.dailyRequestBudget} RPD · ${caps.dailyTokenBudget} TPD`);
  console.log(`  Working budget at ${caps.headroom * 100}% headroom:`);
  console.log(
    `    ${caps.working.requestsPerMinute} RPM · ${caps.working.tokensPerMinute} TPM · ${caps.working.dailyRequestBudget} RPD · ${caps.working.dailyTokenBudget} TPD`,
  );

  console.log("\nCorpus");
  console.log(`  Normalized documents: ${plan.corpus.normalized_documents}`);
  console.log(`  Unique dedupe groups to gate: ${plan.corpus.documents_to_gate}`);

  console.log("\nBinding constraint:", plan.estimates.binding_constraint);
  console.log(
    `  Gate: ~${plan.estimates.gate_tokens_per_call} tokens/call → ${plan.throughput.gate_calls_per_minute}/min, ${plan.throughput.gate_calls_per_day}/day`,
  );
  console.log(
    `  Extract: ~${plan.estimates.extract_tokens_per_call} tokens/call → ${plan.throughput.extract_calls_per_minute}/min, ${plan.throughput.extract_calls_per_day}/day`,
  );
  console.log(
    `  Assumed gate pass rate ${(plan.estimates.gate_pass_rate * 100).toFixed(0)}% → ${plan.estimates.expected_extract_calls} extract calls`,
  );

  console.log("\nCalendar (each strict-schema model has its own TPD — pooling them is how a 2-day finish is possible)");
  console.log(`  Gate pool size:      ${gateModelPool.length}`);
  console.log(`  Gate days (pooled):  ${plan.calendar.gate_days}`);
  console.log(`  Extract days:        ${plan.calendar.extract_days}`);
  console.log(`  Wall-clock days:     ${plan.calendar.overlapped_calendar_days}`);
  console.log(`  ${plan.calendar.agreement_day_note}`);

  console.log("\nRules");
  for (const rule of plan.rules) {
    console.log(`  - ${rule}`);
  }

  console.log("\nRemaining today (UTC), after headroom");
  for (const model of [...new Set([...gateModelPool, ...extractModelPool, models.gate, models.extraction])]) {
    const left = remainingDailyBudget(model);
    console.log(`  ${model}: ${left.requests} req / ${left.tokens} tok`);
  }
}

main();
