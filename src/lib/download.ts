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
