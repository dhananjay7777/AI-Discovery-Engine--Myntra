export function SiteAtmosphere() {
  return (
    <div className="site-atmosphere" aria-hidden="true">
      <div className="site-atmosphere-vignette" />
      <div className="site-atmosphere-lattice site-atmosphere-lattice-a" />
      <div className="site-atmosphere-lattice site-atmosphere-lattice-b" />
      <div className="site-atmosphere-polar">
        <svg viewBox="0 0 200 200">
          <g fill="none">
            <circle cx="100" cy="100" r="22" />
            <circle cx="100" cy="100" r="44" />
            <circle cx="100" cy="100" r="68" />
            <circle cx="100" cy="100" r="92" />
            <line x1="100" y1="4" x2="100" y2="196" />
            <line x1="4" y1="100" x2="196" y2="100" />
            <line x1="32" y1="32" x2="168" y2="168" />
            <line x1="168" y1="32" x2="32" y2="168" />
          </g>
        </svg>
      </div>
      <div className="site-atmosphere-grain" />
    </div>
  );
}
