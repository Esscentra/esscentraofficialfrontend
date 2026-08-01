import { useRef, useState, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import { Check, Copy } from 'lucide-react';
import 'highlight.js/styles/github-dark.css';
import { cn } from '@/lib/utils';

/**
 * A code block with a copy button.
 *
 * The text is read off the rendered DOM rather than walked out of the AST:
 * `react-markdown` hands `pre` a React element tree whose shape depends on the
 * highlighter, and `innerText` is both simpler and exactly what the reader
 * sees — including the line breaks.
 */
function Pre({ children, className, ...props }: ComponentPropsWithoutRef<'pre'>) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = ref.current?.innerText ?? '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* Clipboard blocked (insecure origin, denied permission) — ignore. */
    }
  };

  return (
    <div className="group/code relative my-5">
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy code'}
        className="absolute right-2.5 top-2.5 z-10 grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-slate-400 opacity-0 backdrop-blur transition hover:bg-white/[0.12] hover:text-white focus-visible:opacity-100 group-hover/code:opacity-100"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
      <pre
        ref={ref}
        className={cn(
          'overflow-x-auto rounded-xl border border-white/10 bg-[#0b1020] p-4 text-[13px] leading-relaxed',
          className,
        )}
        {...props}
      >
        {children}
      </pre>
    </div>
  );
}

/**
 * Renders GitHub-flavoured Markdown: tables, task lists, strikethrough, and
 * fenced code with syntax highlighting.
 *
 * Raw HTML in the source is NOT rendered — `react-markdown` escapes it by
 * default and we deliberately don't add `rehype-raw`. Post bodies are written
 * by admins, but "trusted author" is a weak guarantee to hang script execution
 * on, and nothing in a developer blog needs inline HTML that Markdown can't
 * already express.
 */
export function Markdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'max-w-none text-[15px] leading-7 text-slate-300',
        // Headings — anchor ids come from rehype-slug, matching the server's TOC.
        '[&_h1]:mb-4 [&_h1]:mt-8 [&_h1]:font-display [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white',
        '[&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:scroll-mt-24 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white',
        '[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:scroll-mt-24 [&_h3]:font-display [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-white',
        '[&_h4]:mb-2 [&_h4]:mt-5 [&_h4]:font-semibold [&_h4]:text-slate-100',
        // Body
        '[&_p]:my-4',
        '[&_a]:font-medium [&_a]:text-brand-300 [&_a]:underline [&_a]:decoration-brand-400/40 [&_a]:underline-offset-2 hover:[&_a]:text-brand-200',
        '[&_strong]:font-semibold [&_strong]:text-white',
        '[&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6',
        '[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-6',
        '[&_li]:marker:text-slate-600',
        '[&_blockquote]:my-5 [&_blockquote]:border-l-2 [&_blockquote]:border-brand-400/50 [&_blockquote]:bg-white/[0.02] [&_blockquote]:py-1 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-400',
        '[&_hr]:my-8 [&_hr]:border-white/10',
        '[&_img]:my-5 [&_img]:rounded-xl [&_img]:border [&_img]:border-white/10',
        // Inline code only — the `pre > code` inside a block is left to hljs.
        '[&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:border [&_:not(pre)>code]:border-white/10 [&_:not(pre)>code]:bg-white/[0.06] [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-[13px] [&_:not(pre)>code]:text-brand-200',
        // Tables (GFM)
        '[&_table]:my-5 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm',
        '[&_th]:border-b [&_th]:border-white/15 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-slate-200',
        '[&_td]:border-b [&_td]:border-white/5 [&_td]:px-3 [&_td]:py-2',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{ pre: Pre }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
