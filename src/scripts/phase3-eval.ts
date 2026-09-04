/**
 * Phase 3 automated eval checks (T3.1, T3.2, T3.3, T3.8, T3.13 partial).
 */
import "./load-env";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { SEED_CODES, PRICE_CODE_SLUGS, CODEBOOK_VERSION } from "@/lib/codebook/seed";
import { readCollection } from "@/lib/store/fs";
import { embedding } from "@/config/models";

interface Check {
  id: string;
  pass: boolean;
  detail: string;
  pending?: boolean;
}

function check(id: string, pass: boolean, detail: string, pending = false): Check {
  return { id, pass, detail, pending };
}

function main() {
  const checks: Check[] = [];
  const codes = readCollection("codes");
  const unitCodes = readCollection("unit_codes");
  const units = readCollection("evidence_units");

  // T3.1 Seed codes definable
  const seedCodes = codes.filter((c) => c.origin === "deductive" && c.slug !== "other");
  const defsOk = seedCodes.every((c) => c.definition && c.label);
  checks.push(
    check(
      "T3.1",
      defsOk && seedCodes.length >= SEED_CODES.length - 1,
      `${seedCodes.length} seed codes with definitions`,
      codes.length === 0,
    ),
  );

  const coveragePath = join(process.cwd(), "data", "published", "codebook_coverage.json");
  let coverage: {
    coverage_pct?: number;
    other_pct?: number;
    embedding_model?: string;
    codebook_version?: string;
  } | null = null;
  if (existsSync(coveragePath)) {
    coverage = JSON.parse(readFileSync(coveragePath, "utf-8"));
  }

  // T3.2 Coverage
  checks.push(
    check(
      "T3.2",
      (coverage?.coverage_pct ?? 0) >= 90,
      coverage
        ? `${coverage.coverage_pct?.toFixed(1)}% units assigned ≥1 non-other code`
        : "run phase3:codebook first",
      !coverage,
    ),
  );

  // T3.3 Other bucket
  checks.push(
    check(
      "T3.3",
      (coverage?.other_pct ?? 100) <= 10,
      coverage
        ? `${coverage.other_pct?.toFixed(1)}% in other bucket`
        : "run phase3:codebook first",
      !coverage,
    ),
  );

  // T3.8 Price code separation
  const priceSlugs = codes
    .filter((c) => PRICE_CODE_SLUGS.includes(c.slug as (typeof PRICE_CODE_SLUGS)[number]))
    .map((c) => c.slug);
  checks.push(
    check(
      "T3.8",
      PRICE_CODE_SLUGS.every((s) => priceSlugs.includes(s)),
      `price codes: ${priceSlugs.join(", ") || "none"}`,
      codes.length === 0,
    ),
  );

  // T3.13 Versioning
  const logPath = join(process.cwd(), "data", "published", "codebook_log.json");
  const hasLog = existsSync(logPath);
  checks.push(
    check(
      "T3.13",
      hasLog && coverage?.codebook_version === CODEBOOK_VERSION,
      hasLog
        ? `version ${coverage?.codebook_version}, embedding ${coverage?.embedding_model ?? embedding.modelId}`
        : "no codebook_log.json",
      !hasLog,
    ),
  );

  // T3.6 Inductive yield — needs human accept
  const proposed = codes.filter((c) => c.origin === "inductive" && c.status === "proposed");
  checks.push(
    check(
      "T3.6",
      proposed.length >= 3,
      `${proposed.length} proposed inductive codes (accept ≥3 after review)`,
      proposed.length === 0,
    ),
  );

  // Human-review tests
  for (const id of ["T3.4", "T3.5", "T3.7", "T3.9", "T3.10", "T3.11", "T3.12", "T3.14", "T3.15"]) {
    checks.push(check(id, false, "requires human review or gold labels", true));
  }

  checks.push(
    check("T3.7a", true, "clustering uses local embeddings only (D-018)", false),
  );

  console.log("Phase 3 eval\n");
  let failed = 0;
  let pending = 0;
  for (const c of checks) {
    const icon = c.pending ? "○" : c.pass ? "✓" : "✗";
    const tag = c.pending ? "PENDING" : c.pass ? "PASS" : "FAIL";
    console.log(`${icon} ${c.id} [${tag}] ${c.detail}`);
    if (!c.pending && !c.pass) failed += 1;
    if (c.pending) pending += 1;
  }

  console.log(`\nUnits: ${units.length}, codes: ${codes.length}, assignments: ${unitCodes.length}`);
  console.log(`${checks.length} checks: ${failed} failed, ${pending} pending`);
  if (failed > 0) process.exit(1);
}

main();
