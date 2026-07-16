import * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Coins, 
  Wallet, 
  Utensils, 
  TrendingUp, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Sparkles,
  Search,
  CalendarCheck,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { db } from '@/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { toast } from 'sonner';
import { utils, writeFile, read } from 'xlsx';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
const YEARS = ['2024', '2025', '2026', '2027'];

interface RealisasiEntry {
  id: string;
  tahun: string;
  bulan: string;
  program: number;
  gaji: number;
  makan: number;
  keterangan: string;
  createdAt?: any;
}

export const RealisasiManager = () => {
  const [entries, setEntries] = useState<RealisasiEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterTahun, setFilterTahun] = useState('Semua');
  const [filterBulan, setFilterBulan] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit Dialog State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RealisasiEntry | null>(null);

  // Form Fields
  const [formTahun, setFormTahun] = useState('2026');
  const [formBulan, setFormBulan] = useState('Januari');
  const [formProgram, setFormProgram] = useState('');
  const [formGaji, setFormGaji] = useState('');
  const [formMakan, setFormMakan] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load entries from Firestore
  useEffect(() => {
    const q = query(collection(db, 'realisasi_bulanan'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: RealisasiEntry[] = [];
      snapshot.forEach(doc => {
        data.push({
          id: doc.id,
          ...doc.data()
        } as RealisasiEntry);
      });
      setEntries(data);
      setLoading(false);
    }, (error) => {
      console.error("Error loading realisasi data:", error);
      toast.error("Gagal memuat data realisasi bulanan");
    });

    return () => unsubscribe();
  }, []);

  // Format Helper
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Filter and Search logic
  const filteredEntries = useMemo(() => {
    return entries.filter(item => {
      const matchesTahun = filterTahun === 'Semua' || item.tahun === filterTahun;
      const matchesBulan = filterBulan === 'Semua' || item.bulan === filterBulan;
      const matchesSearch = searchQuery === '' || 
        (item.keterangan || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.bulan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tahun.includes(searchQuery);
      return matchesTahun && matchesBulan && matchesSearch;
    }).sort((a, b) => {
      if (a.tahun !== b.tahun) {
        return parseInt(b.tahun) - parseInt(a.tahun);
      }
      return MONTHS.indexOf(b.bulan) - MONTHS.indexOf(a.bulan);
    });
  }, [entries, filterTahun, filterBulan, searchQuery]);

  // Aggregate Totals
  const aggregates = useMemo(() => {
    let totalProgram = 0;
    let totalGaji = 0;
    let totalMakan = 0;

    filteredEntries.forEach(item => {
      totalProgram += Number(item.program || 0);
      totalGaji += Number(item.gaji || 0);
      totalMakan += Number(item.makan || 0);
    });

    const grandTotal = totalProgram + totalGaji + totalMakan;

    return {
      totalProgram,
      totalGaji,
      totalMakan,
      grandTotal
    };
  }, [filteredEntries]);

  // Chart data preparation
  const chartData = useMemo(() => {
    // Group by month for current filtered year (or overall)
    const yearToUse = filterTahun === 'Semua' ? '2026' : filterTahun;
    const monthlyMap: Record<string, { program: number; gaji: number; makan: number }> = {};
    
    MONTHS.forEach(m => {
      monthlyMap[m] = { program: 0, gaji: 0, makan: 0 };
    });

    entries.forEach(item => {
      if (item.tahun === yearToUse) {
        if (monthlyMap[item.bulan]) {
          monthlyMap[item.bulan].program += Number(item.program || 0);
          monthlyMap[item.bulan].gaji += Number(item.gaji || 0);
          monthlyMap[item.bulan].makan += Number(item.makan || 0);
        }
      }
    });

    return MONTHS.map(m => ({
      name: m.substring(0, 3),
      'Realisasi Program': monthlyMap[m].program,
      'Realisasi Gaji': monthlyMap[m].gaji,
      'Realisasi Makan': monthlyMap[m].makan,
      'Total': monthlyMap[m].program + monthlyMap[m].gaji + monthlyMap[m].makan
    })).filter(d => d.Total > 0 || filterTahun !== 'Semua'); // Only show months with data if 'Semua', or show all if year selected
  }, [entries, filterTahun]);

  // Actions
  const handleOpenAdd = () => {
    setEditingEntry(null);
    setFormTahun('2026');
    setFormBulan('Januari');
    setFormProgram('');
    setFormGaji('');
    setFormMakan('');
    setFormKeterangan('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (entry: RealisasiEntry) => {
    setEditingEntry(entry);
    setFormTahun(entry.tahun);
    setFormBulan(entry.bulan);
    setFormProgram(entry.program.toString());
    setFormGaji(entry.gaji.toString());
    setFormMakan(entry.makan.toString());
    setFormKeterangan(entry.keterangan || '');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const programVal = parseFloat(formProgram) || 0;
    const gajiVal = parseFloat(formGaji) || 0;
    const makanVal = parseFloat(formMakan) || 0;

    const payload = {
      tahun: formTahun,
      bulan: formBulan,
      program: programVal,
      gaji: gajiVal,
      makan: makanVal,
      keterangan: formKeterangan,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingEntry) {
        // Update
        const docRef = doc(db, 'realisasi_bulanan', editingEntry.id);
        await updateDoc(docRef, payload);
        toast.success("Data realisasi berhasil diperbarui!");
      } else {
        // Check for duplicates
        const existing = entries.find(e => e.tahun === formTahun && e.bulan === formBulan);
        if (existing) {
          if (!confirm(`Data realisasi untuk ${formBulan} ${formTahun} sudah ada. Apakah Anda ingin memperbaruinya?`)) {
            return;
          }
          const docRef = doc(db, 'realisasi_bulanan', existing.id);
          await updateDoc(docRef, payload);
          toast.success("Data realisasi berhasil diperbarui!");
        } else {
          // Create
          await addDoc(collection(db, 'realisasi_bulanan'), {
            ...payload,
            createdAt: serverTimestamp()
          });
          toast.success("Data realisasi berhasil ditambahkan!");
        }
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error("Error saving realisasi:", err);
      toast.error("Gagal menyimpan data realisasi");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data realisasi bulanan ini?')) {
      try {
        await deleteDoc(doc(db, 'realisasi_bulanan', id));
        toast.success("Data berhasil dihapus!");
      } catch (err) {
        console.error("Error deleting realisasi:", err);
        toast.error("Gagal menghapus data");
      }
    }
  };

  const handleExport = (type: 'xlsx' | 'csv') => {
    const data = filteredEntries.map((item, idx) => ({
      'No': idx + 1,
      'Tahun': item.tahun,
      'Bulan': item.bulan,
      'Realisasi Program (Rp)': item.program,
      'Realisasi Gaji (Rp)': item.gaji,
      'Realisasi Makan (Rp)': item.makan,
      'Total (Rp)': item.program + item.gaji + item.makan,
      'Keterangan': item.keterangan || '-'
    }));

    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Realisasi Bulanan");
    writeFile(workbook, `Laporan_Realisasi_Bulanan.${type}`, { bookType: type });
    toast.success(`Data berhasil diekspor ke ${type.toUpperCase()}`);
  };

  const handleDownloadTemplate = () => {
    const data = [{ 
      'Tahun': '2026', 
      'Bulan': 'Januari', 
      'Realisasi Program': 15000000, 
      'Realisasi Gaji': 25000000, 
      'Realisasi Makan': 10000000, 
      'Keterangan': 'Realisasi rutin bulan Januari' 
    }];
    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Template");
    writeFile(workbook, `Template_Realisasi_Bulanan.xlsx`);
    toast.success("Template berhasil diunduh");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = utils.sheet_to_json(ws);

        let importedCount = 0;
        for (const item of data) {
          const tahunStr = String(item['Tahun'] || '').trim();
          const bulanStr = String(item['Bulan'] || '').trim();
          
          if (tahunStr && bulanStr) {
            const programVal = parseFloat(item['Realisasi Program'] || item['Realisasi Program (Rp)'] || 0);
            const gajiVal = parseFloat(item['Realisasi Gaji'] || item['Realisasi Gaji (Rp)'] || 0);
            const makanVal = parseFloat(item['Realisasi Makan'] || item['Realisasi Makan (Rp)'] || 0);
            const keteranganVal = String(item['Keterangan'] || '').trim();

            // Check if already exists to overwrite or skip
            const existing = entries.find(e => e.tahun === tahunStr && e.bulan === bulanStr);
            const payload = {
              tahun: tahunStr,
              bulan: bulanStr,
              program: programVal,
              gaji: gajiVal,
              makan: makanVal,
              keterangan: keteranganVal,
              updatedAt: serverTimestamp()
            };

            if (existing) {
              await updateDoc(doc(db, 'realisasi_bulanan', existing.id), payload);
            } else {
              await addDoc(collection(db, 'realisasi_bulanan'), {
                ...payload,
                createdAt: serverTimestamp()
              });
            }
            importedCount++;
          }
        }
        toast.success(`Berhasil mengimpor ${importedCount} data realisasi bulanan`);
      } catch (err) {
        console.error("Error importing data:", err);
        toast.error("Gagal mengimpor file Excel. Pastikan format kolom sesuai template.");
      }
    };
    reader.readAsBinaryString(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <CalendarCheck size={18} />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Laporan Realisasi Bulanan</h2>
          </div>
          <p className="text-xs font-medium text-slate-500">Kelola, pantau, dan analisis realisasi dana bulanan untuk program, gaji, dan makan.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleOpenAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-4">
            <Plus size={16} className="mr-1" /> Input Realisasi
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-xl font-black uppercase text-[10px] tracking-widest border-slate-200 text-slate-600 hover:bg-slate-50 h-10">
            <Upload size={14} className="mr-1" /> Import Excel
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .csv" onChange={handleImport} />
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GRAND TOTAL */}
        <Card className="rounded-3xl border border-slate-100/80 shadow-sm relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <TrendingUp size={80} />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-[9px] font-black uppercase tracking-widest text-slate-300">Total Akumulasi Realisasi</CardDescription>
            <CardTitle className="text-2xl font-black tracking-tight font-mono text-emerald-400">
              {formatRupiah(aggregates.grandTotal)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-[10px] font-medium text-slate-300 flex items-center gap-1">
              Dari {filteredEntries.length} data periode laporan
            </span>
          </CardContent>
        </Card>

        {/* REALISASI PROGRAM */}
        <Card className="rounded-3xl border border-slate-100/80 shadow-sm bg-white hover:border-emerald-200 transition-colors">
          <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
            <div>
              <CardDescription className="text-[9px] font-black uppercase tracking-widest text-slate-400">Realisasi Program</CardDescription>
              <CardTitle className="text-xl font-black tracking-tight font-mono text-slate-800 mt-1">
                {formatRupiah(aggregates.totalProgram)}
              </CardTitle>
            </div>
            <div className="h-8 w-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <Sparkles size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <span className="text-[10px] font-bold text-slate-400">
              Kontribusi: {aggregates.grandTotal > 0 ? ((aggregates.totalProgram / aggregates.grandTotal) * 100).toFixed(1) : 0}%
            </span>
          </CardContent>
        </Card>

        {/* REALISASI GAJI */}
        <Card className="rounded-3xl border border-slate-100/80 shadow-sm bg-white hover:border-blue-200 transition-colors">
          <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
            <div>
              <CardDescription className="text-[9px] font-black uppercase tracking-widest text-slate-400">Realisasi Gaji</CardDescription>
              <CardTitle className="text-xl font-black tracking-tight font-mono text-slate-800 mt-1">
                {formatRupiah(aggregates.totalGaji)}
              </CardTitle>
            </div>
            <div className="h-8 w-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Wallet size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <span className="text-[10px] font-bold text-slate-400">
              Kontribusi: {aggregates.grandTotal > 0 ? ((aggregates.totalGaji / aggregates.grandTotal) * 100).toFixed(1) : 0}%
            </span>
          </CardContent>
        </Card>

        {/* REALISASI MAKAN */}
        <Card className="rounded-3xl border border-slate-100/80 shadow-sm bg-white hover:border-amber-200 transition-colors">
          <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
            <div>
              <CardDescription className="text-[9px] font-black uppercase tracking-widest text-slate-400">Realisasi Makan</CardDescription>
              <CardTitle className="text-xl font-black tracking-tight font-mono text-slate-800 mt-1">
                {formatRupiah(aggregates.totalMakan)}
              </CardTitle>
            </div>
            <div className="h-8 w-8 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <Utensils size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <span className="text-[10px] font-bold text-slate-400">
              Kontribusi: {aggregates.grandTotal > 0 ? ((aggregates.totalMakan / aggregates.grandTotal) * 100).toFixed(1) : 0}%
            </span>
          </CardContent>
        </Card>
      </div>

      {/* CHART SECTION */}
      {entries.length > 0 && (
        <Card className="rounded-3xl border border-slate-100/80 shadow-sm bg-white p-6">
          <CardHeader className="px-0 pt-0 pb-4">
            <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Grafik Tren Realisasi Bulanan {filterTahun === 'Semua' ? 'Tahun 2026' : `Tahun ${filterTahun}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} stroke="#94a3b8" />
                <YAxis fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} stroke="#94a3b8" tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                <Tooltip 
                  formatter={(value: any) => [formatRupiah(Number(value)), '']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff' }}
                  labelStyle={{ fontWeight: 'black', color: '#34d399', fontSize: '11px' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                <Bar dataKey="Realisasi Program" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Realisasi Gaji" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Realisasi Makan" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* FILTERS & TABLE SECTION */}
      <Card className="rounded-3xl border border-slate-100/80 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Rincian Realisasi Bulanan
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Cari keterangan..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[180px] sm:w-[220px] bg-slate-50 border-none rounded-xl font-medium text-xs h-9 placeholder:text-slate-400"
                />
              </div>

              {/* Filter Tahun */}
              <Select value={filterTahun} onValueChange={setFilterTahun}>
                <SelectTrigger className="w-[110px] bg-slate-50 border-none rounded-xl font-bold text-xs h-9">
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua">Semua Tahun</SelectItem>
                  {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Filter Bulan */}
              <Select value={filterBulan} onValueChange={setFilterBulan}>
                <SelectTrigger className="w-[120px] bg-slate-50 border-none rounded-xl font-bold text-xs h-9">
                  <SelectValue placeholder="Bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua">Semua Bulan</SelectItem>
                  {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Export Buttons */}
              <Button variant="outline" onClick={() => handleExport('xlsx')} className="rounded-xl border-slate-200 hover:bg-slate-50 h-9 p-2.5 text-slate-500">
                <FileSpreadsheet size={15} />
              </Button>
              <Button variant="outline" onClick={handleDownloadTemplate} className="rounded-xl border-slate-200 hover:bg-slate-50 h-9 text-slate-500 text-xs font-bold px-3">
                <Download size={14} className="mr-1" /> Template
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="w-12 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">No</TableHead>
                  <TableHead className="w-32 text-[10px] font-black uppercase tracking-widest text-slate-400">Periode</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Realisasi Program</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Realisasi Gaji</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Realisasi Makan</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/70">Total Realisasi</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 max-w-[200px]">Keterangan</TableHead>
                  <TableHead className="w-24 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-xs font-bold text-slate-400">
                      Memuat data realisasi...
                    </TableCell>
                  </TableRow>
                ) : filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-xs font-bold text-slate-400">
                      Tidak ada data realisasi bulanan ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((item, idx) => {
                    const total = Number(item.program || 0) + Number(item.gaji || 0) + Number(item.makan || 0);
                    return (
                      <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50/40 transition-colors group">
                        <TableCell className="text-center font-mono text-xs text-slate-400">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-xs text-slate-800">{item.bulan}</span>
                            <Badge className="bg-slate-100 text-slate-600 font-mono text-[9px] hover:bg-slate-100 border-none px-1.5 py-0">
                              {item.tahun}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-emerald-600">
                          {formatRupiah(item.program)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-blue-600">
                          {formatRupiah(item.gaji)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-amber-600">
                          {formatRupiah(item.makan)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-slate-800 bg-slate-50/20">
                          {formatRupiah(total)}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 font-medium max-w-[200px] truncate" title={item.keterangan}>
                          {item.keterangan || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleOpenEdit(item)}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 size={14} />
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
        </CardContent>
      </Card>

      {/* ADD / EDIT DIALOG */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="rounded-3xl border-none p-6 sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-800 tracking-tight">
              {editingEntry ? 'Edit Realisasi Bulanan' : 'Input Realisasi Bulanan'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Silakan masukkan data realisasi dana program, gaji, dan makan untuk periode bulanan tertentu.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Tahun</Label>
                <Select value={formTahun} onValueChange={setFormTahun}>
                  <SelectTrigger className="bg-slate-50 border-none rounded-xl font-bold text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Bulan</Label>
                <Select value={formBulan} onValueChange={setFormBulan}>
                  <SelectTrigger className="bg-slate-50 border-none rounded-xl font-bold text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Realisasi Program (Rp)</Label>
              <Input 
                type="number"
                placeholder="cth. 15000000"
                value={formProgram}
                onChange={e => setFormProgram(e.target.value)}
                required
                className="bg-slate-50 border-none rounded-xl font-bold font-mono text-emerald-600 h-10"
              />
              {formProgram && (
                <div className="text-[10px] font-bold text-emerald-600 px-1">
                  Format: {formatRupiah(Number(formProgram))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Realisasi Gaji (Rp)</Label>
              <Input 
                type="number"
                placeholder="cth. 25000000"
                value={formGaji}
                onChange={e => setFormGaji(e.target.value)}
                required
                className="bg-slate-50 border-none rounded-xl font-bold font-mono text-blue-600 h-10"
              />
              {formGaji && (
                <div className="text-[10px] font-bold text-blue-600 px-1">
                  Format: {formatRupiah(Number(formGaji))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Realisasi Makan (Rp)</Label>
              <Input 
                type="number"
                placeholder="cth. 10000000"
                value={formMakan}
                onChange={e => setFormMakan(e.target.value)}
                required
                className="bg-slate-50 border-none rounded-xl font-bold font-mono text-amber-600 h-10"
              />
              {formMakan && (
                <div className="text-[10px] font-bold text-amber-600 px-1">
                  Format: {formatRupiah(Number(formMakan))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Keterangan</Label>
              <Input 
                placeholder="cth. Pengeluaran program, honor, konsumsi harian"
                value={formKeterangan}
                onChange={e => setFormKeterangan(e.target.value)}
                className="bg-slate-50 border-none rounded-xl font-medium text-xs h-10"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="rounded-xl font-black uppercase text-[10px] tracking-widest">
                Batal
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">
                {editingEntry ? 'Simpan' : 'Tambah'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
