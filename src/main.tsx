import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { CrmProvider } from './context/CrmStore';
import { ThemeProvider } from './context/ThemeProvider';
import { ToastProvider } from './components/ui/Toast';
import './index.css';

/**
 * A deploy replaces the page chunks, so a tab left open on the old build fails
 * when it opens a page it has not loaded yet. Reloading picks up the new build.
 * The timestamp stops a chunk that is really missing from looping forever.
 */
const RELOADED_AT = 'esscentra.chunk-reload-at';
window.addEventListener('vite:preloadError', () => {
  const last = Number(sessionStorage.getItem(RELOADED_AT)) || 0;
  if (Date.now() - last < 60_000) return;
  sessionStorage.setItem(RELOADED_AT, String(Date.now()));
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <CrmProvider>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </CrmProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
