import Link from "next/link";
import { HBarList } from "@/components/site/Charts";
import { Shell } from "@/components/site/Shell";
import { EmptyState, ScoreBar } from "@/components/site/ui";
import { formatPct, getRunMeta, listScoredAreas } from "@/lib/web/data";
import { confidencePhrase, ideaPlain, ideaTitle } from "@/lib/web/plain";

export const dynamic = "force-dynamic";

export default function BoardPage() {
  const run = getRunMeta();
  const areas = listScoredAreas();
  const rec = [...areas].filter((a) => a.recommended).sort((a, b) => b.score - a.score);
  const monetary = [...areas].filter((a) => !a.is_non_monetary).sort((a, b) => b.score - a.score);
  const other = [...areas]
    .filter((a) => a.is_non_monetary && !a.recommended)
    .sort((a, b) => b.score - a.score);

  return (
    <Shell current="/board" run={run}>
      <h1 className="page-title">Start with these ideas</h1>
      <p className="lede mt-4">
        A suggested order for talking to shoppers — not a proven ranking. Open
        an idea and read the real comments before you believe it.
      </p>

      {areas.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No opportunities scored"
            body="The ranked list has not been published yet."
          />
        </div>
      ) : (
        <>
          {rec.length > 0 ? (
            <div className="data-panel mt-10 px-6 py-6 sm:px-8">
              <p className="text-xs text-muted">How often each idea showed up</p>
              <div className="mt-4">
                <HBarList
                  items={rec.map((a) => ({
                    label: ideaTitle(a.slug, a.label),
                    value: a.prevalence,
                    href: `/opportunities/${a.slug}#evidence`,
                  }))}
                  format={(n) => formatPct(n, 0)}
                  max={1}
                />
              </div>
            </div>
          ) : null}
          <ol className="mt-10 space-y-8">
          {rec.map((a, i) => (
            <li key={a.slug} className="surface px-8 py-8 sm:px-10 sm:py-10">
              <p className="kicker">
                {i + 1} of {rec.length}
                {a.source_dependent
                  ? " · Most of these comments came from one website"
                  : ""}
              </p>
              <h2 className="mt-2 font-display text-3xl leading-relaxed">
                <Link href={`/opportunities/${a.slug}`} className="hover:text-accent">
                  {ideaTitle(a.slug, a.label)}
                </Link>
              </h2>
              <p className="mt-4 leading-relaxed text-muted">
                {ideaPlain(a.slug, a.hypothesis)}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <ScoreBar
                  label="How common (Prevalence)"
                  value={a.prevalence}
                  href={`/opportunities/${a.slug}#evidence`}
                />
                <ScoreBar
                  label="How strongly they felt it"
                  value={a.severity}
                  href={`/opportunities/${a.slug}#evidence`}
                />
                <ScoreBar
                  label="Mostly one kind of shopper"
                  value={a.segment_concentration}
                  href="/segments"
                />
                <ScoreBar
                  label="Could the app help without a sale"
                  value={a.actionability}
                  href={`/opportunities/${a.slug}`}
                />
              </div>
              <p className="mt-4 text-sm text-muted">
                {confidencePhrase(a.confidence)}
                {" · "}
                <Link
                  href={`/opportunities/${a.slug}#evidence`}
                  className="text-accent underline underline-offset-4"
                >
                  Read the quotes
                </Link>
              </p>
            </li>
          ))}
        </ol>
        </>
      )}

      {monetary.length > 0 && (
        <section className="mt-14">
          <h2 className="section-title">About price — not in the top list</h2>
          <p className="mt-3 text-sm text-muted" id="monetary">
            These stay visible so a price finding cannot be hidden. They are
            left out of the top list because the only fix would be a
            discount (D-010).
          </p>
          <ul className="mt-4 space-y-2">
            {monetary.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/opportunities/${a.slug}`}
                  className="text-accent underline underline-offset-4"
                >
                  {ideaTitle(a.slug, a.label)}
                </Link>
                <span className="text-sm text-muted">
                  {" "}
                  · {formatPct(a.prevalence)} of comments · monetary-only
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {other.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm text-muted">Also noted, lower down the list</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {other.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/opportunities/${a.slug}`}
                  className="underline underline-offset-4"
                >
                  {ideaTitle(a.slug, a.label)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Shell>
  );
}
