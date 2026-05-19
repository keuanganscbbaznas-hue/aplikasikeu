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
  if (!val || typeof val !== 'string') return 0;
  
  let isNegative = false;
  let cleaned = val.trim();
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    isNegative = true;
    cleaned = cleaned.slice(1, -1);
  }
  if (cleaned.startsWith('-')) {
    isNegative = true;
    cleaned = cleaned.slice(1);
  }

  // Identify if there's a decimal part (Indonesian uses comma, English uses dot)
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  
  // If there's a comma near the end, and it's after any dot, it's likely Indonesian decimal
  if (lastComma > lastDot && lastComma > cleaned.length - 4) {
    cleaned = cleaned.substring(0, lastComma);
  } 
  // If there's a dot near the end, and it's after any comma, it's likely English decimal
  else if (lastDot > lastComma && lastDot > cleaned.length - 4) {
    cleaned = cleaned.substring(0, lastDot);
  }

  cleaned = cleaned.replace(/[^0-9]/g, '');
  const num = Number(cleaned) || 0;
  return isNegative ? -num : num;
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
      for (let i = 0; i < Math.min(15, rawData.length); i++) {
        const row = rawData[i];
        if (!row) continue;
        const isSaldoAwalRow = row.some(cell => 
          cell && typeof cell === 'string' && cell.toLowerCase().includes('saldo awal')
        );

        if (isSaldoAwalRow) {
          saldoAwal = parseRupiah(row[8]) || parseRupiah(row[6]) || parseRupiah(row[7]) || 0;
          break;
        }
      }
      currentSaldo += saldoAwal;

      // Extract rows
      const rows = rawData; 
      rows.forEach(row => {
        if (!row || row.length < 9) return;
        
        const tgl = row[0];
        if (!tgl || tgl.toLowerCase().includes('tgl')) return;

        const isSaldoAwalRow = row.some(cell => 
          cell && typeof cell === 'string' && cell.toLowerCase().includes('saldo awal')
        );
        if (isSaldoAwalRow) return;
        
        let monthNum = 0;
        let yearFull = selectedYear;

        // Try parsing variations like 9/Jan/26, 09-01-2026, 9 Jan 2026
        const parts = tgl.split(/[\/\- ]/);
        if (parts.length >= 2) {
          const mText = parts[1].toLowerCase();
          
          if (isNaN(Number(mText))) {
            monthNum = monthMap[mText] || monthMap[mText.substring(0,3)] || 0;
          } else {
            monthNum = Number(mText);
          }

          if (parts[2]) {
            const yText = parts[2];
            if (yText.length === 2) {
              yearFull = "20" + yText;
            } else if (yText.length === 4) {
              yearFull = yText;
            }
          }
        }

        yearsSet.add(yearFull);

        const penerimaan = parseRupiah(row[6]);
        const pengeluaran = parseRupiah(row[7]);
        
        totalPener += penerimaan;
        totalPengel += pengeluaran;

        if (yearFull === selectedYear && monthNum) {
          chartData[monthNum - 1].penerimaan += penerimaan;
          chartData[monthNum - 1].pengeluaran += pengeluaran;
        }

        // Saldo Akhir based on the row's Saldo Akhir column if present
        const s = parseRupiah(row[8]);
        if (row[8] && row[8].trim() !== '' && row[8].trim() !== '-') {
          currentSaldo = s;
        } else {
          // If no running balance, we could compute it, but usually the sheet has it
        }
      });
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
            <BarChart data={data} margin={{ top: 10, right: 10, left: 60, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis 
                tickFormatter={(value) => `Rp ${value / 1000000}Jt`}
                fontSize={10}
                fontWeight="black"
                width={70}
              />
              <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`} />
              <Legend />
              <Bar dataKey="penerimaan" name="Penerimaan" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
