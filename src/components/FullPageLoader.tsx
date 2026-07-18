import { AuroraBackground } from './AuroraBackground';
import { Logo } from './Logo';

export function FullPageLoader() {
  return (
    <div className="relative grid min-h-screen place-items-center">
      <AuroraBackground />
      <div className="flex flex-col items-center gap-5">
        <Logo withWordmark={false} className="animate-float" />
        {/* smooth indeterminate progress bar */}
        <div className="relative h-1.5 w-44 overflow-hidden rounded-full bg-white/10">
          <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-brand-400 to-transparent animate-loader" />
        </div>
        <p className="text-sm text-slate-400">Securing your session…</p>
      </div>
    </div>
  );
}
