import { Loader2 } from 'lucide-react';
import { AuroraBackground } from './AuroraBackground';
import { Logo } from './Logo';

export function FullPageLoader() {
  return (
    <div className="relative grid min-h-screen place-items-center">
      <AuroraBackground />
      <div className="flex flex-col items-center gap-4">
        <Logo withWordmark={false} className="animate-float" />
        <Loader2 className="h-6 w-6 animate-spin text-brand-300" />
        <p className="text-sm text-slate-400">Securing your session…</p>
      </div>
    </div>
  );
}
