import Link from "next/link";
import { Shell } from "@/components/site/Shell";
import { HBarList, RingStat } from "@/components/site/Charts";
import { ScoreBar } from "@/components/site/ui";
import {
  getCodebookCoverage,
  getPhase2Metrics,
  getRunMeta,
  readScoringReport,
} from "@/lib/web/data";

export const dynamic = "force-dynamic";

export default function MethodPage() {
  const run = getRunMeta();
  const report = readScoringReport();
  const p2 = getPhase2Metrics();
  const coverage = getCodebookCoverage();
  const extraction = p2?.extraction as {
    published_units?: number;
    pre_drop_hallucination_rate?: number;
  } | undefined;
  const agreement = p2?.agreement_slice as {
    kappa_unit_type?: number;
    kappa_decision_factor?: number;
    size?: number;
  } | undefined;
  const weights = report?.weights;

  return (
    <Shell current="/method" run={run}>
      <h1 className="page-title">What this cannot tell you</h1>
      <p className="lede mt-4">
        Use these ideas to plan talks with shoppers. Do not treat the order as
        proof.
      </p>

      <section className="mt-10">
        <h2 className="section-title">Not just thumbs up or down</h2>
        <p className="mt-3 max-w-2xl leading-relaxed">
          We did not score star ratings. We looked for what people were trying
          to do, what got in the way, what they were unsure about, and how they
          worked around it (jobs, blockers, uncertainties, workarounds). We only
          mark a shopper type — first-time vs repeat, gift, budget vs premium —
          when the comment itself names one.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="section-title">What this cannot see</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
          <li>Whether any real person bought a saved item within 30 days.</li>
          <li>Whether a size was in stock, or what happens at checkout.</li>
          <li>Comments in languages other than English and Hinglish.</li>
          <li>Whether a change to the app would actually help people buy — talks with shoppers decide that.</li>
        </ul>
      </section>

      <section className="mt-10" id="bias">
        <h2 className="section-title">Bias disclosure</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          The people who post in public are not a fair picture of everyone who
          uses a wishlist.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            App-store reviews lean toward delivery and refund anger. Reddit
            leans toward people who write long posts.
          </li>
          <li>
            Quiet shoppers who save and never write about it never show up.
          </li>
          <li>No Myntra internal logs. Public comments only.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="section-title">Who we heard from</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-sm">
          This is not a random sample of Myntra wishlist users. It is whoever
          posted in public in English or Hinglish. App-store text leans toward
          delivery anger; we drop those when they are not about considering a
          purchase.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="section-title">What we did not try to do</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>Design or ship a feature — that comes after talks with shoppers.</li>
          <li>Discounts, cashback, coupons, or price-matching as the fix (D-010).</li>
          <li>Private or non-public user data.</li>
          <li>Name a single cause before shoppers are interviewed.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="section-title">How we handled the comments</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed">
          <li>Public Play Store, App Store, Reddit, YouTube, and Hacker News text.</li>
          <li>If a quote is not the exact words of the stored comment, we drop it.</li>
          <li>How common a theme is counted on distinct comments, not repeated lines from the same person.</li>
        </ul>
      </section>

      <section className="mt-10" id="weights">
        <h2 className="section-title">Scoring weights</h2>
        <p className="mt-2 text-sm text-muted">
          How the suggested order is built. “How much support” is separate — it
          is not mixed into the order.
        </p>
        {weights ? (
          <div className="surface mt-5 grid gap-4 p-5 sm:grid-cols-2">
            <ScoreBar label="How common (Prevalence)" value={weights.prevalence} />
            <ScoreBar label="How strongly people felt it" value={weights.severity} />
            <ScoreBar label="How close they were to buying" value={weights.proximity} />
            <ScoreBar label="Could the app help without a sale" value={weights.actionability} />
            <ScoreBar label="Mostly one kind of shopper" value={weights.segment_concentration} />
            <ScoreBar label="Penalty if one website dominates" value={weights.source_bias} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Weights not published yet.</p>
        )}
        {report && (
          <p className="mt-3 text-sm text-muted">
            Nudging any of these shares by 25% left the top 3 unchanged in{" "}
            {report.stability.weight_perturbation.top3_unchanged_pct.toFixed(0)}% of
            trials.
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="section-title">How careful the reading was</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="data-panel px-4 py-6">
            <RingStat
              ratio={
                ((p2?.corpus as { gate_pass_rate?: number } | undefined)
                  ?.gate_pass_rate) ?? 0
              }
              label="Kept as about buying"
            />
          </div>
          <div className="data-panel px-4 py-6">
            <RingStat
              ratio={extraction?.pre_drop_hallucination_rate ?? 0}
              label="Made-up quotes dropped"
            />
          </div>
          <div className="data-panel px-4 py-6">
            <RingStat
              ratio={
                coverage ? Number(coverage.coverage_pct) / 100 : 0
              }
              label="Quotes that fit a theme"
              note={coverage ? undefined : "Coverage not published"}
            />
          </div>
        </div>
        <div className="data-panel mt-4 px-6 py-6">
          <p className="text-xs text-muted">
            How often two checks agreed (kappa). 1.0 means they always matched.
            We wanted at least 0.55.
          </p>
          <div className="mt-4">
            <HBarList
              items={[
                {
                  label: `Kind of quote (n=${agreement?.size ?? "—"})`,
                  value: agreement?.kappa_unit_type ?? 0,
                },
                {
                  label: "What they were stuck on",
                  value: agreement?.kappa_decision_factor ?? 0,
                },
              ]}
              format={(n) => n.toFixed(3)}
              max={1}
            />
          </div>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-muted">
          <li>
            Accuracy checks used model-autofill labels, not independent human
            coding. Treat 1.00 precision/recall as an upper bound.
          </li>
          <li>
            Hinglish vs English quote-type gap: within 10 points on a small
            autofill sample (n=15 Hinglish).
          </li>
          <li>
            Hallucination here means a quote that was not in the original
            comment. Those lines were dropped.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="section-title">Tools that read the comments</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted">
          <li>Picked comments about buying: {run.gate_model ?? "—"}</li>
          <li>Pulled out quotes: {run.extraction_model ?? "—"}</li>
          <li>Checked agreement: {run.agreement_model ?? "—"}</li>
          <li>Grouped similar lines: {run.embedding_model ?? "—"}</li>
        </ul>
      </section>

      <p className="mt-10 text-sm">
        <Link href="/board" className="text-accent underline underline-offset-4">
          Back to the findings
        </Link>
      </p>
    </Shell>
  );
}
