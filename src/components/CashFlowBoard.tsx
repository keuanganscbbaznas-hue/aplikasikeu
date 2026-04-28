import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Wallet, ArrowDownRight, ArrowUpRight, Target } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Papa from 'papaparse';

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1i5cIa8XjrvwF57C8ntrH5fDpgLyppguw3K1sI1VKjXU/export?format=csv&gid=0";

const monthMap: Record<string, number> = { 
  'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'mei': 5, 'jun': 6, 
  'jul': 7, 'agu': 8, 'aug': 8, 'sep': 9, 'okt': 10, 'oct': 10, 'nov': 11, 'des': 12, 'dec': 12
};

const parseRupiah = (val: string) => {
  if (!val) return 0;
  return Number(val.replace(/\./g, '').trim()) || 0;
};

export const CashFlowBoard = ({ sheetGid }: { sheetGid: string }) => {
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear().toString());
  const [rawData, setRawData] = React.useState<any[][]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    const SHEET_URL = `/api/sheets/proxy_csv?spreadsheetId=1i5cIa8XjrvwF57C8ntrH5fDpgLyppguw3K1sI1VKjXU&gid=${sheetGid}`;
    
    Papa.parse(SHEET_URL, {
      download: true,
      complete: (results) => {
        setRawData(results.data as any[][]);
        setLoading(false);
      },
      error: (error) => {
        console.error("Error fetching Google Sheet:", error);
        setLoading(false);
      }
    });
  }, [sheetGid]);

  const { data, totalPengeluaran, totalPenerimaan, saldo, availableYears } = React.useMemo(() => {

    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const chartData = months.map(m => ({
      name: new Date(2000, m - 1).toLocaleString('id-ID', { month: 'short' }),
      pengeluaran: 0,
      penerimaan: 0,
    }));

    let totalPengel = 0;
    let totalPener = 0;
    let currentSaldo = 0;
    const yearsSet = new Set<string>();

    if (rawData.length > 5) {
      // Find initial saldo
      let saldoAwal = 0;
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        if (rawData[i][6]?.includes('Saldo Awal')) {
          saldoAwal = parseRupiah(rawData[i][9]);
          break;
        }
      }
      currentSaldo += saldoAwal;

      // Extract rows
      const rows = rawData.slice(2); // Skip header and saldo awal
      rows.forEach(row => {
        if (!row || row.length < 9) return;
        
        const tgl = row[1];
        if (!tgl) return;
        
        let monthNum = 0;
        let yearFull = selectedYear;

        // Try parsing variations like 9/Jan/26, 09-01-2026, 9 Jan 2026
        const parts = tgl.split(/[\/\- ]/);
        if (parts.length >= 3) {
          const mText = parts[1].toLowerCase();
          const yText = parts[2];
          
          if (isNaN(Number(mText))) {
            monthNum = monthMap[mText] || monthMap[mText.substring(0,3)] || 0;
          } else {
            monthNum = Number(mText);
          }

          if (yText.length === 2) {
            yearFull = "20" + yText;
          } else if (yText.length === 4) {
            yearFull = yText;
          }
        } else {
          const d = new Date(tgl);
          if (!isNaN(d.getTime())) {
             monthNum = d.getMonth() + 1;
             yearFull = d.getFullYear().toString();
          }
        }

        yearsSet.add(yearFull);

        const penerimaan = parseRupiah(row[7]);
        const pengeluaran = parseRupiah(row[8]);
        
        totalPener += penerimaan;
        totalPengel += pengeluaran;

        if (yearFull === selectedYear && monthNum) {
          chartData[monthNum - 1].penerimaan += penerimaan;
          chartData[monthNum - 1].pengeluaran += pengeluaran;
        }
      });

      // Saldo Akhir based on the last row's Saldo Akhir column if present, or computed
      let lastValidSaldo = 0;
      for (let i = rawData.length - 1; i >= 0; i--) {
        const s = parseRupiah(rawData[i][9]);
        if (s > 0 || (rawData[i][9] && rawData[i][9].trim() !== '')) {
           lastValidSaldo = s;
           break;
        }
      }
      if (lastValidSaldo !== 0) {
        currentSaldo = lastValidSaldo;
      } else {
        currentSaldo = saldoAwal + totalPener - totalPengel;
      }
    }

    // Default current year if none available
    if (yearsSet.size === 0) yearsSet.add(new Date().getFullYear().toString());

    return {
      data: chartData,
      totalPengeluaran: totalPengel,
      totalPenerimaan: totalPener,
      saldo: currentSaldo,
      availableYears: Array.from(yearsSet).sort((a, b) => Number(b) - Number(a))
    };
  }, [rawData, selectedYear]);

  // Total in cards should reflect the selected year for penerimaan/pengeluaran
  const yearPengeluaran = data.reduce((sum, d) => sum + d.pengeluaran, 0);
  const yearPenerimaan = data.reduce((sum, d) => sum + d.penerimaan, 0);

  if (loading) {
    return <div className="h-[400px] flex items-center justify-center text-slate-400">Memuat Data Buku Kas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Aktual</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${saldo < 0 ? 'text-red-500' : ''}`}>
              Rp {saldo.toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengeluaran ({selectedYear})</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {yearPengeluaran.toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Penerimaan ({selectedYear})</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {yearPenerimaan.toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="h-[400px]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Arus Kas</CardTitle>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px] h-8 text-xs font-semibold">
              <SelectValue placeholder="Pilih Tahun" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`} />
              <Legend />
              <Bar dataKey="penerimaan" name="Penerimaan" fill="#10b981" />
              <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
