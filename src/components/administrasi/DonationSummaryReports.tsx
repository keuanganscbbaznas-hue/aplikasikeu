import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { CashFlowReportView } from './CashFlowReportView';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, setDoc, getDocs, where, writeBatch } from 'firebase/firestore';
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
  Search, 
  Calendar, 
  TrendingUp, 
  Coins, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Image as ImageIcon,
  MessageSquare,
  ChevronRight,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  BarChart3,
  PieChart as PieIcon,
  Download,
  Trash2,
  Wallet,
  Building2,
  FileSpreadsheet,
  ArrowRightLeft,
  ArrowRight,
  Percent,
  Check,
  AlertCircle,
  Plus,
  Settings
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
  Area
} from 'recharts';
import { toast } from 'sonner';
import { getApiUrl } from '../../lib/utils';

// Helper safely parses the Firestore Timestamp or offline JS Date
const getDonationDate = (donation: any): Date => {
  if (!donation.createdAt) return new Date();
  if (typeof donation.createdAt.toDate === 'function') {
    return donation.createdAt.toDate();
  }
  if (donation.createdAt.seconds) {
    return new Date(donation.createdAt.seconds * 1000);
  }
  return new Date(donation.createdAt);
};

const getEvidenceImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  
  if (url.includes('drive.google.com')) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  return getApiUrl(url);
};

// WhatsApp direct sender helper
const sendWhatsApp = (phoneNumber: string, message: string) => {
  if (!phoneNumber) {
    toast.error("Nomor WhatsApp tidak ditemukan");
    return;
  }
  const cleanedPhone = phoneNumber.replace(/\D/g, '');
  const finalPhone = cleanedPhone.startsWith('0') ? '62' + cleanedPhone.slice(1) : cleanedPhone;
  const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const ALL_CASHFLOWS = {
  2024: {
    smp: {
      saldoAwal: 31200500,
      penerimaan: {
        danaTerikat: [
          { name: "Titipan Uang Saku BAZNAS Daerah", amount: 26500000 },
          { name: "Dana PIP (Program Indonesia Pintar)", amount: 10450000 },
          { name: "Donasi Laptop", amount: 48000000 }
        ],
        danaTidakTerikat: [
          { name: "Donasi Tunjangan Profesi dan Sertifikasi (PPG) Tendik", amount: 16500000 },
          { name: "Donasi Unit Usaha", amount: 2800000 },
          { name: "Donasi Lainnya (Infaq Tendik dll)", amount: 21450000 }
        ]
      },
      pengeluaran: {
        nonProgram: [
          { name: "Pengambilan Titipan Uang Saku BAZNAS Daerah", amount: 31000000 }
        ],
        program: {
          standarProses: [
            { name: "Penguatan Komunitas Belajar", amount: 3800000 },
            { name: "Penguatan Pendidikan Karakter", amount: 5200000 },
            { name: "Pengadaan Sarana Penunjang Kegiatan KBM", amount: 9500000 },
            { name: "Penyaluran Donasi Laptop", amount: 46000000 }
          ],
          pengembanganSDM: [
            { name: "Kegiatan Pelaksanaan Pengembangan SDM", amount: 11200000 }
          ],
          standarSarana: [],
          standarPengelolaan: [
            { name: "Biaya Transportasi", amount: 21500000 }
          ],
          standarPembiayaan: [
            { name: "Administrasi Bank", amount: 110000 }
          ]
        }
      },
      saldoAkhir: 22790500
    },
    sma: {
      saldoAwal: 82400100,
      penerimaan: {
        danaTerikat: [
          { name: "BOSP SMA", amount: 46800000 },
          { name: "Donasi Bencana Sumatra", amount: 8200000 }
        ],
        danaTidakTerikat: [
          { name: "BPMU", amount: 31400000 },
          { name: "Donasi Lainnya (PPG , Infaq dll)", amount: 5120000 }
        ]
      },
      pengeluaran: {
        nonProgram: [],
        program: {
          standarProses: [
            { name: "Penguatan Komunitas Belajar", amount: 0 },
            { name: "Penguatan Pendidikan Karakter", amount: 5400000 },
            { name: "Penyediaan Sarpras Peserta didik", amount: 28600000 },
            { name: "Pengadaan Sarana Penunjang Kegiatan KBM", amount: 4800000 }
          ],
          pengembanganSDM: [
            { name: "Kegiatan Pelaksanaan Pengembangan SDM", amount: 3200000 }
          ],
          standarSarana: [
            { name: "Penyediaan atau Pembuatan Media Pembelajaran", amount: 0 },
            { name: "Pengembangan Sekolah Sehat, Sekolah Aman", amount: 9200000 },
            { name: "Pemeliharaan Prasarana Lahan, Bangunan dan Ruang", amount: 6400000 },
            { name: "Pemeliharaan Perlengkapan Daya & Jasa Sekolah", amount: 10400000 },
            { name: "Pemeliharaan Kendaraan", amount: 11200000 }
          ],
          standarPengelolaan: [
            { name: "Konsumsi Rapat Kedinasan dan Tamu Sekolah", amount: 10500000 },
            { name: "Biaya Transportasi", amount: 11800000 }
          ],
          standarPembiayaan: [
            { name: "Pembayaran Honor Tenaga Penunjang atau Pelaksana", amount: 1800000 },
            { name: "Administrasi Bank", amount: 1300000 },
            { name: "Pembayaran daya dan/atau jasa", amount: 10800000 },
            { name: "Penyaluran Donasi Bencana Sumatra", amount: 8200000 }
          ]
        }
      },
      saldoAkhir: 63620100
    }
  },
  2025: {
    smp: {
      saldoAwal: 37512796,
      penerimaan: {
        danaTerikat: [
          { name: "Titipan Uang Saku BAZNAS Daerah", amount: 30300000 },
          { name: "Dana PIP (Program Indonesia Pintar)", amount: 12370000 },
          { name: "Donasi Laptop", amount: 62203750 }
        ],
        danaTidakTerikat: [
          { name: "Donasi Tunjangan Profesi dan Sertifikasi (PPG) Tendik", amount: 20179780 },
          { name: "Donasi Unit Usaha", amount: 3186000 },
          { name: "Donasi Lainnya (Infaq Tendik dll)", amount: 29325069 }
        ]
      },
      pengeluaran: {
        nonProgram: [
          { name: "Pengambilan Titipan Uang Saku BAZNAS Daerah", amount: 38950000 }
        ],
        program: {
          standarProses: [
            { name: "Penguatan Komunitas Belajar", amount: 4500000 },
            { name: "Penguatan Pendidikan Karakter", amount: 6273596 },
            { name: "Pengadaan Sarana Penunjang Kegiatan KBM", amount: 11352000 },
            { name: "Penyaluran Donasi Laptop", amount: 62000000 }
          ],
          pengembanganSDM: [
            { name: "Kegiatan Pelaksanaan Pengembangan SDM", amount: 14651500 }
          ],
          standarSarana: [],
          standarPengelolaan: [
            { name: "Biaya Transportasi", amount: 27416000 }
          ],
          standarPembiayaan: [
            { name: "Administrasi Bank", amount: 120000 }
          ]
        }
      },
      saldoAkhir: 29814299
    },
    sma: {
      saldoAwal: 97740056,
      penerimaan: {
        danaTerikat: [
          { name: "BOSP SMA", amount: 54245400 },
          { name: "Donasi Bencana Sumatra", amount: 9405000 }
        ],
        danaTidakTerikat: [
          { name: "BPMU", amount: 36955000 },
          { name: "Donasi Lainnya (PPG , Infaq dll)", amount: 6497166 }
        ]
      },
      pengeluaran: {
        nonProgram: [],
        program: {
          standarProses: [
            { name: "Penguatan Komunitas Belajar", amount: 0 },
            { name: "Penguatan Pendidikan Karakter", amount: 6811500 },
            { name: "Penyediaan Sarpras Peserta didik", amount: 34294135 },
            { name: "Pengadaan Sarana Penunjang Kegiatan KBM", amount: 5600000 }
          ],
          pengembanganSDM: [
            { name: "Kegiatan Pelaksanaan Pengembangan SDM", amount: 3750000 }
          ],
          standarSarana: [
            { name: "Penyediaan atau Pembuatan Media Pembelajaran", amount: 0 },
            { name: "Pengembangan Sekolah Sehat, Sekolah Aman", amount: 11169896 },
            { name: "Pemeliharaan Prasarana Lahan, Bangunan dan Ruang", amount: 7660000 },
            { name: "Pemeliharaan Perlengkapan Daya & Jasa Sekolah", amount: 12148965 },
            { name: "Pemeliharaan Kendaraan", amount: 14479500 }
          ],
          standarPengelolaan: [
            { name: "Konsumsi Rapat Kedinasan dan Tamu Sekolah", amount: 12550500 },
            { name: "Biaya Transportasi", amount: 14743100 }
          ],
          standarPembiayaan: [
            { name: "Pembayaran Honor Tenaga Penunjang atau Pelaksana", amount: 2025000 },
            { name: "Administrasi Bank", amount: 1522000 },
            { name: "Pembayaran daya dan/atau jasa", amount: 12598500 },
            { name: "Penyaluran Donasi Bencana Sumatra", amount: 9405000 }
          ]
        }
      },
      saldoAkhir: 56084526
    }
  },
  2026: {
    smp: {
      saldoAwal: 29814299,
      penerimaan: {
        danaTerikat: [
          { name: "Titipan Uang Saku BAZNAS Daerah", amount: 35000004 },
          { name: "Dana PIP (Program Indonesia Pintar)", amount: 15000000 },
          { name: "Donasi Laptop", amount: 75000000 }
        ],
        danaTidakTerikat: [
          { name: "Donasi Tunjangan Profesi dan Sertifikasi (PPG) Tendik", amount: 25000000 },
          { name: "Donasi Unit Usaha", amount: 4500000 },
          { name: "Donasi Lainnya (Infaq Tendik dll)", amount: 35000000 }
        ]
      },
      pengeluaran: {
        nonProgram: [
          { name: "Pengambilan Titipan Uang Saku BAZNAS Daerah", amount: 42000000 }
        ],
        program: {
          standarProses: [
            { name: "Penguatan Komunitas Belajar", amount: 5000000 },
            { name: "Penguatan Pendidikan Karakter", amount: 7500000 },
            { name: "Pengadaan Sarana Penunjang Kegiatan KBM", amount: 13000000 },
            { name: "Penyaluran Donasi Laptop", amount: 72000000 }
          ],
          pengembanganSDM: [
            { name: "Kegiatan Pelaksanaan Pengembangan SDM", amount: 18000000 }
          ],
          standarSarana: [],
          standarPengelolaan: [
            { name: "Biaya Transportasi", amount: 32000000 }
          ],
          standarPembiayaan: [
            { name: "Administrasi Bank", amount: 150000 }
          ]
        }
      },
      saldoAkhir: 29164299
    },
    sma: {
      saldoAwal: 56084526,
      penerimaan: {
        danaTerikat: [
          { name: "BOSP SMA", amount: 62000000 },
          { name: "Donasi Bencana Sumatra", amount: 11000000 }
        ],
        danaTidakTerikat: [
          { name: "BPMU", amount: 42000000 },
          { name: "Donasi Lainnya (PPG , Infaq dll)", amount: 8500000 }
        ]
      },
      pengeluaran: {
        nonProgram: [],
        program: {
          standarProses: [
            { name: "Penguatan Komunitas Belajar", amount: 0 },
            { name: "Penguatan Pendidikan Karakter", amount: 8200000 },
            { name: "Penyediaan Sarpras Peserta didik", amount: 38000000 },
            { name: "Pengadaan Sarana Penunjang Kegiatan KBM", amount: 6500000 }
          ],
          pengembanganSDM: [
            { name: "Kegiatan Pelaksanaan Pengembangan SDM", amount: 4500000 }
          ],
          standarSarana: [
            { name: "Penyediaan atau Pembuatan Media Pembelajaran", amount: 0 },
            { name: "Pengembangan Sekolah Sehat, Sekolah Aman", amount: 13000000 },
            { name: "Pemeliharaan Prasarana Lahan, Bangunan dan Ruang", amount: 9000000 },
            { name: "Pemeliharaan Perlengkapan Daya & Jasa Sekolah", amount: 14500000 },
            { name: "Pemeliharaan Kendaraan", amount: 16500000 }
          ],
          standarPengelolaan: [
            { name: "Konsumsi Rapat Kedinasan dan Tamu Sekolah", amount: 15500000 },
            { name: "Biaya Transportasi", amount: 18200000 }
          ],
          standarPembiayaan: [
            { name: "Pembayaran Honor Tenaga Penunjang atau Pelaksana", amount: 2500000 },
            { name: "Administrasi Bank", amount: 1800000 },
            { name: "Pembayaran daya dan/atau jasa", amount: 14500000 },
            { name: "Penyaluran Donasi Bencana Sumatra", amount: 11000000 }
          ]
        }
      },
      saldoAkhir: 51184526
    }
  }
};

export const CASHFLOW_DATA = ALL_CASHFLOWS[2025];

export const DonationSummaryReports = () => {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation tabs for type of report
  const [reportType, setReportType] = useState<'monthly' | 'yearly' | 'cashflow'>('monthly');
  const [cashflowAccount, setCashflowAccount] = useState<'smp' | 'sma'>('smp');
  
  // Period states
  const [selectedMonthStr, setSelectedMonthStr] = useState<string>(''); // format: "YYYY-MM"
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Inner search and filter for listed donations
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'rejected'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);

  const getSheetsFormulaForEvidence = (url: string) => {
    if (!url) return 'Tidak Ada Bukti';
    if (url.startsWith('data:') || url.length > 2000) {
      return 'Bukti Gambar (Format Base64)';
    }
    
    const absoluteUrl = (url.startsWith('http://') || url.startsWith('https://')) 
      ? url 
      : window.location.origin + url;
      
    const isPdf = absoluteUrl.toLowerCase().endsWith('.pdf') || absoluteUrl.includes('.pdf');
    
    if (isPdf) {
      return `=HYPERLINK("${absoluteUrl}", "BUKTI PDF (KLIK UNTUK BUKA)")`;
    }
    
    let imageUrl = absoluteUrl;
    if (absoluteUrl.includes('drive.google.com')) {
      const match = absoluteUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || absoluteUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        imageUrl = `https://lh3.googleusercontent.com/d/${match[1]}`;
      }
    }
    
    return `=HYPERLINK("${absoluteUrl}", IMAGE("${imageUrl}", 1))`;
  };

  const syncToSheetsWithData = async (dataToSync: any[], silent = false) => {
    let toastId: string | number = '';
    if (!silent) {
      toastId = toast.loading("Menyinkronkan data donasi ke Google Sheet...");
    }
    setIsSyncing(true);
    try {
      const spreadsheetId = '1VmjYCnvWO0vrX5PinazbqR3jSIDnEoVAVfyMdvDs4VM';
      const headers = ["Tanggal", "Donatur", "Nominal", "Tujuan", "Bukti", "Status"];
      
      const sorted = [...dataToSync].sort((a, b) => {
        return getDonationDate(a).getTime() - getDonationDate(b).getTime();
      });

      const rows = sorted.map(d => {
        const dateStr = getDonationDate(d).toLocaleDateString('id-ID', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }) + ' ' + getDonationDate(d).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit'
        });

        return [
          dateStr,
          d.donaturName || 'Donatur Tanpa Nama',
          d.amount || 0,
          d.targetAccount === 'smp' ? 'SMP' : d.targetAccount === 'sma' ? 'SMA' : (d.targetAccount || '-'),
          getSheetsFormulaForEvidence(d.evidenceUrl),
          d.status || 'pending'
        ];
      });

      const bodyData = [headers, ...rows];

      const res = await fetch(getApiUrl('/api/sheets/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          data: bodyData
        })
      });

      if (!res.ok) {
        let errData;
        try { errData = await res.json(); } catch { errData = { message: `HTTP Error ${res.status}: ${res.status === 413 ? 'Payload terlalu besar' : 'Terjadi kesalahan sistem'}` }; }
        throw new Error(errData.message || errData.error || 'Gagal sinkronisasi');
      }

      if (!silent) {
        toast.success("Sinkronisasi Google Sheet berhasil!", { id: toastId });
      }
    } catch (error: any) {
      console.error("Sync Error:", error);
      if (!silent) {
        toast.error(`Gagal sinkronisasi: ${error.message}. Pastikan spreadsheet telah dibagikan sebagai Editor ke email Service Account.`, { id: toastId });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const syncToSheets = async () => {
    await syncToSheetsWithData(donations);
  };

  useEffect(() => {
    const q = query(collection(db, 'donations'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDonations(data);
      
      // Auto-set the latest month available
      if (data.length > 0 && !selectedMonthStr) {
        const latestDate = getDonationDate(data[0]);
        const m = String(latestDate.getMonth() + 1).padStart(2, '0');
        const y = latestDate.getFullYear();
        setSelectedMonthStr(`${y}-${m}`);
        setSelectedYear(y);
      } else if (!selectedMonthStr) {
        const now = new Date();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        setSelectedMonthStr(`${now.getFullYear()}-${m}`);
        setSelectedYear(now.getFullYear());
      }
      
      setLoading(false);
    }, (error) => {
      console.warn("Donations snapshot notice:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateStatus = async (id: string, status: 'verified' | 'rejected' | 'pending') => {
    try {
      await updateDoc(doc(db, 'donations', id), { status });
      const statusText = status === 'verified' ? 'verifikasi' : status === 'rejected' ? 'tolak' : 'kembalikan ke pending';
      toast.success(`Donasi berhasil di-${statusText}`);
      
      const updatedDonations = donations.map(d => d.id === id ? { ...d, status } : d);
      await syncToSheetsWithData(updatedDonations, true);
    } catch (error: any) {
      toast.error("Gagal update status: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'donations', id));
      toast.success("Data donasi berhasil dihapus");
      setDeleteId(null);
      
      const updatedDonations = donations.filter(d => d.id !== id);
      await syncToSheetsWithData(updatedDonations, true);
    } catch (error: any) {
      toast.error("Gagal menghapus data: " + error.message);
    }
  };

  // Extract list of all unique months and years present in data for selection sidebar
  const uniqueMonths = Array.from(new Set(donations.map(d => {
    const date = getDonationDate(d);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${date.getFullYear()}-${m}`;
  }))).sort().reverse() as string[]; // Decending

  const uniqueYears = Array.from(new Set([2024, 2025, 2026, ...donations.map(d => {
    return getDonationDate(d).getFullYear();
  })])).sort().reverse() as number[];

  // Active list based on period selection
  const monthlyDonations = donations.filter(d => {
    const date = getDonationDate(d);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${date.getFullYear()}-${m}` === selectedMonthStr;
  });

  const yearlyDonations = donations.filter(d => {
    return getDonationDate(d).getFullYear() === selectedYear;
  });

  const activeDonations = reportType === 'monthly' ? monthlyDonations : yearlyDonations;

  // Filter with search term and status inside the active list
  const filteredDonations = activeDonations.filter(d => {
    const nameMatch = d.donaturName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      d.contact?.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = statusFilter === 'all' || d.status === statusFilter;
    return nameMatch && statusMatch;
  });

  // Calculate Metrics
  const calculateMetrics = (items: any[]) => {
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const verifiedAmount = items.filter(item => item.status === 'verified')
                                .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const pendingAmount = items.filter(item => item.status === 'pending' || !item.status)
                                .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    
    const totalCount = items.length;
    const verifiedCount = items.filter(item => item.status === 'verified').length;
    const pendingCount = items.filter(item => item.status === 'pending' || !item.status).length;
    
    // Target SMP vs SMA distribution
    const smpAmount = items.filter(item => item.targetAccount === 'smp')
                           .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const smaAmount = items.filter(item => item.targetAccount === 'sma')
                           .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    return { totalAmount, verifiedAmount, pendingAmount, totalCount, verifiedCount, pendingCount, smpAmount, smaAmount };
  };

  const metrics = calculateMetrics(activeDonations);

  // Aggregate data for Charts
  // 1. Monthly Chart: Sum daily donations
  const getMonthlyChartData = () => {
    if (!selectedMonthStr) return [];
    const [year, month] = selectedMonthStr.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const dayMap: Record<number, number> = {};
    for (let i = 1; i <= daysInMonth; i++) dayMap[i] = 0;

    monthlyDonations.forEach(d => {
      const date = getDonationDate(d);
      if (d.status === 'verified') {
        const day = date.getDate();
        dayMap[day] = (dayMap[day] || 0) + (Number(d.amount) || 0);
      }
    });

    return Object.keys(dayMap).map(day => ({
      name: `${day}`,
      Amount: dayMap[Number(day)]
    }));
  };

  // 2. Yearly Chart: Sum monthly donations (Jan - Dec)
  const getYearlyChartData = () => {
    const monthMap: Record<number, number> = {};
    for (let i = 0; i < 12; i++) monthMap[i] = 0;

    yearlyDonations.forEach(d => {
      if (d.status === 'verified') {
        const date = getDonationDate(d);
        const m = date.getMonth();
        monthMap[m] = (monthMap[m] || 0) + (Number(d.amount) || 0);
      }
    });

    return INDONESIAN_MONTHS.map((mName, idx) => ({
      name: mName.substring(0, 3),
      Amount: monthMap[idx]
    }));
  };

  const chartData = reportType === 'monthly' ? getMonthlyChartData() : getYearlyChartData();

  // Target Distribution Chart data
  const pieData = [
    { name: 'SMP Cendekia BAZNAS', value: metrics.smpAmount, color: '#0ea5e9' },
    { name: 'SMA Cendekia BAZNAS', value: metrics.smaAmount, color: '#10b981' }
  ];

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  const formatPeriodLabel = (pStr: string) => {
    if (!pStr) return '';
    const [year, month] = pStr.split('-');
    return `${INDONESIAN_MONTHS[Number(month) - 1]} ${year}`;
  };

  const exportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Tanggal,Donatur,Kontak,Nominal,Tujuan,Status"].join(",") + "\n"
      + activeDonations.map(d => {
          const date = getDonationDate(d).toLocaleDateString('id-ID');
          const cleanName = (d.donaturName || '').replace(/,/g, '');
          const cleanContact = (d.contact || '').replace(/,/g, '');
          return `"${date}","${cleanName}","${cleanContact}",${d.amount},"${d.targetAccount === 'smp' ? 'SMP' : 'SMA'}","${d.status || 'pending'}"`;
        }).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Donasi_${reportType === 'monthly' ? selectedMonthStr : selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* 1. Left Selection Column */}
      <div className="lg:col-span-1 space-y-4">
        {/* Type selector (Monthly, Yearly, Cashflow) */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 border border-slate-200">
          <button
            onClick={() => setReportType('monthly')}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
              reportType === 'monthly' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Bulanan
          </button>
          <button
            onClick={() => setReportType('yearly')}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
              reportType === 'yearly' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Tahunan
          </button>
          <button
            onClick={() => setReportType('cashflow')}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
              reportType === 'cashflow' 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Arus Kas
          </button>
        </div>

        {/* Dynamic List Selection Sidebar */}
        {reportType === 'cashflow' ? (
          <div className="space-y-4">
            {/* Year Selector Card */}
            <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/50 p-4 border-b border-light/10">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Calendar size={14} className="text-slate-500" />
                  Pilih Tahun Arus Kas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 gap-1 flex flex-col bg-white">
                {[2024, 2025, 2026].map(yr => {
                  const isActive = yr === selectedYear;
                  return (
                    <button
                      key={yr}
                      onClick={() => setSelectedYear(yr)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${
                        isActive 
                          ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' 
                          : 'bg-white hover:bg-slate-50 text-slate-650 hover:text-slate-900'
                      }`}
                    >
                      <span className="text-xs font-black tracking-tight">Tahun Buku {yr}</span>
                      <Badge variant={isActive ? "secondary" : "outline"} className={`text-[9px] font-black uppercase ${isActive ? 'bg-emerald-500 border-none text-white' : ''}`}>
                        {isActive ? "Aktif" : "Pilih"}
                      </Badge>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Account Selector Card */}
            <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/50 p-4 border-b border-light/10">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Coins size={14} className="text-slate-500" />
                  Pilih Rekening
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-2 bg-white">
                <button
                  onClick={() => setCashflowAccount('smp')}
                  className={`w-full flex flex-col p-4 rounded-2xl transition-all text-left border ${
                    cashflowAccount === 'smp'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-indigo-900/20'
                      : 'bg-white hover:bg-slate-50 hover:text-slate-900 text-slate-650 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className={`p-1.5 rounded-lg ${cashflowAccount === 'smp' ? 'bg-white/10 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                      <Building2 size={13} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-tight">Donasi SMP</span>
                  </div>
                  <span className={`text-[9px] font-bold ${cashflowAccount === 'smp' ? 'text-slate-300' : 'text-slate-400'} mt-2`}>
                    No Rek: 1032913357
                  </span>
                  <div className={`h-[1px] w-full bg-current opacity-10 my-2`} />
                  <div className="flex items-center justify-between w-full mt-1">
                    <span className="text-[8px] uppercase tracking-wider opacity-60">Sisa Saldo</span>
                    <span className={`text-xs font-extrabold ${cashflowAccount === 'smp' ? 'text-emerald-300' : 'text-emerald-600'}`}>
                      Rp {(ALL_CASHFLOWS[selectedYear] || ALL_CASHFLOWS[2025]).smp.saldoAkhir.toLocaleString('id-ID')}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setCashflowAccount('sma')}
                  className={`w-full flex flex-col p-4 rounded-2xl transition-all text-left border ${
                    cashflowAccount === 'sma'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-indigo-900/20'
                      : 'bg-white hover:bg-slate-50 hover:text-slate-900 text-slate-650 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className={`p-1.5 rounded-lg ${cashflowAccount === 'sma' ? 'bg-white/10 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                      <Building2 size={13} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-tight">Donasi SMA</span>
                  </div>
                  <span className={`text-[9px] font-bold ${cashflowAccount === 'sma' ? 'text-slate-300' : 'text-slate-400'} mt-2`}>
                    No Rek: 1054796605
                  </span>
                  <div className={`h-[1px] w-full bg-current opacity-10 my-2`} />
                  <div className="flex items-center justify-between w-full mt-1">
                    <span className="text-[8px] uppercase tracking-wider opacity-60">Sisa Saldo</span>
                    <span className={`text-xs font-extrabold ${cashflowAccount === 'sma' ? 'text-emerald-300' : 'text-emerald-600'}`}>
                      Rp {(ALL_CASHFLOWS[selectedYear] || ALL_CASHFLOWS[2025]).sma.saldoAkhir.toLocaleString('id-ID')}
                    </span>
                  </div>
                </button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 p-4 border-b border-light/10">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Calendar size={14} className="text-slate-500" />
                Pilih Periode {reportType === 'monthly' ? 'Bulan' : 'Tahun'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 max-h-[300px] overflow-y-auto space-y-1 bg-white">
              {reportType === 'monthly' ? (
                uniqueMonths.length === 0 ? (
                  <p className="text-[11px] text-center text-slate-400 py-6 font-semibold">Tidak ada periode</p>
                ) : (
                  uniqueMonths.map(month => {
                    const isActive = month === selectedMonthStr;
                    const monthDonations = donations.filter(d => {
                      const date = getDonationDate(d);
                      const m = String(date.getMonth() + 1).padStart(2, '0');
                      return `${date.getFullYear()}-${m}` === month;
                    });
                    const sum = monthDonations.reduce((acc, current) => acc + (Number(current.amount) || 0), 0);

                    return (
                      <button
                        key={month}
                        onClick={() => setSelectedMonthStr(month)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${
                          isActive 
                            ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' 
                            : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-black uppercase tracking-tight">{formatPeriodLabel(month)}</p>
                          <p className={`text-[10px] font-semibold ${isActive ? 'text-slate-350' : 'text-slate-400'}`}>
                            {monthDonations.length} Donasi
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-black tracking-tight ${isActive ? 'text-emerald-300' : 'text-emerald-600'}`}>
                            Rp {sum >= 1000000 ? (sum / 1000000).toFixed(1) + 'M' : sum.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )
              ) : (
                uniqueYears.length === 0 ? (
                  <p className="text-[11px] text-center text-slate-400 py-6 font-semibold">Tidak ada periode</p>
                ) : (
                  uniqueYears.map(year => {
                    const isActive = year === selectedYear;
                    const yearDonations = donations.filter(d => getDonationDate(d).getFullYear() === year);
                    const sum = yearDonations.reduce((acc, current) => acc + (Number(current.amount) || 0), 0);

                    return (
                      <button
                        key={year}
                        onClick={() => setSelectedYear(year)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${
                          isActive 
                            ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' 
                            : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-black tracking-tight">{year}</p>
                          <p className={`text-[10px] font-semibold ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                            {yearDonations.length} Donasi
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-black tracking-tight ${isActive ? 'text-emerald-300' : 'text-emerald-605'}`}>
                            Rp {sum >= 1000000 ? (sum / 1000000).toFixed(1) + 'M' : sum.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 2. Right Reports Dashboard Area */}
      <div className="lg:col-span-3 space-y-6">
        {reportType === 'cashflow' ? (
          <CashFlowReportView account={cashflowAccount} setAccount={setCashflowAccount} selectedYear={selectedYear} />
        ) : (
          <>
        {/* Summary Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="rounded-[2rem] border-slate-100 shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden p-5 flex flex-col justify-between h-36">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 bg-white/10 rounded-xl flex items-center justify-center text-white">
                <Coins size={18} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 bg-white/10 px-2 py-0.5 rounded-full">
                Siklus Terkumpul
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Total Penggalangan</p>
              <h3 className="text-lg sm:text-xl font-black text-white mt-1 leading-none">{formatRupiah(metrics.totalAmount)}</h3>
            </div>
          </Card>

          <Card className="rounded-[2rem] border-slate-100 shadow-sm bg-white overflow-hidden p-5 flex flex-col justify-between h-36 border border-emerald-100">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Terverifikasi
              </span>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-tight">Akumulasi Valid</p>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1 leading-none">{formatRupiah(metrics.verifiedAmount)}</h3>
            </div>
          </Card>

          <Card className="rounded-[2rem] border-slate-100 shadow-sm bg-white overflow-hidden p-5 flex flex-col justify-between h-36 border border-amber-100">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Clock size={18} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                Tertunda (Pending)
              </span>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-tight">Menunggu Verifikasi</p>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1 leading-none">{formatRupiah(metrics.pendingAmount)}</h3>
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Flow Chart */}
          <Card className="md:col-span-2 rounded-[2rem] border-slate-100 shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-5 border-b border-slate-50 flex items-center justify-between flex-row">
              <div>
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Grafik Donasi Terverifikasi ({reportType === 'monthly' ? 'Harian' : 'Bulanan'})
                </CardTitle>
                <CardDescription className="text-[11px] font-bold text-slate-400 mt-0.5">
                  Visualisasi dana masuk {reportType === 'monthly' ? formatPeriodLabel(selectedMonthStr) : selectedYear}
                </CardDescription>
              </div>
              <div className="text-right">
                <Badge className="bg-emerald-500 font-mono scale-90 px-2 py-0.5 font-black uppercase text-white shadow-none rounded-lg">
                  Lolos Validasi
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-6">
              <div className="h-64 w-full">
                {metrics.verifiedAmount === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-350">
                    <BarChart3 size={24} className="mb-2" />
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Belum ada donasi valid pada periode ini</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" fontSize={10} fontWeight={700} axisLine={false} tickLine={false} tickFormatter={(val) => reportType === 'monthly' && Number(val) % 5 !== 0 && val !== '1' ? '' : `${val}`} />
                      <YAxis fontSize={9} fontWeight={600} axisLine={false} tickLine={false} tickFormatter={(val) => val >= 1000000 ? `${(val/1000000).toFixed(1)}Jt` : val >= 1000 ? `${(val/1000).toFixed(0)}rb` : val} />
                      <Tooltip 
                        formatter={(value: any) => [formatRupiah(Number(value)), 'Total Donasi']}
                        labelFormatter={(label) => reportType === 'monthly' ? `Tanggal ${label}` : `Bulan ${label}`}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', fontStyle: 'bold' }}
                      />
                      <Area type="monotone" dataKey="Amount" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAmount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Allocation Breakdown Chart */}
          <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-5 border-b border-slate-50">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">
                Alokasi Sekolah
              </CardTitle>
              <CardDescription className="text-[11px] font-bold text-slate-400 mt-0.5">
                Akumulasi peruntukan jenjang
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <div className="h-44 w-full flex items-center justify-center relative">
                {metrics.totalAmount === 0 ? (
                  <p className="text-[10px] uppercase font-black tracking-wider text-slate-300">Belum Ada Data</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData.filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatRupiah(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {/* Visual center labels */}
                {metrics.totalAmount > 0 && (
                  <div className="absolute text-center">
                    <p className="text-[8px] font-black uppercase text-slate-400 leading-none">Donasi SMP/SMA</p>
                    <p className="text-xs font-black text-slate-800 mt-0.5">
                      {Math.round(((metrics.smpAmount / (metrics.totalAmount || 1)) * 100))}% vs {Math.round(((metrics.smaAmount / (metrics.totalAmount || 1)) * 100))}%
                    </p>
                  </div>
                )}
              </div>

              {/* Legends */}
              <div className="w-full space-y-2 mt-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <div className="h-2 w-2 rounded-full bg-sky-500" />
                    <span>SMP</span>
                  </div>
                  <span className="text-slate-800">{formatRupiah(metrics.smpAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>SMA</span>
                  </div>
                  <span className="text-slate-800">{formatRupiah(metrics.smaAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* List of Donations for Selected Period */}
        <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-white border-b border-slate-50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">
                Rincian Transaksi Donasi
              </CardTitle>
              <CardDescription className="text-xs font-semibold text-slate-400 mt-1">
                {activeDonations.length} data ditemukan dalam periode{' '}
                <span className="font-bold text-slate-700">
                  {reportType === 'monthly' ? formatPeriodLabel(selectedMonthStr) : selectedYear}
                </span>
              </CardDescription>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Status quick list filter */}
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-150 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 focus:outline-none"
              >
                <option value="all">Semua Status</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>

              {/* Export Button */}
              <Button 
                onClick={exportCSV} 
                variant="outline" 
                size="sm" 
                className="h-9 text-xs font-black tracking-tight rounded-xl border-slate-200"
              >
                <Download size={13} className="mr-1.5" />
                Ekspor CSV
              </Button>

              {/* Sync Button */}
              <Button 
                onClick={syncToSheets} 
                disabled={isSyncing}
                variant="outline" 
                size="sm" 
                className="h-9 text-xs font-black tracking-tight rounded-xl border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-bold flex items-center gap-1.5"
              >
                <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-orange-500 animate-spin' : 'bg-emerald-500 animate-pulse'}`} />
                {isSyncing ? 'Sinkronisasi...' : 'Sinkronkan Google Sheets'}
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {/* Search filter within period */}
            <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-50 flex items-center justify-between gap-2">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <Input 
                  placeholder="Cari nama atau kontak penanggungjawab dalam list ini..." 
                  className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-100"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-3 pl-6">Tanggal</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-3">Nama Donatur</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-3">Nominal</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-3">Tujuan</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-3 text-center">Bukti</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-3 text-center">Status</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-3 pr-6 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-slate-450 font-semibold text-xs">
                        Memuat data...
                      </TableCell>
                    </TableRow>
                  ) : filteredDonations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16 text-slate-400 font-semibold text-xs">
                        Tidak ada transaksi donasi pada filter periodik ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDonations.map((donation) => (
                      <TableRow key={donation.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="py-3.5 pl-6">
                          <div className="text-[11px] font-bold text-slate-600">
                            {getDonationDate(donation).toLocaleDateString('id-ID')}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {getDonationDate(donation).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-black text-slate-800 text-sm">{donation.donaturName}</div>
                          <div className="text-[10px] font-semibold text-slate-400">{donation.contact}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-black text-emerald-600 text-sm">
                            Rp {donation.amount?.toLocaleString('id-ID')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-lg text-[9px] font-black uppercase tracking-widest border-slate-200 text-slate-500">
                            {donation.targetAccount === 'smp' ? 'SMP' : 'SMA'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {donation.evidenceUrl ? (
                            <Dialog>
                              <DialogTrigger render={
                                <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                                  <ImageIcon size={14} />
                                </Button>
                              } />
                              <DialogContent className="max-w-2xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
                                <DialogHeader className="p-6 bg-slate-900">
                                  <DialogTitle className="text-white font-black uppercase tracking-widest text-xs flex items-center gap-2">
                                    <ImageIcon size={14} />
                                    Bukti Transfer - {donation.donaturName}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="p-6 bg-slate-50 flex items-center justify-center">
                                  <div className="flex flex-col items-center gap-4">
                                    <img 
                                      src={getEvidenceImageUrl(donation.evidenceUrl)} 
                                      alt="Bukti Transfer" 
                                      className="max-h-[65vh] rounded-2xl shadow-md object-contain" 
                                      referrerPolicy="no-referrer"
                                    />
                                    {donation.evidenceUrl.startsWith('http') && (
                                      <Button 
                                        render={
                                          <a href={donation.evidenceUrl} target="_blank" rel="noopener noreferrer">
                                            Buka di Tab Baru / Google Drive
                                          </a>
                                        } 
                                        variant="outline" 
                                        className="rounded-xl text-xs border-slate-200" 
                                      />
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <span className="text-[9px] font-black uppercase text-slate-300 italic">No Proof</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`rounded-lg py-1 px-2 text-[9px] font-black uppercase tracking-widest shadow-none ${
                            donation.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                            donation.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {donation.status === 'verified' ? 'Verified' :
                             donation.status === 'rejected' ? 'Rejected' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center pr-6">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button 
                              onClick={() => {
                                const currentStatus = donation.status || 'pending';
                                if (currentStatus === 'verified') {
                                  updateStatus(donation.id, 'pending');
                                } else {
                                  updateStatus(donation.id, 'verified');
                                }
                              }}
                              variant="ghost" 
                              size="sm" 
                              className={`h-8 w-8 rounded-lg transition-all ${
                                donation.status === 'verified' 
                                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-500/20' 
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={donation.status === 'verified' ? "Batalkan Verifikasi" : "Verifikasi Donasi"}
                            >
                              <CheckCircle2 size={14} />
                            </Button>
                            
                            <Button 
                              onClick={() => {
                                const currentStatus = donation.status || 'pending';
                                if (currentStatus === 'rejected') {
                                  updateStatus(donation.id, 'pending');
                                } else {
                                  updateStatus(donation.id, 'rejected');
                                }
                              }}
                              variant="ghost" 
                              size="sm" 
                              className={`h-8 w-8 rounded-lg transition-all ${
                                donation.status === 'rejected' 
                                  ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm shadow-rose-500/20' 
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                              title={donation.status === 'rejected' ? "Batalkan Penolakan" : "Tolak Donasi"}
                            >
                              <XCircle size={14} />
                            </Button>

                            <Button 
                              onClick={() => sendWhatsApp(donation.contact, `Halo ${donation.donaturName},\n\nTerima kasih telah berdonasi ke Sekolah Cendekia BAZNAS.\nDonasi Anda sebesar Rp ${donation.amount.toLocaleString('id-ID')} telah kami verifikasi.\n\nSemoga menjadi amal jariyah bagi penuntut ilmu. Syukron katsiran.`)}
                              variant="ghost" size="sm" className="h-8 w-8 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                              title="Kastem WA Terima Kasih"
                            >
                              <MessageSquare size={14} />
                            </Button>

                            <Button 
                              onClick={() => {
                                setDeleteId(donation.id);
                                setDeleteName(donation.donaturName || 'Donatur Tanpa Nama');
                              }}
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 rounded-lg text-slate-450 hover:text-rose-600 hover:bg-rose-50"
                              title="Hapus Data Donasi"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
          </>
        )}
      </div>

      {/* Dialog Konfirmasi Hapus */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-md rounded-[2rem] p-6 bg-white border border-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-black uppercase tracking-widest text-xs flex items-center gap-2">
              <Trash2 className="text-rose-500" size={14} />
              Konfirmasi Hapus Data
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-xs font-semibold text-slate-650 leading-relaxed">
            Apakah Anda yakin ingin menghapus data donasi dari <strong className="text-slate-850">{deleteName}</strong> secara permanen? Tindakan ini tidak dapat dibatalkan.
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setDeleteId(null)}
              className="rounded-xl text-xs font-black uppercase tracking-wider h-9"
            >
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteId && handleDelete(deleteId)}
              className="rounded-xl text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white h-9"
            >
              Hapus Permanen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
