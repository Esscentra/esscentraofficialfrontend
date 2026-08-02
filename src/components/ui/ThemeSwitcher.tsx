import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, ChevronDown, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from '@/context/ThemeProvider';

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Day', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'reading', label: 'Reading', icon: BookOpen },
];

/**
 * Theme picker as a dropdown: one compact trigger showing the active theme,
 * opening a labelled menu — far friendlier on a narrow phone header than the
 * old three-button segmented control.
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const active = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[1]!;
  const ActiveIcon = active.icon;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${active.label}`}
        title={`Theme: ${active.label}`}
        className="flex h-9 items-center gap-1 rounded-lg px-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
      >
        <ActiveIcon className="h-[17px] w-[17px]" />
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Theme"
          className="glass-card absolute right-0 top-11 z-40 w-40 p-1.5"
        >
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const selected = theme === value;
            return (
              <button
                key={value}
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
                  selected
                    ? 'bg-brand-500/15 font-semibold text-brand-200'
                    : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{label}</span>
                {selected && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
