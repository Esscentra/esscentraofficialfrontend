import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'text-white bg-gradient-to-b from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 shadow-lg shadow-brand-600/35 hover:shadow-xl hover:shadow-brand-500/40 ring-1 ring-inset ring-white/15 focus-visible:ring-brand-400',
  secondary:
    'text-slate-100 bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] hover:border-white/20 focus-visible:ring-white/30',
  ghost: 'text-slate-300 hover:bg-white/[0.06] hover:text-white focus-visible:ring-white/20',
  danger:
    'text-white bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 shadow-lg shadow-rose-600/30 ring-1 ring-inset ring-white/15 focus-visible:ring-rose-400',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-xs',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'group relative inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-xl font-semibold tracking-tight',
        'outline-none transition-all duration-200 focus-visible:ring-4 focus-visible:ring-offset-0',
        'hover:-translate-y-px active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 disabled:hover:translate-y-0',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {/* sheen sweep on hover (primary only) */}
      {variant === 'primary' && (
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      )}
      {loading && <Loader2 className="relative h-4 w-4 shrink-0 animate-spin" />}
      <span className="relative inline-flex items-center justify-center gap-2 leading-none [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0">
        {children}
      </span>
    </button>
  );
});
