import * as React from 'react';
import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Table, 
  Sparkles,
  Check,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { Submission, getStagesByType, getDisplayAmount } from '../types';
import { getApiUrl } from '../lib/utils';
import * as XLSX from 'xlsx';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  allSubmissions: Submission[];
  filteredSubmissions: Submission[];
  selectedSubmissionIds: Set<string>;
}

export const parseFirestoreDate = (dateVal: any): Date => {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return dateVal;
  if (typeof dateVal.toDate === 'function') return dateVal.toDate();
  if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
  const parsed = new Date(dateVal);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

export function GoogleSheetsSyncModal({
  isOpen,
  onClose,
  allSubmissions,
  filteredSubmissions,
  selectedSubmissionIds
}: GoogleSheetsSyncModalProps) {
  const [spreadsheetId, setSpreadsheetId] = useState('1V4Nn0dUmFLdwzXOa3fAHKVuuEbVqAtNEKH_cGBc54tw');
  const [sheetName, setSheetName] = useState('Tracking Transaksi');
  const [syncScope, setSyncScope] = useState<'all' | 'filtered' | 'selected'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    success: boolean;
    rowsCount: number;
    url: string;
    sheetTitle: string;
    time: string;
  } | null>(null);

  // Extract ID from full URL if pasted
  const handleSpreadsheetIdChange = (val: string) => {
    let cleanId = val.trim();
    if (cleanId.includes('/spreadsheets/d/')) {
      const match = cleanId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        cleanId = match[1];
      }
    }
    setSpreadsheetId(cleanId);
  };

  // Determine which dataset to export
  const getTargetData = (): Submission[] => {
    if (syncScope === 'selected' && selectedSubmissionIds.size > 0) {
      return allSubmissions.filter(s => s.id && selectedSubmissionIds.has(s.id));
    }
    if (syncScope === 'filtered') {
      return filteredSubmissions;
    }
    return allSubmissions;
  };

  // Format headers and rows
  const generateFormattedSheetData = () => {
    const targetItems = getTargetData();

    const headers = [
      'ID Transaksi',
      'Tanggal Pengajuan',
      'Jenis Pengajuan',
      'Judul Pengajuan',
      'Divisi / Unit',
      'Nama PIC',
      'No. WhatsApp PIC',
      'Kode Budget / Anggaran',
      'Sumber Rekening',
      'No. Dokumen Pengajuan',
      'No. Dokumen Laporan (PertUM)',
      'Nama Bank',
      'No. Rekening',
      'Nama Pemilik Rekening',
      'Nominal Pengajuan (Rp)',
      'Nominal Realisasi / Laporan (Rp)',
      'Sisa Dana / Selisih (Rp)',
      'Status Pengajuan',
      'Tahapan Alur Terkini',
      'Progress Tahap',
      'Status Pembukuan',
      'Buku Kas Terdaftar',
      'Nama Pengaju',
      'Email Pengaju',
      'Link Bukti / Nota',
      'Link Dokumen LPJ',
      'Terakhir Diperbarui'
    ];

    const rows = targetItems.map(s => {
      const stages = getStagesByType(s.type);
      const stageText = s.currentStageIndex !== undefined && stages[s.currentStageIndex] 
        ? `${s.currentStageIndex + 1}. ${stages[s.currentStageIndex]}` 
        : '-';
      const progressPercent = `${Math.round(((s.currentStageIndex + 1) / stages.length) * 100)}%`;
      
      const createdDate = parseFirestoreDate(s.createdAt);
      const formattedCreatedDate = createdDate.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      const updatedDate = s.updatedAt ? parseFirestoreDate(s.updatedAt).toLocaleString('id-ID') : '-';

      const typeLabel = s.type === 'uang_muka' 
        ? 'Uang Muka' 
        : s.type === 'reimburse' 
          ? 'Reimburse' 
          : 'Pembiayaan';

      const nominalPengajuan = Number(s.amount) || 0;
      const nominalRealisasi = getDisplayAmount(s);
      const sisaDana = Number(s.sisaDana) || (nominalPengajuan - nominalRealisasi);

      return [
        s.id || '',
        formattedCreatedDate,
        typeLabel,
        s.title || '',
        s.divisi || '-',
        s.picName || s.submittedByName || '-',
        s.picWhatsapp || '-',
        s.kodeBudget || '-',
        s.sumberRekening || '-',
        s.noDokumen || '-',
        s.noDokumenLaporan || '-',
        s.namaBank || '-',
        s.noRekeningPengaju ? `'${s.noRekeningPengaju}` : '-',
        s.namaRekening || '-',
        nominalPengajuan,
        nominalRealisasi,
        sisaDana,
        s.status || 'PENDING',
        stageText,
        progressPercent,
        s.isBooked ? 'Sudah Dibukukan' : 'Belum Dibukukan',
        s.bookedAtSheet || '-',
        s.submittedByName || '-',
        s.submittedByEmail || '-',
        s.evidenceUrl || '',
        s.lpjUrl || '',
        updatedDate
      ];
    });

    return { headers, rows, totalItems: targetItems.length };
  };

  // 1. Sync directly to Google Sheets via Cloud API
  const handleDirectSync = async () => {
    if (!spreadsheetId) {
      toast.error('Harap masukkan ID atau URL Spreadsheet target');
      return;
    }

    const { headers, rows, totalItems } = generateFormattedSheetData();
    if (totalItems === 0) {
      toast.error('Tidak ada data transaksi yang dipilih untuk disinkronkan');
      return;
    }

    setIsSyncing(true);
    const toastId = toast.loading(`Mensinkronkan ${totalItems} transaksi ke Google Sheets...`);

    try {
      const payload = {
        spreadsheetId,
        sheetName: sheetName.trim() || 'Tracking Transaksi',
        data: [headers, ...rows]
      };

      const response = await fetch(getApiUrl('/api/sheets/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || resData.error || 'Gagal sinkronisasi ke Google Sheets');
      }

      setLastSyncResult({
        success: true,
        rowsCount: totalItems,
        url: resData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        sheetTitle: resData.sheetTitle || sheetName,
        time: new Date().toLocaleTimeString('id-ID')
      });

      toast.success(`Berhasil! ${totalItems} transaksi telah muncul di Google Sheets (${sheetName})`, {
        id: toastId,
        duration: 6000,
        action: {
          label: 'Buka Sheet',
          onClick: () => window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, '_blank')
        }
      });
    } catch (err: any) {
      console.error('Sync Error:', err);
      toast.error(`Gagal Sinkronisasi: ${err.message}`, {
        id: toastId,
        duration: 8000,
        description: 'Jika masalah izin (403), pastikan Spreadsheet sudah dibagikan ke Service Account sebagai Editor.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. Open Google Sheets directly
  const handleOpenGoogleSheet = () => {
    if (!spreadsheetId) {
      toast.error('Harap masukkan ID Spreadsheet');
      return;
    }
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    window.open(url, '_blank');
  };

  // 3. Copy formatted TSV data to clipboard
  const handleCopyClipboard = () => {
    const { headers, rows, totalItems } = generateFormattedSheetData();
    if (totalItems === 0) {
      toast.error('Tidak ada data untuk disalin');
      return;
    }

    const tsvContent = [
      headers.join('\t'),
      ...rows.map(row => row.map(val => String(val).replace(/\t/g, ' ')).join('\t'))
    ].join('\n');

    navigator.clipboard.writeText(tsvContent).then(() => {
      setIsCopied(true);
      toast.success(`${totalItems} baris data berhasil disalin ke Clipboard!`, {
        description: 'Anda dapat langsung menekan Ctrl+V (Paste) di Google Sheets atau Excel.'
      });
      setTimeout(() => setIsCopied(false), 3000);
    }).catch(err => {
      console.error('Clipboard copy error:', err);
      toast.error('Gagal menyalin ke clipboard');
    });
  };

  // 4. Download Excel (.xlsx)
  const handleDownloadExcel = () => {
    const { headers, rows, totalItems } = generateFormattedSheetData();
    if (totalItems === 0) {
      toast.error('Tidak ada data untuk diunduh');
      return;
    }

    const worksheetData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Auto column width
    const colWidths = headers.map((h, i) => {
      let maxLen = h.length;
      rows.forEach(r => {
        const valLen = String(r[i] || '').length;
        if (valLen > maxLen) maxLen = valLen;
      });
      return { wch: Math.min(Math.max(maxLen + 2, 10), 45) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31) || 'Tracking Transaksi');
    
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Tracking_Transaksi_BAZNAS_SCB_${today}.xlsx`);
    toast.success(`File Excel (${totalItems} transaksi) berhasil diunduh!`);
  };

  // 5. Download CSV
  const handleDownloadCsv = () => {
    const { headers, rows, totalItems } = generateFormattedSheetData();
    if (totalItems === 0) {
      toast.error('Tidak ada data untuk diunduh');
      return;
    }

    const csvRows = [
      headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ];

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Tracking_Transaksi_BAZNAS_SCB_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`File CSV (${totalItems} transaksi) berhasil diunduh!`);
  };

  const targetCount = getTargetData().length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border-slate-100 p-0 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                Sinkronisasi ke Google Sheets
                <Badge className="bg-white/20 text-white hover:bg-white/30 border-none text-[10px] font-bold tracking-wider uppercase">
                  Data Lengkap
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-emerald-100 text-xs mt-0.5">
                Kirim dan sinkronkan semua riwayat tracking transaksi ke Google Spreadsheet BAZNAS SCB secara real-time.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Last Sync Alert if available */}
          {lastSyncResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-emerald-950">
                    Sinkronisasi Berhasil ({lastSyncResult.rowsCount} Transaksi)
                  </h5>
                  <p className="text-[11px] text-emerald-700">
                    Tab: <span className="font-semibold">{lastSyncResult.sheetTitle}</span> • Waktu: {lastSyncResult.time}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(lastSyncResult.url, '_blank')}
                className="bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-100 h-8 text-xs font-bold gap-1.5 rounded-lg shrink-0"
              >
                <span>Buka Sheet</span>
                <ExternalLink size={12} />
              </Button>
            </div>
          )}

          {/* Scope Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Layers size={14} className="text-emerald-600" />
              Pilih Cakupan Data yang Disinkronkan
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSyncScope('all')}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  syncScope === 'all'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-bold">Semua Data</span>
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    {allSubmissions.length}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">Semua riwayat transaksi</span>
              </button>

              <button
                type="button"
                onClick={() => setSyncScope('filtered')}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  syncScope === 'filtered'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-bold">Hasil Filter</span>
                  <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    {filteredSubmissions.length}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">Sesuai filter / tab saat ini</span>
              </button>

              <button
                type="button"
                onClick={() => setSyncScope('selected')}
                disabled={selectedSubmissionIds.size === 0}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  selectedSubmissionIds.size === 0
                    ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed text-slate-400'
                    : syncScope === 'selected'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-bold">Data Dipilih</span>
                  <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                    {selectedSubmissionIds.size}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">Dari centang checkbox</span>
              </button>
            </div>
          </div>

          {/* Spreadsheet Target Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Spreadsheet ID atau URL Target</Label>
              <Input
                value={spreadsheetId}
                onChange={(e) => handleSpreadsheetIdChange(e.target.value)}
                placeholder="1V4Nn0dUmFLdwzXOa3fAHKVuuEbVqAtNEKH_cGBc54tw"
                className="h-9 text-xs font-mono bg-slate-50/50 border-slate-200 focus:bg-white"
              />
              <p className="text-[10px] text-slate-400">
                Default: BAZNAS Tracking Spreadsheet
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Nama Sheet Tab</Label>
              <Input
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="Tracking Transaksi"
                className="h-9 text-xs font-semibold bg-slate-50/50 border-slate-200 focus:bg-white"
              />
              <p className="text-[10px] text-slate-400">
                Tab sheet yang akan diperbarui datanya
              </p>
            </div>
          </div>

          {/* Export / Sync Options Cards */}
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              Pilihan Eksekusi & Ekspor
            </Label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Direct Cloud Sync */}
              <div className="bg-white p-4 rounded-2xl border border-emerald-100 hover:border-emerald-300 transition-all shadow-sm flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <h4 className="font-bold text-xs text-slate-900">Sinkron Cloud API (Utama)</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Menulis dan memperbarui 27 kolom data langsung ke spreadsheet Google secara otomatis.
                  </p>
                </div>
                <Button
                  onClick={handleDirectSync}
                  disabled={isSyncing || targetCount === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                  <span>{isSyncing ? "Mensinkronkan..." : `Sinkronkan ${targetCount} Data`}</span>
                </Button>
              </div>

              {/* Option 2: Direct Open Sheet */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all shadow-sm flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    <h4 className="font-bold text-xs text-slate-900">Buka Spreadsheet Target</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Membuka link Google Sheets di tab baru untuk melihat atau memeriksa isi data sheet.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleOpenGoogleSheet}
                  className="w-full bg-white border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl h-10 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <span>Buka di Google Sheets</span>
                  <ExternalLink size={14} />
                </Button>
              </div>

              {/* Option 3: Copy Tabular */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all shadow-sm flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <h4 className="font-bold text-xs text-slate-900">Salin Tabular (Clipboard)</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Salin semua baris data untuk langsung di-Paste (Ctrl+V) ke spreadsheet manapun.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleCopyClipboard}
                  className="w-full bg-white border-amber-200 text-amber-900 hover:bg-amber-50 rounded-xl h-10 font-bold text-xs flex items-center justify-center gap-2"
                >
                  {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{isCopied ? "Tersalin ke Clipboard!" : "Salin Format Tabel"}</span>
                </Button>
              </div>

              {/* Option 4: Download Excel / CSV */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all shadow-sm flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    <h4 className="font-bold text-xs text-slate-900">Unduh Berkas Offline</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Download cadangan berkas Excel (.xlsx) atau CSV lengkap dengan semua kolom.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDownloadExcel}
                    className="bg-white border-slate-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 text-slate-700 rounded-xl h-10 font-bold text-[11px] flex items-center justify-center gap-1.5"
                  >
                    <Download size={13} />
                    <span>Excel (.xlsx)</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadCsv}
                    className="bg-white border-slate-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 text-slate-700 rounded-xl h-10 font-bold text-[11px] flex items-center justify-center gap-1.5"
                  >
                    <FileText size={13} />
                    <span>CSV (.csv)</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="bg-white border-t border-slate-100 p-4 shrink-0 flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
            <Table size={14} className="text-emerald-600" />
            <span>Target: <strong className="text-slate-800">{targetCount} transaksi</strong> siap disinkronkan</span>
          </div>
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
