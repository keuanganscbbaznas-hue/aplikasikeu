import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { db } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  addDoc, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  getDocs 
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowRightLeft, 
  Wallet, 
  Coins, 
  Download, 
  FileSpreadsheet,
  Trash2,
  Plus,
  Settings,
  AlertCircle,
  BarChart3,
  PieChart as PieIcon,
  HelpCircle
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
  Legend 
} from 'recharts';
import { toast } from 'sonner';
import { ALL_CASHFLOWS } from './DonationSummaryReports';

// Default budget names matching user's specification for SMP and SMA
export const DEFAULT_BUDGET_CATEGORIES = [
  // SMP Penerimaan Dana Terikat
  { account: "smp", type: "penerimaan", category: "dana_terikat", subCategory: "", name: "Titipan Uang Saku BAZNAS Daerah" },
  { account: "smp", type: "penerimaan", category: "dana_terikat", subCategory: "", name: "Dana PIP (Program Indonesia Pintar)" },
  { account: "smp", type: "penerimaan", category: "dana_terikat", subCategory: "", name: "Donasi Laptop" },
  
  // SMP Penerimaan Dana Tidak Terikat
  { account: "smp", type: "penerimaan", category: "dana_tidak_terikat", subCategory: "", name: "Donasi Tunjangan Profesi dan Sertifikasi (PPG) Tendik" },
  { account: "smp", type: "penerimaan", category: "dana_tidak_terikat", subCategory: "", name: "Donasi Unit Usaha" },
  { account: "smp", type: "penerimaan", category: "dana_tidak_terikat", subCategory: "", name: "Donasi Lainnya (Infaq Tendik dll)" },
  
  // SMP Pengeluaran Non Program
  { account: "smp", type: "pengeluaran", category: "non_program", subCategory: "", name: "Pengambilan Titipan Uang Saku BAZNAS Daerah" },
  
  // SMP Pengeluaran Program
  { account: "smp", type: "pengeluaran", category: "program", subCategory: "standarProses", name: "Penguatan Komunitas Belajar" },
  { account: "smp", type: "pengeluaran", category: "program", subCategory: "standarProses", name: "Penguatan Pendidikan Karakter" },
  { account: "smp", type: "pengeluaran", category: "program", subCategory: "standarProses", name: "Pengadaan Sarana Penunjang Kegiatan KBM" },
  { account: "smp", type: "pengeluaran", category: "program", subCategory: "standarProses", name: "Penyaluran Donasi Laptop" },
  
  { account: "smp", type: "pengeluaran", category: "program", subCategory: "pengembanganSDM", name: "Kegiatan Pelaksanaan Pengembangan SDM" },
  
  { account: "smp", type: "pengeluaran", category: "program", subCategory: "standarPengelolaan", name: "Biaya Transportasi" },
  
  { account: "smp", type: "pengeluaran", category: "program", subCategory: "standarPembiayaan", name: "Administrasi Bank" },

  // SMA Penerimaan Dana Terikat
  { account: "sma", type: "penerimaan", category: "dana_terikat", subCategory: "", name: "BOSP SMA" },
  { account: "sma", type: "penerimaan", category: "dana_terikat", subCategory: "", name: "Donasi Bencana Sumatra" },
  
  // SMA Penerimaan Dana Tidak Terikat
  { account: "sma", type: "penerimaan", category: "dana_tidak_terikat", subCategory: "", name: "BPMU" },
  { account: "sma", type: "penerimaan", category: "dana_tidak_terikat", subCategory: "", name: "Donasi Lainnya (PPG , Infaq dll)" },

  // SMA Pengeluaran Program
  { account: "sma", type: "pengeluaran", category: "program", subCategory: "standarProses", name: "Penguatan Komunitas Belajar" },
  { account: "sma", type: "pengeluaran", category: "program", subCategory: "standarProses", name: "Penguatan Pendidikan Karakter" },
  { account: "sma", type: "pengeluaran", category: "program", subCategory: "standarProses", name: "Penyediaan Sarpras Peserta didik" },
  { account: "sma", type: "pengeluaran", category: "program", subCategory: "standarProses", name: "Pengadaan Sarana Penunjang Kegiatan KBM" },
  
  { account: "sma", type: "pengeluaran", category: "program", subCategory: "pengembanganSDM", name: "Kegiatan Pelaksanaan Pengembangan SDM" },

  { account: "sma", type: "pengeluaran", category: "program", subCategory: "standarSarana", name: "Penyediaan atau Pembuatan Media Pembelajaran" },
  { account: "sma", type: "pengeluaran", category: "program", subCategory: "standarSarana", name: "Pengembangan Sekolah Sehat, Sekolah Aman" },
  { account: "sma", type: "pengeluaran", category: "program", subCategory: "standarSarana", name: "Pemeliharaan Prasarana Lahan, Bangunan dan Ruang" },
  { account: "sma", type: "pengeluaran", category: "program", subCategory: "standarSarana", name: "Pemeliharaan Perlengkapan Daya & Jasa Sekolah" },
  { account: "sma", type: "pengeluaran", category: "program", subCategory: "standarSarana", name: "Pemeliharaan Kendaraan" },

  { account: "sma", type: "pengeluaran", category: "program", subCategory: "standarPengelolaan", name: "Konsumsi Rapat Kedinasan dan Tamu Sekolah" },
  { account: "sma", type: "pengeluaran", category: "program", subCategory: "standarPengelolaan", name: "Biaya Transportasi" },

  { account: "sma", type: "pengeluaran", category: "program", subCategory: "standarPembiayaan", name: "Pembayaran Honor Tenaga Penunjang atau Pelaksana" },
  { account: "sma", type: "pengeluaran", category: "program", subCategory: "standarPembiayaan", name: "Administrasi Bank" },
  { account: "sma", type: "pengeluaran", category: "program", subCategory: "standarPembiayaan", name: "Pembayaran daya dan/atau jasa" },
  { account: "sma", type: "pengeluaran", category: "program", subCategory: "standarPembiayaan", name: "Penyaluran Donasi Bencana Sumatra" }
];

export const CashFlowReportView = ({ account, setAccount, selectedYear }: { account: 'smp' | 'sma'; setAccount: (acc: 'smp' | 'sma') => void; selectedYear: number }) => {
  // Real-time Firestore States
  const [dbTransactions, setDbTransactions] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbSaldoAwal, setDbSaldoAwal] = useState<number | null>(null);
  const [loadingDb, setLoadingDb] = useState(true);

  // Modal Control States
  const [isOpenAddTx, setIsOpenAddTx] = useState(false);
  const [isOpenBudgetNames, setIsOpenBudgetNames] = useState(false);
  const [isOpenSaldoAwal, setIsOpenSaldoAwal] = useState(false);

  // New Transaction Form States
  const [txType, setTxType] = useState<'penerimaan' | 'pengeluaran'>('penerimaan');
  const [txCategory, setTxCategory] = useState<string>('dana_terikat');
  const [txSubCategory, setTxSubCategory] = useState<string>('standarProses');
  const [txBudgetName, setTxBudgetName] = useState<string>('');
  const [txAmount, setTxAmount] = useState<string>('');
  const [txDateStr, setTxDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
  const [txDescription, setTxDescription] = useState<string>('');

  // New Budget Category Form States
  const [newBudgetType, setNewBudgetType] = useState<'penerimaan' | 'pengeluaran'>('penerimaan');
  const [newBudgetCategory, setNewBudgetCategory] = useState<string>('dana_terikat');
  const [newBudgetSubCategory, setNewBudgetSubCategory] = useState<string>('standarProses');
  const [newBudgetName, setNewBudgetName] = useState<string>('');

  // Starting Balance State
  const [newSaldoAwal, setNewSaldoAwal] = useState<string>('');

  // Subscriptions to Firestore
  useEffect(() => {
    setLoadingDb(true);

    const qTransactions = query(
      collection(db, "donation_cashflow_transactions"),
      where("account", "==", account),
      where("year", "==", selectedYear)
    );
    const unsubTransactions = onSnapshot(qTransactions, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setDbTransactions(items);
    }, (error) => {
      console.error("Error reading transactions:", error);
    });

    const qCategories = query(
      collection(db, "donation_budget_categories"),
      where("account", "==", account)
    );
    const unsubCategories = onSnapshot(qCategories, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setDbCategories(items);
    }, (error) => {
      console.error("Error reading categories:", error);
    });

    const qSaldo = query(
      collection(db, "donation_saldo_awal"),
      where("account", "==", account),
      where("year", "==", selectedYear)
    );
    const unsubSaldo = onSnapshot(qSaldo, (snapshot) => {
      let amount: number | null = null;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data && typeof data.amount === 'number') {
          amount = data.amount;
        }
      });
      setDbSaldoAwal(amount);
      setLoadingDb(false);
    }, (error) => {
      console.error("Error reading starting balances:", error);
      setLoadingDb(false);
    });

    return () => {
      unsubTransactions();
      unsubCategories();
      unsubSaldo();
    };
  }, [account, selectedYear]);

  // Sync Form defaults based on type/category selections
  useEffect(() => {
    if (txType === 'penerimaan') {
      setTxCategory('dana_terikat');
    } else {
      setTxCategory('non_program');
    }
  }, [txType]);

  useEffect(() => {
    if (newBudgetType === 'penerimaan') {
      setNewBudgetCategory('dana_terikat');
    } else {
      setNewBudgetCategory('non_program');
    }
  }, [newBudgetType]);

  // Filter Categories matching selections to populate dropdown in Transaction form
  const availableBudgetNames = (dbCategories.length > 0 ? dbCategories : DEFAULT_BUDGET_CATEGORIES.filter(c => c.account === account))
    .filter(c => {
      if (c.type !== txType) return false;
      if (c.category !== txCategory) return false;
      if (txType === 'pengeluaran' && txCategory === 'program') {
        return c.subCategory === txSubCategory;
      }
      return true;
    })
    .map(c => c.name);

  // Set default budget name in form when dropdown list changes
  useEffect(() => {
    if (availableBudgetNames.length > 0) {
      setTxBudgetName(availableBudgetNames[0]);
    } else {
      setTxBudgetName('');
    }
  }, [txType, txCategory, txSubCategory, dbCategories]);

  // Compute final consolidated metrics and dataset
  const activeCategories = dbCategories.length > 0 
    ? dbCategories 
    : DEFAULT_BUDGET_CATEGORIES.filter(c => c.account === account);

  const isUsingDefaultFallback = dbTransactions.length === 0;

  let finalData: any = {};
  
  if (isUsingDefaultFallback) {
    const yearData = ALL_CASHFLOWS[selectedYear] || ALL_CASHFLOWS[2025];
    finalData = JSON.parse(JSON.stringify(yearData[account]));
    
    // Override starting balance if specified in Firestore
    if (dbSaldoAwal !== null) {
      finalData.saldoAwal = dbSaldoAwal;
      finalData.saldoAkhir = finalData.saldoAwal + 
        (finalData.penerimaan.danaTerikat.reduce((acc: number, x: any) => acc + x.amount, 0) +
         finalData.penerimaan.danaTidakTerikat.reduce((acc: number, x: any) => acc + x.amount, 0)) -
        (finalData.pengeluaran.nonProgram.reduce((acc: number, x: any) => acc + x.amount, 0) +
         finalData.pengeluaran.program.standarProses.reduce((acc: number, x: any) => acc + x.amount, 0) +
         finalData.pengeluaran.program.pengembanganSDM.reduce((acc: number, x: any) => acc + x.amount, 0) +
         (finalData.pengeluaran.program.standarSarana || []).reduce((acc: number, x: any) => acc + x.amount, 0) +
         finalData.pengeluaran.program.standarPengelolaan.reduce((acc: number, x: any) => acc + x.amount, 0) +
         finalData.pengeluaran.program.standarPembiayaan.reduce((acc: number, x: any) => acc + x.amount, 0));
    }
  } else {
    // Dynamic database calculation
    const startingBalance = dbSaldoAwal !== null 
      ? dbSaldoAwal 
      : (ALL_CASHFLOWS[selectedYear]?.[account]?.saldoAwal || 0);

    const getSum = (type: string, category: string, name: string) => {
      return dbTransactions
        .filter(t => t.type === type && t.category === category && t.budgetName === name)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    };

    const getSumProgram = (subCat: string, name: string) => {
      return dbTransactions
        .filter(t => t.type === "pengeluaran" && t.category === "program" && t.subCategory === subCat && t.budgetName === name)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    };

    const danaTerikatList = activeCategories
      .filter(c => c.type === "penerimaan" && c.category === "dana_terikat")
      .map(c => ({ name: c.name, amount: getSum("penerimaan", "dana_terikat", c.name) }));

    const danaTidakTerikatList = activeCategories
      .filter(c => c.type === "penerimaan" && c.category === "dana_tidak_terikat")
      .map(c => ({ name: c.name, amount: getSum("penerimaan", "dana_tidak_terikat", c.name) }));

    const nonProgramList = activeCategories
      .filter(c => c.type === "pengeluaran" && c.category === "non_program")
      .map(c => ({ name: c.name, amount: getSum("pengeluaran", "non_program", c.name) }));

    const standarProsesList = activeCategories
      .filter(c => c.type === "pengeluaran" && c.category === "program" && c.subCategory === "standarProses")
      .map(c => ({ name: c.name, amount: getSumProgram("standarProses", c.name) }));

    const pengembanganSDMList = activeCategories
      .filter(c => c.type === "pengeluaran" && c.category === "program" && c.subCategory === "pengembanganSDM")
      .map(c => ({ name: c.name, amount: getSumProgram("pengembanganSDM", c.name) }));

    const standarSaranaList = activeCategories
      .filter(c => c.type === "pengeluaran" && c.category === "program" && c.subCategory === "standarSarana")
      .map(c => ({ name: c.name, amount: getSumProgram("standarSarana", c.name) }));

    const standarPengelolaanList = activeCategories
      .filter(c => c.type === "pengeluaran" && c.category === "program" && c.subCategory === "standarPengelolaan")
      .map(c => ({ name: c.name, amount: getSumProgram("standarPengelolaan", c.name) }));

    const standarPembiayaanList = activeCategories
      .filter(c => c.type === "pengeluaran" && c.category === "program" && c.subCategory === "standarPembiayaan")
      .map(c => ({ name: c.name, amount: getSumProgram("standarPembiayaan", c.name) }));

    const sumDanaTerikat = danaTerikatList.reduce((acc, x) => acc + x.amount, 0);
    const sumDanaTidakTerikat = danaTidakTerikatList.reduce((acc, x) => acc + x.amount, 0);
    const sumNonProgram = nonProgramList.reduce((acc, x) => acc + x.amount, 0);
    const sumProgramProses = standarProsesList.reduce((acc, x) => acc + x.amount, 0);
    const sumProgramSDM = pengembanganSDMList.reduce((acc, x) => acc + x.amount, 0);
    const sumProgramSarana = standarSaranaList.reduce((acc, x) => acc + x.amount, 0);
    const sumProgramPengelolaan = standarPengelolaanList.reduce((acc, x) => acc + x.amount, 0);
    const sumProgramPembiayaan = standarPembiayaanList.reduce((acc, x) => acc + x.amount, 0);

    const totalPenerimaan = sumDanaTerikat + sumDanaTidakTerikat;
    const totalPengeluaran = sumNonProgram + sumProgramProses + sumProgramSDM + sumProgramSarana + sumProgramPengelolaan + sumProgramPembiayaan;
    const saldoAkhir = startingBalance + totalPenerimaan - totalPengeluaran;

    finalData = {
      saldoAwal: startingBalance,
      penerimaan: {
        danaTerikat: danaTerikatList,
        danaTidakTerikat: danaTidakTerikatList
      },
      pengeluaran: {
        nonProgram: nonProgramList,
        program: {
          standarProses: standarProsesList,
          pengembanganSDM: pengembanganSDMList,
          standarSarana: standarSaranaList,
          standarPengelolaan: standarPengelolaanList,
          standarPembiayaan: standarPembiayaanList
        }
      },
      saldoAkhir: saldoAkhir
    };
  }

  const data = finalData;

  const sumDanaTerikat = data.penerimaan.danaTerikat.reduce((acc: number, current: any) => acc + current.amount, 0);
  const sumDanaTidakTerikat = data.penerimaan.danaTidakTerikat.reduce((acc: number, current: any) => acc + current.amount, 0);
  const totalPenerimaan = sumDanaTerikat + sumDanaTidakTerikat;

  const sumNonProgram = data.pengeluaran.nonProgram.reduce((acc: number, current: any) => acc + current.amount, 0);
  const sumProgramProses = data.pengeluaran.program.standarProses.reduce((acc: number, current: any) => acc + current.amount, 0);
  const sumProgramSDM = data.pengeluaran.program.pengembanganSDM.reduce((acc: number, current: any) => acc + current.amount, 0);
  const sumProgramSarana = data.pengeluaran.program.standarSarana ? data.pengeluaran.program.standarSarana.reduce((acc: number, current: any) => acc + current.amount, 0) : 0;
  const sumProgramPengelolaan = data.pengeluaran.program.standarPengelolaan.reduce((acc: number, current: any) => acc + current.amount, 0);
  const sumProgramPembiayaan = data.pengeluaran.program.standarPembiayaan.reduce((acc: number, current: any) => acc + current.amount, 0);
  const sumProgram = sumProgramProses + sumProgramSDM + sumProgramSarana + sumProgramPengelolaan + sumProgramPembiayaan;
  const totalPengeluaran = sumNonProgram + sumProgram;

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  const chartInflows = [
    ...data.penerimaan.danaTerikat.map((x: any) => ({ name: x.name.length > 25 ? x.name.slice(0, 25) + '...' : x.name, Nominal: x.amount, Tipe: 'Terikat' })),
    ...data.penerimaan.danaTidakTerikat.map((x: any) => ({ name: x.name.length > 25 ? x.name.slice(0, 25) + '...' : x.name, Nominal: x.amount, Tipe: 'Tidak Terikat' }))
  ];

  const chartOutflows = [
    ...data.pengeluaran.nonProgram.map((x: any) => ({ name: x.name.length > 25 ? x.name.slice(0, 25) + '...' : x.name, Nominal: x.amount, Tipe: 'Non-Program' })),
    { name: "Std Proses (KBM)", Nominal: sumProgramProses, Tipe: 'Program' },
    { name: "Pengembangan SDM", Nominal: sumProgramSDM, Tipe: 'Program' },
    ...(sumProgramSarana > 0 ? [{ name: "Std Sarana/Prasarana", Nominal: sumProgramSarana, Tipe: 'Program' }] : []),
    { name: "Std Pengelolaan", Nominal: sumProgramPengelolaan, Tipe: 'Program' },
    { name: "Std Pembiayaan", Nominal: sumProgramPembiayaan, Tipe: 'Program' }
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  const reportRef = useRef<HTMLDivElement>(null);

  // Download PDF Handler
  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    const toastId = toast.loading("Sedang mempersiapkan file PDF...");
    const originalGetComputedStyle = window.getComputedStyle;
    const originalStyles = new Map<HTMLStyleElement, string>();

    const oklabToRgb = (l: number, a: number, b: number, alpha: number = 1): string => {
      const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
      const m_ = l - 0.1055613458 * a - 0.0638541167 * b;
      const s_ = l - 0.0894841775 * a - 1.2914855414 * b;

      const l_cube = l_ * l_ * l_;
      const m_cube = m_ * m_ * m_;
      const s_cube = s_ * s_ * s_;

      const r_u = +4.0767416621 * l_cube - 3.3077115913 * m_cube + 0.2309699292 * s_cube;
      const g_u = -1.2684380046 * l_cube + 2.6097574011 * m_cube - 0.3413193965 * s_cube;
      const b_u = -0.0041960863 * l_cube - 0.703418614 * m_cube + 1.7076147004 * s_cube;

      const clampAndConvert = (val: number) => {
        const clamped = Math.max(0, Math.min(1, val));
        const srgb = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
        return Math.round(srgb * 255);
      };

      return `rgba(${clampAndConvert(r_u)}, ${clampAndConvert(g_u)}, ${clampAndConvert(b_u)}, ${alpha})`;
    };

    const oklchToRgb = (l: number, c: number, h: number, alpha: number = 1): string => {
      const hRad = (h * Math.PI) / 180;
      return oklabToRgb(l, c * Math.cos(hRad), c * Math.sin(hRad), alpha);
    };

    const replaceModernColors = (cssText: string): string => {
      if (!cssText) return cssText;
      try {
        let normalized = cssText.replace(/oklch\((.*?)\)/gi, (match, content) => `oklch(${content.replace(/,/g, ' ')})`);
        normalized = normalized.replace(/oklab\((.*?)\)/gi, (match, content) => `oklab(${content.replace(/,/g, ' ')})`);

        normalized = normalized.replace(/oklch\(\s*([-+\d.%]+)\s+([-+\d.%]+)\s+([-+\d.deg%]+)(?:\s*\/\s*([-+\d.%]+))?\s*\)/gi, (match, lStr, cStr, hStr, aStr) => {
          const l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
          const c = cStr.endsWith('%') ? parseFloat(cStr) / 100 : parseFloat(cStr);
          const h = parseFloat(hStr.toLowerCase().replace('deg', ''));
          const alpha = aStr ? (aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr)) : 1;
          return oklchToRgb(l, c, h, alpha);
        });

        return normalized;
      } catch (e) {
        return cssText;
      }
    };

    try {
      const styleElements = Array.from(document.querySelectorAll('style'));
      styleElements.forEach(style => {
        if (style.textContent && (style.textContent.includes('oklch') || style.textContent.includes('oklab'))) {
          originalStyles.set(style, style.textContent);
          style.textContent = replaceModernColors(style.textContent);
        }
      });

      window.getComputedStyle = function (element, pseudoElt) {
        const style = originalGetComputedStyle(element, pseudoElt);
        return new Proxy(style, {
          get(target, prop) {
            const val = Reflect.get(target, prop);
            if (typeof val === 'function') {
              return function (...args: any[]) {
                const result = val.apply(target, args);
                return typeof result === 'string' && (result.includes('oklch') || result.includes('oklab')) ? replaceModernColors(result) : result;
              };
            }
            return typeof val === 'string' && (val.includes('oklch') || val.includes('oklab')) ? replaceModernColors(val) : val;
          }
        });
      };

      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 1024,
        onclone: (clonedDoc) => {
          const overrideStyle = clonedDoc.createElement('style');
          overrideStyle.textContent = `
            :root {
              --background: #f5fdf7 !important;
              --foreground: #242424 !important;
              --card: #ffffff !important;
              --card-foreground: #242424 !important;
              --primary: #0f593e !important;
              --primary-foreground: #fafafa !important;
            }
          `;
          clonedDoc.head.appendChild(overrideStyle);
        }
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const calculatedImgHeight = canvas.height * (pdfWidth / canvas.width);
      
      let heightLeft = calculatedImgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, calculatedImgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - calculatedImgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, calculatedImgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`Laporan_Arus_Kas_Donasi_${account.toUpperCase()}_${selectedYear}.pdf`);
      toast.success("Laporan PDF berhasil diunduh!", { id: toastId });
    } catch (e: any) {
      console.error(e);
      toast.error("Gagal mengunduh PDF.", { id: toastId });
    } finally {
      window.getComputedStyle = originalGetComputedStyle;
      originalStyles.forEach((originalText, styleElement) => {
        styleElement.textContent = originalText;
      });
    }
  };

  // Copy Summary Clipboard
  const handleCopy = () => {
    const text = `LAPORAN ARUS KAS DONASI ${account.toUpperCase()} SEKOLAH CENDEKIA BAZNAS ${selectedYear}\n\n` +
      `● Saldo Awal: ${formatRupiah(data.saldoAwal)}\n` +
      `● Total Penerimaan: ${formatRupiah(totalPenerimaan)}\n` +
      `● Total Pengeluaran: ${formatRupiah(totalPengeluaran)}\n` +
      `● Sisa Saldo: ${formatRupiah(data.saldoAkhir)}\n\n` +
      `Rekening Kas: BSI (${account === 'smp' ? 'SMP: 1032913357' : 'SMA: 1054796605'})`;
    navigator.clipboard.writeText(text);
    toast.success("Summary laporan berhasil disalin!");
  };

  // Submit Handler: Add Transaction
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txBudgetName) {
      toast.error("Silakan pilih Nama Budget");
      return;
    }
    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Nominal harus berupa angka positif");
      return;
    }
    const yearParsed = new Date(txDateStr).getFullYear();
    const toastId = toast.loading("Menyimpan transaksi kas...");
    try {
      await addDoc(collection(db, "donation_cashflow_transactions"), {
        account,
        type: txType,
        category: txCategory,
        subCategory: txType === 'pengeluaran' && txCategory === 'program' ? txSubCategory : '',
        budgetName: txBudgetName,
        amount: amt,
        year: yearParsed,
        dateStr: txDateStr,
        description: txDescription,
        createdAt: new Date().toISOString()
      });
      toast.success("Transaksi kas berhasil disimpan!", { id: toastId });
      setIsOpenAddTx(false);
      setTxAmount('');
      setTxDescription('');
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal menyimpan transaksi: " + error.message, { id: toastId });
    }
  };

  // Submit Handler: Add Custom Budget Name
  const handleAddBudgetCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudgetName.trim()) {
      toast.error("Nama budget tidak boleh kosong");
      return;
    }
    const toastId = toast.loading("Menyimpan kategori budget...");
    try {
      await addDoc(collection(db, "donation_budget_categories"), {
        account,
        type: newBudgetType,
        category: newBudgetCategory,
        subCategory: newBudgetType === 'pengeluaran' && newBudgetCategory === 'program' ? newBudgetSubCategory : '',
        name: newBudgetName.trim(),
        createdAt: new Date().toISOString()
      });
      toast.success("Kategori budget berhasil disimpan!", { id: toastId });
      setNewBudgetName('');
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal menyimpan kategori: " + error.message, { id: toastId });
    }
  };

  // Submit Handler: Save Starting Balance Override
  const handleSaveSaldoAwal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newSaldoAwal);
    if (isNaN(amt) || amt < 0) {
      toast.error("Saldo awal harus berupa angka valid");
      return;
    }
    const toastId = toast.loading("Menyimpan saldo awal...");
    try {
      const saldoRef = doc(db, "donation_saldo_awal", `${account}_${selectedYear}`);
      await setDoc(saldoRef, {
        account,
        year: selectedYear,
        amount: amt,
        createdAt: new Date().toISOString()
      }, { merge: true });
      toast.success("Saldo awal berhasil diperbarui!", { id: toastId });
      setIsOpenSaldoAwal(false);
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal memperbarui saldo awal: " + error.message, { id: toastId });
    }
  };

  // Delete Handlers
  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;
    const toastId = toast.loading("Menghapus transaksi...");
    try {
      await deleteDoc(doc(db, "donation_cashflow_transactions", id));
      toast.success("Transaksi kas berhasil dihapus!", { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal menghapus transaksi: " + error.message, { id: toastId });
    }
  };

  const handleDeleteBudgetCategory = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus kategori budget ini?")) return;
    const toastId = toast.loading("Menghapus kategori budget...");
    try {
      await deleteDoc(doc(db, "donation_budget_categories", id));
      toast.success("Kategori budget berhasil dihapus!", { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal menghapus kategori budget: " + error.message, { id: toastId });
    }
  };

  // Auto Copy / Seed Default Template Data
  const handleCopyDefaultToDb = async () => {
    const toastId = toast.loading("Menyalin data template ke database...");
    try {
      const batch = writeBatch(db);
      
      const defaultSaldo = ALL_CASHFLOWS[selectedYear]?.[account]?.saldoAwal || 0;
      const saldoRef = doc(db, "donation_saldo_awal", `${account}_${selectedYear}`);
      batch.set(saldoRef, {
        account,
        year: selectedYear,
        amount: defaultSaldo,
        createdAt: new Date().toISOString()
      });

      const categoriesSnap = await getDocs(query(collection(db, "donation_budget_categories"), where("account", "==", account)));
      if (categoriesSnap.empty) {
        DEFAULT_BUDGET_CATEGORIES.filter(c => c.account === account).forEach((cat) => {
          const catRef = doc(collection(db, "donation_budget_categories"));
          batch.set(catRef, {
            ...cat,
            createdAt: new Date().toISOString()
          });
        });
      }

      const defaultData = ALL_CASHFLOWS[selectedYear]?.[account];
      if (defaultData) {
        const addTx = (items: any[], cat: string, subCat: string, type: string) => {
          items.forEach((item) => {
            if (item.amount > 0) {
              const txRef = doc(collection(db, "donation_cashflow_transactions"));
              batch.set(txRef, {
                account,
                type,
                category: cat,
                subCategory: subCat,
                budgetName: item.name,
                amount: item.amount,
                year: selectedYear,
                dateStr: `${selectedYear}-06-15`,
                description: "Inisialisasi template default",
                createdAt: new Date().toISOString()
              });
            }
          });
        };

        addTx(defaultData.penerimaan.danaTerikat, "dana_terikat", "", "penerimaan");
        addTx(defaultData.penerimaan.danaTidakTerikat, "dana_tidak_terikat", "", "penerimaan");
        addTx(defaultData.pengeluaran.nonProgram, "non_program", "", "pengeluaran");
        addTx(defaultData.pengeluaran.program.standarProses, "program", "standarProses", "pengeluaran");
        addTx(defaultData.pengeluaran.program.pengembanganSDM, "program", "pengembanganSDM", "pengeluaran");
        if (defaultData.pengeluaran.program.standarSarana) {
          addTx(defaultData.pengeluaran.program.standarSarana, "program", "standarSarana", "pengeluaran");
        }
        addTx(defaultData.pengeluaran.program.standarPengelolaan, "program", "standarPengelolaan", "pengeluaran");
        addTx(defaultData.pengeluaran.program.standarPembiayaan, "program", "standarPembiayaan", "pengeluaran");
      }

      await batch.commit();
      toast.success("Data template berhasil disalin ke database!", { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error("Gagal menyalin data template: " + error.message, { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <Card className="rounded-[2rem] border-none bg-slate-900 text-white overflow-hidden shadow-xl relative">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-900/40 via-transparent to-slate-900/60 pointer-events-none" />
        <CardContent className="p-6 sm:p-8 flex flex-col justify-between items-start gap-4 relative z-10">
          <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                  Sistem Laporan Keuangan SCB
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-full">
                  Tahun Buku {selectedYear}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-2 text-white">
                Arus Kas Donasi {account.toUpperCase()}
              </h1>
              <p className="text-xs text-slate-400 font-semibold max-w-md">
                Sekolah Cendekia BAZNAS (SCB). Informasi rincian penerimaan terikat/bebas serta alokasi program standar nasional pendidikan.
              </p>
            </div>
            
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap">
              <Button 
                onClick={handleCopy}
                variant="outline" 
                className="rounded-xl text-xs font-black uppercase tracking-wider h-10 border-white/15 bg-white/5 hover:bg-white/10 text-white hover:text-white"
              >
                <FileSpreadsheet size={14} className="mr-1.5" />
                Copy Ringkasan
              </Button>
              <Button 
                onClick={() => window.print()}
                className="rounded-xl text-xs font-black uppercase tracking-wider h-10 bg-slate-800 hover:bg-slate-700 text-white border border-white/10"
              >
                <Download size={14} className="mr-1.5" />
                Cetak / Print
              </Button>
              <Button 
                onClick={handleDownloadPDF}
                className="rounded-xl text-xs font-black uppercase tracking-wider h-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
              >
                <Download size={14} className="mr-1.5" />
                Unduh PDF
              </Button>
            </div>
          </div>

          {/* Admin Management Row */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/10 w-full">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 mr-2 flex items-center gap-1">
              <AlertCircle size={12} /> Kelola Kas Donasi:
            </span>
            
            <Button 
              onClick={() => {
                setNewSaldoAwal(data.saldoAwal.toString());
                setIsOpenAddTx(true);
              }}
              className="rounded-xl text-xs font-black uppercase tracking-wider h-9 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
            >
              <Plus size={13} className="mr-1.5" />
              Input Transaksi
            </Button>

            <Button 
              onClick={() => setIsOpenBudgetNames(true)}
              variant="outline" 
              className="rounded-xl text-xs font-black uppercase tracking-wider h-9 border-white/15 bg-white/5 hover:bg-white/10 text-white hover:text-white"
            >
              <Settings size={13} className="mr-1.5" />
              Atur Budget Name
            </Button>

            <Button 
              onClick={() => {
                setNewSaldoAwal(data.saldoAwal.toString());
                setIsOpenSaldoAwal(true);
              }}
              variant="outline" 
              className="rounded-xl text-xs font-black uppercase tracking-wider h-9 border-white/15 bg-white/5 hover:bg-white/10 text-white hover:text-white"
            >
              <Wallet size={13} className="mr-1.5" />
              Atur Saldo Awal
            </Button>

            {isUsingDefaultFallback && (
              <Button 
                onClick={handleCopyDefaultToDb}
                className="rounded-xl text-xs font-black uppercase tracking-wider h-9 bg-amber-500 hover:bg-amber-600 text-white"
              >
                <FileSpreadsheet size={13} className="mr-1.5" />
                Salin Template ke DB
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-[2rem] border-slate-100 shadow-sm bg-white overflow-hidden p-5 flex flex-col justify-between h-32 hover:translate-y-[-2px] transition-all">
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center">
              <Wallet size={16} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
              Awal Buku
            </span>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 leading-none">Saldo Awal</p>
            <h4 className="text-base font-black text-slate-800 mt-1">{formatRupiah(data.saldoAwal)}</h4>
          </div>
        </Card>

        <Card className="rounded-[2rem] border-slate-100 shadow-sm bg-white overflow-hidden p-5 flex flex-col justify-between h-32 hover:translate-y-[-2px] transition-all border border-emerald-50">
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center animate-pulse">
              <ArrowDownLeft size={16} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Penerimaan
            </span>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 leading-none">Total Masuk (Kredit)</p>
            <h4 className="text-base font-black text-emerald-600 mt-1">+{formatRupiah(totalPenerimaan)}</h4>
          </div>
        </Card>

        <Card className="rounded-[2rem] border-slate-100 shadow-sm bg-white overflow-hidden p-5 flex flex-col justify-between h-32 hover:translate-y-[-2px] transition-all border border-rose-50">
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
              <ArrowUpRight size={16} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              Pengeluaran
            </span>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 leading-none">Total Keluar (Debet)</p>
            <h4 className="text-base font-black text-rose-600 mt-1">-{formatRupiah(totalPengeluaran)}</h4>
          </div>
        </Card>

        <Card className="rounded-[2rem] border-slate-100 shadow-sm bg-slate-900 overflow-hidden p-5 flex flex-col justify-between h-32 hover:translate-y-[-2px] transition-all text-white">
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center">
              <Coins size={16} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-300">
              Kas Aktif
            </span>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 leading-none">Saldo Akhir</p>
            <h4 className="text-base font-black text-emerald-400 mt-1">{formatRupiah(data.saldoAkhir)}</h4>
          </div>
        </Card>
      </div>

      {/* Database Warning */}
      {isUsingDefaultFallback && (
        <Card className="rounded-2xl border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <HelpCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
          <div className="text-xs text-amber-800">
            <p className="font-bold">Laporan Arus Kas Default</p>
            <p className="mt-0.5">
              Data saat ini menggunakan template default. Untuk mulai melakukan penginputan, pengeditan, atau penghapusan transaksi baru secara real-time, silakan klik tombol <strong>"Salin Template ke DB"</strong> di banner atas terlebih dahulu.
            </p>
          </div>
        </Card>
      )}

      {/* 3. Charts Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-[2rem] border-slate-100 shadow-sm bg-white p-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-1.5">
            <BarChart3 size={13} className="text-emerald-500" />
            Penerimaan Menurut Sumber ({account.toUpperCase()})
          </h3>
          <div className="h-64">
            {chartInflows.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">Tidak ada penerimaan donasi</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartInflows} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                  <XAxis type="number" tickFormatter={(v) => `Rp ${v >= 1000000 ? v/1000000 + 'jt' : v.toLocaleString('id-ID')}`} tick={{ fontSize: 9, fontWeight: 600, fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 8, fontWeight: 700, fill: '#334155' }} />
                  <Tooltip formatter={(value: any) => [formatRupiah(value), 'Nominal']} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '10px' }} />
                  <Bar dataKey="Nominal" radius={[0, 8, 8, 0]}>
                    {chartInflows.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.Tipe === 'Terikat' ? '#10b981' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-[9px] font-black uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
              <span>Dana Terikat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-blue-500" />
              <span>Dana Tidak Terikat</span>
            </div>
          </div>
        </Card>

        <Card className="rounded-[2rem] border-slate-100 shadow-sm bg-white p-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-1.5">
            <PieIcon size={13} className="text-rose-500" />
            Alokasi Penganggaran Biaya Sekolah
          </h3>
          <div className="h-64">
            {chartOutflows.filter(x => x.Nominal > 0).length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">Tidak ada pengeluaran donasi</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartOutflows.filter(x => x.Nominal > 0)} dataKey="Nominal" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={45} paddingAngle={3}>
                    {chartOutflows.filter(x => x.Nominal > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [formatRupiah(value), 'Alokasi']} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* 5. Statement of Cash Flow Cash Ledgers (Double border line) */}
      <div ref={reportRef} className="bg-white rounded-[2.2rem]">
        <Card className="rounded-[2.5rem] border-slate-100 shadow-md bg-white p-6 sm:p-8 relative overflow-hidden print:border-none print:shadow-none">
          <div className="border-t-[3px] border-double border-slate-900 w-full mb-6" />

          <div className="text-center space-y-1 mb-8">
            <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase">LAPORAN ARUS KAS INSTANSI</span>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
              LAPORAN REALISASI ARUS KAS {account.toUpperCase()}
            </h2>
            <h3 className="text-xs font-bold text-slate-500 uppercase">SEKOLAH CENDEKIA BAZNAS</h3>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              PERIODE 1 JANUARI - 31 DESEMBER {selectedYear}
            </p>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-slate-50/50">
            <table className="w-full text-left border-collapse bg-white">
              <thead>
                <tr className="bg-slate-900 text-white border-b border-slate-850">
                  <th className="py-3 px-5 text-[10px] font-black uppercase tracking-widest text-slate-100">Pos Aliran Dana / Detil Kategori</th>
                  <th className="py-3 px-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-100 w-44">Arus (IDR)</th>
                  <th className="py-3 px-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-100 w-48">Jumlah (IDR)</th>
                </tr>
              </thead>
              <tbody className="text-xs font-semibold text-slate-750">
                <tr className="bg-slate-50 border-b border-slate-100 font-bold">
                  <td className="py-3.5 px-5 font-black text-slate-950 uppercase tracking-wider">SALDO AWAL JANUARI {selectedYear}</td>
                  <td className="py-3.5 px-5"></td>
                  <td className="py-3.5 px-5 text-right font-black text-slate-950">{formatRupiah(data.saldoAwal)}</td>
                </tr>

                <tr className="bg-emerald-50/50 border-b border-emerald-100">
                  <td className="py-3 px-5 font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowDownLeft size={14} className="text-emerald-600" />
                    PENERIMAAN (Inflows)
                  </td>
                  <td className="py-3 px-5"></td>
                  <td className="py-3 px-5"></td>
                </tr>

                <tr className="border-b border-slate-100 bg-white">
                  <td className="py-2.5 px-8 font-black text-slate-900 uppercase text-[10px] tracking-wide">A. DANA TERIKAT</td>
                  <td className="py-2.5 px-5"></td>
                  <td className="py-2.5 px-5"></td>
                </tr>
                {data.penerimaan.danaTerikat.map((item: any, idx: number) => (
                  <tr key={`terikat-${idx}`} className="border-b border-slate-50/70 hover:bg-slate-50/40">
                    <td className="py-2 px-12 text-slate-650 italic pl-12 text-[11px] font-medium">{item.name}</td>
                    <td className="py-2 px-5 text-right text-[11px] font-bold text-slate-700">{formatRupiah(item.amount)}</td>
                    <td className="py-2 px-5"></td>
                  </tr>
                ))}
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <td className="py-2.5 px-8 font-extrabold text-slate-700 text-[10px] italic pl-10">Sub-Total Dana Terikat</td>
                  <td className="py-2.5 px-5"></td>
                  <td className="py-2.5 px-5 text-right font-extrabold text-slate-800 border-t border-slate-100">{formatRupiah(sumDanaTerikat)}</td>
                </tr>

                <tr className="border-b border-slate-100 bg-white">
                  <td className="py-2.5 px-8 font-black text-slate-900 uppercase text-[10px] tracking-wide">B. DANA TIDAK TERIKAT</td>
                  <td className="py-2.5 px-5"></td>
                  <td className="py-2.5 px-5"></td>
                </tr>
                {data.penerimaan.danaTidakTerikat.map((item: any, idx: number) => (
                  <tr key={`tiada-terikat-${idx}`} className="border-b border-slate-50/70 hover:bg-slate-50/40">
                    <td className="py-2 px-12 text-slate-650 italic pl-12 text-[11px] font-medium">{item.name}</td>
                    <td className="py-2 px-5 text-right text-[11px] font-bold text-slate-700">{formatRupiah(item.amount)}</td>
                    <td className="py-2 px-5"></td>
                  </tr>
                ))}
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <td className="py-2.5 px-8 font-extrabold text-slate-700 text-[10px] italic pl-10">Sub-Total Dana Tidak Terikat</td>
                  <td className="py-2.5 px-5"></td>
                  <td className="py-2.5 px-5 text-right font-extrabold text-slate-800 border-t border-slate-100">{formatRupiah(sumDanaTidakTerikat)}</td>
                </tr>

                <tr className="bg-emerald-50 border-y border-emerald-100">
                  <td className="py-3 px-5 font-black text-emerald-900 uppercase tracking-widest text-[10px]">TOTAL ARUS KAS MASUK (PENERIMAAN)</td>
                  <td className="py-3 px-5"></td>
                  <td className="py-3 px-5 text-right font-black text-emerald-800">{formatRupiah(totalPenerimaan)}</td>
                </tr>

                <tr className="bg-rose-50/50 border-b border-rose-100">
                  <td className="py-3 px-5 font-black text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowUpRight size={14} className="text-rose-600" />
                    PENGELUARAN (Outflows)
                  </td>
                  <td className="py-3 px-5"></td>
                  <td className="py-3 px-5"></td>
                </tr>

                <tr className="border-b border-slate-100 bg-white">
                  <td className="py-2.5 px-8 font-black text-slate-900 uppercase text-[10px] tracking-wide">A. REK KENYAMANAN NON-PROGRAM</td>
                  <td className="py-2.5 px-5"></td>
                  <td className="py-2.5 px-5"></td>
                </tr>
                {data.pengeluaran.nonProgram.map((item: any, idx: number) => (
                  <tr key={`nonprog-${idx}`} className="border-b border-slate-55/70 hover:bg-slate-50/40">
                    <td className="py-2 px-12 text-slate-650 italic pl-12 text-[11px] font-medium">{item.name}</td>
                    <td className="py-2 px-5 text-right text-[11px] font-bold text-slate-700">{formatRupiah(item.amount)}</td>
                    <td className="py-2 px-5"></td>
                  </tr>
                ))}
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <td className="py-2.5 px-8 font-extrabold text-slate-700 text-[10px] italic pl-10">Sub-Total Non-Program</td>
                  <td className="py-2.5 px-5"></td>
                  <td className="py-2.5 px-5 text-right font-extrabold text-slate-800 border-t border-slate-100">{formatRupiah(sumNonProgram)}</td>
                </tr>

                <tr className="border-b border-slate-100 bg-white">
                  <td className="py-2.5 px-8 font-black text-slate-900 uppercase text-[10px] tracking-wide">B. REK PROGRAM KEGIATAN SEKOLAH</td>
                  <td className="py-2.5 px-5"></td>
                  <td className="py-2.5 px-5"></td>
                </tr>

                {/* 1. Standar Proses */}
                <tr className="hover:bg-slate-50/30">
                  <td className="py-1 px-12 font-bold text-slate-800 text-[11px] tracking-wide italic pl-12 pr-5">1. Pengembangan Standar Proses</td>
                  <td className="py-1 px-5"></td>
                  <td className="py-1 px-5"></td>
                </tr>
                {data.pengeluaran.program.standarProses.map((item: any, idx: number) => (
                  <tr key={`stdproses-${idx}`} className="border-b border-slate-50/70 hover:bg-slate-50/40">
                    <td className="py-1.5 px-16 text-slate-600 pl-16 text-[11px]">{item.name}</td>
                    <td className="py-1.5 px-5 text-right text-[11px] font-semibold text-slate-650">
                      {item.amount === 0 ? "" : formatRupiah(item.amount)}
                    </td>
                    <td className="py-1.5 px-5"></td>
                  </tr>
                ))}
                <tr className="bg-slate-50/30">
                  <td className="py-1.5 px-12 pl-14 text-[10px] font-extrabold text-slate-550 italic">Total Standar Proses</td>
                  <td className="py-1.5 px-5"></td>
                  <td className="py-1.5 px-5 text-right font-black text-slate-650 text-[11px]">{formatRupiah(sumProgramProses)}</td>
                </tr>

                {/* 2. Pengembangan Pendidik */}
                <tr className="hover:bg-slate-50/30">
                  <td className="py-1 px-12 font-bold text-slate-800 text-[11px] tracking-wide italic pl-12 pr-5">2. Pengembangan Pendidik dan Tenaga Kependidikan</td>
                  <td className="py-1 px-5"></td>
                  <td className="py-1 px-5"></td>
                </tr>
                {data.pengeluaran.program.pengembanganSDM.map((item: any, idx: number) => (
                  <tr key={`sdm-${idx}`} className="border-b border-slate-50/70 hover:bg-slate-50/40">
                    <td className="py-1.5 px-16 text-slate-600 pl-16 text-[11px]">{item.name}</td>
                    <td className="py-1.5 px-5 text-right text-[11px] font-semibold text-slate-650">
                      {item.amount === 0 ? "" : formatRupiah(item.amount)}
                    </td>
                    <td className="py-1.5 px-5"></td>
                  </tr>
                ))}
                <tr className="bg-slate-50/30">
                  <td className="py-1.5 px-12 pl-14 text-[10px] font-extrabold text-slate-550 italic">Total Pengembangan Pendidik</td>
                  <td className="py-1.5 px-5"></td>
                  <td className="py-1.5 px-5 text-right font-black text-slate-650 text-[11px]">{formatRupiah(sumProgramSDM)}</td>
                </tr>

                {/* 3. Pengembangan Sarana (SMA Only or if has elements) */}
                {data.pengeluaran.program.standarSarana && data.pengeluaran.program.standarSarana.length > 0 && (
                  <>
                    <tr className="hover:bg-slate-50/30">
                      <td className="py-1 px-12 font-bold text-slate-800 text-[11px] tracking-wide italic pl-12 pr-5">3. Pengembangan Sarana dan Prasarana Sekolah</td>
                      <td className="py-1 px-5"></td>
                      <td className="py-1 px-5"></td>
                    </tr>
                    {data.pengeluaran.program.standarSarana.map((item: any, idx: number) => (
                      <tr key={`sarana-${idx}`} className="border-b border-slate-50/70 hover:bg-slate-50/40">
                        <td className="py-1.5 px-16 text-slate-600 pl-16 text-[11px]">{item.name}</td>
                        <td className="py-1.5 px-5 text-right text-[11px] font-semibold text-slate-650">
                          {item.amount === 0 ? "" : formatRupiah(item.amount)}
                        </td>
                        <td className="py-1.5 px-5"></td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50/30">
                      <td className="py-1.5 px-12 pl-14 text-[10px] font-extrabold text-slate-550 italic">Total Sarpras Sekolah</td>
                      <td className="py-1.5 px-5"></td>
                      <td className="py-1.5 px-5 text-right font-black text-slate-650 text-[11px]">{formatRupiah(sumProgramSarana)}</td>
                    </tr>
                  </>
                )}

                {/* 4. Standar Pengelolaan */}
                <tr className="hover:bg-slate-50/30">
                  <td className="py-1 px-12 font-bold text-slate-800 text-[11px] tracking-wide italic pl-12 pr-5">
                    {data.pengeluaran.program.standarSarana && data.pengeluaran.program.standarSarana.length > 0 ? "4" : "3"}. Pengembangan Standar Pengelolaan
                  </td>
                  <td className="py-1 px-5"></td>
                  <td className="py-1 px-5"></td>
                </tr>
                {data.pengeluaran.program.standarPengelolaan.map((item: any, idx: number) => (
                  <tr key={`pengelolaan-${idx}`} className="border-b border-slate-50/70 hover:bg-slate-50/40">
                    <td className="py-1.5 px-16 text-slate-600 pl-16 text-[11px]">{item.name}</td>
                    <td className="py-1.5 px-5 text-right text-[11px] font-semibold text-slate-650">
                      {item.amount === 0 ? "" : formatRupiah(item.amount)}
                    </td>
                    <td className="py-1.5 px-5"></td>
                  </tr>
                ))}
                <tr className="bg-slate-50/30">
                  <td className="py-1.5 px-12 pl-14 text-[10px] font-extrabold text-slate-550 italic">Total Standar Pengelolaan</td>
                  <td className="py-1.5 px-5"></td>
                  <td className="py-1.5 px-5 text-right font-black text-slate-650 text-[11px]">{formatRupiah(sumProgramPengelolaan)}</td>
                </tr>

                {/* 5. Standar Pembiayaan */}
                <tr className="hover:bg-slate-50/30">
                  <td className="py-1 px-12 font-bold text-slate-800 text-[11px] tracking-wide italic pl-12 pr-5">
                    {data.pengeluaran.program.standarSarana && data.pengeluaran.program.standarSarana.length > 0 ? "5" : "4"}. Pengembangan Standar Pembiayaan
                  </td>
                  <td className="py-1 px-5"></td>
                  <td className="py-1 px-5"></td>
                </tr>
                {data.pengeluaran.program.standarPembiayaan.map((item: any, idx: number) => (
                  <tr key={`pembiayaan-${idx}`} className="border-b border-slate-50/70 hover:bg-slate-50/40">
                    <td className="py-1.5 px-16 text-slate-600 pl-16 text-[11px]">{item.name}</td>
                    <td className="py-1.5 px-5 text-right text-[11px] font-semibold text-slate-650">
                      {item.amount === 0 ? "" : formatRupiah(item.amount)}
                    </td>
                    <td className="py-1.5 px-5"></td>
                  </tr>
                ))}
                <tr className="bg-slate-50/30">
                  <td className="py-1.5 px-12 pl-14 text-[10px] font-extrabold text-slate-550 italic">Total Standar Pembiayaan</td>
                  <td className="py-1.5 px-5"></td>
                  <td className="py-1.5 px-5 text-right font-black text-slate-650 text-[11px]">{formatRupiah(sumProgramPembiayaan)}</td>
                </tr>

                <tr className="border-b border-slate-100 bg-slate-100/50">
                  <td className="py-3 px-8 font-extrabold text-slate-800 text-[11px] italic pl-10">Sub-Total Program (Pendidikan)</td>
                  <td className="py-3 px-5"></td>
                  <td className="py-3 px-5 text-right font-black text-slate-850 border-t border-slate-200">{formatRupiah(sumProgram)}</td>
                </tr>

                <tr className="bg-rose-50 border-y border-rose-100">
                  <td className="py-3 px-5 font-black text-rose-900 uppercase tracking-widest text-[10px]">TOTAL ARUS KAS KELUAR (PENGELUARAN)</td>
                  <td className="py-3 px-5"></td>
                  <td className="py-3 px-5 text-right font-black text-rose-800">{formatRupiah(totalPengeluaran)}</td>
                </tr>

                <tr className="bg-indigo-900 text-white border-b border-indigo-950 font-black">
                  <td className="py-3.5 px-5 text-slate-105 uppercase tracking-wider text-[11px]">SALDO PER 31 DESEMBER {selectedYear} (KAS AKTIF)</td>
                  <td className="py-3.5 px-5"></td>
                  <td className="py-3.5 px-5 text-right text-emerald-400 text-xs tracking-tight">{formatRupiah(data.saldoAkhir)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-12 pr-6 pl-4 text-xs font-bold text-slate-700">
            <div className="text-center space-y-16">
              <div>
                <p className="text-slate-400">Menyetujui,</p>
                <p className="font-extrabold uppercase mt-1">Kepala Sekolah SCB</p>
              </div>
              <div className="space-y-0.5">
                <p className="underline font-black uppercase text-slate-850">Ahmad Kamaluddin Afif S.Pi M.M Gr</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Kepala Sekolah BAZNAS SCB</p>
              </div>
            </div>

            <div className="text-center space-y-16 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-[40%] -translate-y-1/2 rotate-[-15deg] opacity-[0.85] pointer-events-none select-none z-10 w-28 h-28 border-[3px] border-double border-emerald-500 rounded-full flex flex-col items-center justify-center font-black text-emerald-505 bg-white/40 backdrop-blur-[0.5px]">
                <span className="text-[18px] tracking-widest text-emerald-500 uppercase leading-none font-bold font-sans">LUNAS</span>
                <span className="text-[8px] tracking-widest text-emerald-500 mt-1 uppercase font-sans">VERIFIED</span>
              </div>

              <div>
                <p className="text-slate-400">Dibuat Oleh,</p>
                <p className="font-extrabold uppercase mt-1">Bendahara Keuangan SCB</p>
              </div>
              <div className="space-y-0.5 relative z-20">
                <p className="underline font-black uppercase text-slate-850">Nur Asiah S.E</p>
                <p className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">Keuangan BAZNAS SCB</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 6. List of Dynamic Ledger Transactions */}
      {!isUsingDefaultFallback && (
        <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden bg-white mt-6">
          <CardHeader className="bg-white border-b border-slate-50 p-6">
            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Daftar Riwayat Transaksi Manual Kas Donasi {account.toUpperCase()} - {selectedYear}
            </CardTitle>
            <CardDescription className="text-xs font-semibold text-slate-400 mt-1">
              Ditemukan {dbTransactions.length} transaksi manual di database untuk tahun buku {selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-3 pl-6">Tanggal</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-3">Tipe</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-3">Nama Budget</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-3">Kategori</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-3">Nominal</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-3">Keterangan</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-3 pr-6 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dbTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-slate-400 font-bold text-xs">
                        Tidak ada transaksi manual untuk tahun buku {selectedYear}. Silakan klik "Input Transaksi" untuk menambahkan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dbTransactions.map((tx) => (
                      <TableRow key={tx.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="py-3.5 pl-6 text-xs font-bold text-slate-600">
                          {new Date(tx.dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </TableCell>
                        <TableCell>
                          <Badge className={`rounded-lg py-0.5 px-2 text-[9px] font-black uppercase tracking-wider ${
                            tx.type === 'penerimaan' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {tx.type === 'penerimaan' ? 'Masuk' : 'Keluar'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-slate-800 text-xs">
                          {tx.budgetName}
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs font-semibold uppercase">
                          {tx.category === 'dana_terikat' ? 'Terikat' :
                           tx.category === 'dana_tidak_terikat' ? 'Bebas / Tidak Terikat' :
                           tx.category === 'non_program' ? 'Non-Program' :
                           `Program: ${tx.subCategory || ''}`}
                        </TableCell>
                        <TableCell className={`font-black text-xs ${tx.type === 'penerimaan' ? 'text-emerald-600' : 'text-rose-605'}`}>
                          {tx.type === 'penerimaan' ? '+' : '-'}{formatRupiah(tx.amount)}
                        </TableCell>
                        <TableCell className="text-slate-450 text-xs italic">
                          {tx.description || '-'}
                        </TableCell>
                        <TableCell className="text-center pr-6">
                          <Button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 rounded-lg text-slate-450 hover:text-rose-600 hover:bg-rose-50"
                            title="Hapus Transaksi"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL 1: INPUT TRANSAKSI BARU */}
      <Dialog open={isOpenAddTx} onOpenChange={setIsOpenAddTx}>
        <DialogContent className="max-w-lg rounded-[2rem] p-6 bg-white border border-slate-100 shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-black uppercase tracking-widest text-xs flex items-center gap-2">
              <Plus className="text-emerald-500" size={14} />
              Input Transaksi Kas Baru ({account.toUpperCase()})
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTransaction} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tipe Transaksi</label>
                <select 
                  value={txType} 
                  onChange={(e: any) => setTxType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
                >
                  <option value="penerimaan">Penerimaan (Dana Masuk)</option>
                  <option value="pengeluaran">Pengeluaran (Dana Keluar)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tanggal Transaksi</label>
                <Input 
                  type="date" 
                  value={txDateStr} 
                  onChange={(e) => setTxDateStr(e.target.value)}
                  className="bg-slate-50 text-xs border-slate-200 rounded-xl h-9"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Kategori</label>
                <select 
                  value={txCategory} 
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
                >
                  {txType === 'penerimaan' ? (
                    <>
                      <option value="dana_terikat">Dana Terikat</option>
                      <option value="dana_tidak_terikat">Dana Tidak Terikat</option>
                    </>
                  ) : (
                    <>
                      <option value="non_program">Non Program (Kenyamanan)</option>
                      <option value="program">Program Kegiatan (Pendidikan)</option>
                    </>
                  )}
                </select>
              </div>

              {txType === 'pengeluaran' && txCategory === 'program' && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Sub-Kategori Program</label>
                  <select 
                    value={txSubCategory} 
                    onChange={(e) => setTxSubCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    <option value="standarProses">Pengembangan Standar Proses</option>
                    <option value="pengembanganSDM">Pengembangan Pendidik & Tendik</option>
                    {account === 'sma' && <option value="standarSarana">Pengembangan Standar Sarana</option>}
                    <option value="standarPengelolaan">Pengembangan Standar Pengelolaan</option>
                    <option value="standarPembiayaan">Pengembangan Standar Pembiayaan</option>
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Nama Budget (Aliran Dana)</label>
                <button 
                  type="button" 
                  onClick={() => {
                    setNewBudgetType(txType);
                    setNewBudgetCategory(txCategory);
                    setNewBudgetSubCategory(txSubCategory);
                    setIsOpenBudgetNames(true);
                  }}
                  className="text-[10px] font-extrabold text-indigo-600 hover:underline"
                >
                  + Tambah Budget Name Baru
                </button>
              </div>
              {availableBudgetNames.length === 0 ? (
                <p className="text-[11px] text-rose-500 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                  Tidak ada Nama Budget terdaftar untuk kombinasi ini. Silakan klik tombol di atas untuk menambahkannya!
                </p>
              ) : (
                <select 
                  value={txBudgetName} 
                  onChange={(e) => setTxBudgetName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
                >
                  {availableBudgetNames.map((name, i) => (
                    <option key={i} value={name}>{name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Nominal (Rupiah)</label>
              <Input 
                type="number" 
                placeholder="Contoh: 15000000" 
                value={txAmount} 
                onChange={(e) => setTxAmount(e.target.value)}
                className="bg-slate-50 text-xs border-slate-200 rounded-xl h-10 font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Keterangan / Memo (Opsional)</label>
              <Input 
                type="text" 
                placeholder="Memo transaksi..." 
                value={txDescription} 
                onChange={(e) => setTxDescription(e.target.value)}
                className="bg-slate-50 text-xs border-slate-200 rounded-xl h-10"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpenAddTx(false)}
                className="rounded-xl text-xs font-black uppercase h-10"
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                disabled={availableBudgetNames.length === 0}
                className="rounded-xl text-xs font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-4 shadow-md"
              >
                Simpan Transaksi
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: KELOLA NAMA BUDGET */}
      <Dialog open={isOpenBudgetNames} onOpenChange={setIsOpenBudgetNames}>
        <DialogContent className="max-w-xl rounded-[2rem] p-6 bg-white border border-slate-100 shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-black uppercase tracking-widest text-xs flex items-center gap-2">
              <Settings className="text-indigo-500" size={14} />
              Kelola Daftar Budget Name ({account.toUpperCase()})
            </DialogTitle>
          </DialogHeader>

          {/* Form to Add New Budget Name */}
          <form onSubmit={handleAddBudgetCategory} className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-3 mt-4">
            <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Tambah Budget Name Baru</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500">Tipe</label>
                <select 
                  value={newBudgetType} 
                  onChange={(e: any) => setNewBudgetType(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
                >
                  <option value="penerimaan">Penerimaan</option>
                  <option value="pengeluaran">Pengeluaran</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500">Kategori</label>
                <select 
                  value={newBudgetCategory} 
                  onChange={(e) => setNewBudgetCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
                >
                  {newBudgetType === 'penerimaan' ? (
                    <>
                      <option value="dana_terikat">Dana Terikat</option>
                      <option value="dana_tidak_terikat">Dana Tidak Terikat</option>
                    </>
                  ) : (
                    <>
                      <option value="non_program">Non Program (Kenyamanan)</option>
                      <option value="program">Program Kegiatan</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {newBudgetType === 'pengeluaran' && newBudgetCategory === 'program' && (
              <div className="space-y-1 animate-fadeIn">
                <label className="text-[9px] font-black uppercase text-slate-500">Sub-Kategori Program</label>
                <select 
                  value={newBudgetSubCategory} 
                  onChange={(e) => setNewBudgetSubCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
                >
                  <option value="standarProses">Pengembangan Standar Proses</option>
                  <option value="pengembanganSDM">Pengembangan Pendidik & Tendik</option>
                  {account === 'sma' && <option value="standarSarana">Pengembangan Standar Sarana</option>}
                  <option value="standarPengelolaan">Pengembangan Standar Pengelolaan</option>
                  <option value="standarPembiayaan">Pengembangan Standar Pembiayaan</option>
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500">Nama Budget</label>
              <div className="flex gap-2">
                <Input 
                  type="text" 
                  placeholder="Contoh: Donasi Laboratorium Baru" 
                  value={newBudgetName} 
                  onChange={(e) => setNewBudgetName(e.target.value)}
                  className="bg-white text-xs border-slate-200 rounded-xl h-9"
                  required
                />
                <Button 
                  type="submit" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider h-9 px-4 rounded-xl shadow-sm whitespace-nowrap"
                >
                  + Tambah
                </Button>
              </div>
            </div>
          </form>

          {/* List of current Budget Names */}
          <div className="mt-4 space-y-1">
            <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Daftar Budget Name Terdaftar</h4>
            <div className="max-h-[250px] overflow-y-auto border border-slate-150 rounded-2xl bg-slate-50/50 p-2 space-y-1.5">
              {activeCategories.length === 0 ? (
                <p className="text-[11px] text-slate-400 font-semibold text-center py-4">Belum ada budget name terdaftar</p>
              ) : (
                activeCategories.map((cat, i) => (
                  <div key={cat.id || i} className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100 shadow-sm text-xs font-bold text-slate-700">
                    <div>
                      <p className="text-slate-800">{cat.name}</p>
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mt-0.5">
                        {cat.type} • {cat.category} {cat.subCategory ? `(${cat.subCategory})` : ''}
                      </p>
                    </div>
                    {cat.id && (
                      <Button
                        onClick={() => handleDeleteBudgetCategory(cat.id)}
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: ATUR SALDO AWAL */}
      <Dialog open={isOpenSaldoAwal} onOpenChange={setIsOpenSaldoAwal}>
        <DialogContent className="max-w-md rounded-[2rem] p-6 bg-white border border-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-black uppercase tracking-widest text-xs flex items-center gap-2">
              <Wallet className="text-emerald-500" size={14} />
              Atur Saldo Awal Kas ({account.toUpperCase()}) - {selectedYear}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSaldoAwal} className="space-y-4 mt-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Saldo Awal Buku (IDR)</label>
              <Input 
                type="number" 
                placeholder="Masukkan nominal saldo awal" 
                value={newSaldoAwal} 
                onChange={(e) => setNewSaldoAwal(e.target.value)}
                className="bg-slate-50 text-xs border-slate-200 rounded-xl h-10 font-bold"
                required
              />
              <p className="text-[9px] text-slate-400 font-semibold italic mt-1 leading-relaxed">
                * Saldo awal ini akan digunakan sebagai starting balance untuk perhitungan Arus Kas Masuk & Arus Kas Keluar di Laporan Arus Kas Donasi {account.toUpperCase()} pada periode {selectedYear}.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpenSaldoAwal(false)}
                className="rounded-xl text-xs font-black uppercase h-10"
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                className="rounded-xl text-xs font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-4 shadow-md"
              >
                Simpan Saldo Awal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
