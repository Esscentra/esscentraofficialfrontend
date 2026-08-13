import DOMPurify from 'dompurify';
import { Markdown, PROSE_CLASSES } from './Markdown';
import { cn } from '@/lib/utils';

/**
 * Renders a post body in whichever format it was written:
 *   markdown — legacy posts, via the existing Markdown renderer;
 *   html     — rich-text-editor posts, sanitised with DOMPurify before
 *              touching the DOM. Image layout (size / alignment / wrap) is
 *              baked into each image's inline style by the editor, so the
 *              saved HTML renders correctly with no extra CSS.
 */
export function PostContent({
  content,
  format = 'markdown',
  className,
}: {
  content: string;
  format?: 'markdown' | 'html';
  className?: string;
}) {
  if (format === 'html') {
    const clean = DOMPurify.sanitize(content, {
      ADD_ATTR: ['data-align', 'data-width'],
    });
    return (
      <div
        className={cn(
          PROSE_CLASSES,
          // Contain floated (wrapped) images at the end of the article.
          'after:block after:clear-both after:content-[""]',
          className,
        )}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }

  return <Markdown content={content} className={className} />;
}
