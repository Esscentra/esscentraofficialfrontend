import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

/**
 * Webcam capture modal. Works on laptops/desktops (and phones) via getUserMedia,
 * which the HTML `capture` attribute does NOT do on desktop.
 *
 * Opens the camera, lets the user take a still, then returns it as a File
 * through onCapture so it slots into the same flow as an uploaded image.
 *
 * Requires a secure context (HTTPS or localhost) — browsers block camera
 * access on plain http://.
 */
export function CameraCapture({
  open,
  onClose,
  onCapture,
  facingMode = 'user',
  fileName = 'selfie.jpg',
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  /** "user" = front camera (selfie), "environment" = rear camera. */
  facingMode?: 'user' | 'environment';
  fileName?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not supported in this browser. Please upload an image instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
    } catch (e) {
      const name = (e as DOMException)?.name;
      setError(
        name === 'NotAllowedError'
          ? 'Camera access was blocked. Allow camera permission, then try again.'
          : name === 'NotFoundError'
            ? 'No camera was found on this device. Please upload an image instead.'
            : 'Could not start the camera. Please upload an image instead.',
      );
    }
  }, [facingMode]);

  // Start the camera when the modal opens; stop it whenever it closes/unmounts.
  useEffect(() => {
    if (open) start();
    return stop;
  }, [open, start, stop]);

  const snap = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], fileName, { type: 'image/jpeg' }));
        onClose();
      },
      'image/jpeg',
      0.92,
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Take a photo">
      <div className="space-y-4">
        {error ? (
          <div className="space-y-4">
            <p className="flex items-start gap-2 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
              <X className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button type="button" onClick={start}>
                <RefreshCw className="h-4 w-4" /> Retry
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-xl bg-black/40 ring-1 ring-white/10">
              <video
                ref={videoRef}
                playsInline
                muted
                className="aspect-[4/3] w-full object-cover [transform:scaleX(-1)]"
              />
              {!ready && (
                <div className="absolute inset-0 grid place-items-center text-sm text-slate-400">
                  Starting camera…
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" onClick={snap} disabled={!ready}>
                <Camera className="h-4 w-4" /> Capture
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
