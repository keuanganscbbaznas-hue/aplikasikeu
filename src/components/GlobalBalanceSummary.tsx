import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Landmark, CreditCard, Banknote } from 'lucide-react';
import Papa from 'papaparse';

const parseRupiah = (val: string) => {
  if (!val) return 0;
  return Number(val.replace(/\./g, "").trim()) || 0;
};

const SHEET_ID = '1i5cIa8XjrvwF57C8ntrH5fDpgLyppguw3K1sI1VKjXU';

const SHEETS = [
  { name: 'Kas Tunai SMP', gid: '0', icon: Banknote, color: 'text-emerald-500' },
  { name: 'Kas Tunai SMA', gid: '812391118', icon: Banknote, color: 'text-emerald-500' },
  { name: 'Kas Bank SMP', gid: '1341242520', icon: CreditCard, color: 'text-blue-500' },
  { name: 'Kas Bank SMA', gid: '908301693', icon: CreditCard, color: 'text-blue-500' },
];

export function GlobalBalanceSummary() {
  const [balances, setBalances] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchAllBalances() {
      setLoading(true);
      const balanceMap: Record<string, number> = {};
      
      const promises = SHEETS.map(async (sheet) => {
        return new Promise<void>((resolve) => {
          const url = `/api/sheets/proxy_csv?spreadsheetId=${SHEET_ID}&gid=${sheet.gid}`;
          Papa.parse(url, {
            download: true,
            complete: (results) => {
              const data = results.data as string[][];
              if (data && data.length > 5) {
                // Find initial saldo from "Saldo Awal" row
                let saldoAwal = 0;
                for (let i = 0; i < Math.min(15, data.length); i++) {
                   if (data[i][6]?.includes('Saldo Awal')) {
                     saldoAwal = parseRupiah(data[i][9]);
                     break;
                   }
                }

                // Calculate activity
                let totalPenerimaan = 0;
                let totalPengeluaran = 0;
                
                // Skip header rows
                const rows = data.slice(11); // Usually data starts around row 11 based on previous tool calls
                rows.forEach(row => {
                  if (row && row.length >= 9) {
                    totalPenerimaan += parseRupiah(row[7]);
                    totalPengeluaran += parseRupiah(row[8]);
                  }
                });

                // Check for last Saldo Akhir column specifically as well
                let lastValidSaldo = 0;
                for (let i = data.length - 1; i >= 0; i--) {
                  const s = parseRupiah(data[i][9]);
                  const hasDate = data[i][1] && data[i][1].length > 0;
                  if (hasDate && (s > 0 || (data[i][9] && data[i][9].trim() !== ''))) {
                    lastValidSaldo = s;
                    break;
                  }
                }

                balanceMap[sheet.name] = lastValidSaldo !== 0 ? lastValidSaldo : (saldoAwal + totalPenerimaan - totalPengeluaran);
              } else {
                balanceMap[sheet.name] = 0;
              }
              resolve();
            },
            error: (err) => {
              console.error(`Error fetching sheet ${sheet.name}:`, err);
              balanceMap[sheet.name] = 0;
              resolve();
            }
          });
        });
      });

      await Promise.all(promises);
      setBalances(balanceMap);
      setLoading(false);
    }

    fetchAllBalances();
  }, []);

  const totalGlobal = Object.values(balances).reduce((sum, b) => sum + b, 0);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase">
          Informasi Saldo Rekening
        </h2>
        <div className="flex items-center gap-2 px-4 py-1 bg-emerald-50 rounded-full border border-emerald-100">
           <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Saldo Gabungan</span>
           <span className="text-sm font-black text-emerald-700">Rp {totalGlobal.toLocaleString('id-ID')}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SHEETS.map((sheet) => (
          <Card key={sheet.name} className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
            <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                 {sheet.name}
               </span>
               <div className={`p-2 rounded-lg bg-slate-50 group-hover:bg-white transition-colors`}>
                 <sheet.icon size={16} className={sheet.color} />
               </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-lg font-black text-slate-900 tracking-tight">
                Rp { (balances[sheet.name] || 0).toLocaleString('id-ID') }
              </div>
              <div className="flex items-center gap-1 mt-2">
                 <div className="h-1 w-8 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-slate-300 w-1/2" />
                 </div>
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Verified from Sheets</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
