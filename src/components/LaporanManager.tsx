import React, { useState, useRef, useEffect, useMemo } from 'react';
import { collection, addDoc, query, onSnapshot, orderBy, serverTimestamp, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { FileText, Plus, Search, ExternalLink, Download, Upload, Trash2, Edit2, FileDown, Calendar, Printer, RefreshCw, BarChart2, Settings, Calculator, ClipboardCheck, CheckCircle2, Coins, Layers, BarChart3, Clock, FileCheck } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { DEFAULT_BAZNAS_RINCIAN_SMP_JAN_2026, DEFAULT_BAZNAS_RINCIAN_SMA_JAN_2026, DEFAULT_BAZNAS_SETTLEMENT_SMA_JUNI_2026, BaznasRincianItem, RincianDetailItem } from './baznasDefaultRincian';
import { UM_STAGES, TRANSACTION_STAGES, getDisplayAmount } from '../types';

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export const normalizeBudgetCode = (code: string): string => {
  if (!code) return '';
  const trimmed = code.trim();
  if (/^0(?=[0-9]|\.|$)/i.test(trimmed)) {
    return 'O' + trimmed.slice(1);
  }
  return trimmed;
};

interface Report {
  id: string;
  month: string;
  year: string;
  amount: number;
  date: string;
  bastLink: string;
  linkRincian?: string;
  keterangan: string;
}

interface BudgetTemplateItem {
  code: string;
  name: string;
  budget: number;
  realDefault: number;
  isHeader?: boolean;
  level: number; // 0, 1, 2, 3
}

const BAZNAS_SMP_BUDGET_TEMPLATES: BudgetTemplateItem[] = [
  // A. KEASRAMAAN
  { code: 'A', name: 'KEASRAMAAN', budget: 6500000, realDefault: 0, isHeader: true, level: 0 },
  { code: 'A1', name: 'Kegiatan Keasramaan', budget: 6500000, realDefault: 0, isHeader: true, level: 1 },
  { code: 'A1.1', name: 'Pembentukan Karakter', budget: 1500000, realDefault: 0, isHeader: true, level: 2 },
  { code: 'A1.1.8', name: 'GMM', budget: 1500000, realDefault: 0, level: 3 },
  { code: 'A1.3', name: 'Peringatan Hari Besar Islam', budget: 4500000, realDefault: 0, isHeader: true, level: 2 },
  { code: 'A1.3.4', name: 'Isra\' mi\'roj', budget: 4500000, realDefault: 0, level: 3 },
  { code: 'A1.4', name: 'Akomodasi dan Kebutuhan Harian Santri', budget: 500000, realDefault: 0, isHeader: true, level: 2 },
  { code: 'A1.4.7', name: 'Biaya Kesehatan Siswa', budget: 500000, realDefault: 0, level: 3 },

  // K. KURIKULUM
  { code: 'K', name: 'KURIKULUM', budget: 9050000, realDefault: 2255000, isHeader: true, level: 0 },
  { code: 'K1', name: 'Kegiatan Kurikulum', budget: 9050000, realDefault: 2255000, isHeader: true, level: 1 },
  { code: 'K1.1', name: 'SDM Program', budget: 4300000, realDefault: 2255000, isHeader: true, level: 2 },
  { code: 'K1.1.7', name: 'Dana Kesehatan Amil Tetap (Guru)', budget: 2500000, realDefault: 355000, level: 3 },
  { code: 'K1.1.9', name: 'Tunjangan Fungsional', budget: 1800000, realDefault: 1900000, level: 3 },
  { code: 'K1.2', name: 'Bahan Penunjang KBM', budget: 500000, realDefault: 0, isHeader: true, level: 2 },
  { code: 'K1.2.13', name: 'Pengadaan Perangkat KBM', budget: 500000, realDefault: 0, level: 3 },
  { code: 'K1.4', name: 'Program KBM', budget: 3250000, realDefault: 0, isHeader: true, level: 2 },
  { code: 'K1.4.5', name: 'Klub Bidang Studi', budget: 250000, realDefault: 0, level: 3 },
  { code: 'K1.4.6', name: 'Pengembangan Kompetensi guru', budget: 2500000, realDefault: 0, level: 3 },
  { code: 'K1.4.7', name: 'Olimpiade Matematika', budget: 500000, realDefault: 0, level: 3 },
  { code: 'K1.6', name: 'Pendidikan Lingkungan Hidup', budget: 1000000, realDefault: 0, isHeader: true, level: 2 },
  { code: 'K1.6.2', name: 'Berkebun', budget: 500000, realDefault: 0, level: 3 },
  { code: 'K1.6.3', name: 'Perikanan', budget: 500000, realDefault: 0, level: 3 },

  // O. OPERASIONAL
  { code: 'O', name: 'OPERASIONAL', budget: 91210000, realDefault: 65040530, isHeader: true, level: 0 },
  { code: 'O1', name: 'SDM', budget: 34000000, realDefault: 30355931, isHeader: true, level: 1 },
  { code: 'O1.1', name: 'Biaya SDM', budget: 32500000, realDefault: 30255931, isHeader: true, level: 2 },
  { code: 'O1.1.2', name: 'Tunjangan BPJS Kesehatan', budget: 15500000, realDefault: 14537116, level: 3 },
  { code: 'O1.1.3', name: 'Tunjangan BPJS Tenaga Kerja', budget: 12000000, realDefault: 11864742, level: 3 },
  { code: 'O1.1.4', name: 'Tunjangan Menikah', budget: 500000, realDefault: 0, level: 3 },
  { code: 'O1.1.5', name: 'Tunjangan Melahirkan', budget: 500000, realDefault: 0, level: 3 },
  { code: 'O1.1.6', name: 'Tunjangan Lembur', budget: 1000000, realDefault: 1570000, level: 3 },
  { code: 'O1.1.7', name: 'Santunan Kematian/Musibah', budget: 500000, realDefault: 0, level: 3 },
  { code: 'O1.1.11', name: 'Dana Kesehatan Amil Tetap (Pelaksana)', budget: 2500000, realDefault: 2184073, level: 3 },
  { code: 'O1.3', name: 'Biaya Perjalanan Dinas', budget: 1500000, realDefault: 100000, isHeader: true, level: 2 },
  { code: 'O1.3.1', name: 'Biaya Perjalanan Dinas Luar Kota', budget: 1500000, realDefault: 100000, level: 3 },

  { code: 'O2', name: 'URT', budget: 42710000, realDefault: 24388489, isHeader: true, level: 1 },
  { code: 'O2.1', name: 'Biaya Umum dan Rumah Tangga', budget: 42710000, realDefault: 24388489, isHeader: true, level: 2 },
  { code: 'O2.1.1', name: 'Biaya Pengadaan Peralatan Kantor', budget: 1000000, realDefault: 0, level: 3 },
  { code: 'O2.1.4', name: 'Biaya Sewa Infrastruktur IT', budget: 6660000, realDefault: 6660000, level: 3 },
  { code: 'O2.1.5', name: 'Biaya Transportasi', budget: 10000000, realDefault: 7896000, level: 3 },
  { code: 'O2.1.6', name: 'Biaya Makan dan Minum Rapat', budget: 2000000, realDefault: 1054500, level: 3 },
  { code: 'O2.1.7', name: 'Biaya Komunikasi/Kehumasan', budget: 500000, realDefault: 0, level: 3 },
  { code: 'O2.1.9', name: 'Biaya Alat Tulis Kantor', budget: 1000000, realDefault: 1498500, level: 3 },
  { code: 'O2.1.10', name: 'Biaya Cetak dan Fotocopy', budget: 500000, realDefault: 460000, level: 3 },
  { code: 'O2.1.11', name: 'Biaya Listrik', budget: 6000000, realDefault: 4715989, level: 3 },
  { code: 'O2.1.12', name: 'Biaya Telepon', budget: 200000, realDefault: 0, level: 3 },
  { code: 'O2.1.13', name: 'Biaya PDAM', budget: 300000, realDefault: 0, level: 3 },
  { code: 'O2.1.14', name: 'Biaya Internet', budget: 5000000, realDefault: 6382500, level: 3 },
  { code: 'O2.1.15', name: 'Biaya Kebutuhan Rumah Tangga', budget: 3500000, realDefault: 2281000, level: 3 },
  { code: 'O2.1.17', name: 'Biaya Iuran Lingkungan', budget: 1500000, realDefault: 0, level: 3 },
  { code: 'O2.1.21', name: 'Biaya WTP Chemical', budget: 4500000, realDefault: 0, level: 3 },
  { code: 'O2.1.22', name: 'Biaya Administrasi Bank', budget: 50000, realDefault: 0, level: 3 },

  { code: 'O3', name: 'Pemeliharaan', budget: 10000000, realDefault: 1707000, isHeader: true, level: 1 },
  { code: 'O3.1', name: 'Biaya Pemeliharaan Gedung', budget: 5000000, realDefault: 1707000, isHeader: true, level: 2 },
  { code: 'O3.1.2', name: 'Biaya Perbaikan pintu dan jendela', budget: 1000000, realDefault: 0, level: 3 },
  { code: 'O3.1.3', name: 'Biaya Perbaikan Pipa Air dan Kran', budget: 1000000, realDefault: 1547000, level: 3 },
  { code: 'O3.1.4', name: 'Biaya Renovasi Bangunan', budget: 2000000, realDefault: 0, level: 3 },
  { code: 'O3.1.6', name: 'Biaya Pemeliharaan Taman', budget: 1000000, realDefault: 160000, level: 3 },
  { code: 'O3.2', name: 'Biaya Pemeliharaan Inventaris Kantor', budget: 5000000, realDefault: 0, isHeader: true, level: 2 },
  { code: 'O3.2.1', name: 'Biaya Perbaikan Komputer dan Printer', budget: 1000000, realDefault: 0, level: 3 },
  { code: 'O3.2.2', name: 'Biaya Perbaikan Water Treatment Plant', budget: 1000000, realDefault: 0, level: 3 },
  { code: 'O3.2.3', name: 'Biaya Perbaikan Furnitur', budget: 1000000, realDefault: 0, level: 3 },
  { code: 'O3.2.4', name: 'Biaya Pemeliharaan Kendaraan', budget: 2000000, realDefault: 0, level: 3 },

  { code: 'O4', name: 'Operasional UKS', budget: 2500000, realDefault: 1926610, isHeader: true, level: 1 },
  { code: 'O4.1', name: 'UKS Plus', budget: 2500000, realDefault: 1926610, level: 3 },

  { code: 'O5', name: 'Operasional Perpustakaan', budget: 2000000, realDefault: 202500, isHeader: true, level: 1 },
  { code: 'O5.1', name: 'Perpustakaan', budget: 2000000, realDefault: 202500, level: 3 },

  // S. KESISWAAN
  { code: 'S', name: 'KESISWAAN', budget: 3500000, realDefault: 1080000, isHeader: true, level: 0 },
  { code: 'S3', name: 'Pengembangan Bakat dan Minat', budget: 3500000, realDefault: 1080000, isHeader: true, level: 1 },
  { code: 'S3.1', name: 'Kegiatan Ekstrakurikuler', budget: 3500000, realDefault: 1080000, level: 3 }
];

const BAZNAS_SMA_BUDGET_TEMPLATES: BudgetTemplateItem[] = [
  // A. KEASRAMAAN
  { code: 'A', name: 'KEASRAMAAN', budget: 3000000, realDefault: 0, isHeader: true, level: 0 },
  { code: 'A1', name: 'Kegiatan Keasramaan', budget: 3000000, realDefault: 0, isHeader: true, level: 1 },
  { code: 'A1.2', name: 'Home Making Class', budget: 1000000, realDefault: 0, isHeader: true, level: 2 },
  { code: 'A1.2.2', name: 'Tata Busana', budget: 500000, realDefault: 0, level: 3 },
  { code: 'A1.2.3', name: 'Barber Shop Literasi', budget: 500000, realDefault: 0, level: 3 },
  { code: 'A1.4', name: 'Akomodasi dan Kebutuhan Harian Santri', budget: 2000000, realDefault: 0, isHeader: true, level: 2 },
  { code: 'A1.4.7', name: 'Biaya Kesehatan Siswa', budget: 2000000, realDefault: 0, level: 3 },

  // K. KURIKULUM
  { code: 'K', name: 'KURIKULUM', budget: 23425000, realDefault: 1316460, isHeader: true, level: 0 },
  { code: 'K1', name: 'Kegiatan Kurikulum', budget: 23425000, realDefault: 1316460, isHeader: true, level: 1 },
  { code: 'K1.1', name: 'SDM Program', budget: 4000000, realDefault: 1316460, isHeader: true, level: 2 },
  { code: 'K1.1.7', name: 'Dana Kesehatan Amil Tetap (Guru)', budget: 2500000, realDefault: 1316460, level: 3 },
  { code: 'K1.1.8', name: 'Pengembangan Tendik', budget: 1500000, realDefault: 0, level: 3 },
  { code: 'K1.2', name: 'Bahan Penunjang KBM', budget: 1500000, realDefault: 0, isHeader: true, level: 2 },
  { code: 'K1.2.13', name: 'Pengadaan Perangkat KBM', budget: 1500000, realDefault: 0, level: 3 },
  { code: 'K1.4', name: 'Program KBM', budget: 8300000, realDefault: 0, isHeader: true, level: 2 },
  { code: 'K1.4.3', name: 'Cendekia Enterpreneur Class', budget: 300000, realDefault: 0, level: 3 },
  { code: 'K1.4.5', name: 'Klub Bidang Studi', budget: 500000, realDefault: 0, level: 3 },
  { code: 'K1.4.6', name: 'Pengembangan Kompetensi guru', budget: 2500000, realDefault: 0, level: 3 },
  { code: 'K1.4.7', name: 'Olimpiade Matematika', budget: 5000000, realDefault: 0, level: 3 },
  { code: 'K1.8', name: 'Sukses PTN (Diagnostic Test dan Pembahasan)', budget: 9625000, realDefault: 0, level: 3 },

  // O. OPERASIONAL
  { code: 'O', name: 'OPERASIONAL', budget: 42800000, realDefault: 14175888, isHeader: true, level: 0 },
  { code: 'O1', name: 'SDM', budget: 4750000, realDefault: 4387498, isHeader: true, level: 1 },
  { code: 'O1.1', name: 'Biaya SDM', budget: 3750000, realDefault: 4387498, isHeader: true, level: 2 },
  { code: 'O1.1.4', name: 'Tunjangan Menikah', budget: 250000, realDefault: 0, level: 3 },
  { code: 'O1.1.5', name: 'Tunjangan Melahirkan', budget: 250000, realDefault: 0, level: 3 },
  { code: 'O1.1.6', name: 'Tunjangan Lembur', budget: 500000, realDefault: 0, level: 3 },
  { code: 'O1.1.7', name: 'Santunan Kematian/Musibah', budget: 250000, realDefault: 0, level: 3 },
  { code: 'O1.1.11', name: 'Dana Kesehatan Amil Tetap (Pelaksana)', budget: 2500000, realDefault: 4387498, level: 3 },
  { code: 'O1.3', name: 'Biaya Perjalanan Dinas', budget: 1000000, realDefault: 0, isHeader: true, level: 2 },
  { code: 'O1.3.1', name: 'Biaya Perjalanan Dinas Luar Kota', budget: 1000000, realDefault: 0, level: 3 },

  { code: 'O2', name: 'URT', budget: 24550000, realDefault: 9305530, isHeader: true, level: 1 },
  { code: 'O2.1', name: 'Biaya Umum dan Rumah Tangga', budget: 24550000, realDefault: 9305530, isHeader: true, level: 2 },
  { code: 'O2.1.5', name: 'Biaya Transportasi', budget: 5000000, realDefault: 3907000, level: 3 },
  { code: 'O2.1.6', name: 'Biaya Makan dan Minum Rapat', budget: 2000000, realDefault: 0, level: 3 },
  { code: 'O2.1.7', name: 'Biaya Komunikasi/Kehumasan', budget: 500000, realDefault: 995000, level: 3 },
  { code: 'O2.1.9', name: 'Biaya Alat Tulis Kantor', budget: 500000, realDefault: 0, level: 3 },
  { code: 'O2.1.10', name: 'Biaya Cetak dan Fotocopy', budget: 500000, realDefault: 0, level: 3 },
  { code: 'O2.1.11', name: 'Biaya Listrik', budget: 3000000, realDefault: 0, level: 3 },
  { code: 'O2.1.12', name: 'Biaya Telepon', budget: 500000, realDefault: 202300, level: 3 },
  { code: 'O2.1.13', name: 'Biaya PDAM', budget: 1000000, realDefault: 356950, level: 3 },
  { code: 'O2.1.14', name: 'Biaya Internet', budget: 2500000, realDefault: 2698140, level: 3 },
  { code: 'O2.1.15', name: 'Biaya Kebutuhan Rumah Tangga', budget: 3000000, realDefault: 896000, level: 3 },
  { code: 'O2.1.17', name: 'Biaya Iuran Lingkungan', budget: 1000000, realDefault: 250000, level: 3 },
  { code: 'O2.1.21', name: 'Biaya WTP Chemical', budget: 500000, realDefault: 0, level: 3 },
  { code: 'O2.1.22', name: 'Biaya Administrasi Bank', budget: 50000, realDefault: 0, level: 3 },

  { code: 'O3', name: 'Pemeliharaan', budget: 10500000, realDefault: 483000, isHeader: true, level: 1 },
  { code: 'O3.1', name: 'Biaya Pemeliharaan Gedung', budget: 5500000, realDefault: 483000, isHeader: true, level: 2 },
  { code: 'O3.1.2', name: 'Biaya Perbaikan pintu dan jendela', budget: 1000000, realDefault: 0, level: 3 },
  { code: 'O3.1.3', name: 'Biaya Perbaikan Pipa Air dan Kran', budget: 2000000, realDefault: 483000, level: 3 },
  { code: 'O3.1.4', name: 'Biaya Renovasi Bangunan', budget: 2000000, realDefault: 0, level: 3 },
  { code: 'O3.1.6', name: 'Biaya Pemeliharaan Taman', budget: 500000, realDefault: 0, level: 3 },
  { code: 'O3.2', name: 'Biaya Pemeliharaan Inventaris Kantor', budget: 5000000, realDefault: 0, isHeader: true, level: 2 },
  { code: 'O3.2.1', name: 'Biaya Perbaikan Komputer dan Printer', budget: 1000000, realDefault: 0, level: 3 },
  { code: 'O3.2.2', name: 'Biaya Perbaikan Water Treatment Plant', budget: 1000000, realDefault: 0, level: 3 },
  { code: 'O3.2.3', name: 'Biaya Perbaikan Furnitur', budget: 1000000, realDefault: 0, level: 3 },
  { code: 'O3.2.4', name: 'Biaya Pemeliharaan Kendaraan', budget: 2000000, realDefault: 0, level: 3 },

  { code: 'O4', name: 'Operasional UKS', budget: 2000000, realDefault: 0, isHeader: true, level: 1 },
  { code: 'O4.1', name: 'UKS Plus', budget: 2000000, realDefault: 0, level: 3 },

  { code: 'O5', name: 'Operasional Perpustakaan', budget: 1000000, realDefault: 0, isHeader: true, level: 1 },
  { code: 'O5.1', name: 'Perpustakaan', budget: 1000000, realDefault: 0, level: 3 },

  // S. KESISWAAN
  { code: 'S', name: 'KESISWAAN', budget: 6750000, realDefault: 0, isHeader: true, level: 0 },
  { code: 'S2', name: 'Pelatihan Siswa', budget: 1000000, realDefault: 0, isHeader: true, level: 1 },
  { code: 'S2.3', name: 'SSR', budget: 1000000, realDefault: 0, isHeader: true, level: 2 },
  { code: 'S2.3.2', name: 'SCB Mengajar', budget: 500000, realDefault: 0, level: 3 },
  { code: 'S2.3.3', name: 'Agroeduwisata', budget: 500000, realDefault: 0, level: 3 },
  { code: 'S3', name: 'Pengembangan Bakat dan Minat', budget: 5750000, realDefault: 0, isHeader: true, level: 1 },
  { code: 'S3.1', name: 'Kegiatan Ekstrakurikuler', budget: 4750000, realDefault: 0, level: 3 },
  { code: 'S3.2', name: 'Organisasi & Kepemimpinan Siswa', budget: 1000000, realDefault: 0, isHeader: true, level: 2 },
  { code: 'S3.2.6', name: 'Forum OSIS', budget: 1000000, realDefault: 0, level: 3 }
];

const initialData: Report[] = [];

interface TrackingCategoryData {
  key: string;
  name: string;
  badgeLabel: string;
  description: string;
  statuses: string[];
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  barColor: string;
  count: number;
  totalAmount: number;
  items: any[];
}

export function SettlementTrackingSummarySection({ submissions }: { submissions: any[] }) {
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<'amount' | 'count'>('amount');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [filterMonth, setFilterMonth] = useState<string>('ALL');
  const [filterYear, setFilterYear] = useState<string>('ALL');

  // Global Date Filter State for Chart, Aggregation Table & Summary Cards
  const [globalStartDate, setGlobalStartDate] = useState<string>('');
  const [globalEndDate, setGlobalEndDate] = useState<string>('');
  const [globalMonth, setGlobalMonth] = useState<string>('ALL');
  const [globalYear, setGlobalYear] = useState<string>('ALL');

  // Detail Dialog State for inspecting complete report info
  const [selectedDetailItem, setSelectedDetailItem] = useState<any | null>(null);

  const getItemTime = (item: any): number => {
    if (!item) return 0;
    if (item.createdAt?.seconds) {
      return item.createdAt.seconds * 1000;
    }
    if (item.createdAt) {
      const d = new Date(item.createdAt);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    if (item.tanggalBudget) {
      const d = new Date(item.tanggalBudget);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    if (item.updatedAt?.seconds) {
      return item.updatedAt.seconds * 1000;
    }
    return 0;
  };

  const getItemReportDate = (item: any): Date | null => {
    if (!item) return null;
    if (item.tanggalLaporan) {
      const d = new Date(item.tanggalLaporan);
      if (!isNaN(d.getTime())) return d;
    }
    if (item.tanggalLPJ) {
      const d = new Date(item.tanggalLPJ);
      if (!isNaN(d.getTime())) return d;
    }
    const t = getItemTime(item);
    if (t > 0) return new Date(t);
    return null;
  };

  const getItemMonthYear = (item: any): { monthIndex: number; monthName: string; year: number } | null => {
    const time = getItemTime(item);
    if (!time) return null;
    const d = new Date(time);
    const monthIndex = d.getMonth();
    const monthName = MONTHS[monthIndex] || '';
    const year = d.getFullYear();
    return { monthIndex, monthName, year };
  };

  const formatItemDate = (item: any): string => {
    const time = getItemTime(item);
    if (!time) return '-';
    const d = new Date(time);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Filter submissions by Global Date Filter (Start Date, End Date, Month, Year)
  const dateFilteredSubmissions = useMemo(() => {
    if (!submissions) return [];

    return submissions.filter(sub => {
      const rDate = getItemReportDate(sub);
      if (!rDate) return true;

      const time = rDate.getTime();

      if (globalStartDate) {
        const start = new Date(globalStartDate + 'T00:00:00').getTime();
        if (time < start) return false;
      }

      if (globalEndDate) {
        const end = new Date(globalEndDate + 'T23:59:59').getTime();
        if (time > end) return false;
      }

      if (globalMonth !== 'ALL') {
        const mName = MONTHS[rDate.getMonth()];
        if (mName !== globalMonth) return false;
      }

      if (globalYear !== 'ALL') {
        if (rDate.getFullYear().toString() !== globalYear) return false;
      }

      return true;
    });
  }, [submissions, globalStartDate, globalEndDate, globalMonth, globalYear]);

  const cat1Statuses = ["Belum Laporan (Masih di PIC)", "Belum Laporan"];
  
  const cat2Statuses = [
    "Berkas Laporan di Admin (#09)",
    "Berkas Laporan di Serahkan ke Keuangan (#10)",
    "Verifikasi Laporan (#11)",
    "Penyelesaian selisih (#12)",
    "Pencatatan Transaksi dan Penomeran Dokumen Laporan (#13)"
  ];

  const cat3Statuses = [
    "Proses Digitalisasi Dokumen (#14)",
    "Verifikasi Dokumen Bulanan (#15)",
    "Penyusunan Settlement (#16)",
    "Finalisasi dan Penomeran Dokumen (#17)",
    "Pengesahan Dokumen (#18)"
  ];

  const matchCategory = (sub: any) => {
    if (sub.status === 'REJECTED' || sub.status === 'rejected') return null;

    const type = sub.type || 'uang_muka';
    const stages = type === 'uang_muka' ? UM_STAGES : TRANSACTION_STAGES;
    const stageName = (stages[sub.currentStageIndex] || sub.status || '').toString().trim();
    const lowerCurrent = stageName.toLowerCase();

    // Kategori 1: Belum Laporan (Masih di PIC)
    if (
      lowerCurrent.includes("belum laporan") ||
      (type === 'uang_muka' && sub.currentStageIndex === 6)
    ) {
      return 'cat1';
    }

    // Kategori 2: Laporan Sedang Diverifikasi
    if (
      lowerCurrent.includes("berkas laporan di admin") ||
      lowerCurrent.includes("berkas laporan di serahkan ke keuangan") ||
      lowerCurrent.includes("berkas laporan diserahkan ke keuangan") ||
      lowerCurrent.includes("verifikasi laporan") ||
      lowerCurrent.includes("penyelesaian selisih") ||
      lowerCurrent.includes("pencatatan transaksi dan penomeran dokumen laporan") ||
      (type === 'uang_muka' && sub.currentStageIndex >= 7 && sub.currentStageIndex <= 11)
    ) {
      return 'cat2';
    }

    // Kategori 3: Laporan Sedang Disusun
    if (
      lowerCurrent.includes("proses digitalisasi dokumen") ||
      lowerCurrent.includes("verifikasi dokumen bulanan") ||
      lowerCurrent.includes("penyusunan settlement") ||
      lowerCurrent.includes("finalisasi dan penomeran dokumen") ||
      lowerCurrent.includes("pengesahan dokumen") ||
      (type === 'uang_muka' && sub.currentStageIndex >= 12 && sub.currentStageIndex <= 16)
    ) {
      return 'cat3';
    }

    return null;
  };

  const cat1Items: any[] = [];
  const cat2Items: any[] = [];
  const cat3Items: any[] = [];

  (dateFilteredSubmissions || []).forEach(sub => {
    const cat = matchCategory(sub);
    if (cat === 'cat1') cat1Items.push(sub);
    else if (cat === 'cat2') cat2Items.push(sub);
    else if (cat === 'cat3') cat3Items.push(sub);
  });

  const getSubAmt = (sub: any) => {
    try {
      if (typeof getDisplayAmount === 'function') {
        return getDisplayAmount(sub);
      }
    } catch (e) {}
    return Number(sub?.amount) || 0;
  };

  const cat1Amount = cat1Items.reduce((acc, sub) => acc + getSubAmt(sub), 0);
  const cat2Amount = cat2Items.reduce((acc, sub) => acc + getSubAmt(sub), 0);
  const cat3Amount = cat3Items.reduce((acc, sub) => acc + getSubAmt(sub), 0);

  const grandTotalAmount = cat1Amount + cat2Amount + cat3Amount;
  const grandTotalCount = cat1Items.length + cat2Items.length + cat3Items.length;

  const categories: TrackingCategoryData[] = [
    {
      key: 'cat1',
      name: 'Belum Laporan (Masih di PIC)',
      badgeLabel: 'Kategori I',
      description: 'Pengajuan yang dana permohonannya telah ditransfer namun berkas laporan pertanggungjawaban (LPJ) masih berada di tangan PIC.',
      statuses: cat1Statuses,
      color: 'amber',
      bgColor: 'bg-amber-50/70',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800',
      barColor: '#f59e0b',
      count: cat1Items.length,
      totalAmount: cat1Amount,
      items: cat1Items
    },
    {
      key: 'cat2',
      name: 'Laporan Sedang Diverifikasi',
      badgeLabel: 'Kategori II',
      description: 'Pengajuan LPJ yang sedang diperiksa oleh Admin/Keuangan, proses verifikasi, penyelesaian selisih, atau penomeran dokumen laporan.',
      statuses: cat2Statuses,
      color: 'blue',
      bgColor: 'bg-blue-50/70',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      barColor: '#2563eb',
      count: cat2Items.length,
      totalAmount: cat2Amount,
      items: cat2Items
    },
    {
      key: 'cat3',
      name: 'Laporan Sedang Disusun',
      badgeLabel: 'Kategori III',
      description: 'Pengajuan LPJ yang memasuki digitalisasi dokumen, verifikasi bulanan, penyusunan settlement BAZNAS, finalisasi & pengesahan akhir.',
      statuses: cat3Statuses,
      color: 'emerald',
      bgColor: 'bg-emerald-50/70',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-800',
      barColor: '#059669',
      count: cat3Items.length,
      totalAmount: cat3Amount,
      items: cat3Items
    }
  ];

  const chartData = categories.map(cat => ({
    name: cat.name.length > 25 ? cat.name.substring(0, 22) + '...' : cat.name,
    fullName: cat.name,
    nominal: cat.totalAmount,
    jumlah: cat.count,
    color: cat.barColor
  }));

  const activeCategoryObj = categories.find(c => c.key === selectedCategoryKey);

  const availableYears = useMemo(() => {
    if (!submissions) return [new Date().getFullYear().toString()];
    const yearsSet = new Set<string>();
    submissions.forEach(sub => {
      const my = getItemMonthYear(sub);
      if (my?.year) {
        yearsSet.add(my.year.toString());
      }
    });
    if (yearsSet.size === 0) yearsSet.add(new Date().getFullYear().toString());
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [submissions]);

  const filteredAndSortedItems = useMemo(() => {
    if (!activeCategoryObj?.items) return [];

    return activeCategoryObj.items
      .filter(item => {
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchesTitle = (item.title || '').toLowerCase().includes(term);
          const matchesPic = (item.picName || item.submittedByName || '').toLowerCase().includes(term);
          const matchesNo = (item.noDokumen || '').toLowerCase().includes(term);
          if (!matchesTitle && !matchesPic && !matchesNo) return false;
        }

        if (filterMonth !== 'ALL') {
          const my = getItemMonthYear(item);
          if (!my || my.monthName !== filterMonth) return false;
        }

        if (filterYear !== 'ALL') {
          const my = getItemMonthYear(item);
          if (!my || my.year.toString() !== filterYear) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'date_desc') {
          return getItemTime(b) - getItemTime(a);
        }
        if (sortOption === 'date_asc') {
          return getItemTime(a) - getItemTime(b);
        }
        if (sortOption === 'amount_desc') {
          return getSubAmt(b) - getSubAmt(a);
        }
        if (sortOption === 'amount_asc') {
          return getSubAmt(a) - getSubAmt(b);
        }
        return 0;
      });
  }, [activeCategoryObj, searchTerm, filterMonth, filterYear, sortOption]);

  return (
    <div className="mt-10 space-y-6 pt-6 border-t-2 border-slate-200" id="settlement-tracking-summary-section">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-2xl shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              TRACKING TRANSAKSI SUMMARY
            </span>
            <span className="text-[10px] text-slate-400 font-bold">• Data Terintegrasi Real-time</span>
          </div>
          <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <BarChart2 className="text-emerald-400" size={22} />
            Rekapitulasi Kategori Status Laporan
          </h3>
          <p className="text-xs text-slate-300 font-medium mt-1">
            Aglomerasi data dari menu Tracking Transaksi berdasarkan 3 Tahapan Utama Status Laporan
          </p>
        </div>

        {/* METRIC PILLS */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Transaksi</p>
            <p className="text-base font-black text-white">{grandTotalCount} Transaksi</p>
          </div>
          <div className="bg-emerald-950/80 border border-emerald-800/80 px-4 py-2 rounded-xl text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">Total Nominal LPJ</p>
            <p className="text-base font-black text-emerald-300 font-mono">Rp {grandTotalAmount.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      {/* FILTER TANGGAL LAPORAN GLOBAL TOOLBAR */}
      <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl shadow-sm text-white space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-emerald-400" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-200">
              Filter Tanggal Laporan (Memperbarui Grafik & Tabel Summary)
            </span>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setGlobalStartDate('');
                setGlobalEndDate('');
                setGlobalMonth('ALL');
                setGlobalYear('ALL');
              }}
              className={`h-7 px-2.5 text-[10px] font-extrabold rounded-lg transition-colors ${
                !globalStartDate && !globalEndDate && globalMonth === 'ALL' && globalYear === 'ALL'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-slate-700/70 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              Semua Waktu
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const now = new Date();
                const yearStr = now.getFullYear().toString();
                const monthName = MONTHS[now.getMonth()];
                setGlobalMonth(monthName);
                setGlobalYear(yearStr);
                setGlobalStartDate('');
                setGlobalEndDate('');
              }}
              className={`h-7 px-2.5 text-[10px] font-extrabold rounded-lg transition-colors ${
                globalMonth === MONTHS[new Date().getMonth()] && globalYear === new Date().getFullYear().toString()
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-slate-700/70 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              Bulan Ini
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const now = new Date();
                const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const yearStr = prev.getFullYear().toString();
                const monthName = MONTHS[prev.getMonth()];
                setGlobalMonth(monthName);
                setGlobalYear(yearStr);
                setGlobalStartDate('');
                setGlobalEndDate('');
              }}
              className="h-7 px-2.5 text-[10px] font-extrabold rounded-lg bg-slate-700/70 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Bulan Lalu
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const now = new Date();
                setGlobalYear(now.getFullYear().toString());
                setGlobalMonth('ALL');
                setGlobalStartDate('');
                setGlobalEndDate('');
              }}
              className="h-7 px-2.5 text-[10px] font-extrabold rounded-lg bg-slate-700/70 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Tahun Ini
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Rentang Tanggal Awal */}
          <div>
            <Label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Tanggal Awal Laporan</Label>
            <Input
              type="date"
              value={globalStartDate}
              onChange={e => setGlobalStartDate(e.target.value)}
              className="h-8 text-xs bg-slate-900 border-slate-700 text-white rounded-xl"
            />
          </div>

          {/* Rentang Tanggal Akhir */}
          <div>
            <Label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Tanggal Akhir Laporan</Label>
            <Input
              type="date"
              value={globalEndDate}
              onChange={e => setGlobalEndDate(e.target.value)}
              className="h-8 text-xs bg-slate-900 border-slate-700 text-white rounded-xl"
            />
          </div>

          {/* Filter Bulan */}
          <div>
            <Label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Bulan Laporan</Label>
            <Select value={globalMonth} onValueChange={setGlobalMonth}>
              <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-700 text-white rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 text-white border-slate-700 max-h-60 overflow-y-auto">
                <SelectItem value="ALL">Semua Bulan</SelectItem>
                {MONTHS.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter Tahun */}
          <div>
            <Label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Tahun Laporan</Label>
            <Select value={globalYear} onValueChange={setGlobalYear}>
              <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-700 text-white rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 text-white border-slate-700">
                <SelectItem value="ALL">Semua Tahun</SelectItem>
                {availableYears.map(yr => (
                  <SelectItem key={yr} value={yr}>{yr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* STATUS BAR / RESET */}
        {(globalStartDate || globalEndDate || globalMonth !== 'ALL' || globalYear !== 'ALL') && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-700/60 text-[11px]">
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Filter Aktif: Menampilkan {dateFilteredSubmissions.length} dari {submissions.length} total transaksi
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setGlobalStartDate('');
                setGlobalEndDate('');
                setGlobalMonth('ALL');
                setGlobalYear('ALL');
              }}
              className="h-6 text-[10px] font-extrabold bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200 rounded-lg"
            >
              Reset Filter Tanggal
            </Button>
          </div>
        )}
      </div>

      {/* 3 CATEGORY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const isSelected = selectedCategoryKey === cat.key;
          const percentage = grandTotalAmount > 0 ? ((cat.totalAmount / grandTotalAmount) * 100).toFixed(1) : '0';

          return (
            <Card
              key={cat.key}
              onClick={() => setSelectedCategoryKey(isSelected ? null : cat.key)}
              className={`rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                isSelected ? 'ring-2 ring-slate-900 shadow-md' : 'hover:shadow-md'
              } ${cat.bgColor} ${cat.borderColor}`}
            >
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-white ${cat.textColor} ${cat.borderColor}`}>
                      {cat.badgeLabel}
                    </span>
                    <span className="text-xs font-black font-mono text-slate-600 bg-white/80 px-2 py-0.5 rounded">
                      {percentage}%
                    </span>
                  </div>

                  <h4 className={`text-base font-black tracking-tight leading-snug ${cat.textColor}`}>
                    {cat.name}
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium mt-1.5 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                {/* Status List Preview */}
                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Daftar Status Termasuk:</p>
                  <div className="flex flex-wrap gap-1">
                    {cat.statuses.map((st, idx) => (
                      <span key={idx} className="text-[9px] font-semibold bg-white text-slate-700 px-1.5 py-0.5 rounded border border-slate-200/80">
                        {st}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Values */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 bg-white/60 -mx-5 -mb-5 p-4 mt-auto">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Jumlah</span>
                    <span className="text-sm font-black text-slate-900">{cat.count} Transaksi</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Nominal</span>
                    <span className="text-sm font-black font-mono text-slate-900">Rp {cat.totalAmount.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CHART & TABLE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RECHARTS CHART (6 COLS) */}
        <Card className="lg:col-span-6 rounded-2xl border border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col justify-between">
          <CardHeader className="py-4 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
                <BarChart3 size={16} className="text-emerald-600" />
                Grafik Kategori Status Tracking
              </CardTitle>
              <p className="text-[11px] text-slate-500 font-medium">Perbandingan statistik volume & nominal LPJ</p>
            </div>

            {/* Mode switch */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setChartMode('amount')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                  chartMode === 'amount' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Nominal (Rp)
              </button>
              <button
                type="button"
                onClick={() => setChartMode('count')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                  chartMode === 'count' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Jumlah (Doc)
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-5 flex-1 flex flex-col justify-center min-h-[280px]">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => chartMode === 'amount' ? (val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : `${val/1000}k`) : val}
                />
                <Tooltip 
                  formatter={(value: any) => [
                    chartMode === 'amount' ? `Rp ${Number(value).toLocaleString('id-ID')}` : `${value} Transaksi`,
                    chartMode === 'amount' ? 'Total Nominal' : 'Jumlah Transaksi'
                  ]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey={chartMode === 'amount' ? 'nominal' : 'jumlah'} 
                  radius={[8, 8, 0, 0]} 
                  barSize={45}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* SUMMARY TABLE (6 COLS) */}
        <Card className="lg:col-span-6 rounded-2xl border border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col justify-between">
          <CardHeader className="py-4 px-5 border-b border-slate-100">
            <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" />
              Tabel Aggregasi Status Laporan
            </CardTitle>
            <p className="text-[11px] text-slate-500 font-medium">Ringkasan kuantitas & proporsi nominal pengajuan</p>
          </CardHeader>

          <CardContent className="p-0 flex-1 flex flex-col justify-between">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 w-10 text-center">No</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500">Kategori Status Tracking</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 text-center">Jumlah</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 text-right">Subtotal Nominal</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 text-right">Proporsi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 text-xs">
                  {categories.map((cat, idx) => {
                    const pct = grandTotalAmount > 0 ? ((cat.totalAmount / grandTotalAmount) * 100).toFixed(1) : '0';
                    const isSelected = selectedCategoryKey === cat.key;

                    return (
                      <TableRow 
                        key={cat.key}
                        onClick={() => setSelectedCategoryKey(isSelected ? null : cat.key)}
                        className={`cursor-pointer transition-all ${isSelected ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'}`}
                      >
                        <TableCell className="text-center font-mono font-bold text-slate-500">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.barColor }} />
                            <div>
                              <p className={`font-bold text-slate-900 ${isSelected ? 'text-blue-700' : ''}`}>{cat.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{cat.badgeLabel}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-slate-800">
                          {cat.count} Doc
                        </TableCell>
                        <TableCell className="text-right font-mono font-black text-slate-900">
                          Rp {cat.totalAmount.toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-600">
                          {pct}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Grand Total Footer */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between text-xs font-bold border-t border-slate-800">
              <span className="uppercase tracking-wider font-extrabold text-[11px] text-slate-300">
                TOTAL AKUMULASI (3 KATEGORI)
              </span>
              <div className="flex items-center gap-4">
                <span className="font-mono text-slate-300">{grandTotalCount} Dokumen</span>
                <span className="font-mono text-emerald-400 font-black text-sm bg-slate-800 px-3 py-1 rounded border border-slate-700">
                  Rp {grandTotalAmount.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* EXPANDABLE TRANSACTION BREAKDOWN SECTION */}
      {selectedCategoryKey && activeCategoryObj && (
        <Card className="rounded-2xl border border-slate-300 shadow-md bg-white overflow-hidden mt-4">
          <CardHeader className="py-4 px-5 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white/20 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                  {activeCategoryObj.badgeLabel}
                </span>
                <span className="text-xs text-slate-300 font-bold">• {activeCategoryObj.count} Transaksi Total</span>
              </div>
              <CardTitle className="text-base font-black text-white">
                Rincian Transaksi Pengajuan: {activeCategoryObj.name}
              </CardTitle>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategoryKey(null)}
              className="h-8 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl shrink-0"
            >
              Tutup Table Rincian ✕
            </Button>
          </CardHeader>

          {/* FILTER & SORT TOOLBAR */}
          <div className="bg-slate-800 border-b border-slate-700 p-3 px-5 flex flex-wrap items-center justify-between gap-3 text-xs text-white">
            <div className="flex flex-wrap items-center gap-2">
              {/* SEARCH INPUT */}
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Cari transaksi..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="h-8 pl-8 w-44 text-xs bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 rounded-xl"
                />
              </div>

              {/* SORT SELECTION */}
              <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold shrink-0">Urutan:</span>
                <Select value={sortOption} onValueChange={(val: any) => setSortOption(val)}>
                  <SelectTrigger className="h-6 text-xs border-0 bg-transparent text-white font-semibold focus:ring-0 px-1 py-0 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 text-white border-slate-700">
                    <SelectItem value="date_desc">📅 Tanggal: Terbaru → Terlama</SelectItem>
                    <SelectItem value="date_asc">📅 Tanggal: Terlama → Terbaru</SelectItem>
                    <SelectItem value="amount_desc">💰 Nominal: Terbesar → Terkecil</SelectItem>
                    <SelectItem value="amount_asc">💰 Nominal: Terkecil → Terbesar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* MONTH FILTER */}
              <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold shrink-0">Bulan:</span>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="h-6 text-xs border-0 bg-transparent text-white font-semibold focus:ring-0 px-1 py-0 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 text-white border-slate-700 max-h-60 overflow-y-auto">
                    <SelectItem value="ALL">Semua Bulan</SelectItem>
                    {MONTHS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* YEAR FILTER */}
              <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold shrink-0">Tahun:</span>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="h-6 text-xs border-0 bg-transparent text-white font-semibold focus:ring-0 px-1 py-0 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 text-white border-slate-700">
                    <SelectItem value="ALL">Semua Tahun</SelectItem>
                    {availableYears.map(yr => (
                      <SelectItem key={yr} value={yr}>{yr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* RESET BUTTON */}
              {(filterMonth !== 'ALL' || filterYear !== 'ALL' || searchTerm || sortOption !== 'date_desc') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterMonth('ALL');
                    setFilterYear('ALL');
                    setSortOption('date_desc');
                  }}
                  className="h-8 px-2.5 text-[10px] font-bold bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200 rounded-xl"
                >
                  Reset Filter
                </Button>
              )}
            </div>

            <span className="text-[11px] font-bold text-emerald-400 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-700 shrink-0">
              Menampilkan {filteredAndSortedItems.length} dari {activeCategoryObj.items.length} Transaksi
            </span>
          </div>

          <CardContent className="p-0">
            {filteredAndSortedItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-bold">
                Tidak ada data transaksi pengajuan yang cocok dengan filter.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-100 sticky top-0 z-10 shadow-xs">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase text-slate-600 w-10 text-center">No</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-600">Judul Pengajuan</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-600">PIC / Pengaju</TableHead>
                      
                      {/* TANGGAL / WAKTU COLUMN */}
                      <TableHead 
                        onClick={() => {
                          if (sortOption === 'date_desc') setSortOption('date_asc');
                          else setSortOption('date_desc');
                        }}
                        className="text-[10px] font-black uppercase text-slate-600 cursor-pointer hover:bg-slate-200/80 transition-colors select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Tanggal / Waktu</span>
                          {sortOption === 'date_desc' && <span className="text-emerald-600 text-xs font-bold">▼</span>}
                          {sortOption === 'date_asc' && <span className="text-emerald-600 text-xs font-bold">▲</span>}
                        </div>
                      </TableHead>

                      <TableHead className="text-[10px] font-black uppercase text-slate-600">Status Tahap Spesifik</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Sumber Rek</TableHead>

                      {/* LINK RINCIAN LAPORAN COLUMN */}
                      <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Link Rincian Laporan</TableHead>

                      {/* NOMINAL COLUMN */}
                      <TableHead 
                        onClick={() => {
                          if (sortOption === 'amount_desc') setSortOption('amount_asc');
                          else setSortOption('amount_desc');
                        }}
                        className="text-[10px] font-black uppercase text-slate-600 text-right cursor-pointer hover:bg-slate-200/80 transition-colors select-none"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Nominal</span>
                          {sortOption === 'amount_desc' && <span className="text-emerald-600 text-xs font-bold">▼</span>}
                          {sortOption === 'amount_asc' && <span className="text-emerald-600 text-xs font-bold">▲</span>}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100 text-xs">
                    {filteredAndSortedItems.map((item, idx) => {
                      const type = item.type || 'uang_muka';
                      const stages = type === 'uang_muka' ? UM_STAGES : TRANSACTION_STAGES;
                      const specStatus = stages[item.currentStageIndex] || item.status || 'Proses';
                      const displayAmt = getSubAmt(item);

                      return (
                        <TableRow key={item.id || idx} className="hover:bg-slate-50">
                          <TableCell className="text-center font-mono font-bold text-slate-400">{idx + 1}</TableCell>
                          <TableCell className="font-bold text-slate-900">
                            <div>
                              <p>{item.title}</p>
                              {item.noDokumen && <p className="text-[10px] font-mono text-slate-400 font-normal">No: {item.noDokumen}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-700 font-medium">
                            {item.picName || item.submittedByName || 'PIC'}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-600 whitespace-nowrap">
                            {formatItemDate(item)}
                          </TableCell>
                          <TableCell>
                            <span className="inline-block bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                              {specStatus}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold text-slate-600">
                            {item.sumberRekening || '-'}
                          </TableCell>

                          {/* LINK RINCIAN LAPORAN CELL */}
                          <TableCell className="text-center whitespace-nowrap">
                            {(() => {
                              const link = item.lpjUrl || item.evidenceUrl || item.linkDriveLPJ || item.driveLink || item.linkLaporan || item.linkPenyelesaian || item.bastLink;
                              if (link && typeof link === 'string' && link.trim().length > 0) {
                                const href = link.startsWith('http') ? link : `https://${link}`;
                                return (
                                  <div className="flex items-center justify-center gap-1">
                                    <a
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all shadow-2xs hover:shadow-xs"
                                      title="Buka Link Drive / Rincian LPJ"
                                    >
                                      <span>Link LPJ</span>
                                      <ExternalLink size={12} className="shrink-0" />
                                    </a>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedDetailItem(item)}
                                      className="h-6 px-1.5 text-[10px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                                      title="Rincian Detail Transaksi"
                                    >
                                      <FileText size={13} />
                                    </Button>
                                  </div>
                                );
                              }
                              return (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-[10px] text-slate-400 italic font-medium">Belum Ada Link</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedDetailItem(item)}
                                    className="h-6 px-1.5 text-[10px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                                    title="Rincian Detail Transaksi"
                                  >
                                    <FileText size={13} />
                                  </Button>
                                </div>
                              );
                            })()}
                          </TableCell>

                          <TableCell className="text-right font-mono font-black text-slate-900">
                            Rp {displayAmt.toLocaleString('id-ID')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* DIALOG RINCIAN DETAIL LAPORAN */}
      {selectedDetailItem && (
        <Dialog open={!!selectedDetailItem} onOpenChange={() => setSelectedDetailItem(null)}>
          <DialogContent className="max-w-lg rounded-2xl p-6 bg-white">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileText className="text-emerald-600" size={20} />
                Rincian Detail Laporan Pengajuan
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs mt-2">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-medium">Judul Pengajuan:</span>
                  <span className="font-bold text-slate-900 text-right">{selectedDetailItem.title}</span>
                </div>
                {selectedDetailItem.noDokumen && (
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500 font-medium">No. Dokumen:</span>
                    <span className="font-mono font-bold text-slate-800">{selectedDetailItem.noDokumen}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-medium">PIC / Pengaju:</span>
                  <span className="font-bold text-slate-900">{selectedDetailItem.picName || selectedDetailItem.submittedByName || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-medium">Tanggal / Waktu:</span>
                  <span className="font-mono font-bold text-slate-800">{formatItemDate(selectedDetailItem)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-medium">Sumber Rekening:</span>
                  <span className="font-bold text-slate-800">{selectedDetailItem.sumberRekening || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-medium">Nominal Total:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    Rp {getSubAmt(selectedDetailItem).toLocaleString('id-ID')}
                  </span>
                </div>
                {selectedDetailItem.description && (
                  <div className="pt-1">
                    <span className="text-slate-500 font-medium block mb-1">Keterangan:</span>
                    <p className="bg-white p-2.5 rounded-lg border text-slate-700 text-[11px] leading-relaxed">
                      {selectedDetailItem.description}
                    </p>
                  </div>
                )}
              </div>

              {/* LINK ATTACHMENTS */}
              <div className="space-y-2">
                <p className="font-bold text-slate-800">Tautan Berkas & LPJ:</p>
                {(() => {
                  const link = selectedDetailItem.lpjUrl || selectedDetailItem.evidenceUrl || selectedDetailItem.linkDriveLPJ || selectedDetailItem.driveLink || selectedDetailItem.linkLaporan || selectedDetailItem.linkPenyelesaian || selectedDetailItem.bastLink;
                  if (link) {
                    const href = link.startsWith('http') ? link : `https://${link}`;
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100 transition-colors font-bold text-xs"
                      >
                        <span className="flex items-center gap-2">
                          <ExternalLink size={16} className="text-blue-600" />
                          Link Berkas LPJ / Dokumen Pendukung
                        </span>
                        <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-extrabold">Buka Link ↗</span>
                      </a>
                    );
                  }
                  return (
                    <div className="p-3 rounded-xl bg-slate-100 text-slate-500 text-center text-xs font-medium">
                      Belum ada link drive LPJ / berkas laporan yang diunggah.
                    </div>
                  );
                })()}
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                onClick={() => setSelectedDetailItem(null)}
                className="bg-slate-900 text-white hover:bg-slate-800 text-xs rounded-xl"
              >
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export const LaporanManager = ({ userUid, isReadOnly = false }: { userUid: string, isReadOnly?: boolean }) => {
  const [activeTab, setActiveTab] = useState<'standard' | 'baznas' | 'settlement'>('standard');
  const [baznasMonth, setBaznasMonth] = useState('Januari');
  const [baznasYear, setBaznasYear] = useState('2026');
  const [baznasNoPpd, setBaznasNoPpd] = useState('137910');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [customBaznasValues, setCustomBaznasValues] = useState<any[]>([]);
  const [editingBaznasItem, setEditingBaznasItem] = useState<{
    code: string;
    name: string;
    budget: number;
    real: number;
  } | null>(null);

  const [baznasAccount, setBaznasAccount] = useState<'SMP' | 'SMA'>('SMP');
  const [showBaznasChart, setShowBaznasChart] = useState(true);
  const [isRincianFormOpen, setIsRincianFormOpen] = useState(false);
  const [isChartDialogOpen, setIsChartDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const currentTemplates = baznasAccount === 'SMP' ? BAZNAS_SMP_BUDGET_TEMPLATES : BAZNAS_SMA_BUDGET_TEMPLATES;
  const [selectedBaznasCode, setSelectedBaznasCode] = useState<string>('');
  const [baznasFormBudget, setBaznasFormBudget] = useState<string>('');
  const [baznasFormReal, setBaznasFormReal] = useState<string>('');

  const [data, setData] = useState<Report[]>(initialData);
  const [month, setMonth] = useState('April');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [amount, setAmount] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [bastLink, setBastLink] = useState('');
  const [linkRincian, setLinkRincian] = useState('');
  const [keterangan, setKeterangan] = useState(''); // Tambahkan state ini
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter states
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Rincian (Detail) states
  const [dbRincianList, setDbRincianList] = useState<any[]>([]);
  const [rFormBudgetCode, setRFormBudgetCode] = useState<string>('');
  const [rFormNoDoc, setRFormNoDoc] = useState<number>(1);
  const [rFormNoBukti, setRFormNoBukti] = useState<string>('');
  const [rFormTanggalBudget, setRFormTanggalBudget] = useState<string>('');
  const [rFormKeterangan, setRFormKeterangan] = useState<string>('');
  const [rFormLinkBukti, setRFormLinkBukti] = useState<string>('');
  const [rFormDetails, setRFormDetails] = useState<RincianDetailItem[]>([
    { noBuktiDetail: 'a', keteranganDetail: '', qty: 1, hargaSatuan: 0 }
  ]);
  const [editingRincianId, setEditingRincianId] = useState<string | null>(null);
  const [isResettingDefault, setIsResettingDefault] = useState(false);
  const [selectedBuktiRincian, setSelectedBuktiRincian] = useState<any | null>(null);

  // Settlement BAZNAS states
  const [dbSettlementList, setDbSettlementList] = useState<any[]>([]);
  const [isSettlementFormOpen, setIsSettlementFormOpen] = useState(false);
  const [sFormBudgetCode, setSFormBudgetCode] = useState<string>('');
  const [sFormIsCustomCode, setSFormIsCustomCode] = useState<boolean>(false);
  const [sFormCustomCode, setSFormCustomCode] = useState<string>('');
  const [sFormCustomName, setSFormCustomName] = useState<string>('');
  const [sFormDebit, setSFormDebit] = useState<string>('');
  const [baznasDana, setBaznasDana] = useState<string>('ZAKAT');
  const [sFormNoDoc, setSFormNoDoc] = useState<number>(1);
  const [sFormNoBukti, setSFormNoBukti] = useState<string>('');
  const [sFormTanggalBudget, setSFormTanggalBudget] = useState<string>('');
  const [sFormKeterangan, setSFormKeterangan] = useState<string>('');
  const [sFormDetails, setSFormDetails] = useState<RincianDetailItem[]>([
    { noBuktiDetail: 'a', keteranganDetail: '', qty: 1, hargaSatuan: 0 }
  ]);
  const [editingSettlementId, setEditingSettlementId] = useState<string | null>(null);
  const [isResettingSettlement, setIsResettingSettlement] = useState(false);
  const [settlementSearchTerm, setSettlementSearchTerm] = useState<string>('');

  // Subscribe to BAZNAS detailed transactions (rincian)
  useEffect(() => {
    if (!userUid) return;
    const q = query(collection(db, 'laporan_baznas_rincian_docs'), orderBy('noDoc', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: any[] = [];
      snapshot.forEach((docSnap) => {
        records.push({ id: docSnap.id, ...docSnap.data() });
      });
      setDbRincianList(records);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'laporan_baznas_rincian_docs');
    });
    return () => unsubscribe();
  }, [userUid]);

  // Subscribe to Settlement BAZNAS transactions
  useEffect(() => {
    if (!userUid) return;
    const q = query(collection(db, 'laporan_baznas_settlement_docs'), orderBy('noDoc', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: any[] = [];
      snapshot.forEach((docSnap) => {
        records.push({ id: docSnap.id, ...docSnap.data() });
      });
      setDbSettlementList(records);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'laporan_baznas_settlement_docs');
    });
    return () => unsubscribe();
  }, [userUid]);

  // Fetch submissions to calculate dynamic BAZNAS realisasi
  useEffect(() => {
    if (!userUid) return;
    const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subs: any[] = [];
      snapshot.forEach((docSnap) => {
        subs.push({ id: docSnap.id, ...docSnap.data() });
      });
      setSubmissions(subs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'submissions');
    });
    return () => unsubscribe();
  }, [userUid]);

  useEffect(() => {
    if (!userUid) return;
    const q = query(collection(db, 'laporan_baznas_custom_values'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vals: any[] = [];
      snapshot.forEach((docSnap) => {
        vals.push({ id: docSnap.id, ...docSnap.data() });
      });
      setCustomBaznasValues(vals);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'laporan_baznas_custom_values');
    });
    return () => unsubscribe();
  }, [userUid]);

  const handleSaveBaznasOverride = async (code: string, newBudget: number, newReal: number, customAccount?: string) => {
    try {
      const targetAccount = customAccount || baznasAccount;
      const docId = `${targetAccount}_${baznasMonth}_${baznasYear}_${code}`.toLowerCase().replace(/\s+/g, '_');
      const docRef = doc(db, 'laporan_baznas_custom_values', docId);
      await setDoc(docRef, {
        month: baznasMonth,
        year: baznasYear,
        account: targetAccount,
        code,
        budget: newBudget,
        real: newReal,
        updatedAt: serverTimestamp(),
        userUid
      });
      toast.success(`Berhasil memperbarui ${code}`);
      setEditingBaznasItem(null);
    } catch (err) {
      console.error("Error saving BAZNAS override:", err);
      toast.error("Gagal menyimpan perubahan");
    }
  };

  // Rincian (Detail ledger) computed arrays & helpers
  const currentDbRincian = dbRincianList.filter(
    r => r.month.toLowerCase() === baznasMonth.toLowerCase() &&
         r.year === baznasYear &&
         r.account.toLowerCase() === baznasAccount.toLowerCase()
  );

  const rincianItems: BaznasRincianItem[] = (currentDbRincian.length === 0 && baznasMonth === 'Januari' && baznasYear === '2026')
    ? (baznasAccount === 'SMP' ? DEFAULT_BAZNAS_RINCIAN_SMP_JAN_2026 : DEFAULT_BAZNAS_RINCIAN_SMA_JAN_2026)
    : currentDbRincian;

  const sortedRincianItems = [...rincianItems].sort((a, b) => (a.noDoc || 0) - (b.noDoc || 0));

  useEffect(() => {
    if (!editingRincianId) {
      const nextNoDoc = (sortedRincianItems.length > 0 ? Math.max(...sortedRincianItems.map(r => r.noDoc || 0)) + 1 : 1);
      setRFormNoDoc(nextNoDoc);
    }
  }, [sortedRincianItems, editingRincianId]);

  const ensureRincianCollection = async () => {
    const currentDbItems = dbRincianList.filter(
      r => r.month === 'Januari' && r.year === '2026' && r.account === baznasAccount
    );
    if (currentDbItems.length === 0) {
      const defaultToLoad = baznasAccount === 'SMP' ? DEFAULT_BAZNAS_RINCIAN_SMP_JAN_2026 : DEFAULT_BAZNAS_RINCIAN_SMA_JAN_2026;
      toast.info(`Menginisialisasi data rincian default ${baznasAccount} ke database...`);
      for (const item of defaultToLoad) {
        await addDoc(collection(db, 'laporan_baznas_rincian_docs'), {
          ...item,
          userUid,
          updatedAt: serverTimestamp()
        });
      }
    }
  };

  const handleSaveRincian = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRCode = normalizeBudgetCode(rFormBudgetCode);
    if (!finalRCode || !rFormNoBukti || !rFormTanggalBudget || !rFormKeterangan) {
      toast.error("Mohon lengkapi semua field utama rincian transaksi");
      return;
    }

    setIsSubmitting(true);
    try {
      const validatedDetails = rFormDetails.map(d => ({
        noBuktiDetail: d.noBuktiDetail || 'a',
        tanggalDetail: d.tanggalDetail || '',
        keteranganDetail: d.keteranganDetail || '',
        qty: parseFloat(d.qty.toString()) || 1,
        hargaSatuan: parseInt(d.hargaSatuan.toString().replace(/\./g, '')) || 0
      }));

      // If modifying a static entry, populate the DB first
      if (editingRincianId === 'default_static' || (!editingRincianId && baznasMonth === 'Januari' && baznasYear === '2026' && (baznasAccount === 'SMP' || baznasAccount === 'SMA'))) {
        await ensureRincianCollection();
      }

      const linkBuktiVal = rFormLinkBukti.trim();

      if (editingRincianId && editingRincianId !== 'default_static') {
        const docRef = doc(db, 'laporan_baznas_rincian_docs', editingRincianId);
        await updateDoc(docRef, {
          kodeBudget: finalRCode,
          noDoc: rFormNoDoc,
          noBukti: rFormNoBukti,
          tanggalBudget: rFormTanggalBudget,
          keterangan: rFormKeterangan,
          linkBukti: linkBuktiVal,
          buktiUrl: linkBuktiVal,
          details: validatedDetails,
          updatedAt: serverTimestamp()
        });
        toast.success("Berhasil memperbarui rincian transaksi");
      } else {
        const currentDbItems = dbRincianList.filter(
          r => r.month === baznasMonth && r.year === baznasYear && r.account === baznasAccount
        );
        const existingDoc = currentDbItems.find(r => r.noDoc === rFormNoDoc);
        if (existingDoc) {
          const docRef = doc(db, 'laporan_baznas_rincian_docs', existingDoc.id);
          await updateDoc(docRef, {
            kodeBudget: finalRCode,
            noBukti: rFormNoBukti,
            tanggalBudget: rFormTanggalBudget,
            keterangan: rFormKeterangan,
            linkBukti: linkBuktiVal,
            buktiUrl: linkBuktiVal,
            details: validatedDetails,
            updatedAt: serverTimestamp()
          });
          toast.success("Berhasil memperbarui rincian transaksi");
        } else {
          await addDoc(collection(db, 'laporan_baznas_rincian_docs'), {
            account: baznasAccount,
            month: baznasMonth,
            year: baznasYear,
            kodeBudget: finalRCode,
            noDoc: rFormNoDoc,
            noBukti: rFormNoBukti,
            tanggalBudget: rFormTanggalBudget,
            keterangan: rFormKeterangan,
            linkBukti: linkBuktiVal,
            buktiUrl: linkBuktiVal,
            details: validatedDetails,
            userUid,
            updatedAt: serverTimestamp()
          });
          toast.success("Berhasil menyimpan rincian transaksi");
        }
      }
      
      resetRincianForm();
      setIsRincianFormOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan rincian");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadDefaults = async () => {
    const isSMP = baznasAccount === 'SMP';
    const numItems = isSMP ? 61 : 21;
    if (!window.confirm(`Apakah Anda yakin ingin me-reset data rincian untuk periode ini kembali ke Data Default (${numItems} transaksi)? Data custom untuk periode ini akan terhapus.`)) return;
    
    setIsResettingDefault(true);
    try {
      const currentDbItems = dbRincianList.filter(
        r => r.month.toLowerCase() === baznasMonth.toLowerCase() &&
             r.year === baznasYear &&
             r.account.toLowerCase() === baznasAccount.toLowerCase()
      );
      
      toast.info("Menghapus data rincian lama...");
      for (const item of currentDbItems) {
        await deleteDoc(doc(db, 'laporan_baznas_rincian_docs', item.id));
      }

      const defaultToLoad = isSMP ? DEFAULT_BAZNAS_RINCIAN_SMP_JAN_2026 : DEFAULT_BAZNAS_RINCIAN_SMA_JAN_2026;

      toast.info("Mengunggah data rincian default...");
      for (const item of defaultToLoad) {
        await addDoc(collection(db, 'laporan_baznas_rincian_docs'), {
          ...item,
          account: baznasAccount,
          month: baznasMonth,
          year: baznasYear,
          userUid,
          updatedAt: serverTimestamp()
        });
      }
      
      toast.success(`Berhasil memuat ${numItems} transaksi default!`);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat rincian default");
    } finally {
      setIsResettingDefault(false);
    }
  };

  const handleDeleteRincian = async (item: any) => {
    if (!window.confirm("Yakin ingin menghapus rincian transaksi ini?")) return;
    
    try {
      if (item.id) {
        await deleteDoc(doc(db, 'laporan_baznas_rincian_docs', item.id));
        toast.success("Berhasil menghapus rincian");
      } else {
        setIsSubmitting(true);
        toast.info("Menginisialisasi data rincian ke database...");
        const defaultItems = baznasAccount === 'SMP' ? DEFAULT_BAZNAS_RINCIAN_SMP_JAN_2026 : DEFAULT_BAZNAS_RINCIAN_SMA_JAN_2026;
        for (const defaultItem of defaultItems) {
          if (defaultItem.noDoc === item.noDoc) continue;
          await addDoc(collection(db, 'laporan_baznas_rincian_docs'), {
            ...defaultItem,
            userUid,
            updatedAt: serverTimestamp()
          });
        }
        toast.success("Transaksi berhasil dihapus");
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghapus rincian");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Settlement BAZNAS computed data & helper functions
  const getBudgetItemMeta = (code: string, targetAccount: 'SMP' | 'SMA' = baznasAccount) => {
    const normCode = normalizeBudgetCode(code);
    const templates = targetAccount === 'SMP' ? BAZNAS_SMP_BUDGET_TEMPLATES : BAZNAS_SMA_BUDGET_TEMPLATES;
    const found = templates.find(t => t.code === normCode || t.code === code);
    
    const customDoc = customBaznasValues.find(c =>
      c.account === targetAccount &&
      c.month?.toLowerCase() === baznasMonth.toLowerCase() &&
      c.year === baznasYear &&
      (normalizeBudgetCode(c.code) === normCode || c.code === code)
    );

    const pagu = customDoc?.budget !== undefined ? customDoc.budget : (found?.budget || 0);
    const name = found?.name || 'Pos Anggaran';

    return { code: normCode || code, name, pagu };
  };

  const currentDbSettlement = dbSettlementList.filter(
    s => s.month?.toLowerCase() === baznasMonth.toLowerCase() &&
         s.year === baznasYear &&
         s.account?.toLowerCase() === baznasAccount.toLowerCase()
  );

  const sortedSettlementItems = [...currentDbSettlement].sort((a, b) => (a.noDoc || 0) - (b.noDoc || 0));

  useEffect(() => {
    if (!editingSettlementId && activeTab === 'settlement') {
      const nextNoDoc = (sortedSettlementItems.length > 0 ? Math.max(...sortedSettlementItems.map(s => s.noDoc || 0)) + 1 : 1);
      setSFormNoDoc(nextNoDoc);
    }
  }, [sortedSettlementItems, editingSettlementId, activeTab]);

  const handleOpenAddSettlement = (presetCode?: string) => {
    setEditingSettlementId(null);
    setSFormIsCustomCode(false);
    setSFormCustomCode('');
    setSFormCustomName('');
    setSFormDebit('');
    
    const selectedCode = presetCode || currentTemplates.find(t => t.level === 3)?.code || '';
    setSFormBudgetCode(selectedCode);
    const nextNoDoc = (sortedSettlementItems.length > 0 ? Math.max(...sortedSettlementItems.map(s => s.noDoc || 0)) + 1 : 1);
    setSFormNoDoc(nextNoDoc);
    
    const monthShort = baznasMonth.substring(0, 3).toUpperCase();
    const yearShort = baznasYear.substring(2);
    setSFormNoBukti(`STL.${String(nextNoDoc).padStart(2, '0')}/${monthShort}/${yearShort}`);
    
    const dateObj = new Date();
    const dayStr = String(dateObj.getDate()).padStart(2, '0');
    setSFormTanggalBudget(`${dayStr}-${baznasMonth.substring(0, 3)}-${yearShort}`);
    
    const meta = getBudgetItemMeta(selectedCode);
    setSFormKeterangan(`Settlement ${meta.name}`);
    setSFormDetails([{ noBuktiDetail: 'a', keteranganDetail: '', qty: 1, hargaSatuan: 0 }]);
    setIsSettlementFormOpen(true);
  };

  const handleSaveSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawCode = sFormIsCustomCode ? sFormCustomCode.trim() : sFormBudgetCode;
    const finalCode = normalizeBudgetCode(rawCode);
    const meta = getBudgetItemMeta(finalCode);
    const finalName = sFormIsCustomCode ? sFormCustomName.trim() : (meta.name || 'Pos Anggaran');

    if (!finalCode || !sFormNoBukti || !sFormTanggalBudget || !sFormKeterangan) {
      toast.error("Mohon lengkapi data utama settlement");
      return;
    }

    setIsSubmitting(true);
    try {
      const validatedDetails = sFormDetails.map(d => ({
        noBuktiDetail: d.noBuktiDetail || 'a',
        tanggalDetail: d.tanggalDetail || sFormTanggalBudget,
        keteranganDetail: d.keteranganDetail || '',
        qty: parseFloat(d.qty.toString()) || 1,
        hargaSatuan: parseInt(d.hargaSatuan.toString().replace(/\./g, '')) || 0
      }));

      if (editingSettlementId) {
        const docRef = doc(db, 'laporan_baznas_settlement_docs', editingSettlementId);
        await updateDoc(docRef, {
          account: baznasAccount,
          month: baznasMonth,
          year: baznasYear,
          kodeBudget: finalCode,
          namaAnggaran: finalName,
          paguAnggaran: meta.pagu || 0,
          debit: sFormDebit,
          noDoc: sFormNoDoc,
          noBukti: sFormNoBukti,
          tanggalBudget: sFormTanggalBudget,
          keterangan: sFormKeterangan,
          details: validatedDetails,
          updatedAt: serverTimestamp()
        });
        toast.success("Berhasil memperbarui data settlement BAZNAS");
      } else {
        await addDoc(collection(db, 'laporan_baznas_settlement_docs'), {
          account: baznasAccount,
          month: baznasMonth,
          year: baznasYear,
          kodeBudget: finalCode,
          namaAnggaran: finalName,
          paguAnggaran: meta.pagu || 0,
          debit: sFormDebit,
          noDoc: sFormNoDoc,
          noBukti: sFormNoBukti,
          tanggalBudget: sFormTanggalBudget,
          keterangan: sFormKeterangan,
          details: validatedDetails,
          userUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success("Berhasil menambahkan data settlement BAZNAS baru");
      }

      setIsSettlementFormOpen(false);
      resetSettlementForm();
    } catch (error) {
      console.error("Error saving settlement:", error);
      toast.error("Gagal menyimpan data settlement BAZNAS");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetSettlementForm = () => {
    setEditingSettlementId(null);
    setSFormBudgetCode('');
    setSFormIsCustomCode(false);
    setSFormCustomCode('');
    setSFormCustomName('');
    setSFormDebit('');
    setSFormNoDoc(1);
    setSFormNoBukti('');
    setSFormTanggalBudget('');
    setSFormKeterangan('');
    setSFormDetails([{ noBuktiDetail: 'a', keteranganDetail: '', qty: 1, hargaSatuan: 0 }]);
  };

  const handleEditSettlement = (item: any) => {
    setEditingSettlementId(item.id);
    const templates = baznasAccount === 'SMP' ? BAZNAS_SMP_BUDGET_TEMPLATES : BAZNAS_SMA_BUDGET_TEMPLATES;
    const existsInTemplate = templates.some(t => t.code === item.kodeBudget);

    if (existsInTemplate) {
      setSFormIsCustomCode(false);
      setSFormBudgetCode(item.kodeBudget);
      setSFormCustomCode('');
      setSFormCustomName('');
    } else {
      setSFormIsCustomCode(true);
      setSFormBudgetCode('');
      setSFormCustomCode(item.kodeBudget || '');
      setSFormCustomName(item.namaAnggaran || '');
    }

    setSFormDebit(item.debit || '');
    setSFormNoDoc(item.noDoc);
    setSFormNoBukti(item.noBukti);
    setSFormTanggalBudget(item.tanggalBudget);
    setSFormKeterangan(item.keterangan);
    setSFormDetails(item.details && item.details.length > 0 ? item.details : [{ noBuktiDetail: 'a', keteranganDetail: '', qty: 1, hargaSatuan: 0 }]);
    setIsSettlementFormOpen(true);
  };

  const handleDeleteSettlement = async (item: any) => {
    if (!window.confirm(`Yakin ingin menghapus settlement No Doc ${item.noDoc} (${item.kodeBudget} - ${item.keterangan})?`)) return;
    try {
      if (item.id) {
        await deleteDoc(doc(db, 'laporan_baznas_settlement_docs', item.id));
        toast.success("Data settlement berhasil dihapus");
      } else {
        setIsSubmitting(true);
        toast.info("Menginisialisasi data settlement ke database...");
        const sampleToLoad = DEFAULT_BAZNAS_SETTLEMENT_SMA_JUNI_2026;
        for (const defaultItem of sampleToLoad) {
          if (defaultItem.noDoc === item.noDoc && defaultItem.kodeBudget === item.kodeBudget && defaultItem.keterangan === item.keterangan) continue;
          await addDoc(collection(db, 'laporan_baznas_settlement_docs'), {
            account: baznasAccount,
            month: baznasMonth,
            year: baznasYear,
            kodeBudget: defaultItem.kodeBudget,
            namaAnggaran: defaultItem.namaAnggaran,
            noDoc: defaultItem.noDoc,
            noBukti: defaultItem.noBukti,
            tanggalBudget: defaultItem.tanggalBudget,
            keterangan: defaultItem.keterangan,
            debit: defaultItem.debit || '',
            details: defaultItem.details,
            userUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        toast.success("Data settlement berhasil dihapus");
      }
    } catch (error) {
      console.error("Error deleting settlement:", error);
      toast.error("Gagal menghapus data settlement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadDefaultSettlement = async () => {
    try {
      setIsResettingSettlement(true);
      toast.info("Memuat sample data settlement BAZNAS...");
      
      // Clear existing settlement items for current account/month/year
      const currentItems = dbSettlementList.filter(
        s => s.month?.toLowerCase() === baznasMonth.toLowerCase() &&
             s.year === baznasYear &&
             s.account?.toLowerCase() === baznasAccount.toLowerCase()
      );
      for (const item of currentItems) {
        if (item.id) {
          await deleteDoc(doc(db, 'laporan_baznas_settlement_docs', item.id));
        }
      }

      const sampleToLoad = DEFAULT_BAZNAS_SETTLEMENT_SMA_JUNI_2026;
      for (const item of sampleToLoad) {
        await addDoc(collection(db, 'laporan_baznas_settlement_docs'), {
          account: baznasAccount,
          month: baznasMonth,
          year: baznasYear,
          kodeBudget: item.kodeBudget,
          namaAnggaran: item.namaAnggaran,
          noDoc: item.noDoc,
          noBukti: item.noBukti,
          tanggalBudget: item.tanggalBudget,
          keterangan: item.keterangan,
          debit: item.debit || '',
          details: item.details,
          userUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      toast.success(`Berhasil memuat ${sampleToLoad.length} sample data settlement BAZNAS!`);
    } catch (error) {
      console.error("Error loading default settlement:", error);
      toast.error("Gagal memuat sample settlement");
    } finally {
      setIsResettingSettlement(false);
    }
  };

  const handleEditRincian = (item: any) => {
    setEditingRincianId(item.id || 'default_static');
    setRFormBudgetCode(item.kodeBudget);
    setRFormNoDoc(item.noDoc || 1);
    setRFormNoBukti(item.noBukti);
    setRFormTanggalBudget(item.tanggalBudget);
    setRFormKeterangan(item.keterangan);
    setRFormLinkBukti(item.linkBukti || item.buktiUrl || '');
    setRFormDetails(item.details && item.details.length > 0 ? [...item.details] : [{ noBuktiDetail: 'a', keteranganDetail: '', qty: 1, hargaSatuan: 0 }]);
    
    setIsRincianFormOpen(true);
  };

  const handleOpenAddRincian = () => {
    resetRincianForm();
    setIsRincianFormOpen(true);
  };

  const resetRincianForm = () => {
    setRFormBudgetCode('');
    const nextNoDoc = (sortedRincianItems.length > 0 ? Math.max(...sortedRincianItems.map(r => r.noDoc || 0)) + 1 : 1);
    setRFormNoDoc(nextNoDoc);
    setRFormNoBukti('');
    setRFormTanggalBudget('');
    setRFormKeterangan('');
    setRFormLinkBukti('');
    setRFormDetails([{ noBuktiDetail: 'a', keteranganDetail: '', qty: 1, hargaSatuan: 0 }]);
    setEditingRincianId(null);
  };

  const getSubmissionMonthAndYear = (sub: any) => {
    let dateObj: Date | null = null;
    if (sub.transactionDate) {
      dateObj = new Date(sub.transactionDate);
    } else if (sub.createdAt) {
      const ts = sub.createdAt;
      if (ts.seconds) {
        dateObj = new Date(ts.seconds * 1000);
      } else if (ts.toDate) {
        dateObj = ts.toDate();
      } else {
        dateObj = new Date(ts);
      }
    }
    
    if (dateObj && !isNaN(dateObj.getTime())) {
      const m = MONTHS[dateObj.getMonth()];
      const y = dateObj.getFullYear().toString();
      return { month: m, year: y };
    }
    return null;
  };

  // Prefill BAZNAS custom input form when selected budget item changes
  useEffect(() => {
    if (!selectedBaznasCode) {
      setBaznasFormBudget('');
      setBaznasFormReal('');
      return;
    }
    
    // We compute the current value for this code
    const leavesCalculatedOne = () => {
      const item = currentTemplates.find(it => it.code === selectedBaznasCode);
      if (!item) return null;
      
      const matches = submissions.filter(sub => {
        const my = getSubmissionMonthAndYear(sub);
        if (!my) return false;
        
        const codeMatches = sub.kodeBudget === item.code;
        const periodMatches = my.month.toLowerCase() === baznasMonth.toLowerCase() && my.year === baznasYear;
        const isValidStage = (sub.currentStageIndex >= 4 || sub.status === 'APPROVED' || sub.status === 'approved') && sub.status !== 'REJECTED' && sub.status !== 'rejected';
        
        const subAccount = sub.sumberRekening || 'SMP';
        const accountMatches = baznasAccount === 'SMP'
          ? (subAccount === 'SMP' || subAccount === 'Donasi SMP')
          : (subAccount === 'SMA' || subAccount === 'Donasi SMA');
          
        return codeMatches && periodMatches && isValidStage && accountMatches;
      });
      
      const sum = matches.reduce((acc, sub) => acc + (sub.amount || 0), 0);
      
      let initialReal = sum;
      if (sum === 0 && baznasMonth === 'Januari' && baznasYear === '2026') {
        initialReal = item.realDefault;
      }

      const customOverride = customBaznasValues.find(v => 
        v.month.toLowerCase() === baznasMonth.toLowerCase() &&
        v.year === baznasYear &&
        v.code === item.code &&
        (v.account ? v.account.toLowerCase() === baznasAccount.toLowerCase() : baznasAccount.toLowerCase() === 'smp')
      );

      const realAsi = customOverride && customOverride.real !== undefined ? customOverride.real : initialReal;
      const budgetAsi = customOverride && customOverride.budget !== undefined ? customOverride.budget : item.budget;
      
      return { budgetAsi, realAsi };
    };

    const calculated = leavesCalculatedOne();
    if (calculated) {
      setBaznasFormBudget(calculated.budgetAsi.toString());
      setBaznasFormReal(calculated.realAsi.toString());
    }
  }, [selectedBaznasCode, baznasAccount, baznasMonth, baznasYear, submissions, customBaznasValues]);

  const handleSaveBaznasForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBaznasCode) {
      toast.error("Silakan pilih pos/kode budget terlebih dahulu");
      return;
    }
    const budgetVal = parseInt(baznasFormBudget.replace(/\./g, '')) || 0;
    const realVal = parseInt(baznasFormReal.replace(/\./g, '')) || 0;

    await handleSaveBaznasOverride(selectedBaznasCode, budgetVal, realVal, baznasAccount);
    toast.success("Berhasil menyimpan nilai laporan");
    setSelectedBaznasCode('');
    setBaznasFormBudget('');
    setBaznasFormReal('');
    setIsBudgetDialogOpen(false);
  };

  const computeReportData = (targetMonth: string, targetYear: string) => {
    // Determine the relevant rincian items for the target period
    const targetDbRincian = dbRincianList.filter(
      r => r.month.toLowerCase() === targetMonth.toLowerCase() &&
           r.year === targetYear &&
           r.account.toLowerCase() === baznasAccount.toLowerCase()
    );

    const targetRincian = (targetDbRincian.length === 0 && targetMonth === 'Januari' && targetYear === '2026')
      ? (baznasAccount === 'SMP' ? DEFAULT_BAZNAS_RINCIAN_SMP_JAN_2026 : DEFAULT_BAZNAS_RINCIAN_SMA_JAN_2026)
      : targetDbRincian;

    const hasRincian = targetRincian.length > 0;

    const leafCalculated = currentTemplates.map(item => {
      if (item.level === 3) {
        if (hasRincian) {
          // Calculate sum of credit in details for this code
          const totalRincianReal = targetRincian
            .filter(r => r.kodeBudget === item.code)
            .reduce((sum, r) => sum + (r.details?.reduce((s: number, d: any) => s + ((d.qty || 0) * (d.hargaSatuan || 0)), 0) || 0), 0);

          // Find if there is custom budget override
          const customOverride = customBaznasValues.find(v => 
            v.month.toLowerCase() === targetMonth.toLowerCase() &&
            v.year === targetYear &&
            v.code === item.code &&
            (v.account ? v.account.toLowerCase() === baznasAccount.toLowerCase() : baznasAccount.toLowerCase() === 'smp')
          );

          const budgetAsi = customOverride && customOverride.budget !== undefined ? customOverride.budget : item.budget;

          return {
            ...item,
            anggaranVal: budgetAsi,
            realisasiVal: totalRincianReal
          };
        } else {
          const matches = submissions.filter(sub => {
            const my = getSubmissionMonthAndYear(sub);
            if (!my) return false;
            
            const codeMatches = sub.kodeBudget === item.code;
            const periodMatches = my.month.toLowerCase() === targetMonth.toLowerCase() && my.year === targetYear;
            const isValidStage = (sub.currentStageIndex >= 4 || sub.status === 'APPROVED' || sub.status === 'approved') && sub.status !== 'REJECTED' && sub.status !== 'rejected';
            
            // Check Account
            const subAccount = sub.sumberRekening || 'SMP';
            const accountMatches = baznasAccount === 'SMP'
              ? (subAccount === 'SMP' || subAccount === 'Donasi SMP')
              : (subAccount === 'SMA' || subAccount === 'Donasi SMA');
              
            return codeMatches && periodMatches && isValidStage && accountMatches;
          });
          
          const sum = matches.reduce((acc, sub) => acc + (sub.amount || 0), 0);
          
          let initialReal = sum;
          if (sum === 0 && targetMonth === 'Januari' && targetYear === '2026') {
            initialReal = item.realDefault;
          }

          const customOverride = customBaznasValues.find(v => 
            v.month.toLowerCase() === targetMonth.toLowerCase() &&
            v.year === targetYear &&
            v.code === item.code &&
            (v.account ? v.account.toLowerCase() === baznasAccount.toLowerCase() : baznasAccount.toLowerCase() === 'smp')
          );

          const realAsi = customOverride && customOverride.real !== undefined ? customOverride.real : initialReal;
          const budgetAsi = customOverride && customOverride.budget !== undefined ? customOverride.budget : item.budget;
            
          return {
            ...item,
            anggaranVal: budgetAsi,
            realisasiVal: realAsi
          };
        }
      }
      
      return {
        ...item,
        anggaranVal: 0,
        realisasiVal: 0
      };
    });

    // Segment-based parent-child checker
    const isDescendant = (parentCode: string, childCode: string) => {
      if (parentCode === childCode) return true;
      if (childCode.startsWith(parentCode + '.')) return true;
      if (parentCode.length === 1 && childCode.startsWith(parentCode)) return true;
      return false;
    };

    // Calculate rolled-up values for all headers (level 0, 1, 2)
    // from the calculated leaf values (level 3)
    const leaves = leafCalculated.filter(item => item.level === 3);

    const rolledUp = leafCalculated.map(item => {
      if (item.level < 3) {
        const descendants = leaves.filter(leaf => isDescendant(item.code, leaf.code));
        const totalBudget = descendants.reduce((acc, d) => acc + (d.anggaranVal || 0), 0);
        const totalReal = descendants.reduce((acc, d) => acc + (d.realisasiVal || 0), 0);
        return {
          ...item,
          anggaranVal: totalBudget,
          realisasiVal: totalReal
        };
      }
      return item;
    });

    return rolledUp;
  };

  const reportItems = computeReportData(baznasMonth, baznasYear);
  const totalAnggaran = reportItems.filter(item => item.level === 0).reduce((acc, c) => acc + c.anggaranVal, 0);
  const totalRealisasi = reportItems.filter(item => item.level === 0).reduce((acc, c) => acc + c.realisasiVal, 0);
  const totalVarian = totalAnggaran - totalRealisasi;

  const activeExpenditures = reportItems
    .filter(item => item.level === 3 && item.realisasiVal > 0)
    .map(item => ({
      code: item.code,
      name: item.name,
      amount: item.realisasiVal,
      formattedAmount: `Rp ${item.realisasiVal.toLocaleString('id-ID')}`,
      displayName: `${item.code} - ${item.name.length > 28 ? item.name.substring(0, 28) + '...' : item.name}`
    }))
    .sort((a, b) => b.amount - a.amount);

  useEffect(() => {
    if (!userUid) return;

    const q = query(collection(db, 'laporan_baznas'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData: Report[] = [];
      snapshot.forEach((doc) => {
        reportsData.push({ id: doc.id, ...doc.data() } as Report);
      });
      setData(reportsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'laporan_baznas');
    });

    return () => unsubscribe();
  }, [userUid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!month || !year || !amount || !reportDate || !bastLink) {
      toast.error("Mohon lengkapi semua field laporan (kecuali keterangan)");
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'laporan_baznas', editingId), {
          month,
          year,
          amount: parseInt(amount.toString().replace(/\./g, '')) || 0,
          date: reportDate,
          bastLink,
          linkRincian,
          keterangan,
          updatedAt: serverTimestamp()
        });
        toast.success("Berhasil mengupdate laporan");
      } else {
        await addDoc(collection(db, 'laporan_baznas'), {
          month,
          year,
          amount: parseInt(amount.toString().replace(/\./g, '')) || 0,
          date: reportDate,
          bastLink,
          linkRincian,
          keterangan,
          createdAt: serverTimestamp()
        });
        toast.success("Berhasil menyimpan laporan");
      }
      
      resetForm();
    } catch (error) {
       toast.error(editingId ? 'Gagal mengupdate laporan' : 'Gagal menyimpan laporan');
       handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'laporan_baznas');
    } finally {
       setIsSubmitting(false);
       setEditingId(null);
    }
  };

  const resetForm = () => {
    setAmount('');
    setReportDate('');
    setBastLink('');
    setLinkRincian('');
    setKeterangan('');
    setEditingId(null);
  };

  const handleEdit = (report: Report) => {
    setEditingId(report.id);
    setMonth(report.month);
    setYear(report.year);
    setAmount(report.amount.toString());
    setReportDate(report.date);
    setBastLink(report.bastLink || '');
    setLinkRincian(report.linkRincian || (report as any).buktiRincianLink || (report as any).rincianLink || '');
    setKeterangan(report.keterangan || '');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus laporan ini?')) return;
    try {
      await deleteDoc(doc(db, 'laporan_baznas', id));
      toast.success('Laporan berhasil dihapus');
    } catch (error) {
      toast.error('Gagal menghapus laporan');
      handleFirestoreError(error, OperationType.DELETE, 'laporan_baznas');
    }
  };

  const handleExportCSV = () => {
    const csvData = data.map(d => ({
      "bulan laporan": d.month,
      "tahun laporan": d.year,
      "nominal laporan": d.amount,
      "tanggal laporan": d.date,
      "link bukti BAST": d.bastLink,
      "link bukti rincian laporan": d.linkRincian || '',
      "Keterangan": d.keterangan
    }));
    const csvString = Papa.unparse(csvData);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Laporan_MONETA_${new Date().getTime()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
    const headers = ["bulan laporan", "tahun laporan", "nominal laporan", "tanggal laporan", "link bukti BAST", "link bukti rincian laporan", "Keterangan"];
    const csvString = Papa.unparse([headers]);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Template_Import_Laporan.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          setIsSubmitting(true);
          const imports = results.data as any[];
          for (const ObjectRow of imports) {
            const m = ObjectRow["bulan laporan"];
            const y = ObjectRow["tahun laporan"];
            const a = parseFloat(ObjectRow["nominal laporan"]) || 0;
            const d = ObjectRow["tanggal laporan"];
            const bLink = ObjectRow["link bukti BAST"];
            const rLink = ObjectRow["link bukti rincian laporan"] || ObjectRow["link rincian"] || '';
            const k = ObjectRow["Keterangan"] || '';

            if (!m || !y) continue;

            await addDoc(collection(db, 'laporan_baznas'), {
                month: m,
                year: y,
                amount: a,
                date: d || '',
                bastLink: bLink || '',
                linkRincian: rLink || '',
                keterangan: k || '',
                createdAt: serverTimestamp()
            });
          }
          
          toast.success("Berhasil mengimpor data laporan");
        } catch (error) {
          toast.error("Gagal mengimpor data laporan");
        } finally {
          setIsSubmitting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: () => {
        toast.error("Gagal membaca file CSV");
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const filteredData = data.filter(d => {
    const passMonth = filterMonth === 'all' || d.month === filterMonth;
    const passYear = filterYear === 'all' || d.year === filterYear;
    
    // Filter berdasarkan Tanggal Laporan
    let passDate = true;
    if (d.date) {
      if (filterStartDate) {
        passDate = passDate && d.date >= filterStartDate;
      }
      if (filterEndDate) {
        passDate = passDate && d.date <= filterEndDate;
      }
    } else if (filterStartDate || filterEndDate) {
      passDate = false;
    }
    
    return passMonth && passYear && passDate;
  }).sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    
    if (dateB !== dateA) {
      return dateB - dateA;
    }
    
    const yearDiff = parseInt(b.year) - parseInt(a.year);
    if (yearDiff !== 0) return yearDiff;
    return MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month);
  });

  const totalFilteredReport = filteredData.reduce((sum, r) => sum + r.amount, 0);

  const chartData = MONTHS.map(m => {
    const monthReports = filteredData.filter(d => d.month === m && d.year === (filterYear === 'all' ? year : filterYear));
    const total = monthReports.reduce((sum, r) => sum + r.amount, 0);
    return {
      month: m.substring(0, 3), // short name
      fullMonth: m,
      total
    };
  });

  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const penggunaanDanaRef = useRef<HTMLDivElement>(null);
  const rincianLaporanRef = useRef<HTMLDivElement>(null);
  const settlementLaporanRef = useRef<HTMLDivElement>(null);
  const [isPDFSelectionOpen, setIsPDFSelectionOpen] = useState(false);

  // Standard (BAST & Realisasi Standard) PDF Downloader with multi-page & clean rendering
  const handleDownloadPDF = async () => {
    if (!pdfContainerRef.current) return;
    setIsExportingPDF(true);
    toast.info('Menyiapkan file PDF...', { duration: 2000 });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { toPng } = await import('html-to-image');
      const element = pdfContainerRef.current;
      const originalStyle = element.style.cssText;
      
      element.style.width = '1050px';
      element.style.minWidth = '1050px';
      element.style.maxWidth = '1050px';
      element.style.height = 'auto';
      element.style.overflow = 'visible';
      
      const dataUrl = await toPng(element, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        style: {
          width: '1050px',
          height: 'auto',
          overflow: 'visible',
          transform: 'none',
        }
      });
      
      element.style.cssText = originalStyle;
      
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      const pdfWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgWidth = img.width;
      const imgHeight = img.height;
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;
      
      let heightLeft = pdfHeight;
      let position = 0;
      let pageNum = 1;

      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft > 0) {
        position = -(pageHeight * pageNum);
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
        pageNum++;
      }
      
      const fileName = `Laporan_Realisasi_BAZNAS_${year}.pdf`;
      pdf.save(fileName);
      toast.success('Berhasil mendownload PDF');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Gagal mendownload PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Dedicated high-quality BAZNAS reports exporter with fixed-width scaling and automated multi-page slicing
  const handleDownloadPDFType = async (type: 'penggunaan_dana' | 'rincian_pertum' | 'settlement') => {
    setIsPDFSelectionOpen(false);
    
    const targetRef = type === 'penggunaan_dana' ? penggunaanDanaRef : type === 'rincian_pertum' ? rincianLaporanRef : settlementLaporanRef;
    if (!targetRef.current) return;
    
    setIsExportingPDF(true);
    toast.info('Menyiapkan file PDF...', { duration: 2500 });
    
    try {
      // Allow state update to propagate so buttons and edit-actions are fully hidden
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const { toPng } = await import('html-to-image');
      const element = targetRef.current;
      
      // Store current style state
      const originalStyle = element.style.cssText;
      
      // Override style during conversion to ensure it is in full print mode regardless of user viewport
      element.style.width = '1050px';
      element.style.minWidth = '1050px';
      element.style.maxWidth = '1050px';
      element.style.height = 'auto';
      element.style.overflow = 'visible';
      element.style.position = 'relative';
      element.style.backgroundColor = '#ffffff';
      
      const dataUrl = await toPng(element, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        style: {
          width: '1050px',
          height: 'auto',
          overflow: 'visible',
          transform: 'none',
        }
      });
      
      // Restore original Styles
      element.style.cssText = originalStyle;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      const pdfWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgWidth = img.width;
      const imgHeight = img.height;
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;
      
      let heightLeft = pdfHeight;
      let position = 0;
      let pageNum = 1;

      // Add first page
      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      
      // Add subsequent pages if height is more than 1 page
      while (heightLeft > 0) {
        position = -(pageHeight * pageNum);
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
        pageNum++;
      }
      
      const titleLabel = type === 'penggunaan_dana' ? 'Penggunaan_Dana' : type === 'rincian_pertum' ? 'Rincian_PertUM' : 'Settlement';
      const fileName = `Laporan_BAZNAS_${titleLabel}_${baznasMonth}_${baznasYear}.pdf`;
        
      pdf.save(fileName);
      toast.success('Berhasil mendownload PDF');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Gagal mendownload PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div ref={pdfContainerRef} className="space-y-6 bg-slate-50/50 p-2 md:p-6 rounded-[2.5rem]">
      {/* Tab Navigation - Hides on PDF export */}
      {!isExportingPDF && (
        <div className="flex border-b border-slate-200/60 pb-1 flex-wrap gap-2" id="laporan-tabs">
          <button
            type="button"
            onClick={() => setActiveTab('standard')}
            className={`pb-3 px-4 font-black text-xs uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'standard'
                ? 'border-emerald-500 text-slate-800'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <FileText size={14} />
            BAST & Realisasi Standard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('baznas')}
            className={`pb-3 px-4 font-black text-xs uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'baznas'
                ? 'border-emerald-500 text-slate-800'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Calendar size={14} />
            Laporan Pertum Format BAZNAS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settlement')}
            className={`pb-3 px-4 font-black text-xs uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'settlement'
                ? 'border-emerald-500 text-slate-800'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Calculator size={14} />
            Penyusunan Settlement BAZNAS
          </button>
        </div>
      )}

      {/* Header section with download button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {activeTab === 'settlement'
              ? 'Penyusunan Settlement BAZNAS'
              : activeTab === 'baznas'
              ? 'Laporan Format BAZNAS'
              : 'Laporan Realisasi'}
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {activeTab === 'settlement'
              ? `Formulir & Rekapitulasi Settlement Keuangan Berdasarkan Budget, Kode Budget, dan Pagu Anggaran Periode ${baznasMonth} ${baznasYear}`
              : activeTab === 'baznas'
              ? `Laporan Pertanggungjawaban Uang Muka (PertUM) Periode ${baznasMonth} ${baznasYear}`
              : 'Kelola dan pantau laporan realisasi anggaran.'}
          </p>
        </div>
        {!isExportingPDF && activeTab === 'standard' && (
          <div className="flex items-center gap-2" id="laporan-header-actions">
             <Button 
              variant="outline" 
              onClick={handleDownloadPDF}
              className="font-bold border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl shadow-sm transition-all text-xs h-10 px-4"
              disabled={isExportingPDF || data.length === 0}
            >
              <FileDown className="mr-2" size={16} /> {isExportingPDF ? 'Memproses...' : 'Unduh PDF'}
             </Button>
          </div>
        )}
      </div>

      {activeTab === 'settlement' ? (
        /* SETTLEMENT BAZNAS VIEW */
        <div className="space-y-6" ref={settlementLaporanRef}>
          {/* Controls & Filter Bar - Hides on PDF export */}
          {!isExportingPDF && (
            <div className="space-y-4" id="settlement-controls-and-form">
              <Card className="rounded-3xl border border-slate-100 shadow-sm bg-white overflow-hidden">
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-wrap items-end gap-3 justify-between">
                    <div className="flex flex-wrap items-end gap-3 flex-1 min-w-[280px]">
                      {/* Month */}
                      <div className="space-y-1.5 w-36">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bulan</Label>
                        <Select value={baznasMonth} onValueChange={setBaznasMonth}>
                          <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 text-xs h-9 font-semibold">
                            <SelectValue placeholder="Pilih Bulan" />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map(m => (
                              <SelectItem key={m} value={m} className="text-xs font-medium">{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Year */}
                      <div className="space-y-1.5 w-28">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tahun</Label>
                        <Select value={baznasYear} onValueChange={setBaznasYear}>
                          <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 text-xs h-9 font-semibold">
                            <SelectValue placeholder="Pilih Tahun" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2024" className="text-xs font-medium">2024</SelectItem>
                            <SelectItem value="2025" className="text-xs font-medium">2025</SelectItem>
                            <SelectItem value="2026" className="text-xs font-medium">2026</SelectItem>
                            <SelectItem value="2027" className="text-xs font-medium">2027</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Rekening / Unit */}
                      <div className="space-y-1.5 w-48">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Unit Rekening BAZNAS</Label>
                        <Select value={baznasAccount} onValueChange={(val: 'SMP' | 'SMA') => setBaznasAccount(val)}>
                          <SelectTrigger className="rounded-xl bg-emerald-50/60 border-emerald-200 text-emerald-800 text-xs h-9 font-bold">
                            <SelectValue placeholder="Pilih Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SMP" className="text-xs font-bold text-emerald-700">SMP Cendekia BAZNAS</SelectItem>
                            <SelectItem value="SMA" className="text-xs font-bold text-emerald-700">SMA Cendekia BAZNAS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Jenis Dana */}
                      <div className="space-y-1.5 w-32">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sumber Dana</Label>
                        <Select value={baznasDana} onValueChange={setBaznasDana}>
                          <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 text-xs h-9 font-semibold">
                            <SelectValue placeholder="Pilih Dana" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ZAKAT" className="text-xs font-medium">ZAKAT</SelectItem>
                            <SelectItem value="INFAQ" className="text-xs font-medium">INFAQ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* No PPD */}
                      <div className="space-y-1.5 w-32">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">No. PPD</Label>
                        <Input 
                          value={baznasNoPpd}
                          onChange={e => setBaznasNoPpd(e.target.value)}
                          placeholder="145430"
                          className="rounded-xl bg-slate-50 border-slate-200 text-xs h-9 font-mono font-semibold"
                        />
                      </div>

                      {/* Reset Button */}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setBaznasMonth('Juni');
                          setBaznasYear('2026');
                          setBaznasAccount('SMA');
                          setBaznasNoPpd('145430');
                          setBaznasDana('ZAKAT');
                          setSettlementSearchTerm('');
                        }}
                        className="h-9 px-3 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 font-bold text-xs"
                      >
                        <RefreshCw size={12} className="mr-1.5" /> Reset
                      </Button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleOpenAddSettlement()}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-bold text-xs h-9 px-4 transition-all"
                      >
                        <Plus size={14} className="mr-1.5" /> + Input Settlement Baru
                      </Button>

                      <Button
                        variant="outline"
                        onClick={handleLoadDefaultSettlement}
                        disabled={isResettingSettlement}
                        className="border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl font-bold text-xs h-9 px-3"
                      >
                        <RefreshCw size={12} className={`mr-1.5 ${isResettingSettlement ? 'animate-spin' : ''}`} />
                        Muat Data BAZNAS
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleDownloadPDFType('settlement')}
                        className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl font-bold text-xs h-9 px-3"
                      >
                        <FileDown size={14} className="mr-1.5" /> Unduh PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* MAIN FORMAL REPORT CONTAINER matching requested "LAPORAN PERTUM SCB" format */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-md space-y-6" id="settlement-print-table">
            
            {/* TOP HEADER */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-700 flex items-center justify-center text-white font-black text-lg shadow-sm">
                    SCB
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                      LAPORAN PERTUM {baznasAccount} SCB
                    </h1>
                    <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                      SEKOLAH CENDEKIA BAZNAS
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-2 border-slate-900 p-2.5 rounded text-xs font-mono font-bold text-slate-900 space-y-1 bg-slate-50 min-w-[200px]">
                <div className="flex justify-between">
                  <span>PERIODE</span>
                  <span>: {baznasMonth.toUpperCase()} {baznasYear}</span>
                </div>
                <div className="flex justify-between">
                  <span>DANA</span>
                  <span>: {baznasDana || 'ZAKAT'}</span>
                </div>
                <div className="flex justify-between">
                  <span>PPD</span>
                  <span>: {baznasNoPpd || '145430'}</span>
                </div>
              </div>
            </div>

            {/* SETTLEMENT ITEMS DISPLAYED BY BUDGET CODE GROUPS */}
            {(() => {
              const displaySettlementItems = sortedSettlementItems.length > 0 
                ? sortedSettlementItems 
                : (baznasAccount === 'SMA' && baznasMonth === 'Juni' && baznasYear === '2026' ? DEFAULT_BAZNAS_SETTLEMENT_SMA_JUNI_2026 : []);

              if (displaySettlementItems.length === 0) {
                return (
                  <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-3">
                    <p className="text-slate-500 font-bold text-sm">
                      Belum ada data settlement BAZNAS untuk {baznasAccount} periode {baznasMonth} {baznasYear}.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleLoadDefaultSettlement}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                    >
                      <RefreshCw size={12} className="mr-1.5" /> Muat Data BAZNAS SMA Juni 2026
                    </Button>
                  </div>
                );
              }

              // Group items by unique kodeBudget
              const grouped: Record<string, { kodeBudget: string; namaAnggaran: string; items: any[] }> = {};
              for (const item of displaySettlementItems) {
                const rawCode = item.kodeBudget || 'LAIN';
                const code = normalizeBudgetCode(rawCode);
                if (!grouped[code]) {
                  grouped[code] = {
                    kodeBudget: code,
                    namaAnggaran: item.namaAnggaran || getBudgetItemMeta(code, baznasAccount).name,
                    items: []
                  };
                }
                grouped[code].items.push(item);
              }

              const groupCodes = Object.keys(grouped);

              let grandTotalCredit = 0;

              return (
                <div className="space-y-5">
                  {/* MAIN TABLE HEADER BAR */}
                  <div className="grid grid-cols-12 bg-[#1d609b] text-white font-black text-[11px] uppercase tracking-wider py-2.5 px-3 rounded-t border-2 border-[#1d609b] text-center gap-1">
                    <div className="col-span-1">NO DOC</div>
                    <div className="col-span-2">NO BUKTI</div>
                    <div className="col-span-2">TGL/ BUDGET</div>
                    <div className="col-span-3">KETERANGAN</div>
                    <div className="col-span-1">QTY</div>
                    <div className="col-span-1">HARGA SATUAN</div>
                    <div className="col-span-1">DEBIT</div>
                    <div className="col-span-1">CREDIT / BALANCE</div>
                  </div>

                  {/* GROUPS */}
                  {groupCodes.map((code) => {
                    const group = grouped[code];
                    
                    // Group total
                    const groupTotal = group.items.reduce((sum, item) => {
                      const c = item.details && item.details.length > 0
                        ? item.details.reduce((dSum: number, d: any) => dSum + ((parseFloat(d.qty) || 1) * (parseInt(d.hargaSatuan) || 0)), 0)
                        : (item.creditTotal || 0);
                      return sum + c;
                    }, 0);

                    grandTotalCredit += groupTotal;

                    return (
                      <div key={code} className="border-2 border-slate-900 rounded bg-white overflow-hidden shadow-sm">
                        {/* Group Title Header */}
                        <div className="bg-slate-100 border-b-2 border-slate-900 px-4 py-2 font-black text-xs text-slate-900 tracking-wide uppercase flex items-center justify-between">
                          <div>
                            <span className="font-mono bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300 mr-2">
                              {group.kodeBudget}
                            </span>
                            {group.namaAnggaran}
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold">
                            {group.items.length} Dokumen
                          </span>
                        </div>

                        {/* Document Rows */}
                        <div className="divide-y divide-slate-200 text-xs">
                          {group.items.map((docItem: any) => {
                            const itemCreditTotal = docItem.details && docItem.details.length > 0
                              ? docItem.details.reduce((dSum: number, d: any) => dSum + ((parseFloat(d.qty) || 1) * (parseInt(d.hargaSatuan) || 0)), 0)
                              : (docItem.creditTotal || 0);

                            const hasDetails = docItem.details && docItem.details.length > 0;

                            return (
                              <div key={docItem.id || docItem.noDoc} className="bg-white hover:bg-slate-50/70">
                                {/* MAIN DOC ROW */}
                                <div className="grid grid-cols-12 py-2 px-3 items-center font-bold text-slate-900 gap-1 border-b border-slate-100 text-xs">
                                  <div className="col-span-1 text-center font-mono text-slate-900">
                                    {docItem.noDoc}
                                  </div>
                                  <div className="col-span-2 font-mono text-slate-900">
                                    {docItem.noBukti}
                                  </div>
                                  <div className="col-span-2 text-slate-800 text-[11px]">
                                    {docItem.tanggalBudget}
                                  </div>
                                  <div className="col-span-3 text-slate-900 font-bold">
                                    {docItem.keterangan}
                                  </div>
                                  <div className="col-span-1 text-center text-slate-400">
                                    -
                                  </div>
                                  <div className="col-span-1 text-right text-slate-400 font-mono">
                                    -
                                  </div>
                                  <div className="col-span-1 text-right font-mono font-semibold text-slate-700 text-[11px]">
                                    {docItem.debit || ''}
                                  </div>
                                  <div className="col-span-1 text-right font-mono font-black text-slate-900 flex items-center justify-end gap-1">
                                    {!hasDetails && `Rp ${itemCreditTotal.toLocaleString('id-ID')}`}
                                    
                                    {!isExportingPDF && (
                                      <div className="flex items-center ml-1">
                                        <button
                                          type="button"
                                          onClick={() => handleEditSettlement(docItem)}
                                          className="text-blue-600 hover:text-blue-800 p-1"
                                          title="Edit"
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteSettlement(docItem)}
                                          className="text-red-500 hover:text-red-700 p-1"
                                          title="Hapus"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* SUB-ITEM DETAILS */}
                                {hasDetails && (
                                  <div className="bg-slate-50/60 divide-y divide-slate-100 pl-4">
                                    {docItem.details.map((det: any, dIdx: number) => {
                                      const lineTotal = (parseFloat(det.qty) || 1) * (parseInt(det.hargaSatuan) || 0);
                                      return (
                                        <div key={dIdx} className="grid grid-cols-12 py-1.5 px-3 items-center text-[11px] text-slate-700 gap-1 hover:bg-slate-100/60">
                                          <div className="col-span-1 text-center font-mono text-slate-400">
                                            {/* empty */}
                                          </div>
                                          <div className="col-span-2 font-mono font-bold text-slate-700">
                                            {det.noBuktiDetail || String.fromCharCode(97 + dIdx)}
                                          </div>
                                          <div className="col-span-2 text-slate-500 text-[10px]">
                                            {det.tanggalDetail || ''}
                                          </div>
                                          <div className="col-span-3 text-slate-800 font-medium">
                                            {det.keteranganDetail}
                                          </div>
                                          <div className="col-span-1 text-center font-mono font-bold text-slate-800">
                                            {det.qty}
                                          </div>
                                          <div className="col-span-1 text-right font-mono text-slate-800">
                                            {parseInt(det.hargaSatuan || 0).toLocaleString('id-ID')}
                                          </div>
                                          <div className="col-span-1 text-right font-mono text-slate-400">
                                            -
                                          </div>
                                          <div className="col-span-1 text-right font-mono font-bold text-slate-900">
                                            Rp {lineTotal.toLocaleString('id-ID')}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Group Subtotal Footer */}
                        <div className="bg-slate-100 border-t-2 border-slate-900 px-4 py-2 flex items-center justify-end font-mono font-bold text-xs text-slate-900">
                          <span className="mr-3 font-sans uppercase text-[10px] tracking-wider text-slate-600">
                            Subtotal {group.kodeBudget}:
                          </span>
                          <span className="bg-white border border-slate-900 px-3 py-1 rounded text-slate-950 font-black">
                            Rp {groupTotal.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* OVERALL GRAND TOTAL ROW */}
                  <div className="border-2 border-slate-900 bg-slate-900 text-white font-black text-xs p-3.5 flex items-center justify-between rounded shadow-sm">
                    <span className="uppercase tracking-wider font-bold text-sm">
                      TOTAL REKAPITULASI SETTLEMENT
                    </span>
                    <span className="font-mono text-emerald-400 text-base font-black bg-slate-800 px-4 py-1.5 rounded border border-slate-700">
                      Rp {grandTotalCredit.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* FORMAL SIGNATURES BLOCK (4 COLUMNS) */}
                  <div className="border-2 border-slate-900 bg-white rounded overflow-hidden mt-8">
                    <div className="grid grid-cols-4 divide-x-2 divide-slate-900 text-center text-xs">
                      <div className="p-3 flex flex-col justify-between h-36">
                        <p className="font-bold text-slate-800 uppercase">Dibuat Oleh :</p>
                        <div>
                          <p className="font-bold underline text-slate-900">Dany Wahyudi</p>
                          <p className="text-[11px] text-slate-600 font-medium">Staf Akuntan</p>
                        </div>
                      </div>
                      <div className="p-3 flex flex-col justify-between h-36">
                        <p className="font-bold text-slate-800 uppercase">Disusun oleh :</p>
                        <div>
                          <p className="font-bold underline text-slate-900">Nur Asiah</p>
                          <p className="text-[11px] text-slate-600 font-medium">Staf Keuangan</p>
                        </div>
                      </div>
                      <div className="p-3 flex flex-col justify-between h-36">
                        <p className="font-bold text-slate-800 uppercase">Diperiksa Oleh :</p>
                        <div>
                          <p className="font-bold underline text-slate-900">Mohamad Roni</p>
                          <p className="text-[11px] text-slate-600 font-medium">Manajer Operasional</p>
                        </div>
                      </div>
                      <div className="p-3 flex flex-col justify-between h-36">
                        <p className="font-bold text-slate-800 uppercase">Diketahui Oleh :</p>
                        <div>
                          <p className="font-bold underline text-slate-900">Ahmad Kamaluddin Afif</p>
                          <p className="text-[11px] text-slate-600 font-medium">PLT. Kepala Sekolah</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>


        </div>
      ) : activeTab === 'baznas' ? (
        /* BAZNAS FORMAT VIEW */
        <div className="space-y-6">
          {/* Controls & Mini Menu Bar - Hides on PDF export */}
          {!isExportingPDF && (
            <div className="space-y-4" id="baznas-controls-and-form">
              {/* COMPACT HORIZONTAL FILTER BAR */}
              <Card className="rounded-3xl border border-slate-100 shadow-sm bg-white overflow-hidden">
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-wrap items-end gap-3 justify-between">
                    <div className="flex flex-wrap items-end gap-3 flex-1 min-w-[280px]">
                      {/* Month */}
                      <div className="space-y-1.5 w-36">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bulan</Label>
                        <Select value={baznasMonth} onValueChange={setBaznasMonth}>
                          <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 text-xs h-9">
                            <SelectValue placeholder="Pilih Bulan" />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map(m => (
                              <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Year */}
                      <div className="space-y-1.5 w-24">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tahun</Label>
                        <Input
                          type="number"
                          value={baznasYear}
                          onChange={e => setBaznasYear(e.target.value)}
                          className="rounded-xl bg-slate-50 border-slate-200 text-xs h-9 font-bold text-center"
                        />
                      </div>

                      {/* Rekening / Account Select */}
                      <div className="space-y-1.5 w-44">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rekening Sumber</Label>
                        <Select value={baznasAccount} onValueChange={(val: 'SMP' | 'SMA') => {
                          setBaznasAccount(val);
                          if (val === 'SMA') {
                            setBaznasNoPpd('137911');
                          } else {
                            setBaznasNoPpd('137910');
                          }
                        }}>
                          <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 text-xs h-9 font-semibold">
                            <SelectValue placeholder="Pilih Rekening" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SMP" className="text-xs">Rekening SMP (SCB)</SelectItem>
                            <SelectItem value="SMA" className="text-xs">Rekening SMA (SCB)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* No. PPD */}
                      <div className="space-y-1.5 w-32">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">No. PPD</Label>
                        <Input
                          type="text"
                          value={baznasNoPpd}
                          onChange={e => setBaznasNoPpd(e.target.value)}
                          className="rounded-xl bg-slate-50 border-slate-200 text-xs h-9 font-mono font-bold text-center"
                          placeholder="Contoh: 137910"
                        />
                      </div>

                      {/* Reset Button */}
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => {
                          setBaznasMonth('Januari');
                          setBaznasYear('2026');
                          setBaznasNoPpd('137910');
                          setBaznasAccount('SMP');
                          toast.success("Parameter diset kembali ke Januari 2026 Rekening SMP.");
                        }}
                        className="rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border-none h-9 px-3.5 text-xs transition-all mt-auto"
                        title="Kembalikan filter ke nilai asal"
                      >
                        <RefreshCw size={13} className="mr-1" />
                        Reset Filter
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SLICK PREMIUM ACTION MENU BAR / TOOLBAR */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-md">
                <div className="px-3 py-1 flex items-center gap-2 border-r border-slate-800 text-slate-400 hidden sm:flex">
                  <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">MENU PERTUM:</span>
                </div>
                
                {/* Button 1: Tambah Rincian */}
                <Button
                  onClick={handleOpenAddRincian}
                  className="rounded-xl font-black bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 px-4 shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Plus size={14} className="stroke-[3]" />
                  Tambah Rincian Transaksi
                </Button>

                {/* Button 2: Lihat Grafik */}
                <Button
                  onClick={() => setIsChartDialogOpen(true)}
                  className="rounded-xl font-bold bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 text-xs h-9 px-4 transition-all flex items-center gap-1.5"
                >
                  <BarChart2 size={14} className="text-emerald-400" />
                  Visualisasi & Grafik Belanja
                </Button>

                {/* Button 3: Sesuaikan Target Anggaran */}
                <Button
                  onClick={() => setIsBudgetDialogOpen(true)}
                  className="rounded-xl font-bold bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 text-xs h-9 px-4 transition-all flex items-center gap-1.5"
                >
                  <Settings size={14} className="text-blue-400" />
                  Pagu Target Anggaran
                </Button>

                {/* Divider */}
                <div className="h-6 w-[1px] bg-slate-800 mx-1 hidden md:block" />

                {/* Button 4: Muat Rincian Default */}
                <Button
                  onClick={handleLoadDefaults}
                  className="rounded-xl font-medium bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white text-xs h-9 px-3 transition-all flex items-center gap-1.5 border border-dashed border-slate-700"
                >
                  <RefreshCw size={12} className="text-rose-400" />
                  Muat Rincian Default
                </Button>

                {/* Button 5: Unduh Laporan PDF */}
                <div className="ml-auto pr-1">
                  <Button
                    onClick={() => setIsPDFSelectionOpen(true)}
                    className="rounded-xl font-black bg-slate-800 hover:bg-slate-750 text-white hover:text-emerald-400 border border-slate-700 text-xs h-9 px-4 shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <FileDown size={14} />
                    Unduh PDF
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* BAZNAS Print Sheet */}
          <div ref={penggunaanDanaRef} className={isExportingPDF ? "bg-white p-2" : ""}>
            <Card className={`rounded-3xl border border-slate-105/60 ${isExportingPDF ? 'shadow-none border-none p-0' : 'shadow-sm p-4 md:p-8'} bg-white overflow-hidden`}>
            <div className="space-y-6">
              {/* Report Header */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between border-b border-slate-200 pb-4 gap-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                    PENGGUNAAN DANA PERIODE {baznasMonth.toUpperCase()} {baznasYear}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sekolah Cendekia BAZNAS (SCB) — REKENING {baznasAccount}</p>
                </div>
                <div className="shrink-0 flex items-center md:justify-end">
                  <div className="bg-slate-950 text-white font-extrabold text-[11px] tracking-widest uppercase px-4 py-2 rounded-xl">
                    NO. PPD {baznasNoPpd}
                  </div>
                </div>
              </div>

              {/* Penerimaan Block */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-[14px] font-black uppercase text-slate-900 tracking-wide">A. PENERIMAAN</h4>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Batas Anggota Pembiayaan / Uang Muka dari BAZNAS Pusat untuk periode {baznasMonth} {baznasYear}.</p>
                  </div>
                  <div className="text-left md:text-right">
                    <span className="text-2xl font-black text-emerald-600 font-mono">
                      Rp {totalAnggaran.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* DIALOG DETAILS FOR MENU BAR */}
              {!isExportingPDF && (
                <>
                  {/* DIALOG CHART VISUALISASI */}
                  <Dialog open={isChartDialogOpen} onOpenChange={setIsChartDialogOpen}>
                    <DialogContent className="w-[96vw] sm:max-w-[92vw] md:max-w-4xl lg:max-w-5xl xl:max-w-6xl rounded-3xl p-6 bg-slate-50 border border-slate-200">
                      <DialogHeader className="border-b pb-4 mb-2">
                        <DialogTitle className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                          <BarChart2 className="text-emerald-600" size={18} />
                          Visualisasi & Distribusi Pengeluaran ({baznasMonth} {baznasYear})
                        </DialogTitle>
                        <p className="text-xs text-slate-500 font-medium -mt-1">
                          Bagan rincian pos anggaran berdasarkan pengeluaran riil di rekening {baznasAccount}.
                        </p>
                      </DialogHeader>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-150 shadow-sm h-[320px] sm:h-[400px]">
                          {activeExpenditures.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                              <FileText size={40} className="stroke-[1.5] text-slate-300" />
                              <p className="text-xs font-bold uppercase tracking-wider">Belum Ada Pengeluaran Riil</p>
                              <p className="text-[10px] text-slate-400">Silakan input data realisasi rincian terlebih dahulu.</p>
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={activeExpenditures} margin={{ top: 20, right: 10, left: 20, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                  dataKey="code" 
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                                />
                                <YAxis 
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                                  tickFormatter={(value) => `Rp ${(value / 1000).toLocaleString('id-ID')}rb`}
                                  width={75}
                                />
                                <Tooltip 
                                  cursor={{ fill: '#f8fafc' }}
                                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)' }}
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      const percent = totalRealisasi > 0 ? ((data.amount / totalRealisasi) * 100).toFixed(1) : 0;
                                      return (
                                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-lg text-[11px] space-y-1">
                                          <p className="font-bold text-slate-900 text-xs">{data.code} - {data.name}</p>
                                          <div className="flex justify-between gap-4 text-slate-500 pt-1 border-t border-slate-100">
                                            <span>Pengeluaran:</span>
                                            <span className="font-bold text-emerald-600 font-mono">{data.formattedAmount}</span>
                                          </div>
                                          <div className="flex justify-between gap-4 text-slate-500">
                                            <span>Porsi belanja:</span>
                                            <span className="font-bold text-slate-700 font-mono">{percent}%</span>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Bar 
                                  dataKey="amount" 
                                  fill="#10b981" 
                                  radius={[6, 6, 0, 0]} 
                                  barSize={32}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between h-full">
                            <span className="text-[11px] font-black tracking-wider text-slate-400 uppercase block mb-3">Analisis Ringkas Belanja</span>
                            
                            <div className="space-y-4 py-2 flex-grow">
                              <div>
                                <span className="text-xs text-slate-400 font-semibold block">Total Penerimaan</span>
                                <span className="text-lg font-black text-slate-800 font-mono">Rp {totalAnggaran.toLocaleString('id-ID')}</span>
                              </div>
                              
                              <div>
                                <span className="text-xs text-slate-400 font-semibold block">Total Pengeluaran</span>
                                <span className="text-lg font-black text-emerald-600 font-mono">Rp {totalRealisasi.toLocaleString('id-ID')}</span>
                              </div>

                              <div>
                                <span className="text-xs text-slate-400 font-semibold block">Efisiensi (Sisa Saldo)</span>
                                <span className={`text-lg font-black font-slate-800 font-mono ${totalVarian < 0 ? 'text-rose-500' : 'text-blue-600'}`}>
                                  Rp {totalVarian.toLocaleString('id-ID')}
                                </span>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 mt-4">
                              <div className="flex justify-between text-xs font-bold text-slate-600">
                                <span>Rasio Penyerapan</span>
                                <span>{totalAnggaran > 0 ? ((totalRealisasi / totalAnggaran) * 100).toFixed(1) : 0}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1.5">
                                <div 
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${Math.min(100, totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <DialogFooter className="mt-4 pt-4 border-t gap-2 flex justify-end">
                        <Button onClick={() => setIsChartDialogOpen(false)} className="rounded-xl px-5 font-bold h-10 text-xs bg-slate-900 hover:bg-slate-800 text-white transition-all">
                          Selesai & Tutup
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* DIALOG SESUAIKAN TARGET ANGGARAN / REALISASI */}
                  <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
                    <DialogContent className="w-[96vw] sm:max-w-md rounded-3xl p-6 bg-white border border-slate-100">
                      <DialogHeader className="border-b pb-4 mb-3">
                        <DialogTitle className="text-sm font-black text-slate-905 uppercase tracking-tight flex items-center gap-1.5">
                          <Settings className="text-emerald-605" size={18} />
                          Input & Sesuaikan Anggaran / Realisasi
                        </DialogTitle>
                        <p className="text-xs text-slate-500 font-medium -mt-1">
                          Atur pagu anggaran RKAT dan realisasi langsung untuk pos budget Level 3 perekonomian.
                        </p>
                      </DialogHeader>
                      
                      <form onSubmit={handleSaveBaznasForm} className="space-y-4">
                        <div className="space-y-1.5 text-left">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Pos Budget (Level 3)</Label>
                          <Select value={selectedBaznasCode} onValueChange={setSelectedBaznasCode}>
                            <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 text-xs h-10">
                              <SelectValue placeholder="Pilih Pos Budget" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {currentTemplates.filter(item => item.level === 3).map(item => (
                                <SelectItem key={item.code} value={item.code} className="text-xs">
                                  {item.code} - {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-left">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Anggaran (Rp)</Label>
                            <Input
                              type="text"
                              disabled={!selectedBaznasCode}
                              value={baznasFormBudget ? parseInt(baznasFormBudget.replace(/\./g, '')).toLocaleString('id-ID') : '0'}
                              onChange={e => {
                                const rawVal = e.target.value.replace(/\./g, '');
                                setBaznasFormBudget(rawVal || '0');
                              }}
                              className="rounded-xl bg-slate-50 border-slate-200 text-xs font-mono font-bold h-10"
                              placeholder="Nilai Anggaran"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Realisasi (Rp)</Label>
                            <Input
                              type="text"
                              disabled={!selectedBaznasCode}
                              value={baznasFormReal ? parseInt(baznasFormReal.replace(/\./g, '')).toLocaleString('id-ID') : '0'}
                              onChange={e => {
                                const rawVal = e.target.value.replace(/\./g, '');
                                setBaznasFormReal(rawVal || '0');
                              }}
                              className="rounded-xl bg-slate-50 border-slate-200 text-xs font-mono font-bold h-10"
                              placeholder="Nilai Realisasi"
                            />
                          </div>
                        </div>

                        <DialogFooter className="pt-4 border-t gap-2 flex justify-end">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsBudgetDialogOpen(false)} 
                            className="rounded-xl font-bold h-10 px-4 text-xs"
                          >
                            Batal
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={!selectedBaznasCode} 
                            className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-5 text-xs transition-colors"
                          >
                            Simpan Nilai Laporan
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* DIALOG SELEKSI UNDUH PDF */}
                  <Dialog open={isPDFSelectionOpen} onOpenChange={setIsPDFSelectionOpen}>
                    <DialogContent className="w-[96vw] sm:max-w-md rounded-3xl p-6 bg-white border border-slate-150 text-left">
                      <DialogHeader className="border-b pb-4 mb-4">
                        <DialogTitle className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                          <FileDown className="text-emerald-600" size={18} />
                          PILIH LAPORAN UNTUK DIUNDUH
                        </DialogTitle>
                        <p className="text-xs text-slate-500 font-medium -mt-1">
                          Pilih format dokumen laporan BAZNAS Periode {baznasMonth} {baznasYear}.
                        </p>
                      </DialogHeader>

                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => handleDownloadPDFType('penggunaan_dana')}
                          className="w-full text-left p-4 rounded-2xl border border-slate-150 hover:border-emerald-500 hover:bg-emerald-50/10 transition-all group flex items-start gap-3"
                        >
                          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition-colors mt-0.5">
                            <FileText size={18} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide group-hover:text-emerald-800 transition-colors">
                              1. Laporan Penggunaan Dana BAZNAS
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                              Unduh rekapitulasi realisasi anggaran per pos budget utama (Format BAZNAS).
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadPDFType('rincian_pertum')}
                          className="w-full text-left p-4 rounded-2xl border border-slate-150 hover:border-emerald-500 hover:bg-emerald-50/10 transition-all group flex items-start gap-3"
                        >
                          <div className="p-2 rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-105 transition-colors mt-0.5">
                            <Calendar size={18} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide group-hover:text-emerald-800 transition-colors">
                              2. Rincian Laporan PertUM (Buku Pembantu)
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                              Unduh buku pembantu detail transaksi pengeluaran riil terperinci untuk periode {baznasMonth} {baznasYear}.
                            </p>
                          </div>
                        </button>
                      </div>

                      <DialogFooter className="mt-4 pt-4 border-t gap-2 flex justify-end">
                        <Button 
                          type="button"
                          variant="outline" 
                          onClick={() => setIsPDFSelectionOpen(false)} 
                          className="rounded-xl px-4 font-bold h-10 text-xs"
                        >
                          Batal
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {/* Pengeluaran Section */}
              <div className="space-y-3">
                <h4 className="text-[14px] font-black uppercase text-slate-900 tracking-wide">B. PENGELUARAN</h4>
                
                {/* Spreadsheet Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-sm bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider text-center border-b border-slate-800">
                        <th className="py-3.5 px-3 border-r border-slate-700 w-16">NO.</th>
                        <th className="py-3.5 px-4 border-r border-slate-700 text-left">URAIAN</th>
                        <th className="py-3.5 px-4 border-r border-slate-700 text-right w-40">ANGGARAN (JUMLAH)</th>
                        <th className="py-3.5 px-4 border-r border-slate-700 text-right w-40">REALISASI</th>
                        <th className="py-3.5 px-4 border-r border-slate-700 text-right w-40">VARIAN</th>
                        <th className="py-3.5 px-3 border-slate-800 text-center w-20">KET</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px]">
                      {reportItems.map((item, index) => {
                        const isMainCategory = item.level === 0;
                        const isSubHeader = item.level > 0 && item.isHeader;
                        
                        const valAnggaran = item.anggaranVal || 0;
                        const valRealisasi = item.realisasiVal || 0;
                        const valVarian = valAnggaran - valRealisasi;

                        let rowClass = "border-b border-slate-100 hover:bg-slate-50/50";
                        if (isMainCategory) {
                          rowClass = "bg-slate-100/90 font-black text-slate-900 border-b border-slate-300";
                        } else if (isSubHeader) {
                          rowClass = "bg-slate-50/50 font-bold text-slate-800 border-b border-slate-200";
                        }

                        // Indentation of Uraian
                        let indentStyle = {};
                        if (item.level === 1) indentStyle = { paddingLeft: '1.25rem' };
                        else if (item.level === 2) indentStyle = { paddingLeft: '2.5rem' };
                        else if (item.level === 3) indentStyle = { paddingLeft: '3.75rem' };

                        return (
                          <tr key={`${item.code}-${index}`} className={rowClass}>
                            <td className={`py-2 px-3 border-r border-b border-slate-200 text-center font-bold text-slate-700 ${isMainCategory ? 'text-[12px] text-slate-950' : ''}`}>
                              {item.code}
                            </td>
                            <td style={indentStyle} className={`py-2 px-4 border-r border-b border-slate-200 ${isMainCategory ? 'text-[12px] uppercase font-black' : (isSubHeader ? 'font-bold' : 'text-slate-600')}`}>
                              {item.name}
                            </td>
                            <td className="py-2 px-4 border-r border-b border-slate-200 text-right font-mono font-semibold">
                              {valAnggaran > 0 ? valAnggaran.toLocaleString('id-ID') : '-'}
                            </td>
                            <td className="py-2 px-4 border-r border-b border-slate-200 text-right font-mono font-semibold">
                              {valRealisasi > 0 ? valRealisasi.toLocaleString('id-ID') : '-'}
                            </td>
                            <td className={`py-2 px-4 border-r border-b border-slate-200 text-right font-mono font-semibold ${valVarian < 0 ? 'text-red-650 font-bold' : 'text-slate-700'}`}>
                              {valVarian < 0 ? `(${Math.abs(valVarian).toLocaleString('id-ID')})` : (valVarian === 0 ? '-' : valVarian.toLocaleString('id-ID'))}
                            </td>
                            <td className="py-2 px-3 border-b border-slate-205 text-center text-[10px] text-slate-400">
                              {!isExportingPDF && item.level === 3 ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  type="button"
                                  onClick={() => setEditingBaznasItem({
                                    code: item.code,
                                    name: item.name,
                                    budget: valAnggaran,
                                    real: valRealisasi
                                  })}
                                  className="h-6 w-6 p-0 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg"
                                  title="Edit Nilai"
                                >
                                  <Edit2 size={12} />
                                </Button>
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* GRAND TOTAL ROW */}
                      <tr className="bg-slate-900 text-white font-black text-[12px] uppercase border-t-2 border-slate-850">
                        <td className="py-3 px-3 text-center border-r border-slate-800" colSpan={2}>
                          GRAND TOTAL PENGELUARAN
                        </td>
                        <td className="py-3 px-4 text-right border-r border-slate-800 font-mono text-emerald-400">
                          {totalAnggaran.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right border-r border-slate-800 font-mono text-emerald-400">
                          {totalRealisasi.toLocaleString('id-ID')}
                        </td>
                        <td className={`py-3 px-4 text-right border-r border-slate-800 font-mono ${totalVarian < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {totalVarian < 0 ? `(${Math.abs(totalVarian).toLocaleString('id-ID')})` : (totalVarian === 0 ? '-' : totalVarian.toLocaleString('id-ID'))}
                        </td>
                        <td className="py-3 px-3 text-center border-slate-800 text-emerald-400">
                          -
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* RINCIAN LAPORAN PERTUM TABLE CARD */}
        <div ref={rincianLaporanRef} className={isExportingPDF ? "bg-white p-2" : ""}>
          <Card className={`rounded-3xl border border-slate-100 bg-white ${isExportingPDF ? 'shadow-none border-none p-0' : 'shadow-sm p-4 md:p-8'}`}>
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
                    RINCIAN LAPORAN PERTUM PERIODE {baznasMonth.toUpperCase()} {baznasYear}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                    Buku Pembantu Pengeluaran Riil (Sub-Ledger Detail) — REKENING {baznasAccount}
                  </p>
                </div>
                {!isExportingPDF && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={handleLoadDefaults}
                      disabled={isResettingDefault}
                      className="rounded-xl font-bold border-amber-200 text-amber-700 hover:bg-amber-50 h-10 px-4 text-xs"
                    >
                      <RefreshCw size={14} className={`mr-1.5 ${isResettingDefault ? 'animate-spin' : ''}`} />
                      Muat Default Jan 2026
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById("rincian-input-card");
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-4 text-xs"
                    >
                      <Plus size={14} className="mr-1.5" />
                      Tambah Transaksi Baru
                    </Button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider text-center border-b border-slate-800">
                      <th className="py-3 px-2 border-r border-slate-700 w-12 bg-slate-900">NO DOC</th>
                      <th className="py-3 px-3 border-r border-slate-700 w-28 bg-slate-900 text-center">KODE BUDGET</th>
                      <th className="py-3 px-3 border-r border-slate-700 w-32 bg-slate-900 text-center">NO. BUKTI</th>
                      <th className="py-3 px-3 border-r border-slate-700 w-24 bg-slate-900 text-center">TANGGAL</th>
                      <th className="py-3 px-4 border-r border-slate-700 text-left bg-slate-900">KETERANGAN & RINCIAN DETAIL</th>
                      <th className="py-3 px-3 border-r border-slate-700 text-center w-36 bg-slate-900">BUKTI RINCIAN LAPORAN</th>
                      <th className="py-3 px-3 border-r border-slate-700 text-right w-20 bg-slate-900">QTY</th>
                      <th className="py-3 px-3 border-r border-slate-700 text-right w-28 bg-slate-900">HARGA SATUAN</th>
                      <th className="py-3 px-3 border-r border-slate-700 text-right w-32 bg-slate-900">JUMLAH (CREDIT)</th>
                      {!isExportingPDF && <th className="py-3 px-2 text-center w-20 bg-slate-900">AKSI</th>}
                    </tr>
                  </thead>
                  <tbody className="text-[11px]">
                    {sortedRincianItems.length === 0 ? (
                      <tr>
                        <td colSpan={isExportingPDF ? 9 : 10} className="py-8 text-center text-slate-400 font-bold text-xs bg-slate-50/50">
                          Tidak ada data rincian transaksi untuk periode ini. Silakan input baru atau klik "Muat Default Jan 2026".
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        let runningTotal = 0;
                        return sortedRincianItems.flatMap((item, itemIdx) => {
                          const totalItemCredit = item.details?.reduce((sum, d) => sum + ((d.qty || 0) * (d.hargaSatuan || 0)), 0) || 0;
                          
                          return [
                            // TRANSACTION HEADER ROW
                            <tr key={`h-${item.id || itemIdx}`} className="bg-slate-50/70 border-b border-slate-200 font-bold text-slate-800">
                              <td className="py-2.5 px-2 border-r border-slate-200 text-center text-slate-900 text-xs font-black">
                                {item.noDoc}
                              </td>
                              <td className="py-2.5 px-3 border-r border-slate-200 text-center font-mono text-xs font-bold text-emerald-700 bg-emerald-50/10">
                                {item.kodeBudget}
                              </td>
                              <td className="py-2.5 px-3 border-r border-slate-200 text-center font-mono text-xs">
                                {item.noBukti || '-'}
                              </td>
                              <td className="py-2.5 px-3 border-r border-slate-200 text-center text-xs">
                                {item.tanggalBudget || '-'}
                              </td>
                              <td className="py-2.5 px-4 border-r border-slate-200 text-xs font-black tracking-tight text-slate-900">
                                {item.keterangan}
                              </td>
                              <td className="py-2.5 px-3 border-r border-slate-200 text-center text-xs">
                                {(() => {
                                  const link = item.linkBukti || item.buktiUrl;
                                  if (link && typeof link === 'string' && link.trim().length > 0) {
                                    const href = link.startsWith('http') ? link : `https://${link}`;
                                    return (
                                      <div className="flex items-center justify-center gap-1">
                                        <a
                                          href={href}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all shadow-2xs hover:shadow-xs"
                                          title="Buka Link Bukti LPJ"
                                        >
                                          <span>Bukti LPJ</span>
                                          <ExternalLink size={12} className="shrink-0" />
                                        </a>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          type="button"
                                          onClick={() => setSelectedBuktiRincian(item)}
                                          className="h-6 w-6 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                                          title="Detail Bukti Rincian"
                                        >
                                          <FileText size={12} />
                                        </Button>
                                      </div>
                                    );
                                  }
                                  return (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      type="button"
                                      onClick={() => handleEditRincian(item)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-400 hover:text-blue-700 hover:bg-blue-50 border border-dashed border-slate-200 transition-all"
                                      title="Tambah Link Bukti Rincian Laporan"
                                    >
                                      <Plus size={10} />
                                      <span>+ Bukti LPJ</span>
                                    </Button>
                                  );
                                })()}
                              </td>
                              <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono text-slate-400 text-xs bg-slate-50/30">-</td>
                              <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono text-slate-400 text-xs bg-slate-50/30">-</td>
                              <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900 text-xs bg-slate-50">
                                Rp {totalItemCredit.toLocaleString('id-ID')}
                              </td>
                              {!isExportingPDF && (
                                <td className="py-1 px-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      type="button"
                                      onClick={() => handleEditRincian(item)}
                                      className="h-7 w-7 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg"
                                      title="Edit Rincian"
                                    >
                                      <Edit2 size={13} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      type="button"
                                      onClick={() => handleDeleteRincian(item)}
                                      className="h-7 w-7 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg"
                                      title="Hapus"
                                    >
                                      <Trash2 size={13} />
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>,
                            // SUB-ITEMS DETAIL ROWS
                            ...(item.details || []).map((detail, detIdx) => {
                              const lineTotal = (detail.qty || 0) * (detail.hargaSatuan || 0);
                              return (
                                <tr key={`d-${item.id || itemIdx}-${detIdx}`} className="border-b border-slate-100 hover:bg-slate-50/30 text-slate-600 text-[10.5px]">
                                  <td className="py-1.5 px-2 border-r border-slate-200 bg-white"></td>
                                  <td className="py-1.5 px-3 border-r border-slate-200 bg-white"></td>
                                  <td className="py-1.5 px-3 border-r border-slate-200 bg-white"></td>
                                  <td className="py-1.5 px-3 border-r border-slate-200 text-center text-slate-400 font-mono">
                                    {detail.noBuktiDetail || String.fromCharCode(97 + detIdx)}
                                  </td>
                                  <td className="py-1.5 px-4 border-r border-slate-200 pl-6 italic text-slate-650">
                                    {detail.keteranganDetail || '-'}
                                  </td>
                                  <td className="py-1.5 px-3 border-r border-slate-200 bg-white"></td>
                                  <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono">
                                    {detail.qty}
                                  </td>
                                  <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono text-slate-500">
                                    {detail.hargaSatuan > 0 ? detail.hargaSatuan.toLocaleString('id-ID') : '-'}
                                  </td>
                                  <td className="py-1.5 px-3 border-r border-slate-200 text-right font-mono text-slate-600 bg-slate-50/20">
                                    {lineTotal > 0 ? lineTotal.toLocaleString('id-ID') : '-'}
                                  </td>
                                  {!isExportingPDF && <td className="py-1.5 px-2 bg-white"></td>}
                                </tr>
                              );
                            })
                          ];
                        });
                      })()
                    )}
                    {/* TOTAL SUMMARY LEDGER ROW */}
                    <tr className="bg-slate-900 text-white font-black text-xs uppercase border-t-2 border-slate-800">
                      <td className="py-3 px-3 text-center border-r border-slate-800" colSpan={4}>
                        TOTAL RINCIAN PENGELUARAN PERTUM
                      </td>
                      <td className="py-3 px-4 border-r border-slate-800"></td>
                      <td className="py-3 px-3 border-r border-slate-800"></td>
                      <td className="py-3 px-3 border-r border-slate-800"></td>
                      <td className="py-3 px-3 border-r border-slate-800"></td>
                      <td className="py-3 px-3 text-right border-r border-slate-800 font-mono text-emerald-400 text-xs">
                        Rp {sortedRincianItems.reduce((acc, item) => acc + (item.details?.reduce((sum, d) => sum + ((d.qty || 0) * (d.hargaSatuan || 0)), 0) || 0), 0).toLocaleString('id-ID')}
                      </td>
                      {!isExportingPDF && <td className="py-3 px-2 text-center"></td>}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>

        {/* DIALOG TAMBAH / EDIT RINCIAN TRANSAKSI */}
          {!isExportingPDF && (
            <Dialog open={isRincianFormOpen} onOpenChange={(val) => {
              setIsRincianFormOpen(val);
              if (!val) {
                resetRincianForm();
              }
            }}>
              <DialogContent className="w-[96vw] sm:max-w-[92vw] md:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white border border-slate-100 text-left">
                <DialogHeader className="border-b pb-4 mb-4">
                  <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <Plus className="text-emerald-600" size={18} />
                    {editingRincianId ? 'Edit Rincian Transaksi PertUM' : 'Tambah Rincian Transaksi PertUM'}
                  </DialogTitle>
                  <p className="text-xs text-slate-500 font-medium -mt-1">
                    Lengkapi formulir untuk memasukkan transaksi rincian uang muka. Pengeluaran rincian ini akan otomatis merefleksikan nilai realisasi di Laporan Format BAZNAS.
                  </p>
                </DialogHeader>
                
                <form onSubmit={handleSaveRincian} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* LEFT SIDE: Parent Transaction Header */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2">1. Data Utama Transaksi</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 flex flex-col justify-end">
                          <Label className="text-xs font-bold text-slate-500 uppercase">Pilih Pos Budget (Level 3) <span className="text-red-500">*</span></Label>
                          <Select value={rFormBudgetCode} onValueChange={setRFormBudgetCode}>
                            <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200">
                              <SelectValue placeholder="Pilih Pos Budget" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {currentTemplates.filter(item => item.level === 3).map(item => (
                                <SelectItem key={item.code} value={item.code} className="text-xs">
                                  {item.code} — {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-500 uppercase">No. Urut Dokumen (No Doc) <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            value={rFormNoDoc}
                            onChange={e => setRFormNoDoc(parseInt(e.target.value) || 1)}
                            className="rounded-xl bg-slate-50 border-slate-200 h-10 font-bold"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-500 uppercase">No. Bukti Transaksi <span className="text-red-500">*</span></Label>
                          <Input
                            type="text"
                            value={rFormNoBukti}
                            onChange={e => setRFormNoBukti(e.target.value)}
                            placeholder="Contoh: B.01.160126"
                            className="rounded-xl bg-slate-50 border-slate-200 h-10"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-500 uppercase">Tanggal Dokumen <span className="text-red-500">*</span></Label>
                          <Input
                            type="text"
                            value={rFormTanggalBudget}
                            onChange={e => setRFormTanggalBudget(e.target.value)}
                            placeholder="Contoh: 16-Jan-26"
                            className="rounded-xl bg-slate-50 border-slate-200 h-10"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase">Keterangan Utama Transaksi <span className="text-red-500">*</span></Label>
                        <Input
                          type="text"
                          value={rFormKeterangan}
                          onChange={e => setRFormKeterangan(e.target.value)}
                          placeholder="Contoh: Klaim Kesehatan an Ust Nanang"
                          className="rounded-xl bg-slate-50 border-slate-200 h-10"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between">
                          <span>Bukti Rincian Laporan (Tautan Drive / LPJ)</span>
                          <span className="text-[10px] text-blue-600 font-semibold font-mono">Opsional</span>
                        </Label>
                        <div className="relative">
                          <Input
                            type="url"
                            value={rFormLinkBukti}
                            onChange={e => setRFormLinkBukti(e.target.value)}
                            placeholder="https://drive.google.com/drive/folders/... atau https://..."
                            className="rounded-xl bg-slate-50 border-slate-200 h-10 text-xs font-mono pl-9"
                          />
                          <ExternalLink size={14} className="absolute left-3 top-3 text-slate-400" />
                        </div>
                        <p className="text-[10px] text-slate-400">Masukkan tautan Google Drive / Cloud Storage untuk kuitansi, BAST, atau berkas LPJ rincian ini.</p>
                      </div>
                    </div>

                    {/* RIGHT SIDE: Sub-items Array Editor */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">2. Rincian Unit / Detail Pengeluaran</h4>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setRFormDetails([...rFormDetails, { noBuktiDetail: 'a', keteranganDetail: '', qty: 1, hargaSatuan: 0 }])}
                          className="rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-none font-bold text-xs h-7 px-3"
                        >
                          <Plus size={12} className="mr-1" />
                          Tambah Baris Detail
                        </Button>
                      </div>

                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {rFormDetails.map((detail, index) => (
                          <div key={index} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-3 relative">
                            {rFormDetails.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...rFormDetails];
                                  updated.splice(index, 1);
                                  setRFormDetails(updated);
                                }}
                                className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 p-1"
                                title="Hapus baris ini"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                            
                            <div className="grid grid-cols-4 gap-2">
                              <div className="col-span-1 space-y-1">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase">No/Kode</Label>
                                <Input
                                  type="text"
                                  value={detail.noBuktiDetail}
                                  onChange={e => {
                                    const updated = [...rFormDetails];
                                    updated[index].noBuktiDetail = e.target.value;
                                    setRFormDetails(updated);
                                  }}
                                  placeholder="a"
                                  className="rounded-lg border-slate-200 text-xs h-8"
                                />
                              </div>
                              <div className="col-span-3 space-y-1">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase">Keterangan / Item Penerima <span className="text-red-500">*</span></Label>
                                <Input
                                  type="text"
                                  value={detail.keteranganDetail}
                                  onChange={e => {
                                    const updated = [...rFormDetails];
                                    updated[index].keteranganDetail = e.target.value;
                                    setRFormDetails(updated);
                                  }}
                                  placeholder="Pengobatan / Pembelian obat"
                                  className="rounded-lg border-slate-200 text-xs h-8"
                                  required
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase">Bulan/Tgl</Label>
                                <Input
                                  type="text"
                                  value={detail.tanggalDetail || ''}
                                  onChange={e => {
                                    const updated = [...rFormDetails];
                                    updated[index].tanggalDetail = e.target.value;
                                    setRFormDetails(updated);
                                  }}
                                  placeholder="16-Jan-26"
                                  className="rounded-lg border-slate-200 text-xs h-8"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase">Qty <span className="text-red-500">*</span></Label>
                                <Input
                                  type="number"
                                  step="any"
                                  value={detail.qty}
                                  onChange={e => {
                                    const updated = [...rFormDetails];
                                    updated[index].qty = Math.max(0, parseFloat(e.target.value) || 0);
                                    setRFormDetails(updated);
                                  }}
                                  className="rounded-lg border-slate-200 text-xs h-8 font-semibold"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase">Harga Satuan (Rp) <span className="text-red-500">*</span></Label>
                                <Input
                                  type="text"
                                  value={detail.hargaSatuan ? parseInt(detail.hargaSatuan.toString().replace(/\./g, '')).toLocaleString('id-ID') : '0'}
                                  onChange={e => {
                                    const rawVal = e.target.value.replace(/\./g, '');
                                    const updated = [...rFormDetails];
                                    updated[index].hargaSatuan = parseInt(rawVal) || 0;
                                    setRFormDetails(updated);
                                  }}
                                  className="rounded-lg border-slate-200 text-xs h-8 font-mono font-semibold"
                                  required
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-4 rounded-2xl bg-emerald-55 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                        <span className="text-xs font-black text-slate-700 uppercase">Total Unit Credit Entry</span>
                        <span className="text-lg font-black font-mono text-emerald-700">
                          Rp {rFormDetails.reduce((sum, d) => sum + ((d.qty || 0) * (d.hargaSatuan || 0)), 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetRincianForm();
                        setIsRincianFormOpen(false);
                      }}
                      className="rounded-xl font-bold border-slate-200 text-slate-600 h-10 px-5 text-xs"
                    >
                      Batal / Tutup
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-6 text-xs"
                    >
                      {isSubmitting ? 'Menyimpan...' : (editingRincianId ? 'Simpan Perubahan' : 'Simpan Transaksi Rincian')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {/* DIALOG BUKTI RINCIAN LAPORAN */}
          {selectedBuktiRincian && (
            <Dialog open={!!selectedBuktiRincian} onOpenChange={() => setSelectedBuktiRincian(null)}>
              <DialogContent className="max-w-lg rounded-2xl p-6 bg-white">
                <DialogHeader>
                  <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                    <FileCheck className="text-emerald-600" size={20} />
                    Bukti Rincian Laporan PertUM BAZNAS
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 text-xs mt-2">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-500 font-medium">No. Doc / Bukti:</span>
                      <span className="font-mono font-bold text-slate-900">
                        No. Doc {selectedBuktiRincian.noDoc} — {selectedBuktiRincian.noBukti || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-500 font-medium">Kode Budget:</span>
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {selectedBuktiRincian.kodeBudget}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-500 font-medium">Tanggal:</span>
                      <span className="font-mono font-bold text-slate-800">{selectedBuktiRincian.tanggalBudget || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-500 font-medium">Keterangan:</span>
                      <span className="font-bold text-slate-900 text-right">{selectedBuktiRincian.keterangan}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-500 font-medium">Total Nominal Credit:</span>
                      <span className="font-mono font-black text-emerald-700 text-sm">
                        Rp {(selectedBuktiRincian.details?.reduce((sum: number, d: any) => sum + ((d.qty || 0) * (d.hargaSatuan || 0)), 0) || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* TAUTAN BUKTI */}
                  <div className="space-y-2">
                    <p className="font-bold text-slate-800">Tautan Berkas & Bukti LPJ:</p>
                    {(() => {
                      const link = selectedBuktiRincian.linkBukti || selectedBuktiRincian.buktiUrl;
                      if (link && typeof link === 'string' && link.trim().length > 0) {
                        const href = link.startsWith('http') ? link : `https://${link}`;
                        return (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100 transition-colors font-bold text-xs"
                          >
                            <span className="flex items-center gap-2">
                              <ExternalLink size={16} className="text-blue-600 shrink-0" />
                              Buka File / Google Drive Bukti LPJ
                            </span>
                            <span className="text-[10px] bg-blue-600 text-white px-2.5 py-1 rounded-lg font-extrabold shadow-2xs">Buka Link ↗</span>
                          </a>
                        );
                      }
                      return (
                        <div className="p-4 rounded-xl bg-slate-100 text-slate-500 text-center text-xs space-y-2">
                          <p className="font-medium">Belum ada tautan berkas / Google Drive Bukti Rincian Laporan.</p>
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => {
                              const item = selectedBuktiRincian;
                              setSelectedBuktiRincian(null);
                              handleEditRincian(item);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 rounded-lg font-bold"
                          >
                            + Tambahkan Link Bukti Sekarang
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <DialogFooter className="mt-4 flex justify-between items-center border-t pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const item = selectedBuktiRincian;
                      setSelectedBuktiRincian(null);
                      handleEditRincian(item);
                    }}
                    className="text-xs font-bold border-slate-200 rounded-xl"
                  >
                    <Edit2 size={12} className="mr-1" /> Edit Bukti / Data
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setSelectedBuktiRincian(null)}
                    className="bg-slate-900 text-white hover:bg-slate-800 text-xs rounded-xl px-4 font-bold"
                  >
                    Tutup
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      ) : (
        /* ORIGINAL STANDARD REALISASI VIEW */
        <div className={`grid grid-cols-1 ${isExportingPDF ? '' : 'lg:grid-cols-3'} gap-6 relative`}>
          
          {/* Input Form */}
          {!isExportingPDF && (
            <div className="lg:col-span-1" id="laporan-form">
              <Card className="rounded-3xl border-slate-100 shadow-sm h-full bg-white">
                <CardHeader>
                  <CardTitle className="text-xl font-black text-slate-800">Input Laporan</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500">Bulan Laporan</Label>
                        <Select value={month} onValueChange={setMonth}>
                          <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Pilih Bulan" />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500">Tahun</Label>
                        <Input 
                          type="number" 
                          value={year} 
                          onChange={e => setYear(e.target.value)}
                          className="rounded-xl bg-slate-50 border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500">Nominal Laporan (Rp)</Label>
                      <Input 
                        type="number" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)}
                        placeholder="Contoh: 15000000"
                        className="rounded-xl bg-slate-50 border-slate-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500">Tanggal Laporan</Label>
                      <Input 
                        type="date" 
                        value={reportDate} 
                        onChange={e => setReportDate(e.target.value)}
                        className="rounded-xl bg-slate-50 border-slate-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500">Link Bukti BAST</Label>
                      <Input 
                        type="url" 
                        value={bastLink} 
                        onChange={e => setBastLink(e.target.value)}
                        placeholder="https://..."
                        className="rounded-xl bg-slate-50 border-slate-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 flex items-center justify-between">
                        <span>Link Bukti Rincian Laporan</span>
                        <span className="text-[10px] text-blue-600 font-normal">Opsional</span>
                      </Label>
                      <Input 
                        type="url" 
                        value={linkRincian} 
                        onChange={e => setLinkRincian(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="rounded-xl bg-slate-50 border-slate-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500">Keterangan Laporan</Label>
                      <Input 
                        value={keterangan} 
                        onChange={e => setKeterangan(e.target.value)}
                        placeholder="Contoh: Pembelian alat kantor..."
                        className="rounded-xl bg-slate-50 border-slate-200"
                      />
                    </div>

                    <Button type="submit" disabled={isSubmitting} className="w-full mt-2 font-bold bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                      {isSubmitting ? 'Menyimpan...' : (editingId ? 'Update Laporan' : 'Simpan Laporan')}
                    </Button>
                    {editingId && (
                      <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting} className="w-full mt-2 font-bold rounded-xl">
                        Batal Edit
                      </Button>
                    )}
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Chart Illustration */}
          <div className={isExportingPDF ? "w-full mb-6 relative z-10" : "lg:col-span-2 space-y-6"} id="laporan-chart">
            <Card className="rounded-3xl border-slate-100 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-black text-slate-800 flex justify-between items-center">
                  Bagan Realisasi Laporan {year}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 40, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }}
                        tickFormatter={(value) => `Rp ${value / 1000000}Jt`}
                        width={60}
                      />
                      <Tooltip 
                        cursor={{ fill: '#F1F5F9' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Total Laporan']}
                      />
                      <Bar 
                        dataKey="total" 
                        fill="#0ea5e9" // sky-500
                        radius={[4, 4, 0, 0]} 
                        barSize={24}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Table */}
      {activeTab === 'standard' && !isExportingPDF && (
        <div className="flex flex-col md:flex-row flex-wrap gap-4 mb-4 items-end" id="laporan-filters">
          <div className="w-full md:w-40">
            <Label className="text-xs font-bold text-slate-500 mb-1 block">Filter Bulan</Label>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="rounded-xl bg-white border-slate-200 shadow-sm font-medium h-10">
                <SelectValue placeholder="Filter Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bulan</SelectItem>
                {MONTHS.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-40">
            <Label className="text-xs font-bold text-slate-500 mb-1 block">Filter Tahun</Label>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="rounded-xl bg-white border-slate-200 shadow-sm font-medium h-10">
                <SelectValue placeholder="Filter Tahun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tahun</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-40">
            <Label className="text-xs font-bold text-slate-500 mb-1 block">Mulai Tanggal</Label>
            <Input 
              type="date" 
              value={filterStartDate} 
              onChange={e => setFilterStartDate(e.target.value)} 
              className="rounded-xl bg-white border-slate-200 shadow-sm h-10 text-xs" 
            />
          </div>
          <div className="w-full md:w-40">
            <Label className="text-xs font-bold text-slate-500 mb-1 block">Sampai Tanggal</Label>
            <Input 
              type="date" 
              value={filterEndDate} 
              onChange={e => setFilterEndDate(e.target.value)} 
              className="rounded-xl bg-white border-slate-200 shadow-sm h-10 text-xs" 
            />
          </div>
          {(filterMonth !== 'all' || filterYear !== 'all' || filterStartDate || filterEndDate) && (
            <Button 
              variant="outline" 
              onClick={() => {
                setFilterMonth('all');
                setFilterYear('all');
                setFilterStartDate('');
                setFilterEndDate('');
              }}
              className="h-10 text-xs font-bold text-rose-650 hover:text-rose-800 hover:bg-rose-50 border-rose-200 rounded-xl px-4"
            >
              Reset Filter
            </Button>
          )}
          <div className="w-full md:w-48 bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex flex-col justify-between h-20 md:h-[68px] self-stretch md:self-auto min-w-[180px]">
            <span className="text-xs font-bold text-emerald-500 uppercase">Total Laporan</span>
            <span className="text-sm md:text-base font-black text-emerald-950">Rp {totalFilteredReport.toLocaleString('id-ID')}</span>
          </div>
        </div>
      )}
      
      {activeTab === 'standard' && (
        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-black text-slate-800">Daftar Laporan</CardTitle>
            {!isExportingPDF && (
              <div className="flex items-center gap-2" id="laporan-table-actions">
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleImportCSV}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl shadow-sm text-xs h-9 px-3"
                >
                  <Upload className="mr-2" size={14} /> Import
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDownloadTemplate}
                  className="font-bold border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl shadow-sm text-xs h-9 px-3"
                >
                  <FileDown className="mr-2" size={14} /> Template
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleExportCSV}
                  className="font-bold border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl shadow-sm text-xs h-9 px-3"
                  disabled={filteredData.length === 0}
                >
                  <Download className="mr-2" size={14} /> Ekspor
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-xs text-slate-500">Bulan / Tahun</TableHead>
                    <TableHead className="font-bold text-xs text-slate-500">Keterangan</TableHead>
                    <TableHead className="font-bold text-xs text-slate-500">Tanggal Laporan</TableHead>
                    <TableHead className="font-bold text-xs text-slate-500">Nominal</TableHead>
                    <TableHead className="font-bold text-xs text-slate-500 text-center">Bukti BAST</TableHead>
                    <TableHead className="font-bold text-xs text-slate-500 text-center">Bukti Rincian Laporan</TableHead>
                    {!isExportingPDF && <TableHead className="font-bold text-xs text-slate-500 text-center action-cell-pdf">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map(item => {
                    const rincianUrl = item.linkRincian || (item as any).buktiRincianLink || (item as any).rincianLink;
                    const hrefRincian = rincianUrl && typeof rincianUrl === 'string' && rincianUrl.trim().length > 0
                      ? (rincianUrl.startsWith('http') ? rincianUrl : `https://${rincianUrl}`)
                      : null;

                    const bastUrl = item.bastLink && typeof item.bastLink === 'string' && item.bastLink.trim().length > 0
                      ? (item.bastLink.startsWith('http') ? item.bastLink : `https://${item.bastLink}`)
                      : null;

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-semibold text-sm">
                          {item.month} {item.year}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {item.keterangan || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {item.date ? (
                            isNaN(new Date(item.date).getTime()) ? item.date : new Date(item.date).toLocaleDateString('id-ID', {
                              day: 'numeric', month: 'long', year: 'numeric'
                            })
                          ) : '-'}
                        </TableCell>
                        <TableCell className="font-bold text-sm text-slate-800">
                          Rp {item.amount.toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="text-center">
                          {bastUrl ? (
                            <a 
                              href={bastUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all shadow-2xs"
                            >
                              Lihat BAST <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {hrefRincian ? (
                            <a 
                              href={hrefRincian} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-all shadow-2xs"
                              title="Buka Link Bukti Rincian Laporan"
                            >
                              Lihat Rincian <ExternalLink size={12} />
                            </a>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-blue-700 hover:bg-blue-50 border border-dashed border-slate-200 rounded-lg px-2.5 py-1 h-7"
                              title="Tambah Link Bukti Rincian"
                            >
                              <Plus size={12} />
                              <span>+ Add Link</span>
                            </Button>
                          )}
                        </TableCell>
                        {!isExportingPDF && (
                          <TableCell className="text-center action-cell-pdf">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg shrink-0">
                                <Edit2 size={16} />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg shrink-0">
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-slate-500 font-medium">
                        Belum ada data laporan.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Edit BAZNAS */}
      {editingBaznasItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md rounded-3xl border border-slate-100 shadow-2xl bg-white overflow-hidden animate-in zoom-in-95 duration-200">
            <CardHeader className="bg-slate-900 text-white p-6">
              <CardTitle className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
                <Edit2 size={18} className="text-amber-400" />
                Edit Nilai Anggaran & Realisasi
              </CardTitle>
              <p className="text-xs text-slate-300 font-medium mt-1">
                Kode: {editingBaznasItem.code} — {editingBaznasItem.name}
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Anggaran (Rp)</Label>
                <Input
                  type="text"
                  value={editingBaznasItem.budget.toLocaleString('id-ID')}
                  onChange={e => {
                    const rawVal = e.target.value.replace(/\./g, '');
                    setEditingBaznasItem({
                      ...editingBaznasItem,
                      budget: parseInt(rawVal) || 0
                    });
                  }}
                  className="rounded-xl bg-slate-50 border-slate-200 text-sm font-mono font-semibold h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Realisasi (Rp)</Label>
                <Input
                  type="text"
                  value={editingBaznasItem.real.toLocaleString('id-ID')}
                  onChange={e => {
                    const rawVal = e.target.value.replace(/\./g, '');
                    setEditingBaznasItem({
                      ...editingBaznasItem,
                      real: parseInt(rawVal) || 0
                    });
                  }}
                  className="rounded-xl bg-slate-50 border-slate-200 text-sm font-mono font-semibold h-10"
                />
              </div>

              <div className="flex gap-3 pt-2 font-black text-xs uppercase tracking-wider">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setEditingBaznasItem(null)}
                  className="w-1/2 rounded-xl font-bold text-slate-600 border-slate-200 h-10"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSaveBaznasOverride(
                    editingBaznasItem.code,
                    editingBaznasItem.budget,
                    editingBaznasItem.real
                  )}
                  className="w-1/2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-10"
                >
                  Simpan Perubahan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* DIALOG FORM INPUT / EDIT SETTLEMENT BAZNAS */}
      <Dialog open={isSettlementFormOpen} onOpenChange={setIsSettlementFormOpen}>
        <DialogContent className="max-w-3xl rounded-3xl border border-slate-100 shadow-2xl bg-white overflow-hidden p-0">
          <DialogHeader className="bg-slate-900 text-white p-6">
            <DialogTitle className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
              <Calculator className="text-emerald-400" size={20} />
              {editingSettlementId ? 'EDIT DATA SETTLEMENT BAZNAS' : 'INPUT PENYUSUNAN SETTLEMENT BAZNAS'}
            </DialogTitle>
            <p className="text-xs text-slate-300 font-medium mt-1">
              Unit: {baznasAccount} Cendekia BAZNAS &nbsp;|&nbsp; Periode: {baznasMonth} {baznasYear}
            </p>
          </DialogHeader>

          <form onSubmit={handleSaveSettlement} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Mode Toggle: Preset Code vs Custom Code */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Kode Budget & Nama Anggaran <span className="text-red-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setSFormIsCustomCode(!sFormIsCustomCode)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline"
                >
                  {sFormIsCustomCode ? '← Pilih dari Template Standard' : '+ Input Kode Budget Custom'}
                </button>
              </div>

              {!sFormIsCustomCode ? (
                <Select value={sFormBudgetCode} onValueChange={setSFormBudgetCode}>
                  <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold h-10">
                    <SelectValue placeholder="Pilih Kode Budget Template" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {currentTemplates
                      .filter(t => t.level === 3)
                      .map(item => {
                        const meta = getBudgetItemMeta(item.code, baznasAccount);
                        return (
                          <SelectItem key={item.code} value={item.code} className="text-xs font-medium">
                            <span className="font-mono font-bold text-emerald-700">{item.code}</span> — {item.name}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-200">
                  <div>
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Kode Budget Custom <span className="text-red-500">*</span></Label>
                    <Input
                      value={sFormCustomCode}
                      onChange={e => setSFormCustomCode(normalizeBudgetCode(e.target.value))}
                      placeholder="Contoh: O2.1.17"
                      className="rounded-xl bg-white border-slate-200 text-xs font-mono font-bold h-9"
                      required={sFormIsCustomCode}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Nama Anggaran Custom <span className="text-red-500">*</span></Label>
                    <Input
                      value={sFormCustomName}
                      onChange={e => setSFormCustomName(e.target.value)}
                      placeholder="Contoh: Realisasi Program Berkah Ramadhan"
                      className="rounded-xl bg-white border-slate-200 text-xs font-medium h-9"
                      required={sFormIsCustomCode}
                    />
                  </div>
                </div>
              )}

              {/* Selected Budget Meta Badge for preset */}
              {!sFormIsCustomCode && sFormBudgetCode && (() => {
                const meta = getBudgetItemMeta(sFormBudgetCode, baznasAccount);
                return (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Nama Anggaran Terpilih</p>
                      <p className="text-xs font-bold text-slate-800">{meta.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Pagu Anggaran Kode</p>
                      <p className="text-xs font-black font-mono text-emerald-800">Rp {meta.pagu.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Row 2: No Doc, No Bukti, Tanggal, Debit */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  No. Doc <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={sFormNoDoc}
                  onChange={e => setSFormNoDoc(parseInt(e.target.value) || 1)}
                  className="rounded-xl bg-slate-50 border-slate-200 text-xs font-mono font-semibold h-10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  No. Bukti <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={sFormNoBukti}
                  onChange={e => setSFormNoBukti(e.target.value)}
                  placeholder="FS.04.290626"
                  className="rounded-xl bg-slate-50 border-slate-200 text-xs font-mono font-semibold h-10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Tanggal <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={sFormTanggalBudget}
                  onChange={e => setSFormTanggalBudget(e.target.value)}
                  placeholder="29-Jun-26"
                  className="rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold h-10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Debit / Ref UM
                </Label>
                <Input
                  value={sFormDebit}
                  onChange={e => setSFormDebit(e.target.value)}
                  placeholder="UM.24.060526"
                  className="rounded-xl bg-slate-50 border-slate-200 text-xs font-mono font-semibold h-10"
                />
              </div>
            </div>

            {/* Row 3: Keterangan Utama */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Keterangan Utama Settlement <span className="text-red-500">*</span>
              </Label>
              <Input
                value={sFormKeterangan}
                onChange={e => setSFormKeterangan(e.target.value)}
                placeholder="Contoh: Realisasi Pembayaran Klaim Kesehatan Guru BAZNAS"
                className="rounded-xl bg-slate-50 border-slate-200 text-xs font-medium h-10"
                required
              />
            </div>

            {/* Row 4: Table Detail Rincian Items */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-emerald-600" /> Rincian Sub-Bukti & Items Transaksi
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const charCode = 97 + sFormDetails.length;
                    const subIndex = String.fromCharCode(charCode);
                    setSFormDetails([
                      ...sFormDetails,
                      { noBuktiDetail: subIndex, keteranganDetail: '', qty: 1, hargaSatuan: 0 }
                    ]);
                  }}
                  className="h-8 px-3 text-xs font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl"
                >
                  <Plus size={12} className="mr-1" /> Tambah Sub-Item
                </Button>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      <TableHead className="font-bold text-[10px] text-slate-600 w-20">SUB-BUKTI</TableHead>
                      <TableHead className="font-bold text-[10px] text-slate-600">KETERANGAN DETAIL</TableHead>
                      <TableHead className="font-bold text-[10px] text-slate-600 text-center w-20">QTY</TableHead>
                      <TableHead className="font-bold text-[10px] text-slate-600 text-right w-36">HARGA SATUAN (RP)</TableHead>
                      <TableHead className="font-bold text-[10px] text-slate-600 text-right w-36">TOTAL (RP)</TableHead>
                      <TableHead className="font-bold text-[10px] text-slate-600 text-center w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sFormDetails.map((detail, idx) => {
                      const totalLine = (parseFloat(detail.qty as any) || 1) * (parseInt(detail.hargaSatuan as any) || 0);
                      return (
                        <TableRow key={idx} className="hover:bg-slate-50">
                          <TableCell className="p-2">
                            <Input
                              value={detail.noBuktiDetail}
                              onChange={e => {
                                const newDetails = [...sFormDetails];
                                newDetails[idx].noBuktiDetail = e.target.value;
                                setSFormDetails(newDetails);
                              }}
                              className="h-8 text-xs font-mono font-bold rounded-lg"
                              placeholder="a"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              value={detail.keteranganDetail}
                              onChange={e => {
                                const newDetails = [...sFormDetails];
                                newDetails[idx].keteranganDetail = e.target.value;
                                setSFormDetails(newDetails);
                              }}
                              className="h-8 text-xs font-medium rounded-lg"
                              placeholder="Rincian pengeluaran..."
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              type="number"
                              value={detail.qty}
                              onChange={e => {
                                const newDetails = [...sFormDetails];
                                newDetails[idx].qty = parseFloat(e.target.value) || 1;
                                setSFormDetails(newDetails);
                              }}
                              className="h-8 text-xs text-center font-mono font-bold rounded-lg"
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              type="text"
                              value={detail.hargaSatuan ? detail.hargaSatuan.toLocaleString('id-ID') : ''}
                              onChange={e => {
                                const rawVal = e.target.value.replace(/\./g, '');
                                const newDetails = [...sFormDetails];
                                newDetails[idx].hargaSatuan = parseInt(rawVal) || 0;
                                setSFormDetails(newDetails);
                              }}
                              className="h-8 text-xs text-right font-mono font-bold rounded-lg"
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="p-2 text-right font-mono font-black text-xs text-emerald-800">
                            Rp {totalLine.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell className="p-2 text-center">
                            {sFormDetails.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSFormDetails(sFormDetails.filter((_, i) => i !== idx));
                                }}
                                className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsSettlementFormOpen(false);
                  resetSettlementForm();
                }}
                className="rounded-xl font-bold text-slate-600 border-slate-200 h-10 px-6"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-8 shadow-md"
              >
                {isSubmitting ? 'Menyimpan...' : editingSettlementId ? 'Simpan Perubahan' : 'Simpan Settlement'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
