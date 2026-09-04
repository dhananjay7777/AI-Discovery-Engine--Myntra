export function SiteAtmosphere() {
  return (
    <div className="site-atmosphere" aria-hidden="true">
      <div className="site-atmosphere-columns" />
      <div className="site-atmosphere-horizon">
        <span className="site-atmosphere-horizon-line" />
        <span className="site-atmosphere-horizon-glint" />
      </div>
      <svg
        className="site-atmosphere-lens"
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid meet"
      >
        <circle className="site-atmosphere-lens-ring" cx="200" cy="200" r="168" />
        <circle className="site-atmosphere-lens-ring is-inner" cx="200" cy="200" r="112" />
        <g className="site-atmosphere-lens-finder">
          <circle cx="200" cy="32" r="5" />
          <line x1="200" y1="44" x2="200" y2="78" />
        </g>
      </svg>
      <div className="site-atmosphere-grain" />
    </div>
  );
}
