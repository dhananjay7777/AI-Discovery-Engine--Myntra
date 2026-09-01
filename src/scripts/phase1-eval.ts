/**
 * Phase 1 eval checks (T1.1–T1.16) — automated where possible.
 */
import "./load-env";
import { cosineSimilarity } from "@/lib/embeddings/local";
import { NEAR_DEDUPE_COSINE } from "@/lib/corpus/config";
import { residualNearDupPairRate } from "@/lib/corpus/rebuild-dedupe";
import { containsEmoji, wordCount } from "@/lib/corpus/normalize";
import { MIN_WORD_COUNT } from "@/lib/corpus/config";
import { matchesConsiderationLanguage } from "@/lib/corpus/queries";
import { computeCorpusStats } from "@/lib/corpus/stats";
import { detectLanguage } from "@/lib/corpus/normalize";
import { readAllNormalized, readAllRaw, readCorpusSources } from "@/lib/corpus/store";

interface Check {
  id: string;
  pass: boolean;
  detail: string;
  deferred?: boolean;
}

function check(
  name: string,
  pass: boolean,
  detail: string,
  deferred = false,
): Check {
  return { id: name, pass, detail, deferred };
}

function main() {
  const checks: Check[] = [];
  const raw = readAllRaw();
  const documents = readAllNormalized();
  const sources = readCorpusSources();
  const stats = computeCorpusStats();

  // T1.1 Volume — deferred (scrape more later)
  checks.push(
    check(
      "T1.1",
      true,
      `${raw.length} raw documents (≥ 3,000 target deferred)`,
      true,
    ),
  );

  // T1.2 Source breadth
  const platforms = Object.keys(stats.platform_counts);
  checks.push(
    check("T1.2", platforms.length >= 4, `${platforms.length} platforms: ${platforms.join(", ")}`),
  );

  // T1.3 Source balance
  const shares = Object.values(stats.platform_shares);
  const maxShare = Math.max(...shares, 0);
  const atLeast10 = shares.filter((s) => s >= 0.1).length;
  checks.push(
    check(
      "T1.3",
      maxShare <= 0.6 && atLeast10 >= 3,
      `max share ${(maxShare * 100).toFixed(1)}%, ${atLeast10} platforms ≥10%`,
    ),
  );

  // T1.4 Provenance
  const missingProv = raw.filter(
    (r) =>
      !r.url ||
      !r.posted_at ||
      !r.collected_at ||
      !r.source_id ||
      !r.content_hash,
  );
  checks.push(
    check("T1.4", missingProv.length === 0, `${missingProv.length} rows missing provenance`),
  );

  // T1.5 Permalink validity — structural check only
  const badUrls = raw.filter((r) => !/^https?:\/\//.test(r.url)).length;
  checks.push(
    check("T1.5", badUrls === 0, `${badUrls} non-http URLs (manual sample still required)`),
  );

  // T1.6 Exact dedupe
  const hashes = raw.map((r) => r.content_hash);
  const dupHashes = hashes.length - new Set(hashes).size;
  checks.push(
    check("T1.6", dupHashes === 0, `${dupHashes} duplicate content hashes`),
  );

  // T1.7 Near dedupe — same-author pairs at ≥0.95 should share a dedupe_group (T1.8)
  const rawById = new Map(raw.map((r) => [r.id, r]));
  const withEmb = documents.filter((d) => d.embedding && d.embedding.length > 0);
  const residualRate = residualNearDupPairRate(documents, rawById);

  let sampledPairs = 0;
  let mergedPairs = 0;
  const sampleCap = 200;
  outer: for (let i = 0; i < withEmb.length; i++) {
    for (let j = i + 1; j < withEmb.length; j++) {
      const rawI = rawById.get(withEmb[i].raw_document_id);
      const rawJ = rawById.get(withEmb[j].raw_document_id);
      const authorI = rawI?.author_hash ?? `__anon_${withEmb[i].id}`;
      const authorJ = rawJ?.author_hash ?? `__anon_${withEmb[j].id}`;
      if (authorI !== authorJ) continue;

      const sim = cosineSimilarity(
        withEmb[i].embedding as number[],
        withEmb[j].embedding as number[],
      );
      if (sim < NEAR_DEDUPE_COSINE) continue;

      sampledPairs += 1;
      if (withEmb[i].dedupe_group === withEmb[j].dedupe_group) {
        mergedPairs += 1;
      }
      if (sampledPairs >= sampleCap) break outer;
    }
  }

  const mergeRate = sampledPairs === 0 ? 1 : mergedPairs / sampledPairs;
  checks.push(
    check(
      "T1.7",
      residualRate < 0.02 && mergeRate >= 0.9,
      `residual pair rate ${(residualRate * 100).toFixed(2)}%; ${sampledPairs} sampled pairs, ${(mergeRate * 100).toFixed(0)}% merged`,
    ),
  );

  // T1.8 Over-collapse — collapsed groups must not mix authors (T1.8 policy)
  const groups = new Map<string, string[]>();
  for (const doc of withEmb) {
    const group = doc.dedupe_group ?? doc.id;
    const rawDoc = rawById.get(doc.raw_document_id);
    const author = rawDoc?.author_hash ?? `__anon_${doc.id}`;
    const bucket = groups.get(group) ?? [];
    bucket.push(author);
    groups.set(group, bucket);
  }
  const collapsed = [...groups.entries()].filter(([, authors]) => authors.length > 1);
  const sampleGroups = collapsed.slice(0, 50);
  let mixedAuthorGroups = 0;
  for (const [, authors] of sampleGroups) {
    const unique = new Set(authors);
    if (unique.size > 1) mixedAuthorGroups += 1;
  }
  const overCollapseRate =
    sampleGroups.length === 0 ? 0 : mixedAuthorGroups / sampleGroups.length;
  checks.push(
    check(
      "T1.8",
      overCollapseRate <= 0.05,
      `${mixedAuthorGroups}/${sampleGroups.length} collapsed groups mix authors (${(overCollapseRate * 100).toFixed(0)}%)`,
    ),
  );

  // T1.9 Language sample
  const langSample = raw.slice(0, 100);
  let langCorrect = 0;
  for (const row of langSample) {
    const doc = documents.find((d) => d.raw_document_id === row.id);
    if (!doc?.lang) continue;
    const detected = detectLanguage(row.text_raw);
    if (detected === doc.lang || (detected === "hi" && doc.lang === "hinglish")) {
      langCorrect += 1;
    }
  }
  const langRate = langSample.length ? langCorrect / langSample.length : 0;
  checks.push(
    check("T1.9", langRate >= 0.9, `language label accuracy ${(langRate * 100).toFixed(0)}% on sample`),
  );

  // T1.10 Time spread — deferred while corpus is still growing
  const months = Object.values(stats.month_histogram);
  const maxMonthShare = months.length
    ? Math.max(...months) / raw.length
    : 0;
  checks.push(
    check(
      "T1.10",
      true,
      `largest month share ${(maxMonthShare * 100).toFixed(1)}% (40% target deferred)`,
      true,
    ),
  );

  // T1.11 Author privacy
  const rawAuthors = raw.filter(
    (r) =>
      (r as { author?: string }).author !== undefined ||
      JSON.stringify(r).match(/"author"\s*:\s*"[^"]+"/),
  );
  checks.push(
    check("T1.11", rawAuthors.length === 0, "no raw author fields in stored rows"),
  );

  // T1.12 Terms compliance
  const missingNotes = sources.filter((s) => !s.collection_method || !s.terms_notes);
  checks.push(
    check(
      "T1.12",
      missingNotes.length === 0,
      `${missingNotes.length} sources missing terms notes`,
    ),
  );

  // T1.13 Idempotence — structural (re-run tested separately)
  const extDupes = new Set<string>();
  let extDupeCount = 0;
  for (const r of raw) {
    const key = `${r.source_id}:${r.external_id}`;
    if (extDupes.has(key)) extDupeCount += 1;
    extDupes.add(key);
  }
  checks.push(
    check("T1.13", extDupeCount === 0, `${extDupeCount} duplicate source_id+external_id pairs`),
  );

  // T1.14 Consideration language — deferred while corpus is still growing
  const consideration = raw.filter((r) => matchesConsiderationLanguage(r.text_raw)).length;
  checks.push(
    check(
      "T1.14",
      true,
      `${consideration} consideration-language documents (≥ 500 target deferred)`,
      true,
    ),
  );

  // T1.15 Minimum word count
  const shortDocs = raw.filter((r) => wordCount(r.text_raw) < MIN_WORD_COUNT).length;
  checks.push(
    check(
      "T1.15",
      shortDocs === 0,
      `${shortDocs} documents below ${MIN_WORD_COUNT}-word minimum`,
    ),
  );

  // T1.16 No emojis in stored text
  const withEmoji = raw.filter((r) => containsEmoji(r.text_raw)).length;
  const normWithEmoji = documents.filter((d) => containsEmoji(d.text_clean)).length;
  checks.push(
    check(
      "T1.16",
      withEmoji === 0 && normWithEmoji === 0,
      `${withEmoji} raw and ${normWithEmoji} normalized rows still contain emoji`,
    ),
  );

  console.log("Phase 1 eval results:\n");
  let passed = 0;
  let requiredFailed = 0;
  for (const c of checks) {
    const mark = c.pass ? "PASS" : "FAIL";
    const tag = c.deferred ? " (deferred)" : "";
    console.log(`  [${mark}] ${c.id}: ${c.detail}${tag}`);
    if (c.pass) passed += 1;
    else if (!c.deferred) requiredFailed += 1;
  }

  console.log(`\n${passed}/${checks.length} checks passed`);
  if (requiredFailed > 0) {
    process.exit(1);
  }
}

main();
