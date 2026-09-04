import Link from "next/link";
import { Shell } from "@/components/site/Shell";
import { getRunMeta } from "@/lib/web/data";

export const dynamic = "force-dynamic";

const STAGES = [
  "Read a public page or a tiny sample of comments",
  "Keep only lines about thinking of buying a saved item",
  "Pull out quotes and group similar ones",
  "Put ideas in order against the 30-day save-to-buy goal",
] as const;

export default function DemoPage() {
  const run = getRunMeta();
  return (
    <Shell current="/demo" run={run}>
      <h1 className="page-title">Try a tiny sample</h1>
      <p className="lede mt-4">
        One day you should be able to paste a public link here and watch the
        same steps run on a small sample. That is not turned on yet, so this
        page cannot spend money on models.
      </p>
      <ol className="mt-10 space-y-3">
        {STAGES.map((step, i) => (
          <li
            key={step}
            className="surface flex items-start gap-4 px-6 py-4 text-sm text-muted"
          >
            <span className="kicker mt-0.5">{String(i + 1).padStart(2, "0")}</span>
            <span>
              {step}
              <span className="mt-1 block text-xs">Not turned on yet</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted">
        Every other page already shows a finished reading of public comments.
        When this is on, it will stay on this website — not a separate
        automation tool — with a cap so a visitor cannot run up cost.
      </p>
      <p className="mt-8 text-sm">
        <Link href="/board" className="text-accent underline underline-offset-4">
          See the findings instead
        </Link>
        {" · "}
        <Link href="/method" className="text-accent underline underline-offset-4">
          What’s missing
        </Link>
      </p>
    </Shell>
  );
}
