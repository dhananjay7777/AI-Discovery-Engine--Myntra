import { HBarList, RingStat, VBarList } from "@/components/site/Charts";
import { Shell } from "@/components/site/Shell";
import { EmptyState } from "@/components/site/ui";
import {
  getCorpusStats,
  getPhase2Metrics,
  getRunMeta,
  platformLabel,
} from "@/lib/web/data";

export const dynamic = "force-dynamic";

export default function CorpusPage() {
  const run = getRunMeta();
  const stats = getCorpusStats();
  const p2 = getPhase2Metrics();
  const corpus = p2?.corpus as {
    relevant_documents?: number;
    gate_pass_rate?: number;
  } | undefined;

  if (!stats) {
    return (
      <Shell current="/corpus" run={run}>
        <EmptyState title="Nothing to show" body="The comment counts have not been published." />
      </Shell>
    );
  }

  const sources = stats.by_source.filter((s) => s.raw_count + s.normalized_count > 0);
  const byYear = new Map<string, number>();
  for (const [month, n] of Object.entries(stats.month_histogram)) {
    const year = month.slice(0, 4);
    byYear.set(year, (byYear.get(year) ?? 0) + n);
  }
  const years = [...byYear.entries()].sort(([a], [b]) => a.localeCompare(b));
  const kept = corpus?.gate_pass_rate ?? 0;

  return (
    <Shell current="/corpus" run={run}>
      <h1 className="page-title">Where the comments came from</h1>
      <p className="lede mt-4">
        Public comments only. App-store reviews lean toward delivery complaints;
        we kept the ones about thinking of buying a saved item.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        <div className="data-panel flex items-center justify-center px-4 py-6">
          <RingStat
            ratio={kept}
            label="Kept as about buying"
            note={
              corpus?.relevant_documents !== undefined
                ? `${corpus.relevant_documents} of ${stats.totals.normalized_documents}`
                : `${stats.totals.normalized_documents} after cleaning`
            }
          />
        </div>
        <div className="data-panel px-6 py-6 sm:col-span-2">
          <p className="text-xs text-muted">Where they came from</p>
          <div className="mt-4 overflow-x-auto">
            <HBarList
              items={sources.map((s) => ({
                label: platformLabel(s.platform),
                value: s.normalized_count,
              }))}
            />
          </div>
          <p className="mt-4 max-w-3xl text-sm text-muted">
            Public pages anyone can read — not private accounts. This round
            covers App Store, Play Store, Reddit, YouTube, and Hacker News. It
            does not include Instagram or other social feeds, fashion forums, or
            questions on product pages.
          </p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="section-title">When they were written</h2>
        <div className="data-panel mt-6 w-full overflow-x-auto px-6 py-6 sm:px-8">
          <VBarList
            items={years.map(([year, n]) => ({ label: year, value: n }))}
          />
        </div>
      </section>
    </Shell>
  );
}
