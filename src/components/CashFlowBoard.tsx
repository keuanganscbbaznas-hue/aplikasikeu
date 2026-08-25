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

const parseRupiah = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val !== 'string') return 0;
  
  let cleaned = val.trim();
  if (!cleaned || cleaned === '-' || cleaned === '0') return 0;

  let isNegative = false;
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    isNegative = true;
    cleaned = cleaned.slice(1, -1);
  }
  if (cleaned.startsWith('-')) {
    isNegative = true;
    cleaned = cleaned.slice(1).trim();
  }

  cleaned = cleaned.replace(/Rp/gi, '').trim();

  if (cleaned.includes(',') && !cleaned.includes('.')) {
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = parts[0];
    }
  } else if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.split(',')[0];
  }

  cleaned = cleaned.replace(/[^0-9]/g, '');
  const num = parseInt(cleaned, 10) || 0;
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
      // Find indices dynamically
      const header = rawData[0];
      const findIdx = (names: string[]) => header.findIndex(h => 
         h && names.some(n => h.toLowerCase().includes(n.toLowerCase()))
      );

      const tglIdx = findIdx(['tgl', 'tanggal']);
      const docIdx = findIdx(['no. doc', 'no doc', 'dokumen']);
      const debetIdx = findIdx(['debet', 'penerimaan', 'masuk']);
      const kreditIdx = findIdx(['kredit', 'pengeluaran', 'keluar']);
      const saldoIdx = findIdx(['saldo akhir', 'saldo']);
      const ketIdx = findIdx(['keterangan', 'uraian']);

      // Find initial saldo
      let saldoAwal = 0;
      for (let i = 0; i < Math.min(15, rawData.length); i++) {
        const row = rawData[i];
        if (!row) continue;
        const isSaldoAwalRow = row.some(cell => 
          cell && typeof cell === 'string' && cell.toLowerCase().includes('saldo awal')
        );

        if (isSaldoAwalRow) {
          const s = saldoIdx >= 0 ? parseRupiah(row[saldoIdx]) : 0;
          const d = debetIdx >= 0 ? parseRupiah(row[debetIdx]) : 0;
          const k = kreditIdx >= 0 ? parseRupiah(row[kreditIdx]) : 0;
          saldoAwal = s || d || k || 0;
          break;
        }
      }
      currentSaldo = saldoAwal;

      // Extract rows
      let lastKnownMonth = 0;
      let lastKnownYear = selectedYear;

      const rows = rawData; 
      rows.forEach(row => {
        if (!row || row.length < 4) return;
        
        const tgl = tglIdx >= 0 ? (row[tglIdx] || '').trim() : '';
        const docStr = docIdx >= 0 ? (row[docIdx] || '').trim() : '';
        const ketStr = ketIdx >= 0 ? (row[ketIdx] || '').trim() : '';

        const isSaldoAwalRow = row.some(cell => 
          cell && typeof cell === 'string' && cell.toLowerCase().includes('saldo awal')
        );
        if (isSaldoAwalRow) return;

        const penerimaan = debetIdx >= 0 ? parseRupiah(row[debetIdx]) : 0;
        const pengeluaran = kreditIdx >= 0 ? parseRupiah(row[kreditIdx]) : 0;
        const saldoAkhir = saldoIdx >= 0 ? parseRupiah(row[saldoIdx]) : 0;

        const hasContent = (tgl.length > 0 && !tgl.toLowerCase().includes('tgl')) ||
                           docStr.length > 0 ||
                           ketStr.length > 0 ||
                           penerimaan > 0 ||
                           pengeluaran > 0;

        if (!hasContent) return;
        
        let monthNum = 0;
        let yearFull = lastKnownYear;

        // Try parsing variations like 9/Jan/26, 09-01-2026, 9 Jan 2026
        if (tgl && !tgl.toLowerCase().includes('tgl')) {
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
        }

        // If date not in column 0, extract from doc code e.g. CA.03.210826 -> month 8, year 2026
        if (!monthNum && docStr) {
          const docMatch = docStr.match(/\.(\d{2})(\d{2})(\d{2})$/);
          if (docMatch) {
            monthNum = parseInt(docMatch[2], 10);
            yearFull = "20" + docMatch[3];
          }
        }

        if (!monthNum) {
          monthNum = lastKnownMonth;
        } else {
          lastKnownMonth = monthNum;
          lastKnownYear = yearFull;
        }

        if (yearFull) {
          yearsSet.add(yearFull);
        }

        totalPener += penerimaan;
        totalPengel += pengeluaran;

        if (yearFull === selectedYear && monthNum >= 1 && monthNum <= 12) {
          chartData[monthNum - 1].penerimaan += penerimaan;
          chartData[monthNum - 1].pengeluaran += pengeluaran;
        }

        // Saldo Akhir based on the row's Saldo Akhir column if present
        if (saldoIdx >= 0 && row[saldoIdx] && row[saldoIdx].trim() !== '' && row[saldoIdx].trim() !== '-') {
          currentSaldo = saldoAkhir;
        } else if (penerimaan > 0 || pengeluaran > 0) {
          currentSaldo = currentSaldo + penerimaan - pengeluaran;
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
