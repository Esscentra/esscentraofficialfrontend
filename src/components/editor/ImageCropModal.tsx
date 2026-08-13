import { useEffect, useMemo, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Check, ImageUp, RotateCw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

/**
 * ============================================================================
 *  IMAGE CROP — runs before every inline-image insert
 * ============================================================================
 *
 * Pick an aspect (or keep the original), drag to frame, pinch/slide to zoom,
 * rotate in 90° steps. The crop happens client-side on a canvas, so only the
 * final pixels are uploaded. "Use original" skips cropping entirely.
 * ============================================================================
 */

const ASPECTS = [
  { label: 'Original', value: 0 }, // resolved to the image's own ratio
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '1:1', value: 1 },
  { label: '3:4', value: 3 / 4 },
];

/** Draw the selected area (with rotation) onto a canvas and return a File. */
async function cropToFile(
  url: string,
  area: Area,
  rotation: number,
  name: string,
): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Could not read the image'));
    el.src = url;
  });

  // Paint the rotated image onto an intermediate canvas large enough to hold
  // any rotation, then cut the crop area out of it.
  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const bounds = {
    width: image.width * cos + image.height * sin,
    height: image.width * sin + image.height * cos,
  };

  const staging = document.createElement('canvas');
  staging.width = bounds.width;
  staging.height = bounds.height;
  const stagingCtx = staging.getContext('2d');
  if (!stagingCtx) throw new Error('Canvas unavailable');
  stagingCtx.translate(bounds.width / 2, bounds.height / 2);
  stagingCtx.rotate(radians);
  stagingCtx.drawImage(image, -image.width / 2, -image.height / 2);

  const output = document.createElement('canvas');
  output.width = Math.round(area.width);
  output.height = Math.round(area.height);
  const ctx = output.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(
    staging,
    Math.round(area.x),
    Math.round(area.y),
    Math.round(area.width),
    Math.round(area.height),
    0,
    0,
    Math.round(area.width),
    Math.round(area.height),
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    output.toBlob(resolve, 'image/jpeg', 0.92),
  );
  if (!blob) throw new Error('Could not export the cropped image');

  const base = name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${base}-crop.jpg`, { type: 'image/jpeg' });
}

export function ImageCropModal({
  file,
  onClose,
  onDone,
}: {
  /** The freshly picked file, or null when the modal is closed. */
  file: File | null;
  onClose: () => void;
  /** Receives the file to upload — cropped, or the untouched original. */
  onDone: (file: File) => void;
}) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState(0);
  const [naturalAspect, setNaturalAspect] = useState(16 / 9);
  const [area, setArea] = useState<Area | null>(null);
  const [working, setWorking] = useState(false);

  // Reset per file, release the object URL when done.
  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspect(0);
    setArea(null);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const confirm = async () => {
    if (!file) return;
    setWorking(true);
    try {
      onDone(area ? await cropToFile(url, area, rotation, file.name) : file);
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal open={!!file} onClose={onClose} title="Crop image">
      {file && (
        <div className="space-y-4">
          <div className="relative h-72 overflow-hidden rounded-xl bg-black/60">
            <Cropper
              image={url}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect || naturalAspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
              onMediaLoaded={(media) =>
                setNaturalAspect(media.naturalWidth / media.naturalHeight || 16 / 9)
              }
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {ASPECTS.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setAspect(option.value)}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition',
                  aspect === option.value
                    ? 'bg-brand-500/20 text-brand-200 ring-1 ring-brand-400/40'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-white',
                )}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              title="Rotate 90°"
              className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Zoom
            </span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full accent-brand-500"
            />
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={working}
              onClick={() => file && onDone(file)}
            >
              <ImageUp className="h-4 w-4" /> Use original
            </Button>
            <Button type="button" size="sm" loading={working} onClick={() => void confirm()}>
              {!working && <Check className="h-4 w-4" />} Insert cropped
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
