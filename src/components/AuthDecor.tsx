import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarClock,
  CreditCard,
  HandCoins,
  LineChart,
  Mail,
  MessageSquare,
  PieChart,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';

type Deco = {
  icon: LucideIcon;
  x: string; // left offset (vw-ish %)
  y: string; // top offset (%)
  size: number; // tile px
  dur: number; // float duration (s)
  delay: number; // stagger (s)
  drift: number; // vertical travel (px)
  rot: number; // rotation sweep (deg)
  tint: string; // icon color class
};

/* Scattered across the viewport; whatever sits behind the centered card is
   simply covered, so only the pieces in the gutters/top/bottom peek through. */
const ICONS: Deco[] = [
  { icon: BarChart3, x: '6%', y: '14%', size: 60, dur: 8, delay: 0, drift: 16, rot: 5, tint: 'text-brand-300/70' },
  { icon: Users, x: '15%', y: '30%', size: 48, dur: 9.5, delay: 0.6, drift: 12, rot: -6, tint: 'text-sky-300/60' },
  { icon: TrendingUp, x: '9%', y: '58%', size: 66, dur: 10, delay: 1.1, drift: 18, rot: 4, tint: 'text-brand-200/70' },
  { icon: Wallet, x: '18%', y: '78%', size: 50, dur: 8.5, delay: 0.3, drift: 14, rot: 7, tint: 'text-brand-300/60' },
  { icon: Mail, x: '3%', y: '40%', size: 44, dur: 11, delay: 1.6, drift: 12, rot: -5, tint: 'text-slate-300/50' },
  { icon: Target, x: '24%', y: '9%', size: 46, dur: 9, delay: 0.9, drift: 13, rot: 6, tint: 'text-sky-300/55' },
  { icon: PieChart, x: '88%', y: '13%', size: 62, dur: 9.5, delay: 0.2, drift: 17, rot: -5, tint: 'text-brand-300/70' },
  { icon: CreditCard, x: '80%', y: '30%', size: 50, dur: 8, delay: 1.3, drift: 14, rot: 6, tint: 'text-brand-200/60' },
  { icon: LineChart, x: '92%', y: '55%', size: 58, dur: 10.5, delay: 0.5, drift: 18, rot: -4, tint: 'text-sky-300/60' },
  { icon: MessageSquare, x: '83%', y: '76%', size: 48, dur: 9, delay: 1, drift: 13, rot: 5, tint: 'text-brand-300/60' },
  { icon: ShieldCheck, x: '95%', y: '38%', size: 44, dur: 11.5, delay: 1.8, drift: 12, rot: -6, tint: 'text-slate-300/50' },
  { icon: HandCoins, x: '76%', y: '10%', size: 46, dur: 8.5, delay: 0.7, drift: 15, rot: 5, tint: 'text-sky-300/55' },
  { icon: Briefcase, x: '70%', y: '88%', size: 44, dur: 9.5, delay: 1.4, drift: 12, rot: -5, tint: 'text-brand-200/55' },
  { icon: CalendarClock, x: '30%', y: '86%', size: 46, dur: 10, delay: 0.4, drift: 14, rot: 6, tint: 'text-brand-300/55' },
  { icon: Building2, x: '30%', y: '20%', size: 42, dur: 8, delay: 1.7, drift: 11, rot: -4, tint: 'text-slate-300/45' },
  { icon: Zap, x: '66%', y: '46%', size: 40, dur: 9, delay: 0.9, drift: 12, rot: 7, tint: 'text-brand-200/50' },
];

/**
 * Decorative, non-interactive layer of floating CRM icons for the auth screens.
 * Sits behind the card (-z-10). Honors prefers-reduced-motion.
 */
export function AuthDecor() {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 hidden overflow-hidden md:block" aria-hidden>
      {ICONS.map((d, i) => {
        const Icon = d.icon;
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: d.x, top: d.y }}
            initial={{ opacity: 0, scale: 0.82, y: 8 }}
            animate={
              reduce
                ? { opacity: 0.45, scale: 1, y: 0 }
                : {
                    opacity: 0.45,
                    scale: 1,
                    y: [0, -d.drift, 0],
                    rotate: [0, d.rot, 0],
                  }
            }
            transition={
              reduce
                ? { duration: 0.6 }
                : {
                    opacity: { duration: 0.9, delay: d.delay * 0.25, ease: 'easeOut' },
                    scale: { duration: 0.9, delay: d.delay * 0.25, ease: [0.22, 1, 0.36, 1] },
                    y: { duration: d.dur, repeat: Infinity, ease: 'easeInOut', delay: d.delay },
                    rotate: { duration: d.dur * 1.35, repeat: Infinity, ease: 'easeInOut', delay: d.delay },
                  }
            }
          >
            <span
              className={`grid place-items-center rounded-2xl border border-white/10 bg-white/[0.045] shadow-[0_10px_30px_-12px_rgba(6,12,32,0.6)] backdrop-blur-sm ${d.tint}`}
              style={{ height: d.size, width: d.size }}
            >
              <Icon style={{ height: d.size * 0.42, width: d.size * 0.42 }} strokeWidth={1.75} />
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
