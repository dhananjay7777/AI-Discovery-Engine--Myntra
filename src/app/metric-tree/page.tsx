import Link from "next/link";
import { HBarList } from "@/components/site/Charts";
import { Shell } from "@/components/site/Shell";
import { EmptyState } from "@/components/site/ui";
import { getOutcomeTree, getRunMeta } from "@/lib/web/data";
import type { OutcomeNode } from "@/lib/store/schema";
import type { Area } from "@/lib/web/data";
import { ideaPlain, ideaTitle, metricNodeCopy } from "@/lib/web/plain";

export const dynamic = "force-dynamic";

export default function MetricTreePage() {
  const run = getRunMeta();
  const { nodes, byParent, opportunitiesByNode } = getOutcomeTree();
  const root = nodes.find((n) => !n.parent_id) ?? nodes[0];
  const steps = root ? (byParent.get(root.id) ?? []) : [];
  const rootCopy = root ? metricNodeCopy(root.id) : null;

  const recOnDoubt =
    steps.find((s) => s.id === "decision_resolution_rate") &&
    descendantIds("decision_resolution_rate", byParent)
      .concat("decision_resolution_rate")
      .flatMap((id) => opportunitiesByNode.get(id) ?? [])
      .filter((a, i, all) => a.recommended && all.findIndex((x) => x.slug === a.slug) === i)
      .length;

  return (
    <Shell current="/metric-tree" run={run}>
      <h1 className="page-title">How a save becomes a buy</h1>
      <p className="lede mt-5">
        Myntra wants more people to buy at least one saved item within 30 days.
        For that to happen, five steps have to go right. Each idea on this site
        is a guess about which step is stuck — not a measured result.
      </p>

      {nodes.length === 0 || !root ? (
        <div className="mt-8">
          <EmptyState title="Metric not published" body="The breakdown has not been written yet." />
        </div>
      ) : (
        <>
          <section id={root.id} className="surface mt-10 scroll-mt-24 px-8 py-8 sm:px-10 sm:py-10">
            <p className="kicker">The 30-day goal</p>
            <h2 className="mt-3 font-display text-3xl leading-relaxed sm:text-4xl">
              {rootCopy?.title ?? root.name}
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-muted">
              {rootCopy?.shopper ?? root.definition}
            </p>
            {typeof recOnDoubt === "number" && recOnDoubt > 0 ? (
              <p className="mt-5 max-w-2xl text-sm leading-relaxed">
                Most of the ideas sit on step 3 — leftover doubt after someone
                comes back to the list. Start talks with shoppers there, then
                check the other steps so you do not miss a different stuck point.
              </p>
            ) : null}
          </section>

          <div className="data-panel mt-8 px-6 py-6 sm:px-8">
            <p className="text-xs text-muted">How many top ideas sit on each step</p>
            <div className="mt-4">
              <HBarList
                items={steps.map((node, i) => ({
                  label: `${i + 1}. ${metricNodeCopy(node.id)?.title ?? node.name}`,
                  value: areasOn(
                    node.id,
                    opportunitiesByNode,
                    byParent,
                    true,
                  ).filter((a) => a.recommended).length,
                  href: `#${node.id}`,
                }))}
              />
            </div>
          </div>

          <ol className="mt-10 space-y-8">
            {steps.map((node, i) => (
              <StepCard
                key={node.id}
                index={i + 1}
                total={steps.length}
                node={node}
                byParent={byParent}
                opportunitiesByNode={opportunitiesByNode}
              />
            ))}
          </ol>
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

function areasOnlyHere(
  nodeId: string,
  opportunitiesByNode: Map<string, Area[]>,
  byParent: Map<string | null, OutcomeNode[]>,
): Area[] {
  const childMapped = new Set(
    descendantIds(nodeId, byParent).flatMap((id) =>
      (opportunitiesByNode.get(id) ?? []).map((a) => a.slug),
    ),
  );
  return unique(opportunitiesByNode.get(nodeId) ?? []).filter((a) => !childMapped.has(a.slug));
}

function StepCard({
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
  const children = byParent.get(node.id) ?? [];
  const leftover = areasOnlyHere(node.id, opportunitiesByNode, byParent);
  const allHere = areasOn(node.id, opportunitiesByNode, byParent, true);
  const recCount = allHere.filter((a) => a.recommended).length;

  return (
    <li id={node.id} className="surface scroll-mt-24 px-8 py-8 sm:px-10 sm:py-10">
      <p className="kicker">
        Step {index} of {total}
        {recCount > 0 ? ` · ${recCount} ranked idea${recCount === 1 ? "" : "s"}` : ""}
      </p>
      <h2 className="mt-3 font-display text-3xl leading-relaxed">{copy?.title ?? node.name}</h2>
      <p className="mt-4 max-w-2xl leading-relaxed">{copy?.shopper ?? node.definition}</p>

      {children.length > 0 ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {children.map((child) => (
            <li key={child.id} id={child.id} className="scroll-mt-24 rounded-2xl border border-border/80 bg-background/40 p-5">
              <h3 className="font-medium">{metricNodeCopy(child.id)?.title ?? child.name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {metricNodeCopy(child.id)?.shopper ?? child.definition}
              </p>
              <IdeaList areas={unique(opportunitiesByNode.get(child.id) ?? [])} />
            </li>
          ))}
        </ul>
      ) : (
        <IdeaList areas={leftover} />
      )}

      {children.length > 0 && leftover.length > 0 ? (
        <div className="mt-6">
          <p className="text-sm text-muted">Also sitting on this step as a whole</p>
          <IdeaList areas={leftover} />
        </div>
      ) : null}

      {allHere.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          No idea on this site sits here yet. Public comments also cannot see
          stock or checkout well — talks with shoppers still need to check this
          step.
        </p>
      ) : null}
    </li>
  );
}

function IdeaList({ areas }: { areas: Area[] }) {
  const rec = areas.filter((a) => a.recommended).sort((a, b) => b.score - a.score);
  const other = areas.filter((a) => !a.recommended).sort((a, b) => b.score - a.score);
  if (rec.length === 0 && other.length === 0) return null;
  return (
    <div className="mt-4 space-y-3">
      {rec.map((a) => (
        <IdeaLink key={a.slug} area={a} />
      ))}
      {other.length > 0 ? (
        <div>
          <p className="mt-2 text-xs text-muted">Noted, not in the top list</p>
          <ul className="mt-2 space-y-2">
            {other.map((a) => (
              <li key={a.slug}>
                <IdeaLink area={a} muted />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function IdeaLink({ area, muted = false }: { area: Area; muted?: boolean }) {
  return (
    <Link
      href={`/opportunities/${area.slug}`}
      className={`block rounded-xl border px-4 py-3 transition-colors hover:border-accent/50 ${
        muted ? "border-border/60 text-muted" : "border-border bg-card/40"
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
