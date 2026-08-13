import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Color from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Palette,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import { PROSE_CLASSES } from '@/components/ui/Markdown';
import { useToast } from '@/components/ui/Toast';
import { cn, getErrorMessage } from '@/lib/utils';
import { ImageCropModal } from './ImageCropModal';
import { ResizableImage, type ImageAlign } from './ResizableImage';

/**
 * ============================================================================
 *  RICH TEXT EDITOR — the Word-like writing surface (TipTap)
 * ============================================================================
 *
 * Emits HTML. Everything is toolbar-driven: headings, marks, lists, quotes,
 * code, links, text alignment, and images that can be cropped on insert,
 * dragged anywhere in the document, resized by their corner handle, and
 * aligned left / center / right / full width with text wrapping around them.
 * ============================================================================
 */

function ToolButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      // Fire before the editor loses focus, so chains apply to the selection.
      onMouseDown={(event) => {
        event.preventDefault();
        if (!disabled) onClick();
      }}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-lg transition disabled:opacity-30',
        active
          ? 'bg-brand-500/20 text-brand-200 ring-1 ring-brand-400/40'
          : 'text-slate-400 hover:bg-white/[0.07] hover:text-white',
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-white/10" />;
}

/** Preset swatches; "custom" opens the native colour input for any shade. */
const TEXT_COLORS = [
  '#0b1220', // near-black
  '#64748b', // slate
  '#dc2626', // red
  '#ea580c', // orange
  '#ca8a04', // amber
  '#16a34a', // green
  '#0284c7', // sky
  '#105bfd', // brand blue
  '#7c3aed', // violet
  '#db2777', // pink
];

function ColorPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const current = (editor.getAttributes('textStyle').color as string) ?? '';

  const apply = (color: string) => {
    editor.chain().focus().setColor(color).run();
    setOpen(false);
  };

  return (
    <span className="relative">
      <button
        type="button"
        title="Text colour"
        aria-label="Text colour"
        onMouseDown={(event) => {
          event.preventDefault();
          setOpen((value) => !value);
        }}
        className={cn(
          'grid h-8 w-8 place-items-center rounded-lg transition',
          current || open
            ? 'bg-brand-500/20 text-brand-200 ring-1 ring-brand-400/40'
            : 'text-slate-400 hover:bg-white/[0.07] hover:text-white',
        )}
      >
        <span className="relative">
          <Palette className="h-4 w-4" />
          <span
            className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full"
            style={{ background: current || 'currentColor' }}
          />
        </span>
      </button>

      {open && (
        <>
          <span className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden />
          <span className="glass-card absolute left-0 top-9 z-30 block w-44 rounded-xl p-2.5">
            <span className="grid grid-cols-5 gap-1.5">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    apply(color);
                  }}
                  className={cn(
                    'h-6 w-6 rounded-md border border-white/20 transition hover:scale-110',
                    current.toLowerCase() === color && 'ring-2 ring-brand-400 ring-offset-1',
                  )}
                  style={{ background: color }}
                />
              ))}
            </span>
            <span className="mt-2 flex items-center gap-1.5">
              <label
                className="relative grid h-7 flex-1 cursor-pointer place-items-center overflow-hidden rounded-lg bg-white/[0.06] text-[11px] font-semibold text-slate-300 transition hover:bg-white/[0.12] hover:text-white"
                onMouseDown={(event) => event.stopPropagation()}
              >
                Custom…
                <input
                  type="color"
                  value={current || '#0b1220'}
                  onChange={(event) => apply(event.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  editor.chain().focus().unsetColor().run();
                  setOpen(false);
                }}
                className="h-7 rounded-lg px-2 text-[11px] font-semibold text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
              >
                Default
              </button>
            </span>
          </span>
        </>
      )}
    </span>
  );
}

function Toolbar({
  editor,
  onPickImage,
  uploading,
}: {
  editor: Editor;
  onPickImage: () => void;
  uploading: boolean;
}) {
  const imageSelected = editor.isActive('image');

  const setLink = () => {
    const existing = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL (leave empty to remove)', existing ?? 'https://');
    if (url === null) return;
    if (!url.trim() || url.trim() === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  /** Alignment applies to the selected image when one is selected, else text. */
  const align = (value: 'left' | 'center' | 'right' | 'justify') => {
    if (imageSelected && value !== 'justify') {
      editor.chain().focus().updateAttributes('image', { align: value as ImageAlign }).run();
      return;
    }
    editor.chain().focus().setTextAlign(value).run();
  };

  const alignActive = (value: 'left' | 'center' | 'right' | 'justify') =>
    imageSelected
      ? editor.getAttributes('image').align === value
      : editor.isActive({ textAlign: value });

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-white/10 px-2 py-1.5">
      <ToolButton title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <Undo2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <Redo2 className="h-4 w-4" />
      </ToolButton>

      <Divider />

      <ToolButton title="Paragraph" active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()}>
        <Pilcrow className="h-4 w-4" />
      </ToolButton>
      <ToolButton title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="h-4 w-4" />
      </ToolButton>

      <Divider />

      <ToolButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </ToolButton>
      <ToolButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </ToolButton>
      <ToolButton title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon className="h-4 w-4" />
      </ToolButton>
      <ToolButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="h-4 w-4" />
      </ToolButton>
      <ToolButton title="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code className="h-4 w-4" />
      </ToolButton>
      <ToolButton title="Link" active={editor.isActive('link')} onClick={setLink}>
        <Link2 className="h-4 w-4" />
      </ToolButton>
      <ColorPicker editor={editor} />

      <Divider />

      <ToolButton title={imageSelected ? 'Image left, text wraps' : 'Align left'} active={alignActive('left')} onClick={() => align('left')}>
        <AlignLeft className="h-4 w-4" />
      </ToolButton>
      <ToolButton title={imageSelected ? 'Center image' : 'Align center'} active={alignActive('center')} onClick={() => align('center')}>
        <AlignCenter className="h-4 w-4" />
      </ToolButton>
      <ToolButton title={imageSelected ? 'Image right, text wraps' : 'Align right'} active={alignActive('right')} onClick={() => align('right')}>
        <AlignRight className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        title={imageSelected ? 'Full width image' : 'Justify'}
        active={imageSelected ? editor.getAttributes('image').align === 'full' : editor.isActive({ textAlign: 'justify' })}
        onClick={() =>
          imageSelected
            ? editor.chain().focus().updateAttributes('image', { align: 'full', width: '100%' }).run()
            : editor.chain().focus().setTextAlign('justify').run()
        }
      >
        <AlignJustify className="h-4 w-4" />
      </ToolButton>

      <Divider />

      <ToolButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </ToolButton>
      <ToolButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </ToolButton>
      <ToolButton title="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </ToolButton>
      <ToolButton title="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <Code2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus className="h-4 w-4" />
      </ToolButton>

      <Divider />

      <ToolButton title={uploading ? 'Uploading…' : 'Insert image (crop, then drag/resize in place)'} disabled={uploading} onClick={onPickImage}>
        <ImagePlus className={cn('h-4 w-4', uploading && 'animate-pulse')} />
      </ToolButton>

      {imageSelected && (
        <span className="ml-auto hidden items-center gap-1 pr-1 sm:flex">
          {(['25%', '50%', '75%', '100%'] as const).map((width) => (
            <button
              key={width}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                editor.chain().focus().updateAttributes('image', { width }).run();
              }}
              className={cn(
                'rounded-md px-1.5 py-1 text-[11px] font-semibold transition',
                editor.getAttributes('image').width === width
                  ? 'bg-brand-500/20 text-brand-200'
                  : 'text-slate-500 hover:bg-white/[0.07] hover:text-white',
              )}
            >
              {width}
            </button>
          ))}
        </span>
      )}
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  onUploadImage,
  placeholder = 'Start writing…',
}: {
  /** Current HTML. The editor owns edits; this only seeds/replaces content. */
  value: string;
  onChange: (html: string) => void;
  /** Uploads a picked/cropped file and resolves to its permanent URL. */
  onUploadImage: (file: File) => Promise<string>;
  placeholder?: string;
}) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const lastEmitted = useRef<string>(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      Placeholder.configure({ placeholder }),
      ResizableImage,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          PROSE_CLASSES,
          'min-h-[28rem] px-5 py-4 outline-none',
          // Contain floated (left/right-aligned) images.
          'after:block after:clear-both after:content-[""]',
          '[&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-slate-600 [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]',
        ),
      },
    },
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  // Adopt external replacements (loading a post, markdown conversion) without
  // clobbering the caret during normal typing.
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(value, false);
  }, [editor, value]);

  const insertUploaded = async (file: File) => {
    setCropFile(null);
    setUploading(true);
    try {
      const url = await onUploadImage(file);
      editor
        ?.chain()
        .focus()
        .setImage({ src: url, alt: file.name.replace(/\.[^.]+$/, '') })
        .updateAttributes('image', { width: '100%', align: 'center' })
        .run();
    } catch (thrown) {
      toast.error('Image upload failed', getErrorMessage(thrown));
    } finally {
      setUploading(false);
    }
  };

  if (!editor) return null;

  return (
    <div>
      <Toolbar
        editor={editor}
        uploading={uploading}
        onPickImage={() => fileInput.current?.click()}
      />

      <EditorContent editor={editor} />

      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) setCropFile(file);
          event.target.value = '';
        }}
      />

      <ImageCropModal
        file={cropFile}
        onClose={() => setCropFile(null)}
        onDone={(file) => void insertUploaded(file)}
      />
    </div>
  );
}
