import Link from "next/link";

export interface ChartItem {
  label: string;
  value: number;
  href?: string;
}

function peakOf(items: ChartItem[], max?: number): number {
  return max ?? Math.max(1, ...items.map((i) => i.value));
}

export function HBarList({
  items,
  format = (n) => String(n),
  max,
  empty = "Nothing to plot.",
}: {
  items: ChartItem[];
  format?: (n: number) => string;
  max?: number;
  empty?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">{empty}</p>;
  }
  const peak = peakOf(items, max);
  return (
    <ul className="chart-bars">
      {items.map((item) => {
        const width = `${Math.max(3, (item.value / peak) * 100)}%`;
        const inner = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{item.label}</span>
              <span className="shrink-0 tabular-nums text-muted">
                {format(item.value)}
              </span>
            </div>
            <div className="chart-track" aria-hidden>
              <div className="chart-fill" style={{ width }} />
            </div>
          </>
        );
        return (
          <li key={item.label}>
            {item.href ? (
              <Link href={item.href} className="block rounded-lg hover:opacity-90">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function VBarList({
  items,
  format = (n) => String(n),
}: {
  items: ChartItem[];
  format?: (n: number) => string;
}) {
  if (items.length === 0) return null;
  const peak = peakOf(items);
  return (
    <div className="chart-columns" role="img" aria-label="Column chart">
      {items.map((item) => (
        <div key={item.label} className="chart-col">
          <span className="tabular-nums text-xs text-muted">
            {format(item.value)}
          </span>
          <div className="chart-col-track" aria-hidden>
            <span
              style={{ height: `${Math.max(4, (item.value / peak) * 100)}%` }}
            />
          </div>
          <span className="chart-col-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

const SOURCE_COLORS: Record<string, string> = {
  Reddit: "#e89a4a",
  "Hacker News": "#e6d35c",
  "Play Store": "#4fcbb0",
  YouTube: "#6ba8e8",
  "App Store": "#c9a0e8",
};

const SOURCE_FALLBACK = [
  "#e89a4a",
  "#e6d35c",
  "#4fcbb0",
  "#6ba8e8",
  "#c9a0e8",
  "#f0c4a8",
];

function sourceColor(label: string, index: number): string {
  return SOURCE_COLORS[label] ?? SOURCE_FALLBACK[index % SOURCE_FALLBACK.length];
}

export function ShareStack({
  items,
  format = (n) => String(n),
}: {
  items: ChartItem[];
  format?: (n: number) => string;
}) {
  const total = items.reduce((sum, i) => sum + i.value, 0) || 1;
  if (items.length === 0) return null;
  return (
    <div>
      <div
        className="chart-stack"
        role="img"
        aria-label={items
          .map((i) => `${i.label} ${format(i.value)} (${Math.round((i.value / total) * 100)}%)`)
          .join(", ")}
      >
        {items.map((item, i) => (
          <span
            key={item.label}
            style={{
              width: `${(item.value / total) * 100}%`,
              background: sourceColor(item.label, i),
            }}
          />
        ))}
      </div>
      <ul className="chart-legend">
        {items.map((item, i) => (
          <li key={item.label}>
            <span
              className="chart-legend-swatch"
              style={{ background: sourceColor(item.label, i) }}
              aria-hidden
            />
            <span>
              <span className="tabular-nums text-foreground">{format(item.value)}</span>
              {` ${item.label} · ${Math.round((item.value / total) * 100)}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RingStat({
  ratio,
  label,
  note,
}: {
  ratio: number;
  label: string;
  note?: string;
}) {
  const pct = Math.max(0, Math.min(1, ratio));
  const r = 38;
  const circ = 2 * Math.PI * r;
  return (
    <figure className="chart-ring">
      <div className="chart-ring-wrap">
        <svg viewBox="0 0 100 100" aria-hidden>
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="rgb(28 22 18 / 0.12)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${circ * pct} ${circ}`}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <span className="chart-ring-value tabular-nums">
          {`${(pct * 100).toFixed(0)}%`}
        </span>
      </div>
      <figcaption className="mt-3 text-center">
        <span className="block text-sm">{label}</span>
        {note ? (
          <span className="mt-1 block text-xs leading-relaxed text-muted">
            {note}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
