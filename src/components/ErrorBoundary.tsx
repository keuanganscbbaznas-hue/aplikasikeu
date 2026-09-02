import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FIRESTORE_UPGRADE_URL, FIRESTORE_PRICING_URL, isQuotaExceededError } from '../lib/firebaseUtils';

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
      const errorMsg = this.state.error?.message || "";
      const isQuota = isQuotaExceededError(this.state.error) || errorMsg.includes('Quota limit exceeded') || errorMsg.includes('resource-exhausted') || errorMsg.includes('Free daily read units');

      if (isQuota) {
        return (
          <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900/5 p-6 font-sans">
            <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-7 shadow-2xl shadow-amber-100">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-5 border border-amber-100">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                </svg>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold mb-3">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                Batas Kuota Firestore Harian Tercapai (Quota Exceeded)
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-2">Batas Kuota Harian Database Tercapai</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Penggunaan unit baca harian (<em>Free daily read units per project</em>) pada Firestore database (Spark Free Tier) telah mencapai batas harian. Kuota ini akan di-reset secara otomatis pada pergantian hari berikutnya.
              </p>

              <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-4 mb-5 text-xs text-amber-900 space-y-1.5">
                <p className="font-semibold">Solusi & Tindakan:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1">
                  <li><strong>Reset Otomatis:</strong> Kuota free tier di-reset setiap hari secara gratis.</li>
                  <li><strong>Upgrade Database:</strong> Anda dapat mengaktifkan billing / pay-as-you-go untuk kapasitas tanpa batas tanpa menunggu reset harian.</li>
                </ul>
              </div>

              <div className="space-y-2.5">
                <a
                  href={FIRESTORE_UPGRADE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-amber-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-amber-700 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  Buka Dialog Upgrade Database Firebase
                </a>

                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={FIRESTORE_PRICING_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                  >
                    Info Paket Spark / Quota
                  </a>
                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Muat Ulang Halaman
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }

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
              Aplikasi mendeteksi adanya kendala saat memuat data. Silakan coba muat ulang halaman atau periksa koneksi.
            </p>

            <div className="rounded-lg bg-slate-50 p-3.5 mb-4 text-xs font-mono text-slate-600 max-h-40 overflow-auto border border-slate-100">
              <div className="font-semibold text-rose-600 mb-1">Detail: {this.state.error?.message || "Render Error"}</div>
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

