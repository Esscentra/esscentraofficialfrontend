import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Mail, TriangleAlert, X } from 'lucide-react';
import { EMAIL_TEMPLATE_LABEL, type EmailLog } from '@/lib/emailApi';

/**
 * Renders the exact HTML that was sent (or would have been sent) for one
 * email, inside a sandboxed iframe.
 *
 * `sandbox` is intentionally empty — no allow-scripts, no allow-same-origin —
 * so template markup can never reach the app's origin, cookies or storage.
 * Email HTML is table-and-inline-style markup; it needs no scripting to render.
 */
export function EmailPreviewModal({
  open,
  onClose,
  log,
  loading = false,
  error,
}: {
  open: boolean;
  onClose: () => void;
  log: EmailLog | null;
  loading?: boolean;
  error?: string | null;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6"
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
            className="glass-card relative z-10 flex h-[86vh] w-full max-w-3xl flex-col overflow-hidden !rounded-2xl p-0"
            role="dialog"
            aria-modal="true"
            aria-label="Email preview"
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30">
                  <Mail className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {log?.subject || 'Email preview'}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {log ? `${EMAIL_TEMPLATE_LABEL[log.template]} · to ${log.to}` : 'Loading…'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 bg-[#eef2f9]">
              {loading ? (
                <div className="grid h-full place-items-center bg-transparent">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                </div>
              ) : error ? (
                <div className="grid h-full place-items-center px-6 text-center">
                  <div>
                    <TriangleAlert className="mx-auto h-6 w-6 text-rose-500" />
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      Couldn’t load the message
                    </p>
                    <p className="mt-1 text-xs text-slate-600">{error}</p>
                  </div>
                </div>
              ) : log?.html ? (
                <iframe
                  title="Email preview"
                  srcDoc={log.html}
                  sandbox=""
                  className="h-full w-full border-0 bg-[#eef2f9]"
                />
              ) : (
                <div className="grid h-full place-items-center px-6 text-center">
                  <p className="text-sm text-slate-600">
                    No message body was stored for this record.
                  </p>
                </div>
              )}
            </div>

            {/* Footer — the delivery facts, not the marketing copy */}
            {log && (
              <div className="shrink-0 border-t border-white/10 px-4 py-2.5 text-[11px] text-slate-400 sm:px-5">
                {log.status === 'SENT' ? (
                  <span>
                    Delivered to the provider
                    {log.sentAt ? ` on ${new Date(log.sentAt).toLocaleString('en-IN')}` : ''}
                    {log.providerId ? ` · id ${log.providerId}` : ''}
                  </span>
                ) : (
                  <span className="text-amber-200">
                    Not delivered — {log.reason || 'no reason recorded'}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
