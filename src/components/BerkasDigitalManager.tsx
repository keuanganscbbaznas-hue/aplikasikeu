
import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderOpen, ExternalLink, Download, Plus } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { db } from '@/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

export const BerkasDigitalManager = () => {
  const [links, setLinks] = useState<any[]>([]);
  const [tahun, setTahun] = useState('2026');
  const [bulan, setBulan] = useState('Januari');
  const [link, setLink] = useState('');

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

  const handleDownload = (item: any) => {
    const data = [{ Tahun: item.tahun, Bulan: item.bulan, Link: item.link }];
    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Berkas");
    writeFile(workbook, `Berkas_${item.tahun}_${item.bulan}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tambah Link Berkas Digital</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-4">
            <Select value={tahun} onValueChange={setTahun}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['2022', '2023', '2024', '2025', '2026'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={bulan} onValueChange={setBulan}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Link Google Drive" value={link} onChange={e => setLink(e.target.value)} required />
            <Button type="submit"><Plus size={16} className="mr-2" /> Tambah</Button>
          </form>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {links.map((item) => (
          <Card key={item.id} className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-lg font-black tracking-tight">{item.tahun} - {item.bulan}</CardTitle>
              <FolderOpen className="h-5 w-5 text-emerald-600" />
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
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4 w-full text-xs font-bold"
                onClick={() => handleDownload(item)}
              >
                <Download size={14} className="mr-2" /> Download Rekap (Excel)
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
