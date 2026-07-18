import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldCheck, Sparkles, Users, Workflow } from 'lucide-react';
import { Logo } from './Logo';
import { AuroraBackground } from './AuroraBackground';
import { AuthDecor } from './AuthDecor';
import { ThemeSwitcher } from './ui/ThemeSwitcher';

const HIGHLIGHTS = [
  {
    icon: Workflow,
    title: 'One platform, every phase',
    text: 'CRM, projects, billing and KYC — built on a single secure foundation.',
  },
  {
    icon: ShieldCheck,
    title: 'Security by default',
    text: 'JWT access + refresh tokens, hashed credentials, and role-based access.',
  },
  {
    icon: Users,
    title: 'Built for your whole team',
    text: 'Admins, managers, accountants and clients — each with the right access.',
  },
];

function BrandPanel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % HIGHLIGHTS.length), 4200);
    return () => clearInterval(t);
  }, []);
  const active = HIGHLIGHTS[i];
  const Icon = active.icon;

  return (
    <div className="brand-panel relative hidden flex-col justify-between overflow-hidden rounded-l-[1.25rem] bg-gradient-to-br from-brand-600/55 via-brand-800/45 to-[#070c1a] p-10 lg:flex">
      {/* decorative background layers */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-400/25 blur-3xl animate-float" />
        <div className="absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 translate-y-1/3 rounded-full bg-brand-600/30 blur-[100px]" />
        <div className="absolute inset-0 bg-grid-faint [background-size:34px_34px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      </div>

      {/* top: brand lockup — mark + stacked wordmark/tagline on a shared left edge */}
      <div className="relative flex items-center gap-3">
        <Logo withWordmark={false} />
        <div className="flex flex-col leading-tight">
          <span className="text-gradient font-display text-lg font-bold tracking-tight">
            Esscentra
          </span>
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-200/80">
            Business Platform
          </span>
        </div>
      </div>

      {/* middle: hero + rotating highlight */}
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-brand-200 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" /> Agency OS
        </span>
        <h2 className="mt-5 max-w-sm font-display text-[2rem] font-bold leading-[1.15] tracking-tight text-white">
          The operating system for your <span className="text-gradient">agency</span>.
        </h2>

        <div className="mt-8 min-h-[92px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-start gap-3"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-brand-200 shadow-inner backdrop-blur">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-white">{active.title}</p>
                <p className="mt-0.5 max-w-xs text-sm leading-relaxed text-slate-300/80">{active.text}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* progress dots */}
        <div className="mt-6 flex gap-1.5">
          {HIGHLIGHTS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === i ? 'w-6 bg-brand-300' : 'w-1.5 bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Highlight ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* bottom: copyright */}
      <p className="relative text-xs text-slate-400/70">
        © {new Date().getFullYear()} Esscentra. All rights reserved.
      </p>
    </div>
  );
}

interface AuthLayoutProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-y-auto p-4 py-8 sm:p-6 sm:py-10 lg:items-center">
      <AuroraBackground />
      <AuthDecor />

      <div className="fixed right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeSwitcher />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="glass-card my-auto grid w-full max-w-md grid-cols-1 overflow-hidden lg:max-w-5xl lg:grid-cols-[1.05fr_1fr]"
      >
        <BrandPanel />

        <div className="relative z-10 flex flex-col p-6 sm:p-10 lg:p-12">
          {/* mobile logo */}
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-[2rem] sm:leading-tight">
                {title}
              </h1>
              {subtitle && <p className="mt-2 text-sm leading-relaxed text-slate-400">{subtitle}</p>}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.4 }}
              className="mt-8"
            >
              {children}
            </motion.div>
          </div>

          {footer && (
            <div className="mt-8 border-t border-white/[0.07] pt-6 text-center text-sm text-slate-400">
              {footer}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/** Small helper for the "remember me / forgot" type links used across forms. */
export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="font-semibold text-brand-300 underline-offset-4 transition hover:text-brand-200 hover:underline"
    >
      {children}
    </Link>
  );
}
