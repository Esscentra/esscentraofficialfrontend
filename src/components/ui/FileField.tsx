import { useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';

/**
 * Labeled image/file upload field.
 * Renders a real (hidden) <input type="file" name={name}> so the file is
 * included automatically when you submit the form as multipart/form-data.
 */
export function FileField({
  label,
  name,
  accept = 'image/*',
  required,
  hint,
}: {
  label: string;
  name: string;
  accept?: string;
  required?: boolean;
  hint?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  };

  const clear = () => {
    if (ref.current) ref.current.value = '';
    setPreview(null);
    setFileName(null);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </label>

      <div
        onClick={() => ref.current?.click()}
        className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3 transition hover:border-brand-400/50 hover:bg-brand-500/[0.06]"
      >
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/[0.04] text-slate-400 ring-1 ring-white/10">
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-slate-200">{fileName ?? 'Choose an image'}</p>
          <p className="text-xs text-slate-500">{hint ?? 'PNG or JPG, up to ~5 MB'}</p>
        </div>
        {fileName && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clear();
            }}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <input
        ref={ref}
        type="file"
        name={name}
        accept={accept}
        required={required}
        onChange={onChange}
        className="hidden"
      />
    </div>
  );
}
