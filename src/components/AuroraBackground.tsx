/**
 * Animated aurora / gradient-blob backdrop with a faint grid overlay.
 * Pure CSS animation (keyframes in tailwind.config) — cheap and GPU-friendly.
 */
export function AuroraBackground() {
  return (
    <div className="aurora-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#070c1a]">
      {/* color blobs */}
      <div className="absolute -left-32 -top-32 h-[42rem] w-[42rem] rounded-full bg-brand-600/30 blur-[120px] animate-aurora-1" />
      <div className="absolute -right-40 top-10 h-[38rem] w-[38rem] rounded-full bg-sky-500/20 blur-[130px] animate-aurora-2" />
      <div className="absolute bottom-[-12rem] left-1/3 h-[40rem] w-[40rem] rounded-full bg-blue-700/25 blur-[140px] animate-aurora-3" />

      {/* faint grid */}
      <div className="absolute inset-0 bg-grid-faint [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      {/* vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#070c1a]" />

      {/* subtle noise via SVG */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.035]">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>
    </div>
  );
}
