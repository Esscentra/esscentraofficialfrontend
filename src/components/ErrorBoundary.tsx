import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches a crash while rendering a page, so one bad record shows a message
 * with a way out instead of blanking the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app] page crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="glass-card mx-auto mt-10 max-w-md p-6 text-center">
        <h2 className="font-semibold text-white">This page could not be displayed</h2>
        <p className="mt-2 text-sm text-slate-400">
          Reloading usually fixes it. If it keeps happening, please let the team know.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-400"
        >
          Reload
        </button>
      </div>
    );
  }
}
