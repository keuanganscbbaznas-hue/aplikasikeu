import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ComposedChart } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export function AnalisisManager() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [year, setYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    const qBudgets = query(collection(db, 'baznas_budgets'), orderBy('createdAt', 'desc'));
    const unsubBudgets = onSnapshot(qBudgets, (snap) => {
        const data: any[] = [];
        snap.forEach(doc => data.push({id: doc.id, ...doc.data()}));
        setBudgets(data);
    });

    const qReports = query(collection(db, 'laporan_baznas'), orderBy('createdAt', 'desc'));
    const unsubReports = onSnapshot(qReports, (snap) => {
        const data: any[] = [];
        snap.forEach(doc => data.push({id: doc.id, ...doc.data()}));
        setReports(data);
    });

    return () => { unsubBudgets(); unsubReports(); };
  }, []);

  const chartData = MONTHS.map(m => {
    const mBudgets = budgets.filter(b => b.month === m && b.year === year);
    const mReports = reports.filter(r => r.month === m && r.year === year);
    
    const totalBudget = mBudgets.reduce((sum, b) => sum + (b.program || 0) + (b.operasional || 0), 0);
    const totalReport = mReports.reduce((sum, r) => sum + (r.amount || 0), 0);
    
    return {
      month: m.substring(0, 3),
      Pencairan: totalBudget,
      Laporan: totalReport
    };
  });

  const totalPencairan = chartData.reduce((sum, d) => sum + d.Pencairan, 0);
  const totalLaporan = chartData.reduce((sum, d) => sum + d.Laporan, 0);

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-slate-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-black text-slate-800">Realisasi Pencairan dan Laporan PertUM</CardTitle>
          <div className="w-32">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200">
                <SelectValue placeholder="Pilih Tahun" />
              </SelectTrigger>
              <SelectContent>
                {['2024', '2025', '2026'].map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 40, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                  tickFormatter={(value) => `Rp ${value / 1000000}Jt`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, '']}
                />
                <Legend iconType="circle" />
                <Bar dataKey="Pencairan" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={32} />
                <Bar dataKey="Laporan" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-amber-50 rounded-2xl">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Total Pencairan</p>
                <p className="text-xl font-black text-amber-900">Rp {totalPencairan.toLocaleString('id-ID')}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Total Laporan PertUM</p>
                <p className="text-xl font-black text-emerald-900">Rp {totalLaporan.toLocaleString('id-ID')}</p>
            </div>
            <div className="p-4 bg-rose-50 rounded-2xl col-span-2">
                <p className="text-xs font-bold text-rose-600 uppercase tracking-widest">Sisa Laporan</p>
                <p className="text-xl font-black text-rose-900">Rp {(totalPencairan - totalLaporan).toLocaleString('id-ID')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
