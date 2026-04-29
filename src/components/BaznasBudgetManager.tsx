import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  addDoc,
  deleteDoc,
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
import { Plus, Trash2, Calendar, FileText, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

export function BaznasBudgetManager({ profile, userUid }: { profile: UserProfile | null, userUid: string }) {
  const [budgets, setBudgets] = useState<BaznasBudget[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [program, setProgram] = useState('');
  const [operasional, setOperasional] = useState('');
  const [makan, setMakan] = useState('');
  const [description, setDescription] = useState('');

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
      const numProgram = parseFloat(program.replace(/[^0-9.-]+/g,"")) || 0;
      const numOperasional = parseFloat(operasional.replace(/[^0-9.-]+/g,"")) || 0;
      const numMakan = parseFloat(makan.replace(/[^0-9.-]+/g,"")) || 0;
      const total = numProgram + numOperasional + numMakan;

      await addDoc(collection(db, 'baznas_budgets'), {
        month,
        year,
        program: numProgram,
        operasional: numOperasional,
        makan: numMakan,
        total,
        description,
        status: 'pending',
        submittedBy: userUid,
        submittedByName: profile?.displayName || 'User',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast.success('Pengajuan anggaran BAZNAS berhasil dibuat');
      setIsDialogOpen(false);
      
      // Reset form
      setMonth('');
      setProgram('');
      setOperasional('');
      setMakan('');
      setDescription('');
    } catch (error) {
      toast.error('Gagal membuat pengajuan anggaran');
      handleFirestoreError(error, OperationType.CREATE, 'baznas_budgets');
    } finally {
      setIsSubmitting(false);
    }
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
              status: row.Status || 'pending',
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pengajuan Anggaran BAZNAS</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Input rencana anggaran program, operasional, dan makan.</p>
        </div>
        
        <div className="flex items-center gap-2">
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
            className="font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl"
          >
            <Upload className="mr-2" size={16} /> Import
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportCSV}
            className="font-bold border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl"
            disabled={budgets.length === 0}
          >
            <Download className="mr-2" size={16} /> Ekspor
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20" />}>
              <Plus className="mr-2" size={18} /> Buat Pengajuan
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] border-none shadow-2xl rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-800">Form Pengajuan Anggaran</DialogTitle>
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

              <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/20 mt-4">
                {isSubmitting ? 'Menyimpan...' : 'Simpan Pengajuan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 md:p-6 min-h-[400px]">
        {budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="text-slate-300" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Belum ada pengajuan</h3>
            <p className="text-slate-500 mt-1 max-w-sm">Anda belum membuat pengajuan anggaran apapun untuk BAZNAS.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgets.map((b) => (
              <Card key={b.id} className="rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 border-b border-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 font-bold text-xs">
                      <Calendar size={14} />
                      {b.month} {b.year}
                    </div>
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
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(b.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg shrink-0">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
