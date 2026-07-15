
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderOpen, ExternalLink, Download, Plus, Upload, FileDown, Edit, Trash2 } from 'lucide-react';
import { utils, writeFile, read } from 'xlsx';
import { db } from '@/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const YEARS = ['2024', '2025', '2026'];

export const BerkasDigitalManager = () => {
  const [links, setLinks] = useState<any[]>([]);
  const [tahun, setTahun] = useState('2026');
  const [bulan, setBulan] = useState('Januari');
  const [link, setLink] = useState('');
  
  const [filterTahun, setFilterTahun] = useState('Semua');
  const [filterBulan, setFilterBulan] = useState('Semua');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editTahun, setEditTahun] = useState('');
  const [editBulan, setEditBulan] = useState('');
  const [editLink, setEditLink] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'berkas_digital'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(doc => data.push({id: doc.id, ...doc.data()}));
      setLinks(data);
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'berkas_digital'), {
      tahun,
      bulan,
      link,
      createdAt: serverTimestamp()
    });
    setLink('');
  };

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setEditTahun(item.tahun);
    setEditBulan(item.bulan);
    setEditLink(item.link);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    const itemRef = doc(db, 'berkas_digital', editingItem.id);
    await updateDoc(itemRef, {
      tahun: editTahun,
      bulan: editBulan,
      link: editLink
    });
    setIsEditDialogOpen(false);
    setEditingItem(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus folder ini?')) {
      await deleteDoc(doc(db, 'berkas_digital', id));
    }
  };

  const filteredLinks = links
    .filter(item => {
      return (filterTahun === 'Semua' || item.tahun === filterTahun) &&
             (filterBulan === 'Semua' || item.bulan === filterBulan);
    })
    .sort((a, b) => {
      if (a.tahun !== b.tahun) {
        return parseInt(b.tahun) - parseInt(a.tahun);
      }
      return MONTHS.indexOf(b.bulan) - MONTHS.indexOf(a.bulan);
    });

  const handleExport = (type: 'xlsx' | 'csv') => {
    const data = filteredLinks.map(item => ({ Tahun: item.tahun, Bulan: item.bulan, Link: item.link }));
    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Berkas");
    writeFile(workbook, `Berkas_Digital.${type}`, { bookType: type });
  };

  const handleDownloadTemplate = () => {
    const data = [{ Tahun: '', Bulan: '', Link: '' }];
    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Template");
    writeFile(workbook, `Template_Berkas_Digital.xlsx`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data: any[] = utils.sheet_to_json(ws);

      for (const item of data) {
        if (item.Tahun && item.Bulan && item.Link) {
          await addDoc(collection(db, 'berkas_digital'), {
            tahun: String(item.Tahun),
            bulan: item.Bulan,
            link: item.Link,
            createdAt: serverTimestamp()
          });
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Berkas Digital</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAdd} className="flex gap-4">
            <Select value={tahun} onValueChange={setTahun}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={bulan} onValueChange={setBulan}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Link Google Drive" value={link} onChange={e => setLink(e.target.value)} required />
            <Button type="submit"><Plus size={16} className="mr-2" /> Tambah</Button>
          </form>

          <div className="flex gap-4 items-center pt-4 border-t">
            <Select value={filterTahun} onValueChange={setFilterTahun}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="Tahun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Tahun</SelectItem>
                {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterBulan} onValueChange={setFilterBulan}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Bulan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Bulan</SelectItem>
                {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => handleExport('xlsx')}><FileDown size={16} className="mr-2" /> Export Excel</Button>
            <Button variant="outline" onClick={() => handleExport('csv')}><FileDown size={16} className="mr-2" /> Export CSV</Button>
            <Button variant="outline" onClick={handleDownloadTemplate}><Download size={16} className="mr-2" /> Download Template</Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload size={16} className="mr-2" /> Import</Button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .csv" onChange={handleImport} />
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLinks.map((item) => (
          <Card key={item.id} className="shadow-sm border-slate-100 hover:shadow-md transition-shadow relative group">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-lg font-black tracking-tight">{item.tahun} - {item.bulan}</CardTitle>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                  onClick={() => handleEditClick(item)}
                >
                  <Edit size={14} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 size={14} />
                </Button>
                <FolderOpen className="h-5 w-5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <a 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-700 mt-2"
              >
                Buka Folder Drive <ExternalLink size={14} />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-3xl border-none p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">Edit Folder Digital</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Tahun</label>
                <Select value={editTahun} onValueChange={setEditTahun}>
                  <SelectTrigger className="bg-slate-50 border-none rounded-xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Bulan</label>
                <Select value={editBulan} onValueChange={setEditBulan}>
                  <SelectTrigger className="bg-slate-50 border-none rounded-xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Link Google Drive</label>
              <Input 
                className="bg-slate-50 border-none rounded-xl font-medium"
                value={editLink} 
                onChange={e => setEditLink(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl font-black uppercase text-[10px] tracking-widest">Batal</Button>
            <Button onClick={handleUpdate} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
