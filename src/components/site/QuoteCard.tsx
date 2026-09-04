import { formatDate, platformLabel, type QuoteView } from "@/lib/web/data";

export function QuoteCard({ quote }: { quote: QuoteView }) {
  return (
    <figure className="surface relative overflow-hidden px-5 py-5 pl-6">
      <span className="absolute bottom-4 left-0 top-4 w-0.5 rounded-full bg-accent" aria-hidden />
      <blockquote className="font-display text-[1.25rem] leading-8">
        “{quote.quote}”
      </blockquote>
      <figcaption className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span>{platformLabel(quote.platform)}</span>
        <span>{formatDate(quote.posted_at)}</span>
        {quote.url ? (
          <a
            href={quote.url}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline underline-offset-2"
            title="Permalink"
          >
            Open original
          </a>
        ) : (
          <span title="Permalink">Original link missing</span>
        )}
        {quote.verified ? <span>Exact words from the original</span> : null}
      </figcaption>
    </figure>
  );
}

export function QuoteList({
  quotes,
  empty,
}: {
  quotes: QuoteView[];
  empty: string;
}) {
  if (quotes.length === 0) {
    return <p className="text-sm text-muted">{empty}</p>;
  }
  return (
    <div className="grid gap-4">
      {quotes.map((q) => (
        <QuoteCard key={q.unit_id} quote={q} />
      ))}
    </div>
  );
}
