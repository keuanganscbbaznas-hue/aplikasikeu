import { DonationLedgerItem } from './donationLedgerData';

export interface ParseResult {
  saldoAwal: number;
  items: DonationLedgerItem[];
  errors: string[];
  totalDebet: number;
  totalKredit: number;
  saldoAkhir: number;
}

/**
 * Clean numeric strings like "450.000", "300,000", "30.759.759", "11.325.269"
 */
export function cleanCurrency(val: string | undefined | null): number {
  if (!val) return 0;
  let str = String(val).trim();
  if (!str || str === '-' || str === '0') return 0;
  // Remove quotes and currency prefixes
  str = str.replace(/["'Rp\s]/gi, '');
  // If format is like "300,000" (US comma thousands), or "300.000" (Indonesian dot thousands)
  // Check if both exist
  if (str.includes('.') && str.includes(',')) {
    // Determine decimal separator
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // 1.000,50
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,000.50
      str = str.replace(/,/g, '');
    }
  } else if (str.includes('.')) {
    // Standard Indonesian thousands: e.g. 450.000 or 30.759.759
    str = str.replace(/\./g, '');
  } else if (str.includes(',')) {
    // Comma separated thousands: e.g. 300,000
    str = str.replace(/,/g, '');
  }
  const num = Number(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse date into ISO format (YYYY-MM-DD) and monthKey (YYYY-MM)
 */
export function parseDateComponents(dateStr: string): { isoDate: string; monthKey: string; monthName: string } {
  const monthNamesId: Record<string, { num: string; name: string }> = {
    'jan': { num: '01', name: 'Januari 2026' },
    'feb': { num: '02', name: 'Februari 2026' },
    'mar': { num: '03', name: 'Maret 2026' },
    'apr': { num: '04', name: 'April 2026' },
    'mei': { num: '05', name: 'Mei 2026' },
    'may': { num: '05', name: 'Mei 2026' },
    'jun': { num: '06', name: 'Juni 2026' },
    'jul': { num: '07', name: 'Juli 2026' },
    'agu': { num: '08', name: 'Agustus 2026' },
    'aug': { num: '08', name: 'Agustus 2026' },
    'sep': { num: '09', name: 'September 2026' },
    'okt': { num: '10', name: 'Oktober 2026' },
    'oct': { num: '10', name: 'Oktober 2026' },
    'nov': { num: '11', name: 'November 2026' },
    'des': { num: '12', name: 'Desember 2026' },
    'dec': { num: '12', name: 'Desember 2026' }
  };

  const parts = dateStr.trim().split(/[-/\s]/);
  let day = '01';
  let month = '01';
  let year = '2026';
  let monthName = 'Januari 2026';

  if (parts.length >= 3) {
    day = parts[0].padStart(2, '0');
    const mStr = parts[1].toLowerCase().slice(0, 3);
    if (monthNamesId[mStr]) {
      month = monthNamesId[mStr].num;
      monthName = monthNamesId[mStr].name;
    } else if (!isNaN(Number(parts[1]))) {
      const mNum = Math.min(12, Math.max(1, Number(parts[1])));
      month = String(mNum).padStart(2, '0');
    }
    
    let y = parts[2];
    if (y.length === 2) {
      year = '20' + y;
    } else if (y.length === 4) {
      year = y;
    }
  }

  return {
    isoDate: `${year}-${month}-${day}`,
    monthKey: `${year}-${month}`,
    monthName
  };
}

/**
 * Split CSV line handling quotes
 */
function splitCsvLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Main parser for Donation Database CSV / Spreadsheet TSV
 */
export function parseDonationDatabaseCsv(csvText: string, account: 'smp' | 'sma' = 'smp'): ParseResult {
  const errors: string[] = [];
  const items: DonationLedgerItem[] = [];
  let detectedSaldoAwal = account === 'sma' ? 56084526 : 30759759; // Default based on account

  if (!csvText || !csvText.trim()) {
    return {
      saldoAwal: detectedSaldoAwal,
      items: [],
      errors: ['Teks CSV kosong'],
      totalDebet: 0,
      totalKredit: 0,
      saldoAkhir: detectedSaldoAwal
    };
  }

  // Detect delimiter: tab (\t), comma (,), or semicolon (;)
  const firstFewLines = csvText.trim().split('\n').slice(0, 5).join('\n');
  let delimiter = ',';
  if (firstFewLines.includes('\t')) {
    delimiter = '\t';
  } else if (!firstFewLines.includes(',') && firstFewLines.includes(';')) {
    delimiter = ';';
  }

  const rawLines = csvText.split(/\r?\n/);
  const cleanLines: string[] = [];
  
  // Handle multiline quoted fields
  let buffer = '';
  let inQuote = false;
  for (const rawLine of rawLines) {
    const quoteCount = (rawLine.match(/"/g) || []).length;
    if (!inQuote) {
      if (quoteCount % 2 === 1) {
        inQuote = true;
        buffer = rawLine;
      } else {
        if (rawLine.trim()) cleanLines.push(rawLine);
      }
    } else {
      buffer += ' ' + rawLine;
      if (quoteCount % 2 === 1) {
        inQuote = false;
        cleanLines.push(buffer);
        buffer = '';
      }
    }
  }
  if (buffer.trim()) cleanLines.push(buffer);

  let runningSaldo = detectedSaldoAwal;
  let counter = 1;
  let hasJjColumn = false;

  for (const line of cleanLines) {
    if (!line.trim()) continue;

    const cols = splitCsvLine(line, delimiter);
    const lineUpper = line.toUpperCase();

    // Check if header line
    if (lineUpper.includes('TGL') && (lineUpper.includes('ALOKASI') || lineUpper.includes('DEBET') || lineUpper.includes('KETERANGAN'))) {
      if (lineUpper.includes(', JJ ,') || lineUpper.includes(' JJ ') || cols.some(c => c.trim().toUpperCase() === 'JJ') || cols.length >= 9) {
        hasJjColumn = true;
      }
      continue;
    }

    // Check if Saldo Awal line
    if (lineUpper.includes('SALDO AWAL')) {
      for (const col of cols) {
        const val = cleanCurrency(col);
        if (val > 1000000) { // realistic saldo awal
          detectedSaldoAwal = val;
          runningSaldo = val;
          break;
        }
      }
      continue;
    }

    // Must have at least date or keterangan or debet/kredit
    if (cols.length < 5) continue;

    // Detect format based on column length or header
    // 8-column layout (SMP):
    // 0: TGL, 1: NO. DOC, 2: ALOKASI, 3: PIC, 4: KETERANGAN, 5: DEBET, 6: KREDIT, 7: SALDO AKHIR
    //
    // 9-column layout (SMA):
    // 0: TGL, 1: NO. DOC, 2: JJ, 3: ALOKASI, 4: PIC, 5: KETERANGAN, 6: DEBET, 7: KREDIT, 8: SALDO AKHIR
    const isNineCol = hasJjColumn || cols.length >= 9;

    const dateStr = cols[0] || '';
    const docNo = cols[1] || '-';
    let allocation = isNineCol ? (cols[3] || cols[2] || 'Donasi') : (cols[2] || 'Donasi');
    const pic = isNineCol ? (cols[4] || '-') : (cols[3] || '-');
    const description = isNineCol ? (cols[5] || '') : (cols[4] || '');
    const debet = cleanCurrency(isNineCol ? cols[6] : cols[5]);
    const kredit = cleanCurrency(isNineCol ? cols[7] : cols[6]);

    // If both debet and kredit are 0 and no date, skip
    if (debet === 0 && kredit === 0 && !dateStr) continue;

    // Standardize allocation if empty or weird
    if (!allocation.trim() || allocation === '-') {
      if (docNo && (docNo.includes('Donasi') || docNo.includes('Titipan') || docNo.includes('TPG') || docNo.includes('BOS'))) {
        allocation = docNo;
      } else {
        allocation = 'Donasi';
      }
    }

    const { isoDate, monthKey, monthName } = parseDateComponents(dateStr);
    const isPemasukan = debet > 0;
    runningSaldo = runningSaldo + debet - kredit;

    const prefix = account === 'smp' ? 'TX-SMP-2026' : 'TX-SMA-2026';
    const id = `${prefix}-${String(counter).padStart(3, '0')}`;

    items.push({
      id,
      account,
      accountName: account === 'smp' ? 'Rekening Donasi SMP' : 'Rekening Donasi SMA',
      date: dateStr,
      isoDate,
      monthKey,
      monthName,
      docNo: docNo || '-',
      allocation: allocation.trim(),
      pic: pic || '-',
      description: description.trim() || 'Transaksi Kas Donasi',
      debet,
      kredit,
      type: isPemasukan ? 'pemasukan' : 'pengeluaran',
      saldoAkhir: runningSaldo
    });

    counter++;
  }

  const totalDebet = items.reduce((acc, curr) => acc + curr.debet, 0);
  const totalKredit = items.reduce((acc, curr) => acc + curr.kredit, 0);
  const saldoAkhir = detectedSaldoAwal + totalDebet - totalKredit;

  return {
    saldoAwal: detectedSaldoAwal,
    items,
    errors,
    totalDebet,
    totalKredit,
    saldoAkhir
  };
}
