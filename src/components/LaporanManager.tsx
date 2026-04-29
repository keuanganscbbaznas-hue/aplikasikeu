import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { FileText, Plus, Search, ExternalLink } from 'lucide-react';

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

// Dummy initial data to show chart
const initialData = [
  { id: 1, month: 'Januari', year: '2026', amount: 15000000, date: '2026-01-25', bastLink: 'https://example.com/bast1' },
  { id: 2, month: 'Februari', year: '2026', amount: 18000000, date: '2026-02-24', bastLink: 'https://example.com/bast2' },
  { id: 3, month: 'Maret', year: '2026', amount: 21000000, date: '2026-03-25', bastLink: 'https://example.com/bast3' },
];

export const LaporanManager = () => {
  const [data, setData] = useState(initialData);
  const [month, setMonth] = useState('April');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [amount, setAmount] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [bastLink, setBastLink] = useState('');

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
        <CardHeader>
          <CardTitle className="text-xl font-black text-slate-800">Daftar Laporan</CardTitle>
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
