import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Landmark, School, Wallet, Plus, Edit2, Trash2, RotateCcw, Save, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from '@/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, getDocs, where } from 'firebase/firestore';
import { toast } from 'sonner';

type NeracaEntry = {
  id: string;
  kode: string;
  nama: string;
  debit: number;
  kredit: number;
  unit: 'smp' | 'sma';
  updatedAt: any;
};

export const NeracaSaldoManager = () => {
  const [selectedUnit, setSelectedUnit] = React.useState<'smp' | 'sma'>('smp');
  const [entries, setEntries] = React.useState<NeracaEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<NeracaEntry | null>(null);

  // Form states
  const [formData, setFormData] = React.useState({
    kode: '',
    nama: '',
    debit: 0,
    kredit: 0,
    unit: 'smp' as 'smp' | 'sma'
  });

  React.useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'neraca_saldo'), where('unit', '==', selectedUnit));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NeracaEntry[];
      
      // Sort by code
      setEntries(docs.sort((a, b) => a.kode.localeCompare(b.kode)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching neraca saldo:", error);
      toast.error("Gagal mengambil data neraca saldo");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedUnit]);

  const handleOpenAddModal = () => {
    setFormData({
      kode: '',
      nama: '',
      debit: 0,
      kredit: 0,
      unit: selectedUnit
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (entry: NeracaEntry) => {
    setEditingEntry(entry);
    setFormData({
      kode: entry.kode,
      nama: entry.nama,
      debit: entry.debit,
      kredit: entry.kredit,
      unit: entry.unit
    });
    setIsEditModalOpen(true);
  };

  const handleSave = async (isEdit: boolean) => {
    try {
      if (!formData.kode || !formData.nama) {
        toast.error("Kode budget dan Nama akun wajib diisi");
        return;
      }

      const payload = {
        ...formData,
        updatedAt: serverTimestamp()
      };

      if (isEdit && editingEntry) {
        await updateDoc(doc(db, 'neraca_saldo', editingEntry.id), payload);
        toast.success("Berhasil memperbaharui akun");
        setIsEditModalOpen(false);
      } else {
        await addDoc(collection(db, 'neraca_saldo'), payload);
        toast.success("Berhasil menambahkan akun baru");
        setIsAddModalOpen(false);
      }
    } catch (error) {
      console.error("Error saving entry:", error);
      toast.error("Gagal menyimpan data");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus akun ini?")) return;
    
    try {
      await deleteDoc(doc(db, 'neraca_saldo', id));
      toast.success("Berhasil menghapus akun");
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error("Gagal menghapus data");
    }
  };

  const handleClearDatabase = async () => {
    if (!confirm("PERINGATAN: Ini akan menghapus SELURUH data Neraca Saldo. Lanjutkan?")) return;
    
    try {
      const q = query(collection(db, 'neraca_saldo'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      toast.success("Database Neraca Saldo berhasil dibersihkan");
    } catch (error) {
      console.error("Error clearing database:", error);
      toast.error("Gagal membersihkan database");
    }
  };

  const totalDebit = entries.reduce((sum, item) => sum + (item.debit || 0), 0);
  const totalKredit = entries.reduce((sum, item) => sum + (item.kredit || 0), 0);
  const totalSaldo = entries.reduce((sum, item) => sum + ((item.debit || 0) - (item.kredit || 0)), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Neraca Saldo</h2>
          <p className="text-sm text-slate-500 font-medium font-inter">Owner Management Interface</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <Button 
            onClick={handleClearDatabase}
            variant="outline" 
            className="h-10 bg-white border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl font-bold text-xs uppercase tracking-tight flex items-center gap-2"
          >
            <RotateCcw size={14} />
            Clean Database
          </Button>

          <Select value={selectedUnit} onValueChange={(val: any) => setSelectedUnit(val)}>
            <SelectTrigger className="w-[180px] h-10 bg-white border-slate-200 shadow-sm rounded-xl font-bold text-xs">
              <div className="flex items-center gap-2">
                {selectedUnit === 'smp' ? <School size={16} /> : <Landmark size={16} />}
                <SelectValue placeholder="Pilih Unit" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="smp" className="font-bold text-xs uppercase">SMP</SelectItem>
              <SelectItem value="sma" className="font-bold text-xs uppercase">SMA</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            onClick={handleOpenAddModal}
            className="h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 px-6"
          >
            <Plus size={16} />
            Input Transaksi
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-inter">
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Debit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-600">
              Rp {totalDebit.toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Kredit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-600">
              Rp {totalKredit.toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-emerald-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">
              Rp {totalSaldo.toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-3xl overflow-hidden font-inter">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-none">
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 py-5 pl-8 w-[150px]">Kode Budget</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 py-5">Nama Akun</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 py-5 text-right w-[180px]">Debit</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 py-5 text-right w-[180px]">Kredit</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 py-5 text-right w-[180px]">Sisa Saldo</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 py-5 text-center w-[100px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell colSpan={6} className="h-16 border-b border-slate-50"></TableCell>
                    </TableRow>
                  ))
                ) : entries.length > 0 ? (
                  entries.map((item, idx) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors border-slate-50 group">
                      <TableCell className="pl-8 font-mono text-[11px] font-bold text-slate-400">{item.kode}</TableCell>
                      <TableCell className="font-black text-[13px] text-slate-700">{item.nama}</TableCell>
                      <TableCell className="text-right font-bold text-[13px] text-blue-600 font-mono">Rp {item.debit.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right font-bold text-[13px] text-rose-600 font-mono">Rp {item.kredit.toLocaleString('id-ID')}</TableCell>
                      <TableCell className={`text-right font-black text-[14px] font-mono ${item.debit - item.kredit < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        Rp {(item.debit - item.kredit).toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-blue-600"
                            onClick={() => handleOpenEditModal(item)}
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-rose-600"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center bg-slate-50/20">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-2">
                          <ClipboardList size={24} />
                        </div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-tighter">Database Kosong</p>
                        <p className="text-[10px] text-slate-400 font-medium max-w-[200px]">Silakan klik "Input Transaksi" untuk mulai mengisi Neraca Saldo.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
        }
      }}>
        <DialogContent className="max-w-md bg-white rounded-3xl border-none shadow-2xl p-0 overflow-hidden font-inter">
          <DialogHeader className="p-8 bg-slate-900 text-white">
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-3">
              {isEditModalOpen ? (
                <>
                  <Edit2 size={20} className="text-blue-400" />
                  Edit Akun Neraca
                </>
              ) : (
                <>
                  <Plus size={20} className="text-emerald-400" />
                  Input Data Neraca
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Unit Kerja</Label>
                <div className="flex gap-2">
                  {['smp', 'sma'].map((u) => (
                    <Button
                      key={u}
                      type="button"
                      variant={formData.unit === u ? 'default' : 'outline'}
                      className={`flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest ${formData.unit === u ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'}`}
                      onClick={() => setFormData(prev => ({ ...prev, unit: u as any }))}
                    >
                      {u === 'smp' ? <School size={16} className="mr-2" /> : <Landmark size={16} className="mr-2" />}
                      {u}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Kode Budget</Label>
                <Input 
                  value={formData.kode}
                  onChange={(e) => setFormData(prev => ({ ...prev, kode: e.target.value }))}
                  placeholder="Contoh: 5.1.01" 
                  className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold text-sm focus:ring-2 focus:ring-slate-900 transition-all px-4"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nama Akun</Label>
                <Input 
                  value={formData.nama}
                  onChange={(e) => setFormData(prev => ({ ...prev, nama: e.target.value }))}
                  placeholder="Nama Akun / Uraian" 
                  className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold text-sm focus:ring-2 focus:ring-slate-900 transition-all px-4"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Debit (Rp)</Label>
                  <Input 
                    type="number"
                    value={formData.debit}
                    onChange={(e) => setFormData(prev => ({ ...prev, debit: Number(e.target.value) }))}
                    className="h-12 bg-slate-50 border-slate-100 rounded-xl font-black text-sm text-blue-600 focus:ring-2 focus:ring-blue-500 transition-all px-4"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Kredit (Rp)</Label>
                  <Input 
                    type="number"
                    value={formData.kredit}
                    onChange={(e) => setFormData(prev => ({ ...prev, kredit: Number(e.target.value) }))}
                    className="h-12 bg-slate-50 border-slate-100 rounded-xl font-black text-sm text-rose-600 focus:ring-2 focus:ring-rose-500 transition-all px-4"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-8 pb-8 flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
              }}
              className="flex-1 h-12 border-slate-200 rounded-xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
            >
              Batal
            </Button>
            <Button 
              onClick={() => handleSave(isEditModalOpen)}
              className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-200"
            >
              <Save size={16} className="mr-2" />
              Simpan Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
