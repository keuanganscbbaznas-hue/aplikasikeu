import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { 
  Search, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter, 
  Download, 
  Plus, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  CheckCircle2, 
  Wallet, 
  Building2, 
  GraduationCap, 
  Car, 
  Home, 
  CreditCard, 
  Printer, 
  Droplets, 
  BookOpen, 
  Award, 
  PieChart as PieIcon, 
  BarChart3, 
  FileSpreadsheet, 
  Printer as PrintIcon, 
  Layers, 
  ChevronRight, 
  ChevronDown, 
  Eye, 
  Sparkles,
  DollarSign,
  UploadCloud,
  Link2,
  Globe,
  RefreshCw,
  AlertCircle,
  FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  AreaChart, 
  Area, 
  CartesianGrid 
} from 'recharts';
import { toast } from 'sonner';
import { 
  DonationLedgerItem, 
  INITIAL_DONATION_LEDGER_SMP, 
  INITIAL_SALDO_AWAL_2026_SMP,
  DEFAULT_RAW_CSV_SMP_2026
} from './donationLedgerData';
import { parseDonationDatabaseCsv } from './donationCsvParser';

const ALLOCATION_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  'Donasi': {
    label: 'Donasi & ZIS',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    border: '#10b981',
    icon: Coins
  },
  'FINANCE': {
    label: 'Finance / Perbankan',
    color: 'text-purple-700',
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    border: '#8b5cf6',
    icon: Building2
  },
  'Titipan Uang Saku': {
    label: 'Titipan Uang Saku',
    color: 'text-blue-700',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    border: '#3b82f6',
    icon: Wallet
  },
  'TPG': {
    label: 'TPG / Infaq Sertifikasi Tendik',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    border: '#6366f1',
    icon: GraduationCap
  },
  'Donasi Koperasi': {
    label: 'Donasi Koperasi (SHU)',
    color: 'text-amber-700',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    border: '#f59e0b',
    icon: Building2
  },
  'Wakaf Sumur': {
    label: 'Wakaf Sumur SCB',
    color: 'text-cyan-700',
    bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    border: '#06b6d4',
    icon: Droplets
  },
  'BOSP': {
    label: 'BOSP',
    color: 'text-teal-700',
    bg: 'bg-teal-50 text-teal-700 border-teal-200',
    border: '#14b8a6',
    icon: BookOpen
  },
  'BOS': {
    label: 'BOS',
    color: 'text-teal-700',
    bg: 'bg-teal-50 text-teal-700 border-teal-200',
    border: '#0d9488',
    icon: BookOpen
  },
  'Biaya Transport': {
    label: 'Biaya Transport',
    color: 'text-orange-700',
    bg: 'bg-orange-50 text-orange-700 border-orange-200',
    border: '#f97316',
    icon: Car
  },
  'Biaya Rumah Tangga': {
    label: 'Biaya Rumah Tangga',
    color: 'text-rose-700',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    border: '#f43f5e',
    icon: Home
  },
  'PIP': {
    label: 'Dana PIP',
    color: 'text-sky-700',
    bg: 'bg-sky-50 text-sky-700 border-sky-200',
    border: '#0284c7',
    icon: Award
  },
  'Biaya Cetak dan FC': {
    label: 'Biaya Cetak & FC / ATK',
    color: 'text-violet-700',
    bg: 'bg-violet-50 text-violet-700 border-violet-200',
    border: '#7c3aed',
    icon: Printer
  },
  'Biaya Admin': {
    label: 'Biaya Administrasi Bank',
    color: 'text-slate-700',
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    border: '#64748b',
    icon: CreditCard
  }
};

const formatRupiah = (val: number): string => {
  return 'Rp ' + (val || 0).toLocaleString('id-ID');
};

export const MonthlyDonationLedger = () => {
  // Account state (Default to 'smp' as requested by user)
  const [selectedAccount, setSelectedAccount] = useState<'smp' | 'sma'>('smp');

  // Database state (Firestore collection 'monthly_donation_ledger')
  const [items, setItems] = useState<DonationLedgerItem[]>(INITIAL_DONATION_LEDGER_SMP);
  const [loading, setLoading] = useState(false);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(false);

  // Active view tab (including ledger view with direct edit capability)
  const [activeTab, setActiveTab] = useState<'categories' | 'monthly' | 'ledger' | 'charts'>('categories');

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedAllocation, setSelectedAllocation] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'pemasukan' | 'pengeluaran'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination for table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<DonationLedgerItem | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // CSV & Sheets Import State
  const [pastedCsv, setPastedCsv] = useState<string>(DEFAULT_RAW_CSV_SMP_2026);
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState<string>(() => {
    return localStorage.getItem('scb_smp_donation_sheets_url') || '';
  });
  const [isFetchingSheets, setIsFetchingSheets] = useState(false);

  // Form State for Add & Edit
  const [formData, setFormData] = useState({
    date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' }),
    docNo: '',
    allocation: 'Donasi',
    pic: '',
    description: '',
    type: 'pemasukan' as 'pemasukan' | 'pengeluaran',
    amount: ''
  });

  // 1. Connect Firestore Listener for real-time synchronization
  useEffect(() => {
    try {
      const colRef = collection(db, 'monthly_donation_ledger');
      const unsubscribe = onSnapshot(colRef, (snapshot) => {
        if (!snapshot.empty) {
          const loaded: DonationLedgerItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as any;
            if (!data.account || data.account === selectedAccount) {
              loaded.push({ id: docSnap.id, ...data });
            }
          });
          
          // Sort chronologically
          loaded.sort((a, b) => {
            if (a.isoDate && b.isoDate) return a.isoDate.localeCompare(b.isoDate);
            return a.id.localeCompare(b.id);
          });
          
          if (loaded.length > 0) {
            setItems(loaded);
          } else {
            setItems(INITIAL_DONATION_LEDGER_SMP);
          }
          setIsFirestoreConnected(true);
        } else {
          // If empty, items will default to INITIAL_DONATION_LEDGER_SMP
          setIsFirestoreConnected(false);
        }
      }, (err) => {
        console.warn("Notice: Firestore monthly ledger snapshot:", err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn("Could not listen to Firestore collection:", e);
    }
  }, [selectedAccount]);

  // Sync / Seed to Firestore
  const handleSyncToFirestore = async () => {
    setLoading(true);
    const toastId = toast.loading("Menyinkronkan data Rekening Donasi SMP ke database Firestore...");
    try {
      const batch = writeBatch(db);
      
      // 1. Write each item to monthly_donation_ledger
      INITIAL_DONATION_LEDGER_SMP.forEach((item) => {
        const docRef = doc(db, 'monthly_donation_ledger', item.id);
        batch.set(docRef, { ...item, account: "smp" });
      });

      // 2. Write starting balance for SMP 2026 to donation_saldo_awal
      const saldoRef = doc(db, 'donation_saldo_awal', 'smp_2026');
      batch.set(saldoRef, {
        account: "smp",
        year: 2026,
        amount: INITIAL_SALDO_AWAL_2026_SMP,
        updatedAt: new Date().toISOString()
      });

      await batch.commit();
      setIsFirestoreConnected(true);
      toast.success("149 Transaksi Rekening Donasi SMP 2026 berhasil disinkronkan ke Database Firestore!", { id: toastId });
    } catch (error: any) {
      console.error("Firestore sync error:", error);
      toast.error("Gagal sinkronisasi Firestore: " + error.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // Reset to initial local dataset
  const handleResetData = () => {
    if (window.confirm("Kembalikan database ke 149 data buku kas donasi rekening SMP bawaan tahun 2026?")) {
      setItems(INITIAL_DONATION_LEDGER_SMP);
      toast.success("Data berhasil di-reset ke data Rekening Donasi SMP");
    }
  };

  // Recalculate running balance
  const recalculateBalances = (list: DonationLedgerItem[]): DonationLedgerItem[] => {
    let running = INITIAL_SALDO_AWAL_2026_SMP;
    return list.map(item => {
      running = running + (item.debet || 0) - (item.kredit || 0);
      return {
        ...item,
        saldoAkhir: running
      };
    });
  };

  // Handle Add Item
  const handleSaveNewItem = async () => {
    if (!formData.description || !formData.amount || Number(formData.amount) <= 0) {
      toast.error("Harap lengkapi keterangan dan nominal transaksi");
      return;
    }

    const numAmount = Number(formData.amount);
    const isPemasukan = formData.type === 'pemasukan';
    
    // Determine monthKey & monthName from date
    const monthKey = "2026-08"; // default
    const monthName = "Agustus 2026";

    const newItem: DonationLedgerItem = {
      id: `TX-SMP-2026-${String(items.length + 1).padStart(3, '0')}`,
      account: "smp",
      accountName: "Rekening Donasi SMP",
      date: formData.date,
      isoDate: new Date().toISOString().split('T')[0],
      monthKey,
      monthName,
      docNo: formData.docNo || '-',
      allocation: formData.allocation,
      pic: formData.pic || '-',
      description: formData.description,
      debet: isPemasukan ? numAmount : 0,
      kredit: isPemasukan ? 0 : numAmount,
      type: formData.type,
      saldoAkhir: 0
    };

    const updated = recalculateBalances([...items, newItem]);
    setItems(updated);
    setIsAddModalOpen(false);

    // Save to Firestore if connected
    try {
      await setDoc(doc(db, 'monthly_donation_ledger', newItem.id), newItem);
      toast.success("Transaksi baru Rekening SMP berhasil ditambahkan ke database!");
    } catch {
      toast.success("Transaksi baru ditambahkan ke database lokal");
    }

    // Reset form
    setFormData({
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' }),
      docNo: '',
      allocation: 'Donasi',
      pic: '',
      description: '',
      type: 'pemasukan',
      amount: ''
    });
  };

  // Handle Delete
  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;
    const filtered = items.filter(i => i.id !== id);
    const updated = recalculateBalances(filtered);
    setItems(updated);

    try {
      await deleteDoc(doc(db, 'monthly_donation_ledger', id));
      toast.success("Transaksi berhasil dihapus");
    } catch {
      toast.success("Transaksi dihapus dari tampilan lokal");
    }
  };

  // Open Edit Modal for a specific transaction
  const handleOpenEdit = (item: DonationLedgerItem) => {
    setSelectedItemForEdit(item);
    setFormData({
      date: item.date,
      docNo: item.docNo || '',
      allocation: item.allocation || 'Donasi',
      pic: item.pic || '',
      description: item.description || '',
      type: item.type,
      amount: String(item.type === 'pemasukan' ? item.debet : item.kredit)
    });
    setIsEditModalOpen(true);
  };

  // Save changes from Edit Modal
  const handleSaveEdit = async () => {
    if (!selectedItemForEdit) return;
    const numAmount = Number(formData.amount) || 0;
    const isPemasukan = formData.type === 'pemasukan';

    const updatedItem: DonationLedgerItem = {
      ...selectedItemForEdit,
      date: formData.date,
      docNo: formData.docNo || '-',
      allocation: formData.allocation,
      pic: formData.pic || '-',
      description: formData.description,
      type: formData.type,
      debet: isPemasukan ? numAmount : 0,
      kredit: isPemasukan ? 0 : numAmount
    };

    const updatedList = items.map(it => it.id === selectedItemForEdit.id ? updatedItem : it);
    const recalculated = recalculateBalances(updatedList);
    setItems(recalculated);
    setIsEditModalOpen(false);

    try {
      await setDoc(doc(db, 'monthly_donation_ledger', updatedItem.id), updatedItem);
      toast.success(`Transaksi berhasil diperbarui! Saldo akhir dan seluruh grafik dihitung ulang otomatis.`);
    } catch {
      toast.success(`Transaksi diperbarui di tampilan lokal`);
    }
  };

  // Apply CSV / Excel pasted text to Database
  const handleApplyPastedCsv = async () => {
    if (!pastedCsv.trim()) {
      toast.error("Teks CSV masih kosong!");
      return;
    }
    setLoading(true);
    const toastId = toast.loading("Mem-parsing dan menyinkronkan data CSV ke database...");
    try {
      const result = parseDonationDatabaseCsv(pastedCsv, selectedAccount);
      if (result.items.length === 0) {
        toast.error("Tidak ada baris transaksi yang berhasil dibaca dari CSV.", { id: toastId });
        setLoading(false);
        return;
      }

      // Recalculate balances with detected saldo awal
      let running = result.saldoAwal;
      const recalculated = result.items.map(it => {
        running = running + (it.debet || 0) - (it.kredit || 0);
        return { ...it, saldoAkhir: running };
      });

      setItems(recalculated);

      // Save to Firestore in batches of 400
      const chunkSize = 400;
      for (let i = 0; i < recalculated.length; i += chunkSize) {
        const chunk = recalculated.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(item => {
          const docRef = doc(db, 'monthly_donation_ledger', item.id);
          batch.set(docRef, item);
        });
        await batch.commit();
      }

      // Save starting balance
      try {
        await setDoc(doc(db, 'donation_saldo_awal', `${selectedAccount}_2026`), {
          account: selectedAccount,
          year: 2026,
          amount: result.saldoAwal,
          updatedAt: new Date().toISOString()
        });
      } catch {}

      setIsFirestoreConnected(true);
      setIsImportModalOpen(false);
      toast.success(`Database berhasil diperbarui! ${recalculated.length} transaksi diselaraskan dengan Saldo Akhir ${formatRupiah(running)}.`, { id: toastId });
    } catch (err: any) {
      console.error("Gagal sinkronisasi CSV:", err);
      toast.error("Gagal memperbarui database: " + err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // Fetch and sync data directly from published Google Sheets CSV
  const handleFetchGoogleSheets = async () => {
    if (!googleSheetsUrl.trim()) {
      toast.error("Masukkan tautan Google Sheets terlebih dahulu.");
      return;
    }

    let fetchUrl = googleSheetsUrl.trim();
    if (fetchUrl.includes('/edit') || fetchUrl.includes('/view')) {
      fetchUrl = fetchUrl.replace(/\/edit.*$/, '/export?format=csv');
    }

    setIsFetchingSheets(true);
    const toastId = toast.loading("Mengambil pembaruan data dari Google Sheets...");
    try {
      localStorage.setItem('scb_smp_donation_sheets_url', googleSheetsUrl.trim());
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        throw new Error(`Gagal mengambil data (Status ${res.status}). Pastikan Google Sheets sudah dipublikasikan ke web dalam format CSV.`);
      }
      const csvText = await res.text();
      setPastedCsv(csvText);

      const result = parseDonationDatabaseCsv(csvText, selectedAccount);
      if (result.items.length === 0) {
        throw new Error("Tabel kosong atau kolom tidak sesuai format buku kas.");
      }

      let running = result.saldoAwal;
      const recalculated = result.items.map(it => {
        running = running + (it.debet || 0) - (it.kredit || 0);
        return { ...it, saldoAkhir: running };
      });

      setItems(recalculated);

      // Save in batches to Firestore
      const chunkSize = 400;
      for (let i = 0; i < recalculated.length; i += chunkSize) {
        const chunk = recalculated.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(item => {
          const docRef = doc(db, 'monthly_donation_ledger', item.id);
          batch.set(docRef, item);
        });
        await batch.commit();
      }

      setIsFirestoreConnected(true);
      setIsSheetsModalOpen(false);
      toast.success(`Google Sheets Terhubung! Berhasil menyinkronkan ${recalculated.length} transaksi ke database.`, { id: toastId });
    } catch (err: any) {
      console.error("Sheets sync error:", err);
      toast.error("Gagal sinkron dari Google Sheets: " + err.message, { id: toastId });
    } finally {
      setIsFetchingSheets(false);
    }
  };

  // Handle local file upload (.csv or .txt)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setPastedCsv(content);
        toast.success(`File ${file.name} berhasil dimuat ke editor CSV! Silakan cek pratinjau lalu klik simpan.`);
      }
    };
    reader.readAsText(file);
  };

  // Aggregations and Metrics
  const metrics = useMemo(() => {
    const totalPemasukan = items.reduce((acc, curr) => acc + (curr.debet || 0), 0);
    const totalPengeluaran = items.reduce((acc, curr) => acc + (curr.kredit || 0), 0);
    const countPemasukan = items.filter(i => i.debet > 0).length;
    const countPengeluaran = items.filter(i => i.kredit > 0).length;
    const saldoAkhir = INITIAL_SALDO_AWAL_2026_SMP + totalPemasukan - totalPengeluaran;

    return {
      saldoAwal: INITIAL_SALDO_AWAL_2026_SMP,
      totalPemasukan,
      totalPengeluaran,
      saldoAkhir,
      countPemasukan,
      countPengeluaran,
      totalTransactions: items.length
    };
  }, [items]);

  // Breakdown by Allocation (Categorization requirement)
  const allocationBreakdown = useMemo(() => {
    const map: Record<string, { 
      allocation: string; 
      pemasukan: number; 
      pengeluaran: number; 
      countIn: number; 
      countOut: number; 
      itemsIn: DonationLedgerItem[]; 
      itemsOut: DonationLedgerItem[] 
    }> = {};

    items.forEach(item => {
      const alloc = item.allocation || 'Lain-lain';
      if (!map[alloc]) {
        map[alloc] = {
          allocation: alloc,
          pemasukan: 0,
          pengeluaran: 0,
          countIn: 0,
          countOut: 0,
          itemsIn: [],
          itemsOut: []
        };
      }
      if (item.debet > 0) {
        map[alloc].pemasukan += item.debet;
        map[alloc].countIn++;
        map[alloc].itemsIn.push(item);
      }
      if (item.kredit > 0) {
        map[alloc].pengeluaran += item.kredit;
        map[alloc].countOut++;
        map[alloc].itemsOut.push(item);
      }
    });

    // Separate into Pemasukan and Pengeluaran lists
    const pemasukanList = Object.values(map)
      .filter(x => x.pemasukan > 0)
      .sort((a, b) => b.pemasukan - a.pemasukan);

    const pengeluaranList = Object.values(map)
      .filter(x => x.pengeluaran > 0)
      .sort((a, b) => b.pengeluaran - a.pengeluaran);

    return {
      all: Object.values(map),
      pemasukanList,
      pengeluaranList
    };
  }, [items]);

  // Breakdown by Month
  const monthlyBreakdown = useMemo(() => {
    const monthsOrder = [
      { key: '2026-01', label: 'Januari 2026', short: 'Jan' },
      { key: '2026-02', label: 'Februari 2026', short: 'Feb' },
      { key: '2026-03', label: 'Maret 2026', short: 'Mar' },
      { key: '2026-04', label: 'April 2026', short: 'Apr' },
      { key: '2026-05', label: 'Mei 2026', short: 'Mei' },
      { key: '2026-06', label: 'Juni 2026', short: 'Jun' },
      { key: '2026-07', label: 'Juli 2026', short: 'Jul' },
      { key: '2026-08', label: 'Agustus 2026', short: 'Agu' },
    ];

    let currentSaldo = INITIAL_SALDO_AWAL_2026_SMP;

    return monthsOrder.map(m => {
      const monthItems = items.filter(item => {
        // match monthKey or check date
        return item.monthKey === m.key || item.date.includes(`-${m.short}-`);
      });

      const pemasukan = monthItems.reduce((acc, curr) => acc + (curr.debet || 0), 0);
      const pengeluaran = monthItems.reduce((acc, curr) => acc + (curr.kredit || 0), 0);
      const saldoAwalBulan = currentSaldo;
      const saldoAkhirBulan = saldoAwalBulan + pemasukan - pengeluaran;
      currentSaldo = saldoAkhirBulan;

      // Top allocation for income and expense
      const allocInMap: Record<string, number> = {};
      const allocOutMap: Record<string, number> = {};

      monthItems.forEach(it => {
        if (it.debet > 0) allocInMap[it.allocation] = (allocInMap[it.allocation] || 0) + it.debet;
        if (it.kredit > 0) allocOutMap[it.allocation] = (allocOutMap[it.allocation] || 0) + it.kredit;
      });

      const topAllocIn = Object.entries(allocInMap).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
      const topAllocOut = Object.entries(allocOutMap).sort((a, b) => b[1] - a[1])[0] || ['-', 0];

      return {
        ...m,
        itemsCount: monthItems.length,
        pemasukan,
        pengeluaran,
        saldoAwalBulan,
        saldoAkhirBulan,
        netFlow: pemasukan - pengeluaran,
        topAllocIn: topAllocIn[0],
        topAllocInAmount: topAllocIn[1],
        topAllocOut: topAllocOut[0],
        topAllocOutAmount: topAllocOut[1]
      };
    });
  }, [items]);

  // Filtered Items for Ledger Table
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Month Filter
      if (selectedMonth !== 'all') {
        const matchesKey = item.monthKey === selectedMonth;
        const matchesShort = item.date.toLowerCase().includes(selectedMonth.toLowerCase());
        if (!matchesKey && !matchesShort) return false;
      }

      // Allocation Filter
      if (selectedAllocation !== 'all' && item.allocation !== selectedAllocation) {
        return false;
      }

      // Type Filter
      if (selectedType === 'pemasukan' && item.debet <= 0) return false;
      if (selectedType === 'pengeluaran' && item.kredit <= 0) return false;

      // Search Term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const docMatch = (item.docNo || '').toLowerCase().includes(term);
        const picMatch = (item.pic || '').toLowerCase().includes(term);
        const descMatch = (item.description || '').toLowerCase().includes(term);
        const allocMatch = (item.allocation || '').toLowerCase().includes(term);
        if (!docMatch && !picMatch && !descMatch && !allocMatch) return false;
      }

      return true;
    });
  }, [items, selectedMonth, selectedAllocation, selectedType, searchTerm]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;

  // Live parser preview for pasted CSV modal
  const parsedPreview = useMemo(() => {
    if (!pastedCsv.trim()) return null;
    try {
      const parsed = parseDonationDatabaseCsv(pastedCsv, selectedAccount);
      const totalDebet = parsed.items.reduce((sum, it) => sum + (it.debet || 0), 0);
      const totalKredit = parsed.items.reduce((sum, it) => sum + (it.kredit || 0), 0);
      const saldoAkhir = parsed.saldoAwal + totalDebet - totalKredit;
      return {
        count: parsed.items.length,
        saldoAwal: parsed.saldoAwal,
        totalDebet,
        totalKredit,
        saldoAkhir,
        previewItems: parsed.items.slice(0, 5),
        isValid: parsed.items.length > 0
      };
    } catch {
      return null;
    }
  }, [pastedCsv, selectedAccount]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["ID", "TGL", "NO. DOC", "ALOKASI ANGGARAN", "PIC", "KETERANGAN", "DEBET", "KREDIT", "SALDO AKHIR"];
    const rows = filteredItems.map((item, idx) => [
      item.id,
      item.date,
      item.docNo || '-',
      item.allocation,
      item.pic || '-',
      `"${(item.description || '').replace(/"/g, '""')}"`,
      item.debet || 0,
      item.kredit || 0,
      item.saldoAkhir || 0
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Donasi_Rekening_SMP_2026_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Data buku kas donasi Rekening SMP berhasil diexport ke CSV!");
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  const toggleExpand = (categoryName: string) => {
    setExpandedCategories(prev => ({ ...prev, [categoryName]: !prev[categoryName] }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Center */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        {/* Account Selector Pill Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rekening Akun:</span>
            <div className="inline-flex p-1 bg-slate-100/90 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedAccount('smp')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedAccount === 'smp'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap size={15} />
                <span>Rekening Donasi SMP</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  selectedAccount === 'smp' ? 'bg-emerald-700/60 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  149 Data
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedAccount('sma');
                  toast.info("Menampilkan tampilan Rekening SMA");
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedAccount === 'sma'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 size={15} />
                <span>Rekening Donasi SMA</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Rekening Aktif: <strong>{selectedAccount === 'smp' ? 'SMP (Sekolah Menengah Pertama)' : 'SMA'}</strong></span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider shadow-xs">
                Rekening Donasi SMP
              </span>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase tracking-wider">
                Buku Kas 2026
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-[10px] font-black rounded-full uppercase tracking-wider">
                Sekolah Cendekia BAZNAS
              </span>
              {isFirestoreConnected && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                  <CheckCircle2 size={12} /> Database Terhubung
                </span>
              )}
            </div>
            <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Data Donasi Rekening SMP</span>
              <span className="text-sm font-bold text-slate-400 font-normal">(Buku Kas & Alokasi Anggaran)</span>
            </h2>
            <p className="text-sm font-medium text-slate-500 max-w-3xl">
              Database mutasi kas Rekening Donasi SMP Sekolah Cendekia BAZNAS, pengelompokan debet dan kredit berdasarkan alokasi anggaran, serta buku pembantu kas per bulan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl shadow-xs gap-2 font-bold text-xs h-10 px-3.5"
              title="Perbarui database dengan menempel teks CSV / data Excel"
            >
              <UploadCloud size={16} />
              Update / Tempel CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsSheetsModalOpen(true)}
              className="rounded-xl border-emerald-300 hover:bg-emerald-50 text-emerald-800 font-bold text-xs h-10 px-3.5 gap-2"
              title="Tautkan link publikasi Google Sheets untuk sinkronisasi otomatis"
            >
              <Link2 size={16} className="text-emerald-600" />
              Tautkan Google Sheets
            </Button>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md gap-2 font-bold text-xs h-10 px-4"
            >
              <Plus size={16} />
              Tambah Transaksi SMP
            </Button>
            <Button
              variant="outline"
              onClick={handleSyncToFirestore}
              disabled={loading}
              className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs h-10 px-4 gap-2"
              title="Sinkronkan seluruh 149 transaksi Rekening Donasi SMP ke database Firestore cloud"
            >
              <Sparkles size={16} className="text-amber-500" />
              {loading ? "Menyinkronkan..." : "Sinkron Database SMP"}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs h-10 px-3 gap-2"
            >
              <Download size={15} />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs h-10 px-3 gap-2"
            >
              <PrintIcon size={15} />
              Cetak
            </Button>
            <Button
              variant="ghost"
              onClick={handleResetData}
              className="rounded-xl hover:bg-slate-100 text-slate-500 text-xs h-10 px-3"
              title="Kembalikan ke data awal Rekening SMP"
            >
              <RotateCcw size={15} />
            </Button>
          </div>
        </div>

        {/* 4 Core Financial Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          {/* Card 1: Saldo Awal */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Saldo Awal (1 Jan 2026)</span>
              <div className="p-2 bg-white rounded-xl shadow-xs text-slate-600 border border-slate-100">
                <Wallet size={18} />
              </div>
            </div>
            <p className="text-xl lg:text-2xl font-black text-slate-900 mt-2">
              {formatRupiah(metrics.saldoAwal)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Buku Kas Donasi SCB 2026
            </p>
          </div>

          {/* Card 2: Total Pemasukan */}
          <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">Total Pemasukan (Debet)</span>
              <div className="p-2 bg-white rounded-xl shadow-xs text-emerald-600 border border-emerald-100">
                <ArrowDownLeft size={18} />
              </div>
            </div>
            <p className="text-xl lg:text-2xl font-black text-emerald-700 mt-2">
              {formatRupiah(metrics.totalPemasukan)}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge className="bg-emerald-200 text-emerald-800 text-[10px] font-black border-none px-2 py-0.5">
                {metrics.countPemasukan} Transaksi
              </Badge>
              <span className="text-[11px] text-emerald-700 font-medium">Januari - Agustus</span>
            </div>
          </div>

          {/* Card 3: Total Pengeluaran */}
          <div className="bg-rose-50/70 rounded-2xl p-4 border border-rose-200/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-800">Total Pengeluaran (Kredit)</span>
              <div className="p-2 bg-white rounded-xl shadow-xs text-rose-600 border border-rose-100">
                <ArrowUpRight size={18} />
              </div>
            </div>
            <p className="text-xl lg:text-2xl font-black text-rose-700 mt-2">
              {formatRupiah(metrics.totalPengeluaran)}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge className="bg-rose-200 text-rose-800 text-[10px] font-black border-none px-2 py-0.5">
                {metrics.countPengeluaran} Transaksi
              </Badge>
              <span className="text-[11px] text-rose-700 font-medium">Tersalurkan Sesuai Alokasi</span>
            </div>
          </div>

          {/* Card 4: Saldo Akhir */}
          <div className="bg-blue-50/70 rounded-2xl p-4 border border-blue-200/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-800">Saldo Akhir (Agustus 2026)</span>
              <div className="p-2 bg-white rounded-xl shadow-xs text-blue-600 border border-blue-100">
                <Coins size={18} />
              </div>
            </div>
            <p className="text-xl lg:text-2xl font-black text-blue-900 mt-2">
              {formatRupiah(metrics.saldoAkhir)}
            </p>
            <p className="text-[11px] text-blue-700 font-medium mt-1">
              Total {metrics.totalTransactions} mutasi tercatat di database
            </p>
          </div>
        </div>

        {/* Dynamic Database Sync Indicator Banner */}
        <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-sm">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-slate-900">Database Firestore Terhubung & Dinamis</span>
                <Badge className="bg-emerald-100 text-emerald-800 font-bold text-[10px] border-none">
                  Collection: monthly_donation_ledger ({metrics.totalTransactions} Transaksi)
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Jika data base ini berubah, baik nominal maupun keterangannya (lewat <strong>Tombol Edit Baris</strong>, <strong>Tempel CSV Excel</strong>, atau <strong>Google Sheets</strong>), maka di aplikasi pun seketika berubah.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsImportModalOpen(true)}
              className="bg-white border-emerald-300 text-emerald-800 font-bold text-xs rounded-xl hover:bg-emerald-50"
            >
              <UploadCloud size={14} className="mr-1.5" />
              Update / Tempel CSV
            </Button>
            <Button
              size="sm"
              onClick={() => setActiveTab('ledger')}
              className="bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 border-none shadow-xs"
            >
              <Eye size={14} className="mr-1.5" />
              Buku Kas & Edit Transaksi
            </Button>
          </div>
        </div>
      </div>

      {/* Main View Selector Navigation Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'categories'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers size={15} />
            1. Kategori Alokasi Anggaran
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'monthly'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar size={15} />
            2. Rekap Per Bulan (Jan - Agu)
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'ledger'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet size={15} />
            3. Buku Kas & Cek Transaksi ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'charts'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 size={15} />
            4. Grafik & Analisis
          </button>
        </div>

        <div className="text-xs font-bold text-slate-500 pr-2">
          Tahun Anggaran: <span className="text-slate-900 font-black">2026</span>
        </div>
      </div>

      {/* VIEW 1: KATEGORISASI ALOKASI ANGGARAN (PEMASUKAN & PENGELUARAN) */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Section Pemasukan */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-600/20">
                  <ArrowDownLeft size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Pemasukan Berdasarkan Alokasi Anggaran
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Total: <span className="font-bold text-emerald-700">{formatRupiah(metrics.totalPemasukan)}</span> ({metrics.countPemasukan} transaksi masuk)
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 font-black text-xs px-3 py-1 border-none">
                {allocationBreakdown.pemasukanList.length} Kategori Alokasi
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allocationBreakdown.pemasukanList.map((item) => {
                const conf = ALLOCATION_CONFIG[item.allocation] || {
                  label: item.allocation,
                  color: 'text-slate-700',
                  bg: 'bg-slate-100 text-slate-700 border-slate-300',
                  border: '#64748b',
                  icon: Coins
                };
                const IconComponent = conf.icon;
                const percentage = ((item.pemasukan / (metrics.totalPemasukan || 1)) * 100).toFixed(2);
                const isExpanded = expandedCategories[`in_${item.allocation}`];

                return (
                  <Card key={`in_${item.allocation}`} className="border-slate-200/80 shadow-xs hover:shadow-md transition-all">
                    <CardHeader className="p-4 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl ${conf.bg}`}>
                            <IconComponent size={18} />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-black text-slate-900">
                              {conf.label}
                            </CardTitle>
                            <CardDescription className="text-[11px] font-medium text-slate-500">
                              {item.countIn} Transaksi Masuk
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[11px] font-black border-emerald-200 text-emerald-700 bg-emerald-50">
                          {percentage}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-semibold text-slate-500">Total Masuk:</span>
                        <span className="text-lg font-black text-emerald-700">
                          {formatRupiah(item.pemasukan)}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(4, Number(percentage)))}%` }}
                        />
                      </div>

                      {/* Expandable item list */}
                      <div className="pt-2 border-t border-slate-100">
                        <button
                          onClick={() => toggleExpand(`in_${item.allocation}`)}
                          className="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 hover:text-slate-900 py-1"
                        >
                          <span>{isExpanded ? "Sembunyikan Rincian" : "Lihat Rincian Transaksi"}</span>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                            {item.itemsIn.map((tx) => (
                              <div key={tx.id} className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-1">
                                <div className="flex justify-between items-center font-bold text-slate-800">
                                  <span>{tx.date} • {tx.pic || 'Umum'}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-emerald-700">{formatRupiah(tx.debet)}</span>
                                    <button
                                      onClick={() => handleOpenEdit(tx)}
                                      className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-white transition-colors"
                                      title="Edit nominal / keterangan"
                                    >
                                      <Edit3 size={12} />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-slate-500 text-[10px] leading-tight line-clamp-2">
                                  {tx.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Section Pengeluaran */}
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-md shadow-rose-600/20">
                  <ArrowUpRight size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Pengeluaran Berdasarkan Alokasi Anggaran
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Total: <span className="font-bold text-rose-700">{formatRupiah(metrics.totalPengeluaran)}</span> ({metrics.countPengeluaran} transaksi keluar)
                  </p>
                </div>
              </div>
              <Badge className="bg-rose-100 text-rose-800 font-black text-xs px-3 py-1 border-none">
                {allocationBreakdown.pengeluaranList.length} Kategori Alokasi
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allocationBreakdown.pengeluaranList.map((item) => {
                const conf = ALLOCATION_CONFIG[item.allocation] || {
                  label: item.allocation,
                  color: 'text-slate-700',
                  bg: 'bg-slate-100 text-slate-700 border-slate-300',
                  border: '#64748b',
                  icon: Coins
                };
                const IconComponent = conf.icon;
                const percentage = ((item.pengeluaran / (metrics.totalPengeluaran || 1)) * 100).toFixed(2);
                const isExpanded = expandedCategories[`out_${item.allocation}`];

                return (
                  <Card key={`out_${item.allocation}`} className="border-slate-200/80 shadow-xs hover:shadow-md transition-all">
                    <CardHeader className="p-4 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl ${conf.bg}`}>
                            <IconComponent size={18} />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-black text-slate-900">
                              {conf.label}
                            </CardTitle>
                            <CardDescription className="text-[11px] font-medium text-slate-500">
                              {item.countOut} Transaksi Keluar
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[11px] font-black border-rose-200 text-rose-700 bg-rose-50">
                          {percentage}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-semibold text-slate-500">Total Keluar:</span>
                        <span className="text-lg font-black text-rose-700">
                          {formatRupiah(item.pengeluaran)}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-rose-500 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(4, Number(percentage)))}%` }}
                        />
                      </div>

                      {/* Expandable item list */}
                      <div className="pt-2 border-t border-slate-100">
                        <button
                          onClick={() => toggleExpand(`out_${item.allocation}`)}
                          className="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 hover:text-slate-900 py-1"
                        >
                          <span>{isExpanded ? "Sembunyikan Rincian" : "Lihat Rincian Transaksi"}</span>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                            {item.itemsOut.map((tx) => (
                              <div key={tx.id} className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-1">
                                <div className="flex justify-between items-center font-bold text-slate-800">
                                  <span>{tx.date} • {tx.pic || 'Umum'}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-rose-700">{formatRupiah(tx.kredit)}</span>
                                    <button
                                      onClick={() => handleOpenEdit(tx)}
                                      className="p-1 rounded text-slate-400 hover:text-rose-700 hover:bg-white transition-colors"
                                      title="Edit nominal / keterangan"
                                    >
                                      <Edit3 size={12} />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-slate-500 text-[10px] leading-tight line-clamp-2">
                                  {tx.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Tabel Perbandingan Neraca Saldo Alokasi Anggaran */}
          <div className="pt-6">
            <Card className="border-slate-200/80 shadow-xs overflow-hidden">
              <CardHeader className="bg-slate-50/70 p-4 border-b border-slate-100">
                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers size={16} />
                  Rekapitulasi Netto Alokasi Anggaran (Debet vs Kredit)
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-black text-xs text-slate-700">Alokasi Anggaran</TableHead>
                      <TableHead className="font-black text-xs text-right text-emerald-700">Pemasukan (Debet)</TableHead>
                      <TableHead className="font-black text-xs text-right text-rose-700">Pengeluaran (Kredit)</TableHead>
                      <TableHead className="font-black text-xs text-right text-slate-700">Saldo Netto</TableHead>
                      <TableHead className="font-black text-xs text-center text-slate-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocationBreakdown.all
                      .sort((a, b) => (b.pemasukan + b.pengeluaran) - (a.pemasukan + a.pengeluaran))
                      .map((row) => {
                        const net = row.pemasukan - row.pengeluaran;
                        const conf = ALLOCATION_CONFIG[row.allocation] || {
                          label: row.allocation,
                          bg: 'bg-slate-100 text-slate-700'
                        };

                        return (
                          <TableRow key={`summary_${row.allocation}`} className="hover:bg-slate-50/80">
                            <TableCell className="font-bold text-slate-900 text-xs">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold mr-2 ${conf.bg}`}>
                                {row.allocation}
                              </span>
                              <span className="text-slate-500 font-normal">({conf.label})</span>
                            </TableCell>
                            <TableCell className="text-right font-black text-emerald-700 text-xs">
                              {formatRupiah(row.pemasukan)}
                            </TableCell>
                            <TableCell className="text-right font-black text-rose-700 text-xs">
                              {formatRupiah(row.pengeluaran)}
                            </TableCell>
                            <TableCell className={`text-right font-black text-xs ${net >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                              {formatRupiah(net)}
                            </TableCell>
                            <TableCell className="text-center">
                              {net > 0 ? (
                                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold border-none">
                                  Surplus
                                </Badge>
                              ) : net < 0 ? (
                                <Badge className="bg-rose-100 text-rose-800 text-[10px] font-bold border-none">
                                  Defisit / Tersalurkan
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] font-bold">
                                  Imbang (0)
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW 2: REKAP PER BULAN (JAN - AGU 2026) */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Rekapitulasi Arus Donasi Per Bulan (Tahun Buku 2026)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Pantau saldo awal, pergerakan kas masuk, kas keluar, dan saldo akhir setiap bulan.
              </p>
            </div>
            <Badge className="bg-slate-900 text-white font-black text-xs px-3 py-1">
              8 Periode Bulan
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {monthlyBreakdown.map((m) => {
              const isSurplus = m.netFlow >= 0;

              return (
                <Card key={m.key} className="border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                  <CardHeader className="p-4 pb-2 bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <Calendar size={15} className="text-slate-500" />
                        {m.label}
                      </CardTitle>
                      <Badge variant={isSurplus ? "secondary" : "destructive"} className="text-[10px] font-bold">
                        {isSurplus ? `+${formatRupiah(m.netFlow)}` : formatRupiah(m.netFlow)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3 text-xs">
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-slate-500">
                        <span>Saldo Awal:</span>
                        <span className="font-semibold text-slate-700">{formatRupiah(m.saldoAwalBulan)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span className="flex items-center gap-1">
                          <ArrowDownLeft size={13} /> Masuk:
                        </span>
                        <span>+{formatRupiah(m.pemasukan)}</span>
                      </div>
                      <div className="flex justify-between text-rose-700 font-bold">
                        <span className="flex items-center gap-1">
                          <ArrowUpRight size={13} /> Keluar:
                        </span>
                        <span>-{formatRupiah(m.pengeluaran)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-100 font-black text-slate-900 text-sm">
                        <span>Saldo Akhir:</span>
                        <span className="text-blue-900">{formatRupiah(m.saldoAkhirBulan)}</span>
                      </div>
                    </div>

                    {/* Top Allocations in this month */}
                    <div className="bg-slate-50 p-2.5 rounded-xl space-y-1 text-[11px] border border-slate-100">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Alokasi Dominan
                      </div>
                      <div className="truncate text-slate-600">
                        <span className="font-bold text-emerald-700">In:</span> {m.topAllocIn} ({formatRupiah(m.topAllocInAmount)})
                      </div>
                      <div className="truncate text-slate-600">
                        <span className="font-bold text-rose-700">Out:</span> {m.topAllocOut} ({formatRupiah(m.topAllocOutAmount)})
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px] font-bold text-slate-500 bg-slate-100/70 px-3 py-1.5 rounded-xl">
                      <span>Total Mutasi</span>
                      <span className="font-mono text-slate-800">{m.itemsCount} Transaksi</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: BUKU KAS & CEK TRANSAKSI (DENGAN FASILITAS EDIT LANGSUNG) */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <Card className="border-slate-200/80 shadow-xs">
            <CardHeader className="p-4 bg-slate-50/50 border-b border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet size={18} className="text-emerald-600" />
                    Buku Kas & Cek Transaksi Rekening SMP 2026
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Data mutasi lengkap per baris. Klik tombol <strong>Edit</strong> pada baris mana saja untuk mengubah nominal maupun keterangan. Saldo akhir dan laporan akan langsung dihitung ulang.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => setIsImportModalOpen(true)}
                    className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl"
                  >
                    <UploadCloud size={14} className="mr-1.5" />
                    Update / Tempel CSV
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                  >
                    <Plus size={14} className="mr-1.5" />
                    Tambah Transaksi
                  </Button>
                </div>
              </div>

              {/* Filter Controls Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-slate-200/60">
                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Cari keterangan, no. doc, PIC..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-8 text-xs bg-white rounded-xl border-slate-200 h-9"
                  />
                </div>

                {/* Filter Month */}
                <div>
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 text-xs font-medium text-slate-800 h-9"
                  >
                    <option value="all">Semua Bulan (Jan - Agu)</option>
                    <option value="Jan">Januari 2026</option>
                    <option value="Feb">Februari 2026</option>
                    <option value="Mar">Maret 2026</option>
                    <option value="Apr">April 2026</option>
                    <option value="Mei">Mei 2026</option>
                    <option value="Jun">Juni 2026</option>
                    <option value="Jul">Juli 2026</option>
                    <option value="Agu">Agustus 2026</option>
                  </select>
                </div>

                {/* Filter Allocation */}
                <div>
                  <select
                    value={selectedAllocation}
                    onChange={(e) => {
                      setSelectedAllocation(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 text-xs font-medium text-slate-800 h-9"
                  >
                    <option value="all">Semua Alokasi Anggaran</option>
                    {Object.keys(ALLOCATION_CONFIG).map(alloc => (
                      <option key={alloc} value={alloc}>{alloc} - {ALLOCATION_CONFIG[alloc].label}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Type */}
                <div>
                  <select
                    value={selectedType}
                    onChange={(e) => {
                      setSelectedType(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 text-xs font-medium text-slate-800 h-9"
                  >
                    <option value="all">Semua Jenis Transaksi</option>
                    <option value="pemasukan">Hanya Pemasukan (Debet)</option>
                    <option value="pengeluaran">Hanya Pengeluaran (Kredit)</option>
                  </select>
                </div>
              </div>

              {/* Summary Strip */}
              <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/60 font-medium">
                <div className="flex items-center gap-3">
                  <span>Ditemukan: <strong>{filteredItems.length}</strong> transaksi</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-emerald-700">Debet: <strong>{formatRupiah(filteredItems.reduce((s, it) => s + (it.debet || 0), 0))}</strong></span>
                  <span className="text-slate-300">|</span>
                  <span className="text-rose-700">Kredit: <strong>{formatRupiah(filteredItems.reduce((s, it) => s + (it.kredit || 0), 0))}</strong></span>
                </div>
                {(searchTerm || selectedMonth !== 'all' || selectedAllocation !== 'all' || selectedType !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedMonth('all');
                      setSelectedAllocation('all');
                      setSelectedType('all');
                      setCurrentPage(1);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                  >
                    <RotateCcw size={12} /> Reset Filter
                  </button>
                )}
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs font-black text-slate-700">No</TableHead>
                    <TableHead className="w-24 text-xs font-black text-slate-700">Tanggal</TableHead>
                    <TableHead className="w-24 text-xs font-black text-slate-700">No. Doc</TableHead>
                    <TableHead className="w-40 text-xs font-black text-slate-700">Alokasi Anggaran</TableHead>
                    <TableHead className="w-28 text-xs font-black text-slate-700">PIC</TableHead>
                    <TableHead className="min-w-[280px] text-xs font-black text-slate-700">Keterangan</TableHead>
                    <TableHead className="w-32 text-right text-xs font-black text-emerald-700">Debet (Masuk)</TableHead>
                    <TableHead className="w-32 text-right text-xs font-black text-rose-700">Kredit (Keluar)</TableHead>
                    <TableHead className="w-36 text-right text-xs font-black text-blue-900">Saldo Akhir</TableHead>
                    <TableHead className="w-24 text-center text-xs font-black text-slate-700">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-slate-400 text-xs">
                        Tidak ada transaksi yang cocok dengan filter pencarian.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((item, index) => {
                      const actualIndex = (currentPage - 1) * itemsPerPage + index + 1;
                      const conf = ALLOCATION_CONFIG[item.allocation] || {
                        label: item.allocation,
                        color: 'text-slate-700',
                        bg: 'bg-slate-100 text-slate-700 border-slate-200',
                        border: '#64748b',
                        icon: Coins
                      };
                      return (
                        <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <TableCell className="text-center font-mono text-xs text-slate-400">
                            {actualIndex}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-800 whitespace-nowrap">
                            {item.date}
                          </TableCell>
                          <TableCell className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                            {item.docNo || '-'}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${conf.bg}`}>
                              {item.allocation}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                            {item.pic || '-'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-800 font-medium max-w-md">
                            {item.description}
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold text-emerald-700 whitespace-nowrap">
                            {item.debet > 0 ? formatRupiah(item.debet) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold text-rose-700 whitespace-nowrap">
                            {item.kredit > 0 ? formatRupiah(item.kredit) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-xs font-black font-mono text-blue-900 whitespace-nowrap">
                            {formatRupiah(item.saldoAkhir || 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEdit(item)}
                                className="h-7 w-7 p-0 rounded-lg hover:bg-emerald-50 text-slate-500 hover:text-emerald-700"
                                title="Edit nominal atau keterangan transaksi"
                              >
                                <Edit3 size={13} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteItem(item.id)}
                                className="h-7 w-7 p-0 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                                title="Hapus transaksi"
                              >
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500">
                <div>
                  Menampilkan <strong>{Math.min(filteredItems.length, (currentPage - 1) * itemsPerPage + 1)}</strong> - <strong>{Math.min(filteredItems.length, currentPage * itemsPerPage)}</strong> dari <strong>{filteredItems.length}</strong> transaksi
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="h-8 px-3 text-xs rounded-lg font-bold"
                  >
                    Sebelumnya
                  </Button>
                  <span className="px-2 font-bold text-slate-700">
                    Halaman {currentPage} / {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="h-8 px-3 text-xs rounded-lg font-bold"
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* VIEW 3: GRAFIK & ANALISIS VISUAL */}
      {activeTab === 'charts' && (
        <div className="space-y-6">
          {/* Chart Row 1: Bar Chart Pemasukan vs Pengeluaran per Bulan */}
          <Card className="border-slate-200/80 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                <BarChart3 size={16} />
                Tren Arus Kas Masuk vs Kas Keluar Per Bulan (2026)
              </CardTitle>
              <CardDescription className="text-xs">
                Perbandingan total debet (pemasukan) dan kredit (pengeluaran) dalam satuan Rupiah.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyBreakdown} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="short" tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(val) => `${(val / 1000000).toFixed(0)}jt`}
                    />
                    <Tooltip 
                      formatter={(val: any) => [formatRupiah(Number(val)), '']}
                      labelFormatter={(label) => `Bulan ${label} 2026`}
                    />
                    <Legend />
                    <Bar dataKey="pemasukan" name="Pemasukan (Debet)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pengeluaran" name="Pengeluaran (Kredit)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Chart Row 2: Pie Charts of In vs Out Allocations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart Pemasukan */}
            <Card className="border-slate-200/80 shadow-xs">
              <CardHeader className="p-4 pb-2 border-b border-slate-100 bg-emerald-50/30">
                <CardTitle className="text-sm font-black text-emerald-900 flex items-center gap-2 uppercase tracking-wider">
                  <PieIcon size={16} />
                  Proporsi Pemasukan Per Alokasi Anggaran
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationBreakdown.pemasukanList.map(a => ({
                          name: a.allocation,
                          value: a.pemasukan
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {allocationBreakdown.pemasukanList.map((entry, index) => (
                          <Cell 
                            key={`cell-in-${index}`} 
                            fill={ALLOCATION_CONFIG[entry.allocation]?.border || '#10b981'} 
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [formatRupiah(Number(val)), 'Pemasukan']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pie Chart Pengeluaran */}
            <Card className="border-slate-200/80 shadow-xs">
              <CardHeader className="p-4 pb-2 border-b border-slate-100 bg-rose-50/30">
                <CardTitle className="text-sm font-black text-rose-900 flex items-center gap-2 uppercase tracking-wider">
                  <PieIcon size={16} />
                  Proporsi Pengeluaran Per Alokasi Anggaran
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationBreakdown.pengeluaranList.map(a => ({
                          name: a.allocation,
                          value: a.pengeluaran
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {allocationBreakdown.pengeluaranList.map((entry, index) => (
                          <Cell 
                            key={`cell-out-${index}`} 
                            fill={ALLOCATION_CONFIG[entry.allocation]?.border || '#f43f5e'} 
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [formatRupiah(Number(val)), 'Pengeluaran']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart Row 3: Area Chart of Running Saldo Trend */}
          <Card className="border-slate-200/80 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-black text-blue-900 flex items-center gap-2 uppercase tracking-wider">
                <TrendingUp size={16} />
                Tren Saldo Akhir Kas Donasi Sepanjang 2026
              </CardTitle>
              <CardDescription className="text-xs">
                Perkembangan saldo kas donasi dari Saldo Awal Rp 30.759.759 hingga akhir Agustus 2026.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyBreakdown} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="saldoGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="short" tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(val) => `${(val / 1000000).toFixed(0)}jt`}
                    />
                    <Tooltip formatter={(val: any) => [formatRupiah(Number(val)), 'Saldo Akhir']} />
                    <Area type="monotone" dataKey="saldoAkhirBulan" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#saldoGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Tambah Transaksi Baru */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Tambah Transaksi Donasi / Beban Baru
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Tipe Transaksi</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(f => ({ ...f, type: 'pemasukan' }))}
                  className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    formData.type === 'pemasukan'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ArrowDownLeft size={16} />
                  Pemasukan (Debet)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(f => ({ ...f, type: 'pengeluaran' }))}
                  className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    formData.type === 'pengeluaran'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ArrowUpRight size={16} />
                  Pengeluaran (Kredit)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Alokasi Anggaran</label>
              <select
                value={formData.allocation}
                onChange={(e) => setFormData(f => ({ ...f, allocation: e.target.value }))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                {Object.keys(ALLOCATION_CONFIG).map(alloc => (
                  <option key={alloc} value={alloc}>{alloc} - {ALLOCATION_CONFIG[alloc].label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal</label>
                <Input
                  value={formData.date}
                  onChange={(e) => setFormData(f => ({ ...f, date: e.target.value }))}
                  placeholder="Contoh: 1-Sep-26"
                  className="text-xs rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">No. Dokumen</label>
                <Input
                  value={formData.docNo}
                  onChange={(e) => setFormData(f => ({ ...f, docNo: e.target.value }))}
                  placeholder="CAD.01.010926"
                  className="text-xs rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">PIC / Donatur / Penerima</label>
              <Input
                value={formData.pic}
                onChange={(e) => setFormData(f => ({ ...f, pic: e.target.value }))}
                placeholder="Nama PIC atau Donatur"
                className="text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nominal (Rp)</label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(f => ({ ...f, amount: e.target.value }))}
                placeholder="0"
                className="text-sm font-black rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Keterangan Lengkap</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Tulis rincian peruntukan transaksi..."
                rows={2}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveNewItem}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
            >
              Simpan Transaksi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Edit Transaksi */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Edit3 size={18} className="text-emerald-600" />
              Edit Transaksi Rekening SMP
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ubah nominal, keterangan, atau alokasi. Perubahan akan langsung disimpan ke database Firestore dan seluruh saldo akhir dihitung ulang.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Tipe Transaksi</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(f => ({ ...f, type: 'pemasukan' }))}
                  className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    formData.type === 'pemasukan'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ArrowDownLeft size={16} />
                  Pemasukan (Debet)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(f => ({ ...f, type: 'pengeluaran' }))}
                  className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    formData.type === 'pengeluaran'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ArrowUpRight size={16} />
                  Pengeluaran (Kredit)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Alokasi Anggaran</label>
              <select
                value={formData.allocation}
                onChange={(e) => setFormData(f => ({ ...f, allocation: e.target.value }))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                {Object.keys(ALLOCATION_CONFIG).map(alloc => (
                  <option key={alloc} value={alloc}>{alloc} - {ALLOCATION_CONFIG[alloc].label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal</label>
                <Input
                  value={formData.date}
                  onChange={(e) => setFormData(f => ({ ...f, date: e.target.value }))}
                  className="text-xs rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">No. Dokumen</label>
                <Input
                  value={formData.docNo}
                  onChange={(e) => setFormData(f => ({ ...f, docNo: e.target.value }))}
                  className="text-xs rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">PIC / Donatur / Penerima</label>
              <Input
                value={formData.pic}
                onChange={(e) => setFormData(f => ({ ...f, pic: e.target.value }))}
                className="text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nominal (Rp)</label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(f => ({ ...f, amount: e.target.value }))}
                className="text-sm font-black text-slate-900 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Keterangan Transaksi</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Update / Tempel CSV Excel */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <UploadCloud size={20} className="text-emerald-700" />
              Update / Tempel Database Donasi SMP (Excel / CSV)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Jika data di Excel Anda berubah nominal atau keterangannya, salin seluruh tabel lalu tempelkan di bawah ini. Sistem otomatis mendeteksi kolom, saldo awal, dan menghitung saldo akhir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="font-bold text-slate-700">Teks Data Tabel CSV / TSV / Excel:</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPastedCsv(DEFAULT_RAW_CSV_SMP_2026)}
                  className="h-7 px-2 text-[11px] text-emerald-700 hover:bg-emerald-50 rounded-lg font-bold"
                >
                  Muat Data Asli 2026
                </Button>
                <label className="cursor-pointer inline-flex items-center gap-1.5 h-7 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-colors">
                  <FileText size={12} />
                  Unggah File .CSV
                  <input
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <textarea
              value={pastedCsv}
              onChange={(e) => setPastedCsv(e.target.value)}
              placeholder="Tempel baris data dari Excel di sini..."
              rows={8}
              className="w-full font-mono text-[11px] p-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
            />

            {/* Live Parsing Preview Summary */}
            {parsedPreview ? (
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    Format Valid: {parsedPreview.count} Baris Transaksi Terdeteksi
                  </span>
                  <span className="text-[11px] font-mono font-bold text-emerald-800">
                    Saldo Akhir: {formatRupiah(parsedPreview.saldoAkhir)}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Saldo Awal</div>
                    <div className="font-bold text-slate-800">{formatRupiah(parsedPreview.saldoAwal)}</div>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                    <div className="text-emerald-600 text-[10px] uppercase font-bold">Total Debet</div>
                    <div className="font-bold text-emerald-700">+{formatRupiah(parsedPreview.totalDebet)}</div>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                    <div className="text-rose-600 text-[10px] uppercase font-bold">Total Kredit</div>
                    <div className="font-bold text-rose-700">-{formatRupiah(parsedPreview.totalKredit)}</div>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                    <div className="text-blue-600 text-[10px] uppercase font-bold">Saldo Akhir</div>
                    <div className="font-black text-blue-900">{formatRupiah(parsedPreview.saldoAkhir)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-3 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-amber-600" />
                <span>Format data belum dikenali atau masih kosong. Tempelkan baris tabel dari Excel untuk melihat pratinjau.</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsImportModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              onClick={handleApplyPastedCsv}
              disabled={loading || !parsedPreview?.isValid}
              className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold gap-2 shadow-xs"
            >
              <CheckCircle2 size={15} />
              {loading ? "Menyimpan ke Database..." : `Terapkan & Simpan ke Database (${parsedPreview?.count || 0} Data)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tautkan Google Sheets */}
      <Dialog open={isSheetsModalOpen} onOpenChange={setIsSheetsModalOpen}>
        <DialogContent className="max-w-lg bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Link2 size={20} className="text-emerald-600" />
              Tautkan Link Database Google Sheets
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Jika data donasi rekening SMP dikelola di Google Sheets, tautkan tautan CSV publiknya agar aplikasi dapat langsung menarik pembaruan kapan pun.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Tautan Publikasi Web / CSV Google Sheets:
              </label>
              <div className="relative">
                <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={googleSheetsUrl}
                  onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                  className="pl-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5 text-xs text-slate-600">
              <span className="font-bold text-slate-900 block">Cara Mendapatkan Link CSV Google Sheets:</span>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600">
                <li>Buka Google Sheets data Rekening Donasi SMP Anda.</li>
                <li>Pilih menu <strong>File &gt; Bagikan (Share) &gt; Publikasikan ke web</strong>.</li>
                <li>Pada tab lembar kerja, pilih lembar donasi dan ubah format <em>Halaman Web</em> menjadi <strong>Comma-separated values (.csv)</strong>.</li>
                <li>Klik <strong>Publikasikan</strong> lalu salin URL yang muncul dan tempelkan di atas.</li>
              </ol>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsSheetsModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Tutup
            </Button>
            <Button
              onClick={handleFetchGoogleSheets}
              disabled={isFetchingSheets || !googleSheetsUrl.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-2 shadow-xs"
            >
              <RefreshCw size={14} className={isFetchingSheets ? "animate-spin" : ""} />
              {isFetchingSheets ? "Mengambil Data..." : "Tarik Data Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
