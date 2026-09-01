/**
 * Verify the JSON store schema exists and the website cannot write published data (T0.2, T0.4).
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { assertCorpusLayout } from "@/lib/corpus/store";
import { COLLECTIONS } from "@/lib/store/schema";
import { assertPublishedCollections } from "@/lib/store/fs";

function fail(message: string): never {
  console.error("FAIL:", message);
  process.exit(1);
}

function scanFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      scanFiles(path, acc);
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      acc.push(path);
    }
  }
  return acc;
}

function main() {
  const missing = assertPublishedCollections();
  if (missing.length > 0) {
    fail(`Missing published collections: ${missing.join(", ")}`);
  }
  console.log(`✓ ${COLLECTIONS.length} published analysis collections present`);

  const corpusMissing = assertCorpusLayout("published");
  if (corpusMissing.length > 0) {
    fail(`Missing corpus layout files:\n${corpusMissing.join("\n")}`);
  }
  console.log("✓ Corpus layout present under data/published/corpus/");

  const appRoot = join(process.cwd(), "src", "app");
  const appFiles = scanFiles(appRoot);
  const offenders: string[] = [];

  for (const file of appFiles) {
    const source = readFileSync(file, "utf-8");
    if (
      source.includes("@/lib/store/write") ||
      source.includes("lib/store/write")
    ) {
      offenders.push(file);
    }
  }

  if (offenders.length > 0) {
    fail(
      `App routes imported the write store (must be read-only):\n${offenders.join("\n")}`,
    );
  }
  console.log("✓ No app route imports @/lib/store/write");
  console.log("\n✓ Store verification passed");
}

main();
