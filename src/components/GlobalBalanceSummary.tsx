import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Landmark, CreditCard, Banknote } from 'lucide-react';
import Papa from 'papaparse';

const parseRupiah = (val: string) => {
  if (!val || typeof val !== 'string') return 0;
  let cleaned = val.trim();
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
  
  // Handle decimals like 1.000,50 or 1,000.50
  const decimalMatch = cleaned.match(/[,.](\d{1,2})$/);
  if (decimalMatch) {
    cleaned = cleaned.substring(0, cleaned.length - (decimalMatch[1].length + 1));
  }

  cleaned = cleaned.replace(/[^0-9]/g, '');
  const num = parseInt(cleaned, 10) || 0;
  return isNegative ? -num : num;
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
  const [lastUpdate, setLastUpdate] = React.useState<Date | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchAllBalances() {
      setLoading(true);
      const balanceMap: Record<string, number> = {};
      const dates: Date[] = [];
      
      const promises = SHEETS.map(async (sheet) => {
        return new Promise<void>((resolve) => {
          const url = `/api/sheets/proxy_csv?spreadsheetId=${SHEET_ID}&gid=${sheet.gid}`;
          Papa.parse(url, {
            download: true,
            complete: (results) => {
              const data = results.data as string[][];
              if (data && data.length > 0) {
                let currentBalance = 0;
                let sheetLastDate: Date | null = null;

                // Find indices dynamically
                const header = data[0];
                const findIdx = (names: string[]) => header.findIndex(h => 
                   h && names.some(n => h.toLowerCase().includes(n.toLowerCase()))
                );

                const tglIdx = findIdx(['tgl', 'tanggal']);
                const debetIdx = findIdx(['debet', 'penerimaan', 'masuk']);
                const kreditIdx = findIdx(['kredit', 'pengeluaran', 'keluar']);
                const saldoIdx = findIdx(['saldo akhir', 'saldo']);

                // Scan all rows
                for (let i = 0; i < data.length; i++) {
                  const row = data[i];
                  if (!row || row.length < 5) continue;

                  const dateStr = tglIdx >= 0 ? (row[tglIdx] || '') : '';
                  const debet = debetIdx >= 0 ? parseRupiah(row[debetIdx]) : 0;
                  const kredit = kreditIdx >= 0 ? parseRupiah(row[kreditIdx]) : 0;
                  const saldoAkhir = saldoIdx >= 0 ? parseRupiah(row[saldoIdx]) : 0;

                  const isSaldoAwalRow = row.some(cell => 
                    cell && typeof cell === 'string' && cell.toLowerCase().includes('saldo awal')
                  );

                  if (isSaldoAwalRow) {
                    currentBalance = saldoAkhir || debet || 0;
                    continue;
                  }

                  if (dateStr && dateStr.trim().length > 0 && !dateStr.toLowerCase().includes('tgl')) {
                    // Update balance
                    if (saldoIdx >= 0 && row[saldoIdx] && row[saldoIdx].trim() !== '' && row[saldoIdx].trim() !== '-') {
                      currentBalance = saldoAkhir;
                    } else {
                      currentBalance = currentBalance + debet - kredit;
                    }

                    // Try to parse date for last update check
                    const parts = dateStr.split(/[\/\- ]/);
                    if (parts.length >= 2) {
                      try {
                        const d = parseInt(parts[0]);
                        let m = 0;
                        let y = new Date().getFullYear();
                        const mText = parts[1].toLowerCase();
                        const monthMap: Record<string, number> = { 
                          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mei': 4, 'may': 4, 'jun': 5, 
                          'jul': 6, 'agu': 7, 'aug': 7, 'sep': 8, 'okt': 9, 'oct': 9, 'nov': 10, 'des': 11, 'dec': 11
                        };
                        if (isNaN(Number(mText))) {
                          m = monthMap[mText] || monthMap[mText.substring(0,3)] || 0;
                        } else {
                          m = parseInt(mText) - 1;
                        }
                        if (parts[2]) {
                          const yText = parts[2];
                          y = yText.length === 2 ? 2000 + parseInt(yText) : parseInt(yText);
                        }
                        if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y > 2000) {
                          const parsedDate = new Date(y, m, d);
                          if (!isNaN(parsedDate.getTime())) {
                            sheetLastDate = parsedDate;
                          }
                        }
                      } catch (e) { /* ignore */ }
                    }
                  }
                }

                if (sheetLastDate) dates.push(sheetLastDate);
                balanceMap[sheet.name] = currentBalance;
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
      if (dates.length > 0) {
        const maxTime = Math.max(...dates.map(d => d.getTime()));
        setLastUpdate(new Date(maxTime));
      }
      setLoading(false);
    }

    fetchAllBalances();
  }, []);

  const totalGlobal = Object.values(balances).reduce((sum: number, b: number) => sum + b, 0);

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
        <div>
          <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase">
            Informasi Saldo Rekening
          </h2>
          {lastUpdate && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Berdasarkan Pembukuan Kas Terakhir
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 px-4 py-1 bg-emerald-50 rounded-full border border-emerald-100">
             <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Saldo Gabungan</span>
             <span className="text-sm font-black text-emerald-700">Rp {(totalGlobal as number).toLocaleString('id-ID')}</span>
          </div>
          {lastUpdate && (
            <div className="flex items-center gap-1.5 mr-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                Update per {lastUpdate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}
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
