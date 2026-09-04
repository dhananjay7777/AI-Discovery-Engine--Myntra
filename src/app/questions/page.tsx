import Link from "next/link";
import { Shell } from "@/components/site/Shell";
import { EmptyState } from "@/components/site/ui";
import { getArea, getRunMeta, interviewMarkdown, listScoredAreas } from "@/lib/web/data";
import { ideaPlain, ideaTitle } from "@/lib/web/plain";

export const dynamic = "force-dynamic";

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ opportunity?: string }>;
}) {
  const run = getRunMeta();
  const { opportunity } = await searchParams;
  const all = [...listScoredAreas()].sort(
    (a, b) => Number(b.recommended) - Number(a.recommended) || b.score - a.score,
  );
  const rec = all.filter((a) => a.recommended);
  const selected =
    (opportunity ? getArea(opportunity) : null) ?? rec[0] ?? all[0];

  return (
    <Shell current="/questions" run={run}>
      <h1 className="page-title">What to ask next</h1>
      <p className="lede mt-4">
        Questions for real shoppers. They are written to hear what people
        actually do — not to prove our list is right.
      </p>

      {all.length === 0 || !selected ? (
        <div className="mt-8">
          <EmptyState title="No findings yet" body="There is nothing to ask about yet." />
        </div>
      ) : (
        <>
          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Choose a finding">
            {rec.map((a) => (
              <Link
                key={a.slug}
                href={`/questions?opportunity=${a.slug}`}
                className={`chip ${a.slug === selected.slug ? "chip-on" : "chip-off"}`}
              >
                {ideaTitle(a.slug, a.label)}
              </Link>
            ))}
          </nav>

          <article className="surface mt-8 p-7">
            <h2 className="font-display text-2xl leading-relaxed">
              {ideaTitle(selected.slug, selected.label)}
            </h2>
            <p className="mt-2 leading-relaxed">
              {ideaPlain(selected.slug, selected.hypothesis)}
            </p>
            <h3 className="mt-6 text-sm font-medium text-muted">Ask these</h3>
            <p className="mt-1 text-sm text-muted">
              Use them as a guide. Say them in your own words.
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              {selected.open_questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
            <h3 className="mt-6 text-sm font-medium text-muted">Who to talk to</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted">
              <li>Saved a fashion item recently and did not buy within about 30 days</li>
              <li>Can describe one specific hesitation</li>
              <li>Shops online fashion in India, in English or Hinglish</li>
            </ul>
            <p className="mt-6 text-sm">
              <a
                href={`/api/interview/${selected.slug}`}
                className="text-accent underline underline-offset-4"
              >
                Download these questions
              </a>
              {" · "}
              <Link
                href={`/opportunities/${selected.slug}`}
                className="text-accent underline underline-offset-4"
              >
                Read the quotes
              </Link>
            </p>
          </article>
          <pre className="sr-only">{interviewMarkdown(selected)}</pre>
        </>
      )}
    </Shell>
  );
}
