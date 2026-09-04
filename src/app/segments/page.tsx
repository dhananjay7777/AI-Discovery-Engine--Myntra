import Link from "next/link";
import { HBarList } from "@/components/site/Charts";
import { Shell } from "@/components/site/Shell";
import { EmptyState } from "@/components/site/ui";
import { getRunMeta, listScoredAreas, segmentCrossTab } from "@/lib/web/data";
import { ideaPlain, ideaTitle, segmentCellPhrase } from "@/lib/web/plain";

export const dynamic = "force-dynamic";

export default function SegmentsPage() {
  const run = getRunMeta();
  const rows = segmentCrossTab();
  const areas = listScoredAreas();
  const named = rows.filter((r) => r.cells.some((c) => !c.unclear));
  const unclearRows = rows.filter((r) => !r.cells.some((c) => !c.unclear));

  return (
    <Shell current="/segments" run={run}>
      <h1 className="page-title">Who to talk to</h1>
      <p className="lede mt-5">
        These are not Myntra’s official shopper types. They are groups a comment
        itself named — first-time vs repeat, gifts, budget vs premium. If the
        same named group does not show up in at least eight comments, we say
        Segment unclear instead of inventing a person.
      </p>

      {areas.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No findings yet" body="The list of ideas has not been published." />
        </div>
      ) : (
        <>
          <section className="surface mt-10 px-8 py-8 sm:px-10 sm:py-10">
            <p className="kicker">What we can say today</p>
            {named.length === 0 ? (
              <>
                <h2 className="mt-3 font-display text-3xl leading-relaxed">
                  No idea names a group you can look for
                </h2>
                <p className="mt-4 max-w-2xl leading-relaxed">
                  Public comments rarely say who the shopper is. Talk to people
                  who saved something and did not buy — leftover doubt, dressing
                  for an occasion, checking other sites — not a made-up type.
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-3 font-display text-3xl leading-relaxed">
                  {named.length} idea{named.length === 1 ? "" : "s"} name a group
                  that shows up often enough to use
                </h2>
                <p className="mt-4 max-w-2xl leading-relaxed text-muted">
                  Still a hint from public comments, not a Myntra type. Check it
                  when you talk to shoppers.
                </p>
              </>
            )}
            <ul className="mt-6 max-w-2xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
              <li>We never guess age, gender, or city from how someone writes.</li>
              <li>
                One comment can name a group and still be the only one that does
                — that is too few to trust.
              </li>
              <li>
                Eight comments naming eight different groups is still Segment
                unclear. The same group has to repeat.
              </li>
            </ul>
          </section>

          {named.length > 0 ? (
            <section className="mt-12">
              <h2 className="section-title">Named in the comments</h2>
              <div className="mt-8 space-y-8">
                {named.map((row) => (
                  <IdeaWho key={row.area.slug} row={row} />
                ))}
              </div>
            </section>
          ) : null}

          {unclearRows.length > 0 ? (
            <section className="mt-12">
              <h2 className="section-title">Segment unclear</h2>
              <p className="mt-3 max-w-2xl leading-relaxed text-muted">
                {named.length === 0
                  ? "Every idea in the top list is in this bucket. A few comments still named something — listed as hints, not as a who."
                  : "These ideas do not have eight comments naming the same group. Use the quotes, not a made-up type."}
              </p>
              <div className="mt-8 space-y-8">
                {unclearRows.map((row) => (
                  <IdeaWho key={row.area.slug} row={row} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </Shell>
  );
}

function IdeaWho({
  row,
}: {
  row: ReturnType<typeof segmentCrossTab>[number];
}) {
  const trusted = row.cells.filter((c) => !c.unclear);
  const hints = row.cells.filter((c) => c.unclear);
  const split =
    row.unclear === false && trusted.length === 0 && row.cells.length > 0;

  return (
    <section className="surface px-8 py-8 sm:px-10 sm:py-10">
      <h3 className="font-display text-2xl leading-relaxed">
        <Link href={`/opportunities/${row.area.slug}`} className="hover:text-accent">
          {ideaTitle(row.area.slug, row.area.label)}
        </Link>
      </h3>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        {ideaPlain(row.area.slug, row.area.hypothesis)}
      </p>

      {trusted.length === 0 ? (
        <p className="mt-5 text-sm leading-relaxed">
          Segment unclear
          {split
            ? " — enough comments named some group, but they named different groups. No single who is thick enough."
            : row.cells.length === 0
              ? " — no comment on this idea named a shopper type."
              : " — fewer than eight comments name a group."}
        </p>
      ) : (
        <p className="mt-5 text-sm">Groups that repeat often enough to look for:</p>
      )}

      {row.cells.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <HBarList
            items={row.cells.map((c) => ({
              label: `${segmentCellPhrase(c.signal)}${c.unclear ? " (too few)" : ""}`,
              value: c.count,
            }))}
          />
        </div>
      ) : null}

      {trusted.length === 0 && hints.length > 0 ? (
        <p className="mt-3 text-xs text-muted">
          Hints only. Do not pick people from one or two comments.
        </p>
      ) : null}
    </section>
  );
}
