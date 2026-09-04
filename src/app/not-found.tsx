import Link from "next/link";
import { Shell } from "@/components/site/Shell";
import { getRunMeta } from "@/lib/web/data";

export default function NotFound() {
  const run = getRunMeta();
  return (
    <Shell current="/" run={run}>
      <h1 className="page-title">That page is not here</h1>
      <p className="lede mt-4">
        The link does not match a finding or a page on this site.
      </p>
      <p className="mt-6">
        <Link href="/board" className="text-accent underline underline-offset-4">
          See the findings
        </Link>
      </p>
    </Shell>
  );
}
