import { countRuns } from "@/lib/store/read";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const runCount = countRuns();

  const stages = [
    { step: "1", label: "Collect", desc: "Play Store, App Store, Reddit, YouTube, communities" },
    { step: "2", label: "Normalize", desc: "Dedupe, language, provenance" },
    { step: "3", label: "Relevance gate", desc: "gpt-oss-20b — consideration window only" },
    { step: "4", label: "Extract", desc: "gpt-oss-120b — verbatim evidence units" },
    { step: "5", label: "Codebook", desc: "Deductive seed + inductive clusters" },
    { step: "6", label: "Score", desc: "Rank opportunities, map to metric tree" },
    { step: "7", label: "Serve", desc: "This site — evidence you can audit" },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-accent">
              Growth · Myntra
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              AI-Powered Discovery Engine
            </h1>
          </div>
          <StatusBadge runCount={runCount} />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <section className="mb-14">
          <h2 className="text-lg font-medium text-muted">Business metric</h2>
          <blockquote className="mt-3 border-l-4 border-accent pl-5 text-xl leading-relaxed">
            Increase the percentage of users who purchase at least one item from
            their wishlist within 30 days of adding it.
          </blockquote>
          <p className="mt-4 max-w-2xl text-muted leading-relaxed">
            This engine discovers <em>why</em> wishlists stall — from public
            conversation at scale — before any solution is designed. No monetary
            incentives. Evidence you can click through.
          </p>
        </section>

        <section className="mb-14">
          <h2 className="mb-6 text-lg font-medium">How it works</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stages.map((s) => (
              <div
                key={s.step}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <span className="font-mono text-xs text-accent">Stage {s.step}</span>
                <h3 className="mt-1 font-medium">{s.label}</h3>
                <p className="mt-1 text-sm text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-accent-muted p-6">
          <h2 className="font-medium">Phase 0 — Foundation</h2>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            The site, JSON store, and Groq client are wired. Public deploy is
            Phase 6.
          </p>
          <ul className="mt-4 space-y-1 font-mono text-xs text-muted">
            <li>→ npm run phase0:verify-store</li>
          </ul>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        Public conversation in · ranked opportunities out · interviews decide
      </footer>
    </div>
  );
}

function StatusBadge({ runCount }: { runCount: number }) {
  return (
    <span className="rounded-full bg-accent-muted px-3 py-1 text-xs text-accent">
      {runCount} pipeline run{runCount === 1 ? "" : "s"}
    </span>
  );
}
