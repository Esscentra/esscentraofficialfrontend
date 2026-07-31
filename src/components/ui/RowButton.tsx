import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** Small icon button used in table rows (edit / delete). */
export function RowButton({
  children,
  danger,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent ${
        danger ? 'hover:text-rose-300 disabled:hover:text-slate-400' : 'hover:text-white disabled:hover:text-slate-400'
      }`}
      {...props}
    >
      {children}
    </button>
  );
}
