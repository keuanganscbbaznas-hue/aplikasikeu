import React, { useState, useRef, useEffect } from 'react';
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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { FileText, Plus, Search, ExternalLink, Download, Upload, Trash2, Edit2, FileDown, Calendar, Printer, RefreshCw, BarChart2, Settings } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { DEFAULT_BAZNAS_RINCIAN_SMP_JAN_2026, DEFAULT_BAZNAS_RINCIAN_SMA_JAN_2026, BaznasRincianItem, RincianDetailItem } from './baznasDefaultRincian';

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

interface Report {
  id: string;
  month: string;
  year: string;
  amount: number;
  date: string;
  bastLink: string;
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

export const LaporanManager = ({ userUid, isReadOnly = false }: { userUid: string, isReadOnly?: boolean }) => {
  const [activeTab, setActiveTab] = useState<'standard' | 'baznas'>('standard');
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
  const [rFormDetails, setRFormDetails] = useState<RincianDetailItem[]>([
    { noBuktiDetail: 'a', keteranganDetail: '', qty: 1, hargaSatuan: 0 }
  ]);
  const [editingRincianId, setEditingRincianId] = useState<string | null>(null);
  const [isResettingDefault, setIsResettingDefault] = useState(false);

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
    if (!rFormBudgetCode || !rFormNoBukti || !rFormTanggalBudget || !rFormKeterangan) {
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

      if (editingRincianId && editingRincianId !== 'default_static') {
        const docRef = doc(db, 'laporan_baznas_rincian_docs', editingRincianId);
        await updateDoc(docRef, {
          kodeBudget: rFormBudgetCode,
          noDoc: rFormNoDoc,
          noBukti: rFormNoBukti,
          tanggalBudget: rFormTanggalBudget,
          keterangan: rFormKeterangan,
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
            kodeBudget: rFormBudgetCode,
            noBukti: rFormNoBukti,
            tanggalBudget: rFormTanggalBudget,
            keterangan: rFormKeterangan,
            details: validatedDetails,
            updatedAt: serverTimestamp()
          });
          toast.success("Berhasil memperbarui rincian transaksi");
        } else {
          await addDoc(collection(db, 'laporan_baznas_rincian_docs'), {
            account: baznasAccount,
            month: baznasMonth,
            year: baznasYear,
            kodeBudget: rFormBudgetCode,
            noDoc: rFormNoDoc,
            noBukti: rFormNoBukti,
            tanggalBudget: rFormTanggalBudget,
            keterangan: rFormKeterangan,
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

  const handleEditRincian = (item: any) => {
    setEditingRincianId(item.id || 'default_static');
    setRFormBudgetCode(item.kodeBudget);
    setRFormNoDoc(item.noDoc || 1);
    setRFormNoBukti(item.noBukti);
    setRFormTanggalBudget(item.tanggalBudget);
    setRFormKeterangan(item.keterangan);
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
    setKeterangan('');
    setEditingId(null);
  };

  const handleEdit = (report: Report) => {
    setEditingId(report.id);
    setMonth(report.month);
    setYear(report.year);
    setAmount(report.amount.toString());
    setReportDate(report.date);
    setBastLink(report.bastLink);
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
    const headers = ["bulan laporan", "tahun laporan", "nominal laporan", "tanggal laporan", "link bukti BAST", "Keterangan"];
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
            const k = ObjectRow["Keterangan"] || '';

            if (!m || !y) continue;

            await addDoc(collection(db, 'laporan_baznas'), {
                month: m,
                year: y,
                amount: a,
                date: d || '',
                bastLink: bLink || '',
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

  const handleDownloadPDF = async () => {
    if (!pdfContainerRef.current) return;
    setIsExportingPDF(true);
    toast.info('Menyiapkan file PDF...', { duration: 2000 });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(pdfContainerRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      
      const pdfWidth = 210; // A4 width in mm
      const elWidth = pdfContainerRef.current.offsetWidth;
      const elHeight = pdfContainerRef.current.offsetHeight;
      const pdfHeight = (elHeight * pdfWidth) / elWidth;
      
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const fileName = activeTab === 'baznas' 
        ? `Laporan_PertUM_Format_BAZNAS_${baznasMonth}_${baznasYear}.pdf`
        : `Laporan_Realisasi_BAZNAS_${year}.pdf`;
        
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
        </div>
      )}

      {/* Header section with download button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {activeTab === 'baznas' ? 'Laporan Format BAZNAS' : 'Laporan Realisasi'}
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {activeTab === 'baznas'
              ? `Laporan Pertanggungjawaban Uang Muka (PertUM) Periode ${baznasMonth} ${baznasYear}`
              : 'Kelola dan pantau laporan realisasi anggaran.'}
          </p>
        </div>
        {!isExportingPDF && (
          <div className="flex items-center gap-2" id="laporan-header-actions">
             <Button 
              variant="outline" 
              onClick={handleDownloadPDF}
              className="font-bold border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl shadow-sm transition-all text-xs h-10 px-4"
              disabled={isExportingPDF || (activeTab === 'standard' && data.length === 0)}
            >
              <FileDown className="mr-2" size={16} /> {isExportingPDF ? 'Memproses...' : 'Unduh PDF'}
             </Button>
          </div>
        )}
      </div>

      {activeTab === 'baznas' ? (
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
                    onClick={handleDownloadPDF}
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

          {/* RINCIAN LAPORAN PERTUM TABLE CARD */}
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
                      <th className="py-3 px-3 border-r border-slate-700 text-right w-24 bg-slate-900">QTY</th>
                      <th className="py-3 px-3 border-r border-slate-700 text-right w-32 bg-slate-900">HARGA SATUAN</th>
                      <th className="py-3 px-3 border-r border-slate-700 text-right w-32 bg-slate-900">JUMLAH (CREDIT)</th>
                      {!isExportingPDF && <th className="py-3 px-2 text-center w-20 bg-slate-900">AKSI</th>}
                    </tr>
                  </thead>
                  <tbody className="text-[11px]">
                    {sortedRincianItems.length === 0 ? (
                      <tr>
                        <td colSpan={isExportingPDF ? 8 : 9} className="py-8 text-center text-slate-400 font-bold text-xs bg-slate-50/50">
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
                              <td className="py-2.5 px-4 border-r border-slate-200 text-xs font-black tracking-tight text-slate-900" colSpan={3}>
                                {item.keterangan}
                              </td>
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
                    {!isExportingPDF && <TableHead className="font-bold text-xs text-slate-500 text-center action-cell-pdf">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-semibold text-sm">
                        {item.month} {item.year}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {item.keterangan || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {new Date(item.date).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="font-bold text-sm text-slate-800">
                        Rp {item.amount.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-center">
                        <a 
                          href={item.bastLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Lihat <ExternalLink size={12} />
                        </a>
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
                  ))}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-slate-500 font-medium">
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
    </div>
  );
};
