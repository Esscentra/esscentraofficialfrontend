import { forwardRef, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
      {children}
    </label>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, className, ...props },
  ref,
) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select ref={ref} className={cn('glass-input !pl-4 [color-scheme:dark]', className)} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0f1830]">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, className, rows = 3, ...props },
  ref,
) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-brand-400/70 focus:bg-white/[0.06] focus:ring-4 focus:ring-brand-500/20',
          className,
        )}
        {...props}
      />
    </div>
  );
});
