import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Wallet, ArrowDownRight, ArrowUpRight, Target } from 'lucide-react';
import Papa from 'papaparse';

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1i5cIa8XjrvwF57C8ntrH5fDpgLyppguw3K1sI1VKjXU/export?format=csv&gid=0";

const monthMap: Record<string, number> = { 
  'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'Mei': 5, 'Jun': 6, 
  'Jul': 7, 'Agu': 8, 'Sep': 9, 'Okt': 10, 'Nov': 11, 'Des': 12 
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

  const { data, totalPengeluaran, totalPenerimaan, saldo } = React.useMemo(() => {

    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const chartData = months.map(m => ({
      name: new Date(2000, m - 1).toLocaleString('id-ID', { month: 'short' }),
      pengeluaran: 0,
      penerimaan: 0,
    }));

    let totalPengel = 0;
    let totalPener = 0;
    let currentSaldo = 0;

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
        
        const parts = tgl.split('/');
        if (parts.length === 3) {
          const mText = parts[1];
          const yText = parts[2];
          const monthNum = monthMap[mText];
          const yearFull = "20" + yText;

          const penerimaan = parseRupiah(row[7]);
          const pengeluaran = parseRupiah(row[8]);
          
          // Add to global totals regardless of selected year, so balance matches reality?
          // Or should total cards just be for the selected year?
          // The prompt screenshot shows saldo as overall running balance usually, but let's calculate for selected year to match chart, or global.
          // Usually a dashboard like this shows absolute current bank balance, but year specific income/expense.
          totalPener += penerimaan;
          totalPengel += pengeluaran;

          if (yearFull === selectedYear && monthNum) {
            chartData[monthNum - 1].penerimaan += penerimaan;
            chartData[monthNum - 1].pengeluaran += pengeluaran;
          }
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

    return {
      data: chartData,
      totalPengeluaran: totalPengel,
      totalPenerimaan: totalPener,
      saldo: currentSaldo
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
        <CardHeader>
          <CardTitle>Arus Kas {selectedYear}</CardTitle>
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
