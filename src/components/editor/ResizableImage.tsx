import Image from '@tiptap/extension-image';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react';
import { cn } from '@/lib/utils';

/**
 * ============================================================================
 *  RESIZABLE, ALIGNABLE IMAGE — the Word-like image node
 * ============================================================================
 *
 * Extends TipTap's Image with two attributes:
 *   width — a percentage of the content column ("60%"), set by dragging the
 *           corner handle;
 *   align — left / right (text wraps around, like Word's "wrap text"),
 *           center, or full width.
 *
 * The node is draggable: grab the image and drop it anywhere in the document.
 *
 * `renderHTML` bakes the layout into an inline style, so the saved HTML looks
 * right anywhere it's rendered — the admin preview, the public site, an email
 * — without needing any accompanying stylesheet. The data-* attributes are
 * kept as the machine-readable source so the editor can parse its own output
 * back losslessly.
 * ============================================================================
 */

export type ImageAlign = 'left' | 'center' | 'right' | 'full';

const ALIGN_STYLE: Record<ImageAlign, string> = {
  left: 'float:left;margin:0.4rem 1.4rem 0.9rem 0;',
  right: 'float:right;margin:0.4rem 0 0.9rem 1.4rem;',
  center: 'display:block;margin:1.25rem auto;',
  full: 'display:block;width:100%;margin:1.25rem 0;',
};

export const ResizableImage = Image.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        parseHTML: (element) =>
          element.getAttribute('data-width') || element.style.width || '100%',
      },
      align: {
        default: 'center',
        parseHTML: (element) =>
          (element.getAttribute('data-align') as ImageAlign) || 'center',
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const {
      width = '100%',
      align = 'center',
      style: _ignored,
      ...rest
    } = HTMLAttributes as Record<string, string>;

    const alignKey = (
      ['left', 'center', 'right', 'full'].includes(align) ? align : 'center'
    ) as ImageAlign;

    const style =
      (alignKey === 'full' ? '' : `width:${width};`) +
      ALIGN_STYLE[alignKey] +
      'max-width:100%;height:auto;border-radius:0.75rem;';

    return [
      'img',
      { ...rest, 'data-width': width, 'data-align': alignKey, style },
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});

function ImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const { src, alt, width, align } = node.attrs as {
    src: string;
    alt?: string;
    width: string;
    align: ImageAlign;
  };

  /** Drag the corner handle → width as % of the editor column. */
  const startResize = (event: React.PointerEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const wrapper = (event.currentTarget as HTMLElement).parentElement;
    const column = wrapper?.closest('.ProseMirror') as HTMLElement | null;
    if (!wrapper || !column) return;

    const startX = event.clientX;
    const startWidth = wrapper.getBoundingClientRect().width;
    const columnWidth = column.clientWidth || 1;

    const onMove = (move: PointerEvent) => {
      const next = Math.min(
        columnWidth,
        Math.max(80, startWidth + (move.clientX - startX)),
      );
      updateAttributes({
        width: `${Math.max(10, Math.min(100, Math.round((next / columnWidth) * 100)))}%`,
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <NodeViewWrapper
      as="div"
      data-drag-handle
      className={cn(
        'group/image relative cursor-grab leading-none active:cursor-grabbing',
        align === 'left' && 'float-left clear-left my-1 mr-5',
        align === 'right' && 'float-right clear-right my-1 ml-5',
        align === 'center' && 'mx-auto my-4',
        align === 'full' && 'my-4 w-full',
      )}
      style={{ width: align === 'full' ? '100%' : width }}
    >
      <img
        src={src}
        alt={alt ?? ''}
        draggable={false}
        className={cn(
          'h-auto w-full rounded-xl border border-white/10 transition',
          selected && 'ring-2 ring-brand-400 ring-offset-2 ring-offset-transparent',
        )}
      />
      <span
        onPointerDown={startResize}
        title="Drag to resize"
        className={cn(
          'absolute -bottom-1.5 -right-1.5 z-10 h-4 w-4 cursor-se-resize rounded-full border-2 border-white bg-brand-500 opacity-0 shadow transition',
          'group-hover/image:opacity-100',
          selected && 'opacity-100',
        )}
      />
    </NodeViewWrapper>
  );
}
