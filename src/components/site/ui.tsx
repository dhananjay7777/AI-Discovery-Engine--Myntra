import Link from "next/link";

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="surface px-8 py-12 text-center">
      <h2 className="section-title">{title}</h2>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  );
}

export function StatLink({
  href,
  label,
  value,
  hint = "See more",
}: {
  href: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Link href={href} className="surface surface-hover block p-5">
      <span className="text-xs text-muted">{label}</span>
      <span className="mt-1 block font-display text-3xl">{value}</span>
      <span className="mt-2 text-xs text-accent">{hint}</span>
    </Link>
  );
}

export function ScoreBar({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const pct = Math.max(0, Math.min(100, value * 100));
  const inner = (
    <>
      <div className="mb-2 flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${pct}%` }}
        />
      </div>
    </>
  );
  if (!href) return <div>{inner}</div>;
  return (
    <Link
      href={href}
      className="block rounded-xl p-1 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent"
    >
      {inner}
    </Link>
  );
}
