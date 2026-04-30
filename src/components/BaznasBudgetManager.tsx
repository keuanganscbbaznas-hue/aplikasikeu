import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  addDoc,
  deleteDoc,
  updateDoc,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, BaznasBudget } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, Calendar, FileText, Download, Upload, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import jsPDF from 'jspdf';

export function BaznasBudgetManager({ profile, userUid }: { profile: UserProfile | null, userUid: string }) {
  const [budgets, setBudgets] = useState<BaznasBudget[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [program, setProgram] = useState('');
  const [operasional, setOperasional] = useState('');
  const [makan, setMakan] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('PENDING');
  
  const [chartYear, setChartYear] = useState(new Date().getFullYear().toString());

  // Filter states
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'baznas_budgets'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const budgetData: BaznasBudget[] = [];
      snapshot.forEach((doc) => {
        budgetData.push({ id: doc.id, ...doc.data() } as BaznasBudget);
      });
      setBudgets(budgetData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'baznas_budgets');
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!month || !year || !program || !operasional || !makan) {
      toast.error('Mohon lengkapi semua field yang wajib');
      return;
    }

    setIsSubmitting(true);
    try {
      const numProgram = parseFloat(program.toString().replace(/[^0-9.-]+/g,"")) || 0;
      const numOperasional = parseFloat(operasional.toString().replace(/[^0-9.-]+/g,"")) || 0;
      const numMakan = parseFloat(makan.toString().replace(/[^0-9.-]+/g,"")) || 0;
      const total = numProgram + numOperasional + numMakan;

      if (editingId) {
        await updateDoc(doc(db, 'baznas_budgets', editingId), {
          month,
          year,
          program: numProgram,
          operasional: numOperasional,
          makan: numMakan,
          total,
          description,
          status,
          updatedAt: serverTimestamp()
        });
        toast.success('Pengajuan anggaran BAZNAS berhasil diupdate');
      } else {
        await addDoc(collection(db, 'baznas_budgets'), {
          month,
          year,
          program: numProgram,
          operasional: numOperasional,
          makan: numMakan,
          total,
          description,
          status,
          submittedBy: userUid,
          submittedByName: profile?.displayName || 'User',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success('Pengajuan anggaran BAZNAS berhasil dibuat');
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(editingId ? 'Gagal mengupdate pengajuan' : 'Gagal membuat pengajuan anggaran');
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'baznas_budgets');
    } finally {
      setIsSubmitting(false);
      setEditingId(null);
    }
  };

  const resetForm = () => {
    setMonth('');
    setProgram('');
    setOperasional('');
    setMakan('');
    setDescription('');
    setStatus('PENDING');
    setEditingId(null);
  };

  const handleEdit = (b: BaznasBudget) => {
    setEditingId(b.id);
    setMonth(b.month);
    setYear(b.year);
    setProgram(b.program.toString());
    setOperasional(b.operasional.toString());
    setMakan(b.makan.toString());
    setDescription(b.description || '');
    setStatus(b.status || 'PENDING');
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus pengajuan ini?')) return;
    try {
      await deleteDoc(doc(db, 'baznas_budgets', id));
      toast.success('Pengajuan berhasil dihapus');
    } catch (error) {
      toast.error('Gagal menghapus');
      handleFirestoreError(error, OperationType.DELETE, 'baznas_budgets');
    }
  };

  const handleExportCSV = () => {
    const csvData = budgets.map(b => ({
      Bulan: b.month,
      Tahun: b.year,
      Program: b.program,
      Operasional: b.operasional,
      Makan: b.makan,
      Total: b.total,
      Keterangan: b.description || '',
      Status: b.status,
      DibuatOleh: b.submittedByName
    }));
    const csvString = Papa.unparse(csvData);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Anggaran_BAZNAS_${new Date().getTime()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
    const templateData = [{
      Bulan: 'Januari',
      Tahun: new Date().getFullYear().toString(),
      Program: 15000000,
      Operasional: 5000000,
      Makan: 8000000,
      Keterangan: 'Contoh pengajuan anggaran program binaan'
    }];
    const csvString = Papa.unparse(templateData);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Template_Import_Anggaran_BAZNAS.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const imports = results.data as any[];
          for (const row of imports) {
            const numProgram = parseFloat(row.Program) || 0;
            const numOperasional = parseFloat(row.Operasional) || 0;
            const numMakan = parseFloat(row.Makan) || 0;
            const total = numProgram + numOperasional + numMakan;
            
            if (!row.Bulan || !row.Tahun) continue;

            await addDoc(collection(db, 'baznas_budgets'), {
              month: row.Bulan,
              year: row.Tahun,
              program: numProgram,
              operasional: numOperasional,
              makan: numMakan,
              total,
              description: row.Keterangan || '',
              status: row.Status || 'PENDING',
              submittedBy: userUid,
              submittedByName: profile?.displayName || 'User',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
          toast.success("Berhasil mengimpor data anggaran");
        } catch (error) {
          console.error("Import error:", error);
          toast.error("Gagal mengimpor sebagian data");
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
          setIsSubmitting(false);
        }
      },
      error: () => {
        toast.error("Gagal membaca file CSV");
        setIsSubmitting(false);
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const chartData = months.map(m => {
    const reports = budgets.filter(b => b.month === m && b.year === chartYear);
    const program = reports.reduce((sum, b) => sum + (b.program || 0), 0);
    const operasional = reports.reduce((sum, b) => sum + (b.operasional || 0), 0);
    const makan = reports.reduce((sum, b) => sum + (b.makan || 0), 0);
    return {
      month: m.substring(0, 3),
      fullMonth: m,
      Program: program,
      Operasional: operasional,
      Makan: makan,
      Total: program + operasional + makan
    };
  });

  const filteredBudgets = budgets.filter(b => {
    const passMonth = filterMonth === 'all' || b.month === filterMonth;
    const passYear = filterYear === 'all' || b.year === filterYear;
    return passMonth && passYear;
  });

  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!pdfContainerRef.current) return;
    setIsExportingPDF(true);
    toast.info('Menyiapkan file PDF...', { duration: 2000 });
    
    try {
      // Small delay to allow React to render any hidden elements if needed
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(pdfContainerRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = 210; // A4 width in mm
      const elWidth = pdfContainerRef.current.offsetWidth;
      const elHeight = pdfContainerRef.current.offsetHeight;
      const pdfHeight = (elHeight * pdfWidth) / elWidth;
      
      // If content is longer than page, it will be single long page or scaled down
      // Here we just add it to the first page (scaled to width)
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Laporan_Anggaran_BAZNAS_${chartYear}.pdf`);
      toast.success('Berhasil mendownload PDF');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Gagal mendownload PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pengajuan Anggaran BAZNAS</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Input rencana anggaran program, operasional, dan makan.</p>
        </div>
        
        <div className="flex items-center gap-2">
          {!isExportingPDF && (
            <>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleImportCSV}
                className="hidden"
              />
              <Button 
                variant="outline" 
                onClick={handleDownloadTemplate}
                className="font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl hidden md:flex"
              >
                <FileText className="mr-2" size={16} /> Template
              </Button>
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl hidden md:flex"
              >
                <Upload className="mr-2" size={16} /> Import
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDownloadPDF}
                className="font-bold border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl"
                disabled={budgets.length === 0 || isExportingPDF}
              >
                <FileDown className="mr-2" size={16} /> {isExportingPDF ? 'Proses...' : 'PDF'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportCSV}
                className="font-bold border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl"
                disabled={budgets.length === 0}
              >
                <Download className="mr-2" size={16} /> Ekspor
              </Button>
    
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger render={
                  <Button className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20" />
                }>
                  <Plus className="mr-2" size={18} /> Buat Pengajuan
                </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] border-none shadow-2xl rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-800">
                {editingId ? 'Edit Pengajuan Anggaran' : 'Form Pengajuan Anggaran'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Bulan</Label>
                  <Select value={month} onValueChange={setMonth} required>
                    <SelectTrigger className="rounded-xl border-slate-200">
                      <SelectValue placeholder="Pilih Bulan" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Tahun</Label>
                  <Select value={year} onValueChange={setYear} required>
                    <SelectTrigger className="rounded-xl border-slate-200">
                      <SelectValue placeholder="Pilih Tahun" />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2].map(offset => {
                        const y = (new Date().getFullYear() + offset).toString();
                        return <SelectItem key={y} value={y}>{y}</SelectItem>
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Anggaran Program (Rp)</Label>
                <Input 
                  type="text" 
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  placeholder="Contoh: 15000000"
                  className="rounded-xl border-slate-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Anggaran Operasional (Rp)</Label>
                <Input 
                  type="text" 
                  value={operasional}
                  onChange={(e) => setOperasional(e.target.value)}
                  placeholder="Contoh: 10000000"
                  className="rounded-xl border-slate-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Anggaran Makan (Rp)</Label>
                <Input 
                  type="text" 
                  value={makan}
                  onChange={(e) => setMakan(e.target.value)}
                  placeholder="Contoh: 8000000"
                  className="rounded-xl border-slate-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Keterangan / Deskripsi</Label>
                <Input 
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Catatan tambahan..."
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Status Pengajuan</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="rounded-xl border-slate-200">
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">PENDING</SelectItem>
                    <SelectItem value="SUDAH DI AJUKAN">SUDAH DI AJUKAN</SelectItem>
                    <SelectItem value="SUDAH DI TRANSFER">SUDAH DI TRANSFER</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/20 mt-4">
                {isSubmitting ? 'Menyimpan...' : (editingId ? 'Update Pengajuan' : 'Simpan Pengajuan')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </>
        )}
        </div>
      </div>

      <div ref={pdfContainerRef} className="bg-slate-50/50 p-2 md:p-6 rounded-[2.5rem]">
        <Card className="rounded-3xl border-slate-100 shadow-sm mb-6 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-black text-slate-800">
              Bagan Pengajuan Anggaran {chartYear}
            </CardTitle>
            {!isExportingPDF && (
              <div className="w-32">
                <Select value={chartYear} onValueChange={setChartYear}>
                  <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Pilih Tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2].map(offset => {
                      const y = (new Date().getFullYear() + offset).toString();
                      return <SelectItem key={y} value={y}>{y}</SelectItem>
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                    tickFormatter={(value) => `Rp ${value / 1000000}Jt`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#F8FAFC' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    formatter={(value: number, name: string) => [`Rp ${value.toLocaleString('id-ID')}`, name]}
                    labelStyle={{ fontWeight: 'bold', color: '#0F172A', marginBottom: '8px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '20px' }} />
                  <Bar dataKey="Program" stackId="a" fill="#0ea5e9" radius={[0, 0, 4, 4]} barSize={32} />
                  <Bar dataKey="Operasional" stackId="a" fill="#f59e0b" barSize={32} />
                  <Bar dataKey="Makan" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {!isExportingPDF && (
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="w-full md:w-48">
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="rounded-xl bg-white border-slate-200 shadow-sm font-medium">
                  <SelectValue placeholder="Filter Bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bulan</SelectItem>
                  {months.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="rounded-xl bg-white border-slate-200 shadow-sm font-medium">
                  <SelectValue placeholder="Filter Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahun</SelectItem>
                  {[0, 1, 2].map(offset => {
                    const y = (new Date().getFullYear() + offset).toString();
                    return <SelectItem key={y} value={y}>{y}</SelectItem>
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="bg-white/80 rounded-[2rem] border border-slate-100 shadow-sm p-4 md:p-6 min-h-[400px]">
          {filteredBudgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center">
              <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <FileText className="text-slate-300" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Tidak ada pengajuan</h3>
              <p className="text-slate-500 mt-1 max-w-sm">Data pengajuan anggaran tidak ditemukan untuk filter ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBudgets.map((b) => (
                <Card key={b.id} className="rounded-2xl border-slate-100 shadow-sm bg-white hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3 border-b border-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 font-bold text-xs">
                        <Calendar size={14} />
                        {b.month} {b.year}
                      </div>
                      {b.status === 'PENDING' && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Pending</span>}
                      {b.status === 'SUDAH DI AJUKAN' && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Sudah Diajukan</span>}
                      {b.status === 'SUDAH DI TRANSFER' && <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Sudah Ditransfer</span>}
                      {/* Fallback for old lowercase statuses */}
                      {b.status === 'pending' && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Pending</span>}
                      {b.status === 'approved' && <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Approved</span>}
                    </div>
                    <CardTitle className="text-lg mt-3 flex items-center gap-2">
                      {formatCurrency(b.total)}
                    </CardTitle>
                    {b.description && <CardDescription className="line-clamp-1">{b.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 pb-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Program</span>
                      <span className="font-bold text-slate-700">{formatCurrency(b.program)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Operasional</span>
                      <span className="font-bold text-slate-700">{formatCurrency(b.operasional)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Makan</span>
                      <span className="font-bold text-slate-700">{formatCurrency(b.makan)}</span>
                    </div>
                    <div className="pt-3 border-t flex items-center justify-between">
                      <span className="text-xs text-slate-400">Oleh: {b.submittedByName}</span>
                      {!isExportingPDF && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(b)} className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg shrink-0">
                            <Edit2 size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(b.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg shrink-0">
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
