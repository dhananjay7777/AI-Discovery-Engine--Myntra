export const NAV_ITEMS = [
  { href: "/", label: "Home", hint: "What this site is" },
  { href: "/board", label: "Findings", hint: "The main ideas, in a suggested order" },
  { href: "/questions", label: "Questions", hint: "What to ask real shoppers" },
  { href: "/corpus", label: "Comments", hint: "Where the comments came from" },
  { href: "/metric-tree", label: "Path", hint: "The five steps from save to buy" },
  { href: "/segments", label: "Who", hint: "Who to talk to" },
  { href: "/method", label: "Limits", hint: "What this cannot tell you" },
  { href: "/demo", label: "Try it", hint: "Run a tiny sample — not on yet" },
] as const;

export function isActive(current: string, href: string): boolean {
  if (href === "/") return current === "/";
  if (href === "/board") {
    return current === "/board" || current.startsWith("/opportunities/");
  }
  return current === href || current.startsWith(`${href}/`);
}

/** Links shown in the desktop rail (includes Home). */
export const RAIL_ITEMS = NAV_ITEMS;
