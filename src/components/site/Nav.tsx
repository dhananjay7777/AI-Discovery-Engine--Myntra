"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_ITEMS = [
  { href: "/", label: "Home", hint: "What this site is" },
  { href: "/board", label: "Findings", hint: "The main ideas, in a suggested order" },
  { href: "/questions", label: "Questions", hint: "What to ask real shoppers" },
  { href: "/corpus", label: "Comments", hint: "Where the comments came from" },
  { href: "/metric-tree", label: "Buying path", hint: "How a save becomes a buy" },
  { href: "/segments", label: "Who", hint: "Who to talk to" },
  { href: "/method", label: "What's missing", hint: "What this cannot tell you" },
  { href: "/demo", label: "Try it", hint: "Run a tiny sample — not on yet" },
] as const;

function isActive(current: string, href: string): boolean {
  if (href === "/") return current === "/";
  if (href === "/board") {
    return current === "/board" || current.startsWith("/opportunities/");
  }
  return current === href || current.startsWith(`${href}/`);
}

export function Nav() {
  const current = usePathname() || "/";
  return (
    <nav aria-label="Primary" className="min-w-0 overflow-x-auto">
      <ul className="flex flex-wrap items-center justify-end gap-x-5">
        {NAV_ITEMS.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              title={item.hint}
              className={isActive(current, item.href) ? "site-nav-link is-active" : "site-nav-link"}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
