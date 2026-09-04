"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { NAV_ITEMS, RAIL_ITEMS, isActive } from "./Nav";

export function SiteHeader() {
  const current = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const railRef = useRef<HTMLUListElement>(null);
  const panelId = useId();

  useEffect(() => {
    setOpen(false);
  }, [current]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 960px)");
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const measure = () => {
      const active = rail.querySelector<HTMLElement>("[data-active='true']");
      if (!active) {
        setIndicator((prev) => ({ ...prev, width: 0, ready: true }));
        return;
      }
      const listBox = rail.getBoundingClientRect();
      const activeBox = active.getBoundingClientRect();
      setIndicator({
        left: activeBox.left - listBox.left,
        width: activeBox.width,
        ready: true,
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(rail);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [current]);

  return (
    <header className="site-header">
      <div className="site-header-bar">
        <Link href="/" className="site-mark" aria-label="Discovery Engine home">
          <span className="site-mark-glyph-wrap" aria-hidden="true">
            <svg className="site-mark-glyph" viewBox="0 0 32 32">
              <line x1="8" y1="23" x2="16" y2="8" />
              <line x1="16" y1="8" x2="24" y2="23" />
              <line x1="8" y1="23" x2="24" y2="23" />
              <circle cx="16" cy="8" r="2.4" />
              <circle cx="8" cy="23" r="2.1" />
              <circle cx="24" cy="23" r="2.1" />
            </svg>
          </span>
          <span className="site-mark-text">
            Discovery
            <span className="site-mark-engine">Engine</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="site-nav-rail">
          <ul ref={railRef} className="site-nav-rail-list">
            <li
              className="site-nav-indicator"
              aria-hidden="true"
              style={{
                transform: `translateX(${indicator.left}px)`,
                width: indicator.width,
                opacity: indicator.ready && indicator.width ? 1 : 0,
              }}
            />
            {RAIL_ITEMS.map((item) => {
              const active = isActive(current, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={item.hint}
                    data-active={active ? "true" : "false"}
                    aria-current={active ? "page" : undefined}
                    className={active ? "site-nav-link is-active" : "site-nav-link"}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          type="button"
          className={open ? "site-nav-toggle is-open" : "site-nav-toggle"}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="site-nav-toggle-bars" aria-hidden="true">
            <span />
            <span />
          </span>
        </button>
      </div>

      <div
        id={panelId}
        className={open ? "site-nav-sheet is-open" : "site-nav-sheet"}
        aria-hidden={!open}
        inert={!open}
      >
        <nav aria-label="Menu" className="site-nav-sheet-nav">
          <p className="site-nav-sheet-kicker">Go to</p>
          <ul className="site-nav-sheet-list">
            {NAV_ITEMS.map((item, index) => {
              const active = isActive(current, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={
                      active ? "site-nav-sheet-link is-active" : "site-nav-sheet-link"
                    }
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <span className="site-nav-sheet-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="site-nav-sheet-copy">
                      <span className="site-nav-sheet-label">{item.label}</span>
                      <span className="site-nav-sheet-hint">{item.hint}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
