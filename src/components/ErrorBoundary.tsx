'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-orange-50 border-2 border-orange-200 rounded-2xl p-8 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-6 text-orange-600">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-serif text-slate-900 mb-3">Something went wrong</h2>
            <p className="text-slate-600 mb-8 font-sans">
              The meal planner encountered an unexpected error. Don't worry, your data is safe.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
            >
              <RefreshCw size={18} />
              Reload Dashboard
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-8 text-left bg-slate-900 text-slate-300 p-4 rounded-lg overflow-auto max-h-40 text-xs font-mono">
                {this.state.error.toString()}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
