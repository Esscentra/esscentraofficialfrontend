import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

/**
 * Base URL of the Esscentra REST API.
 * Configurable via `VITE_API_BASE_URL`; falls back to the local backend.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:4000/api/v1';

/**
 * Normalized error thrown for any non-2xx response (or network/timeout failure).
 * Carries the backend's `message` and HTTP `status` so the UI can show it directly.
 */
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 0, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  withCredentials: true, // send/receive httpOnly auth cookies
  timeout: 20_000,
});

/** Shape of the backend's error envelope (best-effort parsing). */
interface ErrorPayload {
  message?: string | string[];
  error?: string;
}

/** Convert an axios failure into a typed ApiError carrying the backend message. */
function toApiError(error: AxiosError<ErrorPayload>): ApiError {
  if (error.response) {
    const { status, data } = error.response;
    const raw = data?.message ?? data?.error;
    const message =
      (Array.isArray(raw) ? raw[0] : raw) ||
      (status >= 500
        ? 'Something went wrong on our end. Please try again.'
        : 'Request failed. Please try again.');
    return new ApiError(message, status, error.code);
  }
  if (error.code === 'ECONNABORTED') {
    return new ApiError('The request timed out. Please try again.', 0, error.code);
  }
  return new ApiError('Cannot reach the server. Check your connection and try again.', 0, error.code);
}

/** Endpoints that must never trigger a refresh-retry (avoids loops). */
function isAuthEndpoint(url = ''): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh-token') ||
    url.includes('/auth/logout')
  );
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Single-flight: many parallel 401s share one refresh call.
let refreshPromise: Promise<void> | null = null;

function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh-token')
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorPayload>) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // On a 401, try a one-time silent refresh, then replay the original request.
    if (status === 401 && original && !original._retry && !isAuthEndpoint(original.url)) {
      original._retry = true;
      try {
        await refreshSession();
        return api(original);
      } catch {
        // Refresh failed → fall through and surface the original 401.
      }
    }

    return Promise.reject(toApiError(error));
  },
);

export default api;
