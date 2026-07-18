import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * pdf.js is loaded from a CDN at runtime (no npm dependency / build step). The
 * module is fetched once and cached. Rendering happens fully on-canvas, so the
 * browser's native PDF handler never runs — the file previews inline and is
 * never auto-downloaded.
 */
const PDFJS_VERSION = '4.10.38';
const PDFJS_CDN = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

/* eslint-disable @typescript-eslint/no-explicit-any */
let pdfjsPromise: Promise<any> | null = null;
function loadPdfjs(): Promise<any> {
  if (!pdfjsPromise) {
    pdfjsPromise = import(/* @vite-ignore */ PDFJS_CDN).then((lib: any) => {
      lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      return lib;
    });
  }
  return pdfjsPromise;
}

export function PdfViewer({ url, onError }: { url: string; onError?: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const host = pagesRef.current;
    const scroller = scrollRef.current;
    if (!host || !scroller) return;

    setLoading(true);
    host.replaceChildren();

    (async () => {
      try {
        const [pdfjs, res] = await Promise.all([loadPdfjs(), fetch(url, { mode: 'cors' })]);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.arrayBuffer();
        if (cancelled) return;

        const pdf = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const targetWidth = Math.min(scroller.clientWidth - 32, 900);

        for (let n = 1; n <= pdf.numPages; n++) {
          if (cancelled) return;
          const page = await pdf.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const scale = targetWidth / base.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.className = 'mx-auto mb-4 rounded-lg shadow-xl ring-1 ring-black/10';

          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          host.appendChild(canvas);

          await page.render({
            canvasContext: ctx,
            viewport,
            transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
          }).promise;

          if (n === 1 && !cancelled) setLoading(false);
        }
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) {
          setLoading(false);
          onError?.();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div ref={scrollRef} className="relative h-full w-full overflow-auto">
      <div ref={pagesRef} className="mx-auto max-w-3xl p-4" />
      {loading && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="h-7 w-7 animate-spin text-brand-300" />
            <p className="text-sm">Loading preview…</p>
          </div>
        </div>
      )}
    </div>
  );
}
