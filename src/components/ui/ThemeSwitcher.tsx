import { BookOpen, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from '@/context/ThemeProvider';

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'reading', label: 'Reading', icon: BookOpen },
];

/** Compact segmented control to switch between dark / light / reading themes. */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.04] p-0.5"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            title={label}
            aria-label={label}
            className={`grid h-7 w-7 place-items-center rounded-lg transition ${
              active
                ? 'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow ring-1 ring-inset ring-white/20'
                : 'text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon className="h-[15px] w-[15px]" />
          </button>
        );
      })}
    </div>
  );
}
