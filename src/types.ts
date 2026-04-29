export type UserRole = 'staff' | 'finance' | 'accountant' | 'management' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: any;
}

export type SubmissionType = 'uang_muka' | 'reimburse' | 'pembiayaan';

export const UM_STAGES = [
  "Penyerahan Dokumen Oleh PIC",
  "Verifikasi Dokumen Pengajuan",
  "Proses Tanda Tangan Oleh Manajemen",
  "Dalam Antrian Transfer",
  "Sudah di Transfer",
  "Pencatatan Transaksi dan Penomeran Dokumen",
  "Belum Laporan",
  "Berkas Laporan di Admin",
  "Berkas Laporan di Serahkan ke Keuangan",
  "Verifikasi Laporan",
  "Penyelesaian selisih",
  "Pencatatan Transaksi dan Penomeran Dokumen Laporan",
  "Digitalisasi Dokumen",
  "Verifikasi Dokumen Bulanan",
  "Penyusunan Settlement",
  "Finalisasi dan Penomeran Dokumen",
  "Pengesahan Dokumen",
  "Sudah di Laporkan ke BAZNAS"
] as const;

export const TRANSACTION_STAGES = [
  "Penyerahan Dokumen Oleh PIC",
  "Verifikasi Dokumen Pengajuan",
  "Proses Tanda Tangan Oleh Manajemen",
  "Dalam Antrian Transfer",
  "Sudah di Transfer",
  "Pencatatan Transaksi dan Penomeran Dokumen",
  "Proses Digitalisasi Dokumen",
  "Verifikasi Dokumen Bulanan",
  "Penyusunan Settlement",
  "Finalisasi dan Penomeran Dokumen",
  "Pengesahan Dokumen",
  "Sudah di Laporkan ke BAZNAS"
] as const;

export function getStagesByType(type: SubmissionType): readonly string[] {
  if (type === 'uang_muka') {
    return UM_STAGES;
  }
  return TRANSACTION_STAGES;
}

export interface HistoryEntry {
  stage: string;
  status: 'approved' | 'rejected' | 'pending' | 'submitted';
  actor: string;
  actorName: string;
  timestamp: any;
  comment?: string;
}

export interface BaznasBudget {
  id: string;
  month: string;
  year: string;
  program: number;
  operasional: number;
  makan: number;
  total: number;
  description: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  submittedBy: string;
  submittedByName: string;
  createdAt: any;
  updatedAt: any;
}

export interface Submission {
  id: string;
  type: SubmissionType;
  title: string;
  amount: number;
  description: string;
  status: string;
  currentStageIndex: number;
  submittedBy: string;
  submittedByName: string;
  submittedByEmail: string;
  picName?: string;
  createdAt: any;
  updatedAt: any;
  evidenceUrl?: string;
  lpjUrl?: string;
  history: HistoryEntry[];
}
