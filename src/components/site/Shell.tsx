import type { ReactNode } from "react";
import type { RunMeta } from "@/lib/web/data";

export function Shell({
  current: _current,
  run: _run,
  children,
}: {
  current: string;
  run: RunMeta;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <main id="main" className="page-wrap py-12 sm:py-16">
        {children}
      </main>
      <footer className="border-t border-border/80 py-10 text-center text-xs text-muted">
        Interviews with shoppers decide what is real. This site only says where to look first.
      </footer>
    </div>
  );
}
