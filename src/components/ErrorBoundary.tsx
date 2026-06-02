import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };
  props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught runtime exception inside React tree:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 font-sans">
          <div className="w-full max-w-md rounded-2xl border border-rose-100 bg-white p-6 shadow-xl shadow-rose-100/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            
            <h2 className="text-lg font-bold text-slate-900 mb-2">Terjadi Hambatan Membuka Aplikasi</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Aplikasi mendeteksi adanya error runtime. Silakan coba muat ulang halaman atau hubungi pengembang jika masalah berlanjut.
            </p>

            <div className="rounded-lg bg-slate-50 p-3.5 mb-4 text-xs font-mono text-slate-600 max-h-40 overflow-auto border border-slate-100">
              <div className="font-semibold text-rose-600 mb-1">Error: {this.state.error?.message || "Render Error"}</div>
              <div className="opacity-70 whitespace-pre-wrap">{this.state.error?.stack}</div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-xl bg-slate-950 py-2.5 text-center text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
