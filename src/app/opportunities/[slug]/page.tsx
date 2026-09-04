import Link from "next/link";
import { notFound } from "next/navigation";
import { HBarList, RingStat } from "@/components/site/Charts";
import { QuoteList } from "@/components/site/QuoteCard";
import { Shell } from "@/components/site/Shell";
import {
  getOpportunityDetail,
  getRunMeta,
  outcomeNodeNames,
  platformLabel,
} from "@/lib/web/data";
import {
  confidencePhrase,
  ideaPlain,
  ideaTitle,
  ideaTry,
  ideaWhy,
  metricNodeCopy,
  severityLabel,
} from "@/lib/web/plain";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = getOpportunityDetail(slug);
  if (!detail) notFound();
  const { area, supporting, counter, severity_mix } = detail;
  const run = getRunMeta();
  const mixEntries = Object.entries(area.platform_mix).sort((a, b) => b[1] - a[1]);
  const pathId = area.outcome_node_slugs[0] ?? "";
  const pathLabel =
    metricNodeCopy(pathId)?.title ?? outcomeNodeNames(area.outcome_node_slugs)[0] ?? "See the shopper path";
  const severityRows = Object.entries(severity_mix).filter(([k]) => k !== "none");

  return (
    <Shell current="/board" run={run}>
      <p className="text-sm text-muted">
        <Link href="/board" className="underline underline-offset-4">
          Back to findings
        </Link>
      </p>
      <h1 className="page-title mt-3">{ideaTitle(area.slug, area.label)}</h1>
      {!area.is_non_monetary && (
        <p className="mt-4 rounded-2xl bg-accent-muted px-4 py-3 text-sm">
          Not in the top list: the only fix would be a discount (D-010).
          Still shown so the finding is not hidden.
        </p>
      )}
      <p className="mt-5 text-lg leading-relaxed">
        {ideaPlain(area.slug, area.hypothesis)}
      </p>
      <p className="mt-3 text-sm text-muted">
        Something the app could try: {ideaTry(area.slug, area.intervention)}
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link href="#evidence" className="surface surface-hover flex flex-col items-center p-5">
          <RingStat
            ratio={area.prevalence}
            label="How common"
            note={`${area.document_count} different comments`}
          />
        </Link>
        <Link href="#evidence" className="surface surface-hover p-5">
          <span className="text-xs text-muted">How much support</span>
          <span className="mt-1 block font-display text-2xl">{confidencePhrase(area.confidence)}</span>
        </Link>
        <Link
          href={`/metric-tree#${pathId}`}
          className="surface surface-hover p-5"
        >
          <span className="text-xs text-muted">Where this sits on the path</span>
          <span className="mt-2 block text-sm">{pathLabel}</span>
        </Link>
      </div>

      <section className="mt-12">
        <h2 className="section-title">Where these comments came from</h2>
        <div className="data-panel mt-5 max-w-xl px-6 py-6">
          <HBarList
            items={mixEntries.map(([platform, n]) => ({
              label: platformLabel(platform),
              value: n,
            }))}
          />
        </div>
        {area.source_dependent && (
          <p className="mt-2 text-sm text-muted">
            Most of these comments came from one website, so treat this idea
            with extra care.
          </p>
        )}
      </section>

      {severityRows.length > 0 && (
        <section className="mt-8">
          <h2 className="section-title">How strongly people said it</h2>
          <div className="data-panel mt-5 max-w-xl px-6 py-6">
            <HBarList
              items={severityRows.map(([k, n]) => ({
                label: severityLabel(k),
                value: n,
              }))}
            />
          </div>
        </section>
      )}

      <p className="mt-4 text-sm text-muted">
        <Link href="/segments" className="text-accent underline underline-offset-4">
          Who to talk to
        </Link>
        {area.segment_label === "segment unclear" || !area.segment_label
          ? " — Segment unclear from these comments. Look for the behavior, not a made-up shopper type."
          : " — a few comments named a group; check Who before treating it as a type of shopper."}
      </p>

      <section className="mt-8">
        <h2 className="section-title">Why this might help more people buy</h2>
        <p className="mt-2 leading-relaxed">{ideaWhy(area.slug, area.rationale)}</p>
        <p className="mt-2 text-sm">
          <Link
            href={`/metric-tree#${pathId}`}
            className="text-accent underline underline-offset-4"
          >
            See the full shopper path
          </Link>
        </p>
      </section>

      <section id="counter" className="mt-12">
        <h2 className="section-title">Counter-evidence</h2>
        <p className="mt-2 text-sm text-muted">
          Comments that go the other way. Read these before you trust the idea.
        </p>
        <div className="mt-4">
          <QuoteList quotes={counter} empty="No opposing comments stored for this idea." />
        </div>
      </section>

      <section id="evidence" className="mt-12">
        <h2 className="section-title">Supporting quotes</h2>
        <p className="mt-2 text-sm text-muted">
          Exact words from the original post or review. Each has a date and a
          link you can open.
        </p>
        <div className="mt-4">
          <QuoteList quotes={supporting} empty="No supporting quotes yet." />
        </div>
      </section>

      <section id="questions" className="mt-12">
        <h2 className="section-title">What to ask shoppers</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          {area.open_questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
        <p className="mt-4 text-sm">
          <Link
            href={`/questions?opportunity=${area.slug}`}
            className="text-accent underline underline-offset-4"
          >
            All questions for this idea
          </Link>
          {" · "}
          <Link href="/method" className="text-accent underline underline-offset-4">
            What’s missing
          </Link>
        </p>
      </section>
    </Shell>
  );
}
