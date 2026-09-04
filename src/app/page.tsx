import Link from "next/link";
import { HBarList, ShareStack } from "@/components/site/Charts";
import { Shell } from "@/components/site/Shell";
import { EmptyState } from "@/components/site/ui";
import {
  formatDate,
  formatPct,
  getCorpusStats,
  getPhase2Metrics,
  getRunMeta,
  listScoredAreas,
  platformLabel,
} from "@/lib/web/data";
import { ideaPlain, ideaTitle } from "@/lib/web/plain";

export const dynamic = "force-dynamic";

function formatCount(n: number): string {
  return n.toLocaleString("en-IN");
}

function StatCell({
  step,
  label,
  value,
  hint,
  share,
}: {
  step: string;
  label: string;
  value: number;
  hint: string;
  share: number;
}) {
  const keptPct = Math.round(share * 100);
  return (
    <div className="stat-cell">
      <p className="kicker">
        {step}
        <span className="mx-2 opacity-40">·</span>
        {label}
      </p>
      <p className="stat-cell-value mt-5">{formatCount(value)}</p>
      <p className="stat-cell-hint mt-3 text-xs leading-relaxed text-muted">
        {hint}
      </p>
      <div className="stat-cell-bar">
        <p className="stat-cell-bar-label">
          {share >= 0.999
            ? "Starting pile · 100%"
            : `Still ${keptPct}% of the starting pile`}
        </p>
        <span>
          <span style={{ width: `${Math.max(6, share * 100)}%` }} />
        </span>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const run = getRunMeta();
  const stats = getCorpusStats();
  const p2 = getPhase2Metrics();
  const corpus = p2?.corpus as {
    relevant_documents?: number;
  } | undefined;
  const rec = [...listScoredAreas()]
    .filter((a) => a.recommended)
    .sort((a, b) => b.score - a.score);
  const areas = listScoredAreas();
  const hrefIdea = (slug: string) =>
    areas.some((a) => a.slug === slug) ? `/opportunities/${slug}` : "/board";

  const rawCollected = stats?.totals.raw_documents ?? 0;
  const afterCleaning = stats?.totals.normalized_documents ?? 0;
  const aboutBuying =
    corpus?.relevant_documents ?? run.document_count;
  const quotesKept = run.unit_count;
  const sources =
    stats?.by_source.filter((s) => s.raw_count + s.normalized_count > 0) ?? [];

  return (
    <Shell current="/" run={run}>
      <p className="kicker">Myntra · Growth</p>
      <h1 className="page-title mt-3">Why wishlists sit unbought</h1>
      <p className="lede mt-5">
        Shoppers save items on Myntra. Many never buy them within 30 days.
      </p>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
        This site read public comments — app reviews, Reddit, YouTube — and
        picked a few likely reasons. They are starting points for talking to
        shoppers, not finished answers.
        {run.started_at ? ` Comments were read on ${formatDate(run.started_at)}.` : ""}
      </p>

      <section className="mt-12" aria-label="How to use this site">
        <h2 className="section-title">How to use this site</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted">
          Four pages are enough. The rest is extra detail.
        </p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <li className="surface flex h-full flex-col p-6">
            <p className="kicker">1 · Findings</p>
            <p className="mt-3 leading-relaxed">
              The main ideas, in the order we suggest you look first.
            </p>
            <p className="mt-auto pt-4 text-sm">
              <Link href="/board" className="text-accent underline underline-offset-4">
                Open findings
              </Link>
            </p>
          </li>
          <li className="surface flex h-full flex-col p-6">
            <p className="kicker">2 · One idea</p>
            <p className="mt-3 leading-relaxed">
              Real comments for and against. Read both before you believe it.
            </p>
            <p className="mt-auto pt-4 text-sm">
              <Link href="/board" className="text-accent underline underline-offset-4">
                Pick an idea
              </Link>
            </p>
          </li>
          <li className="surface flex h-full flex-col p-6">
            <p className="kicker">3 · Questions</p>
            <p className="mt-3 leading-relaxed">
              What to ask a real shopper — written to hear their story, not to
              prove us right.
            </p>
            <p className="mt-auto pt-4 text-sm">
              <Link href="/questions" className="text-accent underline underline-offset-4">
                What to ask
              </Link>
            </p>
          </li>
          <li className="surface flex h-full flex-col p-6">
            <p className="kicker">4 · What’s missing</p>
            <p className="mt-3 leading-relaxed">
              This is public comments only. No private Myntra data. No proof a
              change would work.
            </p>
            <p className="mt-auto pt-4 text-sm">
              <Link href="/method" className="text-accent underline underline-offset-4">
                Read the gaps
              </Link>
            </p>
          </li>
        </ol>
      </section>

      <section className="mt-16">
        <h2 className="section-title">The ideas, in short</h2>
        {rec.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="Nothing published yet"
              body="The list of ideas has not been posted."
            />
          </div>
        ) : (
          <>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted">
              Tap one to read the actual comments behind it.
            </p>
            <div className="data-panel mt-8 px-6 py-6 sm:px-8">
              <p className="text-xs text-muted">How often each idea showed up</p>
              <div className="mt-4">
                <HBarList
                  items={rec.map((a) => ({
                    label: ideaTitle(a.slug, a.label),
                    value: a.prevalence,
                    href: `/opportunities/${a.slug}`,
                  }))}
                  format={(n) => formatPct(n, 0)}
                  max={1}
                />
              </div>
            </div>
            <ol className="mt-8 grid gap-6 sm:grid-cols-2">
              {rec.map((a, i) => (
                <li key={a.slug} className="h-full">
                  <Link
                    href={`/opportunities/${a.slug}`}
                    className="surface surface-hover flex h-full flex-col px-6 py-7 sm:px-8 sm:py-8"
                  >
                    <span className="kicker">Idea {i + 1}</span>
                    <span className="mt-4 block font-display text-2xl leading-snug sm:text-3xl">
                      {ideaTitle(a.slug, a.label)}
                    </span>
                    <span className="mt-4 block text-base leading-7 text-muted">
                      {ideaPlain(a.slug, a.hypothesis)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </>
        )}
        <p className="mt-10 text-sm">
          <Link href="/board" className="text-accent underline underline-offset-4">
            See why they are in this order
          </Link>
        </p>
      </section>

      <section className="mt-16" aria-label="What we read">
        <h2 className="section-title">Where the comments came from</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Two pictures sit below. The four numbers are a filter: we start with
          a big public pile and throw most of it away. The long bar is only the
          first pile, split by website.
        </p>
        <div className="stat-strip mt-8">
          <p className="stat-strip-heading">
            How many comments we still kept
          </p>
          <div className="stat-strip-grid">
            <StatCell
              step="1"
              label="Started with"
              value={rawCollected}
              hint="Every public review and comment we collected"
              share={1}
            />
            <StatCell
              step="2"
              label="After cleanup"
              value={afterCleaning}
              hint="Copies and junk taken out"
              share={rawCollected ? afterCleaning / rawCollected : 0}
            />
            <StatCell
              step="3"
              label="About buying"
              value={aboutBuying || run.document_count}
              hint="About thinking of buying — not delivery complaints"
              share={
                rawCollected
                  ? (aboutBuying || run.document_count) / rawCollected
                  : 0
              }
            />
            <StatCell
              step="4"
              label="Quotes we used"
              value={quotesKept}
              hint="Short lines about pausing before buying"
              share={rawCollected ? quotesKept / rawCollected : 0}
            />
          </div>
          {sources.length > 0 ? (
            <div className="stat-strip-sources">
              <p className="stat-strip-heading">Which websites they came from</p>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">
                The whole bar is the starting pile. A longer slice means more
                comments from that website.
              </p>
              <div className="mt-4">
                <ShareStack
                  items={sources.map((s) => ({
                    label: platformLabel(s.platform),
                    value: s.raw_count,
                  }))}
                  format={formatCount}
                />
              </div>
              <p className="mt-3">
                <Link
                  href="/corpus"
                  className="text-sm text-accent underline underline-offset-4"
                >
                  See every source
                </Link>
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="section-title">Questions these comments can help with</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted">
          From public posts, not from Myntra’s private user list. Each one still
          needs a real shopper to confirm.
        </p>
        <ul className="mt-8 space-y-5">
          <li>
            <p className="font-medium">Why save something you don’t buy yet?</p>
            <p className="mt-1 text-muted">
              Is it a plan to buy, or just a bookmark?{" "}
              <Link
                href={hrefIdea("save_intent_quality")}
                className="text-accent underline underline-offset-4"
              >
                {ideaTitle("save_intent_quality", "Saved to remember")}
              </Link>
            </p>
          </li>
          <li>
            <p className="font-medium">What makes people wait after they save?</p>
            <p className="mt-1 text-muted">
              They liked it — then nothing happened.{" "}
              <Link
                href={hrefIdea("post_save_resolution")}
                className="text-accent underline underline-offset-4"
              >
                {ideaTitle("post_save_resolution", "Saved it, then went quiet")}
              </Link>
            </p>
          </li>
          <li>
            <p className="font-medium">What are they still unsure about?</p>
            <p className="mt-1 text-muted">
              Fit, fabric, outfit, or something else.{" "}
              <Link href="/board" className="text-accent underline underline-offset-4">
                See the findings
              </Link>
            </p>
          </li>
          <li>
            <p className="font-medium">What do they check on other websites?</p>
            <p className="mt-1 text-muted">
              Reviews, photos, price, or a second opinion.{" "}
              <Link
                href={hrefIdea("social_proof_on_shortlist")}
                className="text-accent underline underline-offset-4"
              >
                {ideaTitle("social_proof_on_shortlist", "Checking other sites")}
              </Link>
            </p>
          </li>
          <li>
            <p className="font-medium">
              Fit, size, style, price, reviews, occasion — which of these matter?
            </p>
            <p className="mt-1 text-muted">
              Open a finding and read the comments.{" "}
              <Link href="/board" className="text-accent underline underline-offset-4">
                Start with findings
              </Link>
            </p>
          </li>
          <li>
            <p className="font-medium">Do different kinds of shoppers show up?</p>
            <p className="mt-1 text-muted">
              First-time vs repeat, gifts, budget vs premium — only if the
              comment itself says so.{" "}
              <Link href="/segments" className="text-accent underline underline-offset-4">
                Who to talk to
              </Link>
            </p>
          </li>
          <li>
            <p className="font-medium">Which idea is worth checking first?</p>
            <p className="mt-1 text-muted">
              The ones that show up often, feel strong, and could be helped
              without a discount.{" "}
              <Link href="/board" className="text-accent underline underline-offset-4">
                Suggested order
              </Link>
            </p>
          </li>
        </ul>
      </section>

      <p className="mt-16 max-w-3xl text-sm leading-relaxed text-muted">
        The shopper path this is about: save something → come back → settle
        leftover doubt → buy within 30 days.{" "}
        <Link href="/metric-tree" className="text-accent underline underline-offset-4">
          See that path
        </Link>
        {" · "}
        <Link href="/method" className="text-accent underline underline-offset-4">
          What this cannot tell you
        </Link>
      </p>
    </Shell>
  );
}
