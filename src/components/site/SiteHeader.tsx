import Link from "next/link";
import { Nav } from "./Nav";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-mark">
          <svg className="site-mark-glyph" viewBox="0 0 32 32" aria-hidden="true">
            <line x1="8" y1="23" x2="16" y2="8" />
            <line x1="16" y1="8" x2="24" y2="23" />
            <line x1="8" y1="23" x2="24" y2="23" />
            <circle cx="16" cy="8" r="2.4" />
            <circle cx="8" cy="23" r="2.1" />
            <circle cx="24" cy="23" r="2.1" />
          </svg>
          <span className="site-mark-text">Discovery Engine</span>
        </Link>
        <Nav />
      </div>
    </header>
  );
}
