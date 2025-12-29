'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log full error details for developers
    console.error('Global Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  handleRefresh = () => {
    // Reset error state and reload
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          <div className="w-full max-w-md bg-gradient-to-br from-red-500/10 via-red-500/5 to-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-3xl p-8 text-center shadow-2xl">
            {/* Error Icon */}
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg">
              <span className="text-3xl">⚠️</span>
            </div>
            
            {/* Error Message */}
            <h1 className="text-xl font-bold text-white mb-3">
              Something went wrong
            </h1>
            <p className="text-sm text-white/70 mb-8">
              Please refresh the app to continue.
            </p>
            
            {/* Action Button */}
            <button
              onClick={this.handleRefresh}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold transition-all duration-300 hover:scale-105 shadow-lg"
            >
              Refresh App
            </button>
            
            {/* Footer */}
            <p className="text-xs text-white/50 mt-6">
              If this keeps happening, try closing and reopening the app.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}