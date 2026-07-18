import api from './api';

/**
 * Download a file from an authenticated API endpoint, saving it with a proper
 * filename (e.g. "yasowant.pdf") instead of the storage id.
 *
 * We fetch through the axios instance (so auth cookies + token refresh work),
 * receive the bytes as a Blob, then trigger a browser download via a temporary
 * object URL. The `download` attribute controls the saved filename.
 */
export async function downloadFromApi(path: string, fallbackName = 'download'): Promise<void> {
  const res = await api.get(path, { responseType: 'blob' });

  // Prefer the server's Content-Disposition filename when exposed, else fallback.
  let filename = fallbackName;
  const cd = (res.headers?.['content-disposition'] ?? '') as string;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  if (match?.[1]) {
    try {
      filename = decodeURIComponent(match[1]);
    } catch {
      filename = match[1];
    }
  }

  const blob = res.data as Blob;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke a moment later so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Fetch a public (e.g. Cloudinary) file directly and return an object URL whose
 * MIME type is forced — Cloudinary `raw` uploads are served as
 * `application/octet-stream`, so a browser won't preview them. Re-wrapping the
 * bytes as `application/pdf` makes the file previewable in an <iframe>.
 * Caller must URL.revokeObjectURL() the result when done.
 */
export async function fetchAsObjectUrl(url: string, mime = 'application/pdf'): Promise<string> {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  return URL.createObjectURL(new Blob([buf], { type: mime }));
}

/**
 * Download a public file URL as a properly-typed, properly-named file. Fetches
 * the bytes, coerces the MIME type, and saves with `filename`. Falls back to
 * opening the URL in a new tab if the fetch is blocked (e.g. CORS).
 */
export async function downloadUrlAsFile(
  url: string,
  filename: string,
  mime = 'application/pdf',
): Promise<void> {
  try {
    const objectUrl = await fetchAsObjectUrl(url, mime);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}
