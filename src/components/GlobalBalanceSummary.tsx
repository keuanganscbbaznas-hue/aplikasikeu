import * as React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Banknote, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';

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

  // If format has decimal with comma like 1.000,50
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = parts[0];
    }
  } else if (cleaned.includes('.') && cleaned.includes(',')) {
    // Standard IDR format: 1.000,00 -> 1000
    cleaned = cleaned.split(',')[0];
  }

  cleaned = cleaned.replace(/[^0-9]/g, '');
  const num = parseInt(cleaned, 10) || 0;
  return isNegative ? -num : num;
};

const SHEET_ID = '1i5cIa8XjrvwF57C8ntrH5fDpgLyppguw3K1sI1VKjXU';

const SHEETS = [
  { name: 'Kas Tunai SMP', gid: '0', icon: Banknote, color: 'text-emerald-600', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { name: 'Kas Tunai SMA', gid: '812391118', icon: Banknote, color: 'text-teal-600', badgeColor: 'bg-teal-50 text-teal-700 border-teal-200' },
  { name: 'Kas Bank SMP', gid: '1341242520', icon: CreditCard, color: 'text-blue-600', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
  { name: 'Kas Bank SMA', gid: '908301693', icon: CreditCard, color: 'text-indigo-600', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
];

const monthMap: Record<string, number> = { 
  'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mei': 4, 'may': 4, 'jun': 5, 
  'jul': 6, 'agu': 7, 'aug': 7, 'sep': 8, 'okt': 9, 'oct': 9, 'nov': 10, 'des': 11, 'dec': 11
};

interface SheetDetail {
  balance: number;
  lastDate: Date | null;
  lastDateStr: string;
  rowCount: number;
  lastDoc: string;
}

export function GlobalBalanceSummary() {
  const [balances, setBalances] = React.useState<Record<string, number>>({});
  const [sheetDetails, setSheetDetails] = React.useState<Record<string, SheetDetail>>({});
  const [lastUpdate, setLastUpdate] = React.useState<Date | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const fetchAllBalances = React.useCallback(async (showToast = false) => {
    if (showToast) setIsRefreshing(true);
    else setLoading(true);

    const balanceMap: Record<string, number> = {};
    const detailsMap: Record<string, SheetDetail> = {};
    const dates: Date[] = [];
    
    try {
      const promises = SHEETS.map(async (sheet) => {
        return new Promise<void>((resolve) => {
          const url = `/api/sheets/proxy_csv?spreadsheetId=${SHEET_ID}&gid=${sheet.gid}&_t=${Date.now()}`;
          Papa.parse(url, {
            download: true,
            complete: (results) => {
              const data = results.data as string[][];
              if (data && data.length > 0) {
                let currentBalance = 0;
                let sheetLastDate: Date | null = null;
                let sheetLastDateStr = '';
                let activeRowCount = 0;
                let lastDocName = '';

                // Find indices dynamically from headers
                const header = data[0];
                const findIdx = (names: string[]) => header.findIndex(h => 
                   h && names.some(n => h.toLowerCase().trim().includes(n.toLowerCase()))
                );

                const tglIdx = findIdx(['tgl', 'tanggal']);
                const docIdx = findIdx(['no. doc', 'no doc', 'dokumen', 'no. dokumen']);
                const debetIdx = findIdx(['debet', 'penerimaan', 'masuk']);
                const kreditIdx = findIdx(['kredit', 'pengeluaran', 'keluar']);
                const saldoIdx = findIdx(['saldo akhir', 'saldo']);
                const ketIdx = findIdx(['keterangan', 'uraian']);

                // Scan all rows
                for (let i = 0; i < data.length; i++) {
                  const row = data[i];
                  if (!row || row.length < 4) continue;

                  const dateStr = tglIdx >= 0 ? (row[tglIdx] || '').trim() : '';
                  const docStr = docIdx >= 0 ? (row[docIdx] || '').trim() : '';
                  const ketStr = ketIdx >= 0 ? (row[ketIdx] || '').trim() : '';
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

                  // Check if row has valid content (either date, document code, description, debet, kredit, or non-zero saldo)
                  const hasContent = (dateStr.length > 0 && !dateStr.toLowerCase().includes('tgl')) ||
                                     docStr.length > 0 ||
                                     ketStr.length > 0 ||
                                     debet > 0 ||
                                     kredit > 0;

                  if (hasContent) {
                    activeRowCount++;
                    if (docStr) lastDocName = docStr;

                    // Update balance: prioritize recorded saldo akhir if present, otherwise accumulate debet/kredit
                    if (saldoIdx >= 0 && row[saldoIdx] && row[saldoIdx].trim() !== '' && row[saldoIdx].trim() !== '-') {
                      currentBalance = saldoAkhir;
                    } else if (debet > 0 || kredit > 0) {
                      currentBalance = currentBalance + debet - kredit;
                    }

                    // Try to parse transaction date
                    let parsedRowDate: Date | null = null;
                    if (dateStr && !dateStr.toLowerCase().includes('tgl')) {
                      const parts = dateStr.split(/[\/\- ]/);
                      if (parts.length >= 2) {
                        try {
                          const d = parseInt(parts[0], 10);
                          let m = 0;
                          let y = new Date().getFullYear();
                          const mText = parts[1].toLowerCase();
                          if (isNaN(Number(mText))) {
                            m = monthMap[mText] ?? monthMap[mText.substring(0,3)] ?? 0;
                          } else {
                            m = parseInt(mText, 10) - 1;
                          }
                          if (parts[2]) {
                            const yText = parts[2];
                            y = yText.length === 2 ? 2000 + parseInt(yText, 10) : parseInt(yText, 10);
                          }
                          if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y > 2000) {
                            const dt = new Date(y, m, d);
                            if (!isNaN(dt.getTime())) {
                              parsedRowDate = dt;
                            }
                          }
                        } catch (e) { /* ignore */ }
                      }
                    }

                    // If date not in column 0, extract from doc code e.g. CA.03.210826 (21 Aug 2026)
                    if (!parsedRowDate && docStr) {
                      const docMatch = docStr.match(/\.(\d{2})(\d{2})(\d{2})$/);
                      if (docMatch) {
                        const d = parseInt(docMatch[1], 10);
                        const m = parseInt(docMatch[2], 10) - 1;
                        const y = 2000 + parseInt(docMatch[3], 10);
                        if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y > 2000 && d >= 1 && d <= 31 && m >= 0 && m <= 11) {
                          parsedRowDate = new Date(y, m, d);
                        }
                      }
                    }

                    if (parsedRowDate) {
                      sheetLastDate = parsedRowDate;
                      sheetLastDateStr = parsedRowDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                    }
                  }
                }

                if (sheetLastDate) dates.push(sheetLastDate);
                balanceMap[sheet.name] = currentBalance;
                detailsMap[sheet.name] = {
                  balance: currentBalance,
                  lastDate: sheetLastDate,
                  lastDateStr: sheetLastDateStr || (sheetLastDate ? sheetLastDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'),
                  rowCount: activeRowCount,
                  lastDoc: lastDocName
                };
              } else {
                balanceMap[sheet.name] = 0;
                detailsMap[sheet.name] = { balance: 0, lastDate: null, lastDateStr: '-', rowCount: 0, lastDoc: '' };
              }
              resolve();
            },
            error: (err) => {
              console.error(`Error fetching sheet ${sheet.name}:`, err);
              balanceMap[sheet.name] = 0;
              detailsMap[sheet.name] = { balance: 0, lastDate: null, lastDateStr: '-', rowCount: 0, lastDoc: '' };
              resolve();
            }
          });
        });
      });

      await Promise.all(promises);
      setBalances(balanceMap);
      setSheetDetails(detailsMap);
      if (dates.length > 0) {
        const maxTime = Math.max(...dates.map(d => d.getTime()));
        setLastUpdate(new Date(maxTime));
      }
      if (showToast) {
        toast.success("Data saldo rekening berhasil disinkronkan dari Google Sheets!");
      }
    } catch (err) {
      console.error("Error updating balances:", err);
      if (showToast) toast.error("Gagal menyinkronkan data Google Sheets.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAllBalances();
  }, [fetchAllBalances]);

  const totalGlobal = Object.values(balances).reduce((sum: number, b: number) => sum + b, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-6 w-32 bg-slate-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase">
              Informasi Saldo Rekening
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAllBalances(true)}
              disabled={isRefreshing}
              className="h-7 px-2.5 text-[10px] font-bold rounded-lg border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition-all flex items-center gap-1.5 shadow-2xs"
              title="Sinkronkan ulang saldo dari Google Sheets"
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-emerald-600' : ''} />
              {isRefreshing ? 'Menyinkronkan...' : 'Sinkronkan Sheet'}
            </Button>
          </div>
          {lastUpdate && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Berdasarkan Pembukuan Kas Terakhir • Update per {lastUpdate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:items-end gap-1">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 rounded-2xl border border-emerald-200/80 shadow-2xs">
             <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Total Saldo Gabungan</span>
             <span className="text-sm font-black text-emerald-700">Rp {(totalGlobal as number).toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SHEETS.map((sheet) => {
          const detail = sheetDetails[sheet.name];
          const balance = balances[sheet.name] || 0;

          return (
            <Card key={sheet.name} className="border border-slate-100 shadow-xs bg-white rounded-2xl overflow-hidden group hover:shadow-md hover:border-slate-200 transition-all">
              <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
                 <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider leading-none">
                   {sheet.name}
                 </span>
                 <div className={`p-2 rounded-xl bg-slate-50 group-hover:bg-slate-100 transition-colors`}>
                   <sheet.icon size={16} className={sheet.color} />
                 </div>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="text-xl font-black text-slate-900 tracking-tight">
                  Rp { balance.toLocaleString('id-ID') }
                </div>
                
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100/80 text-[10px]">
                  <div className="flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle2 size={12} className="shrink-0" />
                    <span>Sinkron Sheets</span>
                  </div>
                  {detail?.lastDateStr && detail.lastDateStr !== '-' && (
                    <span className="text-slate-400 font-semibold text-[9.5px]">
                      Per {detail.lastDateStr}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

