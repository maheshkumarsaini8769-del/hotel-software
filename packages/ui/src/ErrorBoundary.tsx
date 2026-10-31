import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Last-resort UI guard. Keeps an unexpected render error from turning the
 * whole staff/guest terminal into a blank white screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep the report local/observable without calling a non-existent endpoint.
    console.error('[ErrorBoundary]', error, info.componentStack);
    if (typeof window !== 'undefined' && (window as any).Sentry?.captureException) {
      (window as any).Sentry.captureException(error, {
        extra: { componentStack: info.componentStack },
      });
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') window.location.reload();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-screen w-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
          <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-slate-900 p-6 text-center shadow-sm dark:shadow-none">
            <div className="mb-3 text-4xl">⚠️</div>
            <h1 className="text-lg font-bold text-white">Something went wrong</h1>
            <p className="mt-2 break-words text-xs text-slate-400">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-red-500"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
