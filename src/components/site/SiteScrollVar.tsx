"use client";

import { useEffect } from "react";

/** Drives --page-scroll on <html> so background layers can parallax. */
export function SiteScrollVar() {
  useEffect(() => {
    const root = document.documentElement;
    let ticking = false;

    const update = () => {
      ticking = false;
      const max = root.scrollHeight - root.clientHeight;
      const t = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      root.style.setProperty("--page-scroll", t.toFixed(4));
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return null;
}
