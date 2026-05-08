import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const TEMPLATES = [
  { id: '1', name: 'Formulir Pengajuan Dana UM', description: 'Template baku untuk pengajuan uang muka kegiatan.', category: 'Pengajuan' },
  { id: '2', name: 'Laporan Pertanggungjawaban (LPJ)', description: 'Format laporan realisasi penggunaan dana.', category: 'Pelaporan' },
  { id: '3', name: 'Surat Tugas Perjalanan Dinas', description: 'Dokumen pendukung untuk transportasi dan akomodasi.', category: 'Administrasi' },
  { id: '4', name: 'Formulir Permintaan Kwitansi', description: 'Form internal untuk pengajuan pencetakan kwitansi.', category: 'Keuangan' },
  { id: '5', name: 'Template Berita Acara Serah Terima', description: 'Dokumen bukti serah terima barang/jasa.', category: 'Logistik' },
];

export const DocumentTemplates = () => {
  const [search, setSearch] = React.useState('');

  const filteredTemplates = TEMPLATES.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Template Dokumen Keuangan</h2>
          <p className="text-sm text-slate-500 font-medium">Download template surat dan dokumen standar keuangan.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input 
            placeholder="Cari template..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                  <FileText size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-widest leading-none">
                      {template.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 truncate">{template.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{template.description}</p>
                  
                  <Button variant="outline" size="sm" className="w-full mt-4 rounded-xl gap-2 border-slate-200 group-hover:border-primary group-hover:bg-primary/5 transition-all">
                    <Download size={14} />
                    Download Template
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
           <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
              <Search size={32} />
           </div>
           <h3 className="text-lg font-bold text-slate-800">Tidak ada template ditemukan</h3>
           <p className="text-sm text-slate-500">Coba kata kunci lain.</p>
        </div>
      )}
    </div>
  );
};
