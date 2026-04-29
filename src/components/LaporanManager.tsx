import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { FileText, Plus, Search, ExternalLink, Download, Upload } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

interface Report {
  id: number;
  month: string;
  year: string;
  amount: number;
  date: string;
  bastLink: string;
}

const initialData: Report[] = [];

export const LaporanManager = () => {
  const [data, setData] = useState<Report[]>(initialData);
  const [month, setMonth] = useState('April');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [amount, setAmount] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [bastLink, setBastLink] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!month || !year || !amount || !reportDate || !bastLink) return;
    
    const newReport = {
      id: Date.now(),
      month,
      year,
      amount: parseInt(amount.replace(/\./g, '')),
      date: reportDate,
      bastLink
    };
    
    setData([...data, newReport]);
    setAmount('');
    setReportDate('');
    setBastLink('');
  };

  const handleExportCSV = () => {
    const csvData = data.map(d => ({
      Bulan: d.month,
      Tahun: d.year,
      Nominal: d.amount,
      TanggalLaporan: d.date,
      BuktiBAST: d.bastLink
    }));
    const csvString = Papa.unparse(csvData);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Laporan_BAZNAS_${new Date().getTime()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const imports = results.data as any[];
          const newReports: Report[] = imports.map((row, index) => ({
            id: Date.now() + index,
            month: row.Bulan || '',
            year: row.Tahun || '',
            amount: parseFloat(row.Nominal) || 0,
            date: row.TanggalLaporan || '',
            bastLink: row.BuktiBAST || ''
          })).filter(r => r.month && r.year);
          
          setData(prev => [...prev, ...newReports]);
          toast.success("Berhasil mengimpor data laporan");
        } catch (error) {
          toast.error("Gagal mengimpor data laporan");
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: () => {
        toast.error("Gagal membaca file CSV");
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const chartData = MONTHS.map(m => {
    const report = data.find(d => d.month === m && d.year === year);
    return {
      month: m.substring(0, 3), // short name
      fullMonth: m,
      total: report ? report.amount : 0
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Input Form */}
        <div className="lg:col-span-1">
          <Card className="rounded-3xl border-slate-100 shadow-sm h-full">
            <CardHeader>
              <CardTitle className="text-xl font-black text-slate-800">Input Laporan</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500">Bulan Laporan</Label>
                    <Select value={month} onValueChange={setMonth}>
                      <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Pilih Bulan" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500">Tahun</Label>
                    <Input 
                      type="number" 
                      value={year} 
                      onChange={e => setYear(e.target.value)}
                      className="rounded-xl bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Nominal Laporan (Rp)</Label>
                  <Input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Contoh: 15000000"
                    className="rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Tanggal Laporan</Label>
                  <Input 
                    type="date" 
                    value={reportDate} 
                    onChange={e => setReportDate(e.target.value)}
                    className="rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500">Link Bukti BAST</Label>
                  <Input 
                    type="url" 
                    value={bastLink} 
                    onChange={e => setBastLink(e.target.value)}
                    placeholder="https://..."
                    className="rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>

                <Button type="submit" className="w-full mt-2 font-bold bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                  Simpan Laporan
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Chart Illustration */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-3xl border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black text-slate-800 flex justify-between items-center">
                Bagan Realisasi Laporan {year}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }}
                      tickFormatter={(value) => `Rp ${value / 1000000}Jt`}
                    />
                    <Tooltip 
                      cursor={{ fill: '#F1F5F9' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Total Laporan']}
                    />
                    <Bar 
                      dataKey="total" 
                      fill="#0ea5e9" // sky-500
                      radius={[4, 4, 0, 0]} 
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Table */}
      <Card className="rounded-3xl border-slate-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-black text-slate-800">Daftar Laporan</CardTitle>
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
              className="font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl"
            >
              <Upload className="mr-2" size={16} /> Import
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportCSV}
              className="font-bold border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl"
              disabled={data.length === 0}
            >
              <Download className="mr-2" size={16} /> Ekspor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-xs text-slate-500">Bulan / Tahun</TableHead>
                  <TableHead className="font-bold text-xs text-slate-500">Tanggal Laporan</TableHead>
                  <TableHead className="font-bold text-xs text-slate-500">Nominal</TableHead>
                  <TableHead className="font-bold text-xs text-slate-500 text-center">Bukti BAST</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold text-sm">
                      {item.month} {item.year}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {new Date(item.date).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="font-bold text-sm text-slate-800">
                      Rp {item.amount.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-center">
                      <a 
                        href={item.bastLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Lihat <ExternalLink size={12} />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-slate-500 font-medium">
                      Belum ada data laporan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
