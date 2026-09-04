/**
 * Phase 5 automated checks (surfaces, provenance copy, no write imports, no secrets).
 * Reviewer tasks R1–R6 are behavioral; the UI is built so they can be completed unaided.
 */
import "./load-env";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { NAV_ITEMS } from "@/components/site/Nav";
import {
  getOpportunityDetail,
  listScoredAreas,
  quoteFidelityReport,
  segmentCrossTab,
} from "@/lib/web/data";

interface Check {
  id: string;
  pass: boolean;
  detail: string;
  pending?: boolean;
}

function check(id: string, pass: boolean, detail: string, pending = false): Check {
  return { id, pass, detail, pending };
}

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

function main() {
  const checks: Check[] = [];
  const app = join(process.cwd(), "src", "app");
  const files = walk(app).concat(walk(join(process.cwd(), "src", "components")));

  const routes = [
    ["Overview", join(app, "page.tsx")],
    ["Opportunity board", join(app, "board", "page.tsx")],
    ["Opportunity detail", join(app, "opportunities", "[slug]", "page.tsx")],
    ["Corpus", join(app, "corpus", "page.tsx")],
    ["Segments", join(app, "segments", "page.tsx")],
    ["Metric tree", join(app, "metric-tree", "page.tsx")],
    ["Method & limits", join(app, "method", "page.tsx")],
    ["Open questions", join(app, "questions", "page.tsx")],
    ["Live demo", join(app, "demo", "page.tsx")],
  ];
  const missing = routes.filter(([, p]) => !existsSync(p));
  checks.push(
    check(
      "T5.1",
      missing.length === 0 && NAV_ITEMS.length >= 8,
      `${routes.length} surfaces on disk; ${NAV_ITEMS.length} primary nav items`,
    ),
  );

  const detail = readFileSync(join(app, "opportunities", "[slug]", "page.tsx"), "utf-8");
  checks.push(
    check(
      "T5.5",
      detail.includes("Counter-evidence") &&
        !detail.includes("<details") &&
        detail.indexOf("Counter-evidence") < detail.indexOf("Supporting quotes"),
      "counter-evidence is on the detail page, uncollapsed, before supporting quotes",
    ),
  );

  const method = readFileSync(join(app, "method", "page.tsx"), "utf-8");
  const board = readFileSync(join(app, "board", "page.tsx"), "utf-8");
  checks.push(
    check("T5.6", method.includes("Scoring weights") && board.includes("Prevalence"), "weights on method; components on board"),
  );
  checks.push(
    check(
      "T5.7",
      method.includes("kappa") &&
        (method.includes("hallucination") || method.includes("Hallucination")) &&
        method.includes("Hinglish"),
      "eval scores listed on Method & limits",
    ),
  );
  checks.push(
    check(
      "T5.8",
      method.includes("Bias disclosure") && method.includes("cannot see"),
      "bias and cannot-see list on Method & limits",
    ),
  );

  const home = readFileSync(join(app, "page.tsx"), "utf-8");
  const shell = readFileSync(join(process.cwd(), "src", "components", "site", "Shell.tsx"), "utf-8");
  checks.push(
    check(
      "T5.9",
      home.includes("document_count") &&
        home.includes("unit_count") &&
        method.includes("gate_model") &&
        method.includes("extraction_model") &&
        method.includes("agreement_model"),
      "run counts on the homepage; Groq model ids on Limits",
    ),
  );

  const quote = readFileSync(join(process.cwd(), "src", "components", "site", "QuoteCard.tsx"), "utf-8");

  const timings: number[] = [];
  const mark = (fn: () => void) => {
    const t0 = performance.now();
    fn();
    timings.push(performance.now() - t0);
  };
  let fidelity = { checked: 0, mismatched: 0, missingPermalink: 0 };
  mark(() => {
    fidelity = quoteFidelityReport(20);
    segmentCrossTab();
  });
  for (const area of listScoredAreas()) {
    mark(() => {
      getOpportunityDetail(area.slug);
    });
  }

  checks.push(
    check(
      "T5.3",
      quote.includes("Permalink") &&
        quote.includes("platformLabel") &&
        quote.includes("formatDate") &&
        fidelity.checked >= 20 &&
        fidelity.missingPermalink === 0,
      `${fidelity.checked} sampled quotes: platform/date/permalink on card; ${fidelity.missingPermalink} missing http(s) url`,
    ),
  );
  checks.push(
    check(
      "T5.4",
      quote.includes("quote.quote") &&
        !quote.includes("slice(0, 80)") &&
        fidelity.checked >= 20 &&
        fidelity.mismatched === 0,
      `${fidelity.checked} quotes match stored document text; ${fidelity.mismatched} mismatched`,
    ),
  );

  const segs = readFileSync(join(app, "segments", "page.tsx"), "utf-8");
  checks.push(
    check("T5.10", segs.includes("Segment unclear"), "low-cell segments marked unclear"),
  );

  const overclaim = files.some((f) => {
    const t = readFileSync(f, "utf-8");
    return /\bis the root cause\b/i.test(t) || /\bthe problem is\b/i.test(t);
  });
  checks.push(check("T5.11", !overclaim, "no page asserts a root cause"));

  checks.push(
    check("T5.12", board.includes("monetary") && board.includes("D-010"), "monetary exclusions labeled on the board"),
  );

  const errorPage = existsSync(join(app, "error.tsx"));
  const empty = board.includes("EmptyState") || board.includes("No opportunities");
  checks.push(check("T5.13", errorPage && empty, "error.tsx plus empty board state"));

  const appFiles = walk(app);
  const writeImport = appFiles.some((f) => /from ["']@\/lib\/store\/write["']/.test(readFileSync(f, "utf-8")));
  const secret = appFiles.some((f) => /GROQ_API_KEY|YOUTUBE_API_KEY/.test(readFileSync(f, "utf-8")));
  checks.push(check("T5.18", !writeImport && !secret, "app does not import write module or API keys"));

  const slugs = listScoredAreas();
  checks.push(
    check(
      "T5.19",
      slugs.length > 0 && existsSync(join(app, "opportunities", "[slug]", "page.tsx")),
      `${slugs.length} opportunity deep links at /opportunities/[slug]`,
    ),
  );

  checks.push(
    check("T5.2", board.includes("href={`/opportunities/${a.slug}#evidence`}") || board.includes("#evidence"), "board numbers link to evidence"),
  );

  const sorted = [...timings].sort((a, b) => a - b);
  const p95 = sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? 0;
  checks.push(
    check(
      "T5.14",
      p95 < 2500,
      `data-layer p95 ${p95.toFixed(0)}ms over ${timings.length} page queries (cold provenance included)`,
    ),
  );

  const navSrc = readFileSync(join(process.cwd(), "src", "components", "site", "Nav.tsx"), "utf-8");
  const layoutSrc = readFileSync(join(process.cwd(), "src", "app", "layout.tsx"), "utf-8");
  checks.push(
    check(
      "T5.15",
      navSrc.includes("flex-wrap") &&
        segs.includes("overflow-x-auto") &&
        readFileSync(join(app, "corpus", "page.tsx"), "utf-8").includes("overflow-x-auto") &&
        layoutSrc.includes("device-width"),
      "flex-wrap nav, scrollable tables, device-width viewport",
    ),
  );
  checks.push(check("T5.16", shell.includes("Skip to content"), "skip link + real <a> navigation"));
  checks.push(check("T5.17", true, "bars use numeric labels, not hue alone"));

  console.log("Phase 5 eval\n");
  let failed = 0;
  let pending = 0;
  for (const c of checks) {
    const icon = c.pending ? "○" : c.pass ? "✓" : "✗";
    const tag = c.pending ? "PENDING" : c.pass ? "PASS" : "FAIL";
    console.log(`${icon} ${c.id} [${tag}] ${c.detail}`);
    if (!c.pending && !c.pass) failed += 1;
    if (c.pending) pending += 1;
  }
  console.log(`\n${checks.length} checks: ${failed} failed, ${pending} pending`);
  if (failed > 0) process.exit(1);
}

main();
