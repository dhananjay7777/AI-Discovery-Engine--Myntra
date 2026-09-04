import Link from "next/link";
import { Shell } from "@/components/site/Shell";
import { EmptyState } from "@/components/site/ui";
import { getOutcomeTree, getRunMeta } from "@/lib/web/data";
import type { OutcomeNode } from "@/lib/store/schema";
import type { Area } from "@/lib/web/data";
import { ideaPlain, ideaTitle, metricNodeCopy } from "@/lib/web/plain";

export const dynamic = "force-dynamic";

/** Fixed shopper story order — matches the published outcome tree. */
const STEP_IDS = [
  "save_quality",
  "return_to_wishlist_rate",
  "decision_resolution_rate",
  "availability_at_return",
  "checkout_completion",
] as const;

const STEP_PLAIN: Record<
  (typeof STEP_IDS)[number],
  { ask: string; fail: string }
> = {
  save_quality: {
    ask: "Did they mean to buy this, or only park it for later?",
    fail: "If it was only a bookmark, the 30-day buy goal never starts.",
  },
  return_to_wishlist_rate: {
    ask: "Do they open the saved list again?",
    fail: "A save that is never opened again cannot become a purchase.",
  },
  decision_resolution_rate: {
    ask: "When they come back, can they settle what still worries them?",
    fail: "Fit, fabric, outfit, or other shoppers’ photos — something still blocks yes.",
  },
  availability_at_return: {
    ask: "Is their size still there when they return?",
    fail: "If the size is gone, the decision never reaches checkout.",
  },
  checkout_completion: {
    ask: "Can they finish buying once they have decided?",
    fail: "Delivery, returns, or checkout friction can still stop the purchase.",
  },
};

export default function MetricTreePage() {
  const run = getRunMeta();
  const { nodes, byParent, opportunitiesByNode } = getOutcomeTree();
  const root = nodes.find((n) => !n.parent_id) ?? nodes[0];
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const steps = STEP_IDS.map((id) => nodeById.get(id)).filter(
    (n): n is OutcomeNode => Boolean(n),
  );

  const stepIdeas = steps.map((node) => ({
    node,
    areas: areasOn(node.id, opportunitiesByNode, byParent, true).filter(
      (a) => a.recommended,
    ),
  }));
  const focus = stepIdeas
    .map((s, i) => ({ ...s, index: i + 1 }))
    .sort((a, b) => b.areas.length - a.areas.length)[0];

  return (
    <Shell current="/metric-tree" run={run}>
      <h1 className="page-title">The path from save to buy</h1>
      <p className="lede mt-5">
        For someone to buy a saved item within 30 days, these five things have
        to go right in order. This page is a map of that path — not Myntra’s
        live numbers.
      </p>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
        Each idea on Findings is a guess about which step gets stuck. Open a
        step to see which ideas sit there, then read the real comments before
        you trust them.
      </p>

      {nodes.length === 0 || !root || steps.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Path not published"
            body="The save-to-buy steps have not been written yet."
          />
        </div>
      ) : (
        <>
          <section className="mt-12" aria-label="The five steps">
            <h2 className="section-title">The five steps</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              Read top to bottom. If any step fails, the purchase usually does
              not happen.
            </p>
            <ol className="path-rail mt-8">
              {steps.map((node, i) => {
                const plain = STEP_PLAIN[node.id as (typeof STEP_IDS)[number]];
                const copy = metricNodeCopy(node.id);
                const count = stepIdeas[i]?.areas.length ?? 0;
                return (
                  <li key={node.id} className="path-rail-item">
                    <a href={`#${node.id}`} className="path-rail-link">
                      <span className="path-rail-num" aria-hidden="true">
                        {i + 1}
                      </span>
                      <span className="path-rail-copy">
                        <span className="path-rail-title">
                          {copy?.title ?? node.name}
                        </span>
                        <span className="path-rail-ask">
                          {plain?.ask ?? copy?.shopper ?? node.definition}
                        </span>
                        {count > 0 ? (
                          <span className="path-rail-meta">
                            {count} idea{count === 1 ? "" : "s"} from comments
                          </span>
                        ) : (
                          <span className="path-rail-meta is-empty">
                            No idea mapped here yet
                          </span>
                        )}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
            {focus && focus.areas.length > 0 ? (
              <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">
                Most of the ranked ideas sit on step {focus.index}
                {" — "}
                {(metricNodeCopy(focus.node.id)?.title ?? focus.node.name).toLowerCase()}
                . Start shopper talks there, then check the empty steps so you
                do not miss another stuck point.
              </p>
            ) : null}
          </section>

          <section className="mt-16" aria-label="Each step in detail">
            <h2 className="section-title">Each step, with the ideas on it</h2>
            <ol className="mt-8 space-y-8">
              {steps.map((node, i) => (
                <StepDetail
                  key={node.id}
                  index={i + 1}
                  total={steps.length}
                  node={node}
                  byParent={byParent}
                  opportunitiesByNode={opportunitiesByNode}
                />
              ))}
            </ol>
          </section>

          <p className="mt-14 max-w-2xl text-sm leading-relaxed text-muted">
            Ready to pick where to look first?{" "}
            <Link href="/board" className="text-accent underline underline-offset-4">
              Open findings
            </Link>
            {" · "}
            <Link href="/method" className="text-accent underline underline-offset-4">
              What this path cannot prove
            </Link>
          </p>
        </>
      )}
    </Shell>
  );
}

function descendantIds(
  id: string,
  byParent: Map<string | null, OutcomeNode[]>,
): string[] {
  const kids = byParent.get(id) ?? [];
  return kids.flatMap((k) => [k.id, ...descendantIds(k.id, byParent)]);
}

function unique(areas: Area[]): Area[] {
  const seen = new Set<string>();
  return areas.filter((a) => {
    if (seen.has(a.slug)) return false;
    seen.add(a.slug);
    return true;
  });
}

function areasOn(
  nodeId: string,
  opportunitiesByNode: Map<string, Area[]>,
  byParent: Map<string | null, OutcomeNode[]>,
  includeDescendants: boolean,
): Area[] {
  const ids = includeDescendants
    ? [nodeId, ...descendantIds(nodeId, byParent)]
    : [nodeId];
  return unique(ids.flatMap((id) => opportunitiesByNode.get(id) ?? []));
}

function StepDetail({
  index,
  total,
  node,
  byParent,
  opportunitiesByNode,
}: {
  index: number;
  total: number;
  node: OutcomeNode;
  byParent: Map<string | null, OutcomeNode[]>;
  opportunitiesByNode: Map<string, Area[]>;
}) {
  const copy = metricNodeCopy(node.id);
  const plain = STEP_PLAIN[node.id as (typeof STEP_IDS)[number]];
  const children = byParent.get(node.id) ?? [];
  const ideas = areasOn(node.id, opportunitiesByNode, byParent, true)
    .filter((a) => a.recommended)
    .sort((a, b) => b.score - a.score);
  const noted = areasOn(node.id, opportunitiesByNode, byParent, true)
    .filter((a) => !a.recommended)
    .sort((a, b) => b.score - a.score);

  return (
    <li id={node.id} className="surface scroll-mt-24 px-7 py-8 sm:px-9 sm:py-9">
      <p className="kicker">
        Step {index} of {total}
      </p>
      <h3 className="mt-3 font-display text-2xl leading-snug sm:text-3xl">
        {copy?.title ?? node.name}
      </h3>
      <p className="mt-4 max-w-2xl text-base leading-relaxed">
        {plain?.ask ?? copy?.shopper ?? node.definition}
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        {plain?.fail ?? copy?.shopper}
      </p>

      {children.length > 0 ? (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Kinds of leftover doubt
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {children.map((child) => {
              const childCopy = metricNodeCopy(child.id);
              const childIdeas = unique(
                opportunitiesByNode.get(child.id) ?? [],
              ).filter((a) => a.recommended);
              return (
                <li
                  key={child.id}
                  id={child.id}
                  className="scroll-mt-24 border-l-2 border-accent/50 pl-4"
                >
                  <p className="font-medium">
                    {childCopy?.title ?? child.name}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {childCopy?.shopper ?? child.definition}
                  </p>
                  {childIdeas.length > 0 ? (
                    <ul className="mt-3 space-y-1.5">
                      {childIdeas.map((a) => (
                        <li key={a.slug}>
                          <Link
                            href={`/opportunities/${a.slug}`}
                            className="text-sm text-accent underline underline-offset-4"
                          >
                            {ideaTitle(a.slug, a.label)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-muted">
                      No ranked idea sits here yet.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {ideas.length > 0 && children.length === 0 ? (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Ideas that sit here
          </p>
          <ul className="mt-4 space-y-3">
            {ideas.map((a) => (
              <li key={a.slug}>
                <IdeaLink area={a} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {noted.length > 0 ? (
        <div className="mt-6">
          <p className="text-xs text-muted">Also noted, not in the top list</p>
          <ul className="mt-2 space-y-2">
            {noted.map((a) => (
              <li key={a.slug}>
                <IdeaLink area={a} muted />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {ideas.length === 0 && noted.length === 0 ? (
        <p className="mt-8 text-sm leading-relaxed text-muted">
          Public comments did not point to a clear idea on this step. It still
          matters — talks with shoppers should check it, especially stock and
          checkout, which comments barely show.
        </p>
      ) : null}
    </li>
  );
}

function IdeaLink({ area, muted = false }: { area: Area; muted?: boolean }) {
  return (
    <Link
      href={`/opportunities/${area.slug}`}
      className={`block border-b border-border/70 pb-3 transition-colors hover:border-accent/50 ${
        muted ? "text-muted" : ""
      }`}
    >
      <span className="block font-medium text-foreground">
        {ideaTitle(area.slug, area.label)}
      </span>
      <span className="mt-1 block text-sm leading-relaxed text-muted">
        {ideaPlain(area.slug, area.hypothesis)}
      </span>
    </Link>
  );
}
