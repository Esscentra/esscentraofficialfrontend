import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, ExternalLink, FileText, TriangleAlert, X } from 'lucide-react';
import { PdfViewer } from './PdfViewer';

/**
 * Professional in-app preview for a document URL (PDF or image). Renders in a
 * portal with a frosted backdrop, a header (title + open-in-new-tab + optional
 * download + close), and the file filling the body. Closes on Escape / backdrop.
 *
 * PDFs are fetched and re-wrapped as `application/pdf` blobs before embedding,
 * because Cloudinary `raw` uploads are delivered as octet-stream and would not
 * otherwise preview in an <iframe>.
 */
export function FilePreviewModal({
  open,
  onClose,
  url,
  title = 'Document',
  subtitle = 'Preview',
  kind = 'pdf',
  onDownload,
}: {
  open: boolean;
  onClose: () => void;
  url?: string;
  title?: string;
  subtitle?: string;
  kind?: 'pdf' | 'image';
  onDownload?: () => void;
}) {
  const [failed, setFailed] = useState(false);

  // Lock scroll + Escape to close.
  useEffect(() => {
    if (!open) return;
    setFailed(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && url && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="glass-card relative z-10 flex h-[86vh] w-full max-w-4xl flex-col overflow-hidden !rounded-2xl p-0"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30">
                  <FileText className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{title}</p>
                  <p className="truncate text-[11px] text-slate-400">{subtitle}</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {onDownload && (
                  <button
                    type="button"
                    onClick={onDownload}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand-400/30 bg-brand-500/10 px-2.5 py-1.5 text-xs font-semibold text-brand-200 transition hover:bg-brand-500/20"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                )}
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  title="Open in new tab"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Open</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close preview"
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 bg-black/30">
              {kind === 'image' ? (
                <div className="grid h-full w-full place-items-center overflow-auto p-4">
                  <img src={url} alt={title} className="max-h-full max-w-full object-contain" />
                </div>
              ) : failed ? (
                <div className="grid h-full w-full place-items-center p-6">
                  <div className="flex max-w-xs flex-col items-center gap-3 text-center">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30">
                      <TriangleAlert className="h-6 w-6" />
                    </span>
                    <p className="text-sm font-semibold text-white">Preview unavailable here</p>
                    <p className="text-xs text-slate-400">
                      This file couldn’t be rendered. You can still open it in a new tab or download
                      it.
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
                      </a>
                      {onDownload && (
                        <button
                          type="button"
                          onClick={onDownload}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-400/30 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-200 transition hover:bg-brand-500/20"
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <PdfViewer url={url} onError={() => setFailed(true)} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
