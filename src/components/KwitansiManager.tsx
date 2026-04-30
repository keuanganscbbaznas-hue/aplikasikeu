import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDown, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

export const KwitansiManager = () => {
  const [dibayarkanKepada, setDibayarkanKepada] = useState('');
  const [uangSejumlah, setUangSejumlah] = useState('');
  const [untukPembayaran, setUntukPembayaran] = useState('');
  const [kota, setKota] = useState('Bogor');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [namaPenerima, setNamaPenerima] = useState('');
  const [jabatanPenerima, setJabatanPenerima] = useState('');

  const kwitansiRef = useRef<HTMLDivElement>(null);

  const formatRupiah = (value: string) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(Number(value));
  };

  const generatePDF = async () => {
    const doc = new jsPDF('l', 'mm', 'a5');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Border
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

    // Header
    doc.rect(5, 5, pageWidth - 10, 25);
    doc.setFontSize(14);
    doc.text('SEKOLAH CENDEKIA BAZNAS', 50, 15);
    doc.setFontSize(8);
    doc.text('Jl. KH. Umar Cirangkong Ds. Cemplang', 50, 20);
    doc.text('Kec. Cibungbulang Kab. Bogor, Jawa Barat', 50, 24);

    // Title
    doc.setFontSize(16);
    doc.text('Kwitansi', pageWidth / 2, 40, { align: 'center' });
    doc.line(70, 42, 140, 42);

    // Content
    doc.setFontSize(10);
    doc.text(`Dibayarkan kepada : ${dibayarkanKepada}`, 20, 55);
    doc.line(55, 56, 190, 56);
    
    doc.text(`Uang Sejumlah      : ${uangSejumlah ? formatRupiah(uangSejumlah) : ''}`, 20, 65);
    doc.line(55, 66, 190, 66);
    
    doc.text(`Untuk Pembayaran   : ${untukPembayaran}`, 20, 75);
    doc.line(55, 76, 190, 76);

    // Signature
    doc.text(`${kota}, ${new Date(tanggal).toLocaleDateString('id-ID')}`, 150, 95);
    doc.text(jabatanPenerima ? jabatanPenerima : 'Penerima', 150, 100);
    doc.text(namaPenerima ? namaPenerima : '..................', 150, 125);
    
    // Total
    doc.setFontSize(12);
    doc.text(`Rp. ${uangSejumlah ? Number(uangSejumlah).toLocaleString('id-ID') : ''}`, 20, 100);
    doc.rect(20, 95, 60, 10);
    
    doc.save(`Kwitansi_${dibayarkanKepada}.pdf`);
    toast.success('Kwitansi berhasil didownload');
  };

  return (
    <div className="space-y-6 bg-slate-50/50 p-2 md:p-6 rounded-[2.5rem]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Kwitansi Keuangan</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Buat dan cetak kwitansi resmi.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-3xl border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black text-slate-800">Form Request Kwitansi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Dibayarkan kepada</Label>
              <Input value={dibayarkanKepada} onChange={e => setDibayarkanKepada(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Uang Sejumlah (Nominal)</Label>
              <Input type="number" value={uangSejumlah} onChange={e => setUangSejumlah(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Untuk Pembayaran</Label>
              <Input value={untukPembayaran} onChange={e => setUntukPembayaran(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kota</Label>
                <Input value={kota} onChange={e => setKota(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Penerima (Ttd)</Label>
                <Input value={namaPenerima} onChange={e => setNamaPenerima(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Jabatan Penerima</Label>
                <Input value={jabatanPenerima} onChange={e => setJabatanPenerima(e.target.value)} />
              </div>
            </div>
            <Button onClick={generatePDF} className="w-full mt-4 font-bold bg-emerald-600 hover:bg-emerald-700 rounded-xl">
              <FileDown className="mr-2" size={16} /> Download Kwitansi PDF
            </Button>
          </CardContent>
        </Card>

        {/* Preview area could be added here later */}
      </div>
    </div>
  );
};
