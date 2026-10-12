import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught render crash:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('akinoya_public_unlocked');
        sessionStorage.removeItem('akinoya_public_unlocked');
        window.location.href = '/';
      }
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full bg-[#050505] text-white flex flex-col items-center justify-center p-6 selection:bg-cyan-500/30 selection:text-cyan-200">
          <div className="max-w-md w-full bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center mx-auto text-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.25)]">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-display font-bold tracking-wider text-white uppercase">
                ÄKINOYA PROTOCOL RECOVERED
              </h2>
              <p className="text-xs font-mono text-white/60 leading-relaxed">
                The application encountered an unexpected state and safely restored public guest mode.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-black font-mono font-bold text-xs tracking-wider transition-all cursor-pointer shadow-lg min-h-[44px]"
              >
                <Home className="w-3.5 h-3.5" />
                <span>RETURN TO HOMEPAGE</span>
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-mono text-xs tracking-wider transition-all cursor-pointer min-h-[44px]"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>RELOAD</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
