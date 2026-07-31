export interface RincianDetailItem {
  noBuktiDetail: string;
  tanggalDetail?: string;
  keteranganDetail: string;
  qty: number;
  hargaSatuan: number;
}

export interface BaznasRincianItem {
  id?: string;
  account: 'SMP' | 'SMA';
  month: string;
  year: string;
  kodeBudget: string;
  noDoc: number;
  noBukti: string;
  tanggalBudget: string;
  keterangan: string;
  details: RincianDetailItem[];
  linkBukti?: string;
  buktiUrl?: string;
}

export const DEFAULT_BAZNAS_RINCIAN_SMP_JAN_2026: BaznasRincianItem[] = [
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'K1.1.7',
    noDoc: 1,
    noBukti: 'B.01.160126',
    tanggalBudget: '16-Jan-26',
    keterangan: 'Klaim Kesehatan an Ust Nanang',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Pengobatan', qty: 1, hargaSatuan: 355000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'K1.1.9',
    noDoc: 2,
    noBukti: 'B.01.220126',
    tanggalBudget: '22-Jan-26',
    keterangan: 'Honor Jabatan Fungsional Januari 2026',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Bact Transfer BSI', qty: 1, hargaSatuan: 1900000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O1.1.2',
    noDoc: 3,
    noBukti: 'B.02.090126',
    tanggalBudget: '9-Jan-26',
    keterangan: 'BPJS Kesehatan Januari 2026',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '9-Jan-26', keteranganDetail: 'Transfer BSI a.n Smp Cendekia BAZNAS', qty: 1, hargaSatuan: 14537116 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O1.1.3',
    noDoc: 4,
    noBukti: 'B.01.090126',
    tanggalBudget: '9-Jan-26',
    keterangan: 'BPJSTK Januari 2026',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '9-Jan-26', keteranganDetail: 'Transfer BSI a.n Smp Cendekia BAZNAS', qty: 1, hargaSatuan: 11864742 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O1.1.6',
    noDoc: 5,
    noBukti: 'B.02.220126',
    tanggalBudget: '22-Jan-26',
    keterangan: 'Insentif Pemeliharaan Air Januari 2026',
    details: [
      { noBuktiDetail: '1', keteranganDetail: 'Bact Transfer BSI', qty: 1, hargaSatuan: 770000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O1.1.6',
    noDoc: 6,
    noBukti: 'B.03.220126',
    tanggalBudget: '22-Jan-26',
    keterangan: 'Back Up Keamanan POS 3',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '22-Jan-26', keteranganDetail: 'Transfer BSI a.n Feri Perdiansyah', qty: 1, hargaSatuan: 100000 },
      { noBuktiDetail: '2', tanggalDetail: '22-Jan-26', keteranganDetail: 'Transfer BSI a.n Abdul Kodir', qty: 1, hargaSatuan: 700000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O1.1.11',
    noDoc: 7,
    noBukti: 'B.02.160126',
    tanggalBudget: '16-Jan-26',
    keterangan: 'Klaim kesehatan an ustzh Kusma',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Pengobatan,Obat Dan Suplemen', qty: 1, hargaSatuan: 476900 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O1.1.11',
    noDoc: 8,
    noBukti: 'B.03.160126',
    tanggalBudget: '16-Jan-26',
    keterangan: 'Klaim kesehatan an Asiah',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Biaya Pengobatan', qty: 1, hargaSatuan: 955173 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O1.1.11',
    noDoc: 9,
    noBukti: 'B.04.160126',
    tanggalBudget: '16-Jan-26',
    keterangan: 'Klaim kesehatan an Tatang',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '15-Jun-25', keteranganDetail: 'Dr.Rahmawati - Brobat', qty: 1, hargaSatuan: 60000 },
      { noBuktiDetail: '2', tanggalDetail: '29-Aug-25', keteranganDetail: 'Dr.Rahmawati - Pemeriksaan', qty: 1, hargaSatuan: 60000 },
      { noBuktiDetail: '3', tanggalDetail: '24-Dec-25', keteranganDetail: 'Dr.Candra Bima Argandi - Pengobatan', qty: 1, hargaSatuan: 75000 },
      { noBuktiDetail: '4', tanggalDetail: '24-Dec-25', keteranganDetail: 'Dr.Candra Bima Argandi - Berobat', qty: 1, hargaSatuan: 70000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O1.1.11',
    noDoc: 10,
    noBukti: 'B.05.220126',
    tanggalBudget: '22-Jan-26',
    keterangan: 'Klaim Kesehatan an Ust Dany',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Pengobatan & Suplemen', qty: 1, hargaSatuan: 202000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O1.1.11',
    noDoc: 11,
    noBukti: 'B.06.220126',
    tanggalBudget: '22-Jan-26',
    keterangan: 'Klaim Kesehatan an Ust Daud',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '12-Jan-26', keteranganDetail: 'Indomaret - Bear Brand', qty: 1, hargaSatuan: 285000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O1.3.1',
    noDoc: 12,
    noBukti: 'B.04.220126',
    tanggalBudget: '22-Jan-26',
    keterangan: 'Biaya Perdin Rekonsiliasi BOSP 2025',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '19-Jan-26', keteranganDetail: 'Biaya Perjalanan Dinas Ke Hotel Ayunda', qty: 1, hargaSatuan: 100000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.4',
    noDoc: 13,
    noBukti: 'B.01.070126',
    tanggalBudget: '7-Jan-26',
    keterangan: 'Term III Talenta',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '7-Jan-26', keteranganDetail: 'Transfer BSI a.n Mid Solusi Nusantara PT', qty: 1, hargaSatuan: 6660000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 14,
    noBukti: 'KK.05.150126',
    tanggalBudget: '15-Jan-26',
    keterangan: 'BBM Mobil OP',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '19-Dec-25', keteranganDetail: 'SPBU - Bensin Pertalite', qty: 1, hargaSatuan: 300000 },
      { noBuktiDetail: '2', tanggalDetail: '21-Dec-25', keteranganDetail: 'SPBU - Bensin Pertalite', qty: 1, hargaSatuan: 130000 },
      { noBuktiDetail: '3', tanggalDetail: '20-Dec-25', keteranganDetail: 'Lesehan Danau - Es Kelapa Dll', qty: 1, hargaSatuan: 64000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 15,
    noBukti: 'KK.04.150126',
    tanggalBudget: '15-Jan-26',
    keterangan: 'BBM dan Etoll BAZNAS',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Transportasi & Akomodasi', qty: 1, hargaSatuan: 491000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 16,
    noBukti: 'KK.03.150126',
    tanggalBudget: '15-Jan-26',
    keterangan: 'BBM Mobil OPS',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '19-Dec-25', keteranganDetail: 'SPBU - Bensin Pertalite', qty: 1, hargaSatuan: 300000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 17,
    noBukti: 'KK.02.190126',
    tanggalBudget: '19-Jan-26',
    keterangan: 'BBM Mobil SCB & Rumput',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '30-Dec-25', keteranganDetail: 'SPBU - Bensin Pertalite', qty: 1, hargaSatuan: 300000 },
      { noBuktiDetail: '2', tanggalDetail: '13-Jan-26', keteranganDetail: 'SPBU - Bensin Pertalite', qty: 1, hargaSatuan: 100000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 18,
    noBukti: 'KK.01.200126',
    tanggalBudget: '20-Jan-26',
    keterangan: 'Seal Pintu ELF',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Biaya Maintenance', qty: 1, hargaSatuan: 394000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 19,
    noBukti: 'KK.02.200126',
    tanggalBudget: '20-Jan-26',
    keterangan: 'BBM Motor OP',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Transportasi', qty: 1, hargaSatuan: 60000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 20,
    noBukti: 'KK.01.090126',
    tanggalBudget: '9-Jan-26',
    keterangan: 'Akomodasi ke BSI Dramaga',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '9-Jan-26', keteranganDetail: 'Goride', qty: 1, hargaSatuan: 41000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 21,
    noBukti: 'KK.04.130126',
    tanggalBudget: '13-Jan-26',
    keterangan: 'BBM Mobil Operasional Elf',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '15-Dec-25', keteranganDetail: 'SPBU - Bensin Bio Solar', qty: 1, hargaSatuan: 400000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 22,
    noBukti: 'KK.05.130126',
    tanggalBudget: '13-Jan-26',
    keterangan: 'BBM Mobil OP APV & Ambulance',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '21-Dec-25', keteranganDetail: 'SPBU - Bensin Pertalite', qty: 1, hargaSatuan: 150000 },
      { noBuktiDetail: '2', tanggalDetail: '17-Dec-25', keteranganDetail: 'SPBU - Bensin Bio Solar', qty: 1, hargaSatuan: 350000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 23,
    noBukti: 'KK.07.130126',
    tanggalBudget: '13-Jan-26',
    keterangan: 'BBM Mobil APV',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '15-Dec-25', keteranganDetail: 'SPBU - Bensin Pertalite', qty: 1, hargaSatuan: 350000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 24,
    noBukti: 'KK.01.150126',
    tanggalBudget: '15-Jan-26',
    keterangan: 'BBM Mobil OP',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '26-Dec-25', keteranganDetail: 'SPBU - Bensin Bio Solar', qty: 1, hargaSatuan: 400000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 25,
    noBukti: 'KK.04.190126',
    tanggalBudget: '19-Jan-26',
    keterangan: 'Antar Jemput Pemateri',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Bensin', qty: 1, hargaSatuan: 350000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 26,
    noBukti: 'KK.05.190126',
    tanggalBudget: '19-Jan-26',
    keterangan: 'Antar Jemput Pemateri',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Bensin', qty: 1, hargaSatuan: 350000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 27,
    noBukti: 'KK.06.190126',
    tanggalBudget: '19-Jan-26',
    keterangan: 'Antar Kegiatan Santri',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Bensin', qty: 1, hargaSatuan: 300000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 28,
    noBukti: 'KK.05.200126',
    tanggalBudget: '20-Jan-26',
    keterangan: 'Antar Kepala Sekolah ke Cibinong',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Bensin', qty: 1, hargaSatuan: 500000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 29,
    noBukti: 'KK.06.200126',
    tanggalBudget: '20-Jan-26',
    keterangan: 'Antar Kegiatan Santri',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Bensin', qty: 1, hargaSatuan: 300000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 30,
    noBukti: 'KK.07.200126',
    tanggalBudget: '20-Jan-26',
    keterangan: 'Antar Santri Sakit',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Bensin', qty: 1, hargaSatuan: 300000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 31,
    noBukti: 'KK.03.210126',
    tanggalBudget: '21-Jan-26',
    keterangan: 'Rekonsiliasi BOSP 2025',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Transportasi & Akomodasi', qty: 1, hargaSatuan: 223000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 32,
    noBukti: 'KK.02.210126',
    tanggalBudget: '21-Jan-26',
    keterangan: 'Akomodasi Pengurusan NPWP SCB',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '24-Dec-25', keteranganDetail: 'Ayam Penyet Edun - P.Bakar Komplit', qty: 1, hargaSatuan: 23000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 33,
    noBukti: 'KK.01.220126',
    tanggalBudget: '22-Jan-26',
    keterangan: 'Antar Berkas Keuangan',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Bensin', qty: 1, hargaSatuan: 420000 },
      { noBuktiDetail: 'b', keteranganDetail: 'Tol', qty: 1, hargaSatuan: 47000 },
      { noBuktiDetail: 'c', keteranganDetail: 'Makan', qty: 1, hargaSatuan: 23000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 34,
    noBukti: 'KK.02.220126',
    tanggalBudget: '22-Jan-26',
    keterangan: 'Antar Ustzh Ulya ke Bogor',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Bensin', qty: 1, hargaSatuan: 500000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 35,
    noBukti: 'KK.03.220126',
    tanggalBudget: '22-Jan-26',
    keterangan: 'Antar Kegiatan Santri',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Bensin', qty: 1, hargaSatuan: 350000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 36,
    noBukti: 'KK.01.230126',
    tanggalBudget: '23-Jan-26',
    keterangan: 'Akomodasi Rihlah Rohis SCB',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '22-Nov-25', keteranganDetail: 'Fee Driver Ambulan', qty: 1, hargaSatuan: 200000 },
      { noBuktiDetail: '2', tanggalDetail: '22-Nov-25', keteranganDetail: 'Nasi Pandang', qty: 1, hargaSatuan: 180000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.6',
    noDoc: 37,
    noBukti: 'KK.04.090126',
    tanggalBudget: '9-Jan-26',
    keterangan: 'Konsumsi Tamu PGRI',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '9-Jan-26', keteranganDetail: 'Transfer BSI a.n Koperasi Cendekia Syariah', qty: 1, hargaSatuan: 20000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.6',
    noDoc: 38,
    noBukti: 'KK.08.130126',
    tanggalBudget: '13-Jan-26',
    keterangan: 'Konsumsi Rapat Raker Akhir Tahun',
    details: [
      { noBuktiDetail: '1', keteranganDetail: 'KCCS - Minuman Cimory Dll', qty: 1, hargaSatuan: 110500 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.6',
    noDoc: 39,
    noBukti: 'KK.09.130126',
    tanggalBudget: '13-Jan-26',
    keterangan: 'Konsumsi Rapat Manajemen',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Konsumsi', qty: 1, hargaSatuan: 247000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.6',
    noDoc: 40,
    noBukti: 'KK.01.190126',
    tanggalBudget: '19-Jan-26',
    keterangan: 'Konsumsi Rapat Manajemen',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Konsumsi', qty: 1, hargaSatuan: 477000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.6',
    noDoc: 41,
    noBukti: 'KK.09.200126',
    tanggalBudget: '20-Jan-26',
    keterangan: 'Konsumsi Adiwiyata Akbar',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '19-Sep-25', keteranganDetail: 'KCCS - Konsumsi Adiwiyata', qty: 1, hargaSatuan: 200000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.9',
    noDoc: 42,
    noBukti: 'KK.02.090126',
    tanggalBudget: '9-Jan-26',
    keterangan: 'ATK Keuangan',
    details: [
      { noBuktiDetail: '1', keteranganDetail: 'Gebyar - Adner Bantex Dll', qty: 1, hargaSatuan: 504500 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.9',
    noDoc: 43,
    noBukti: 'KK.02.130126',
    tanggalBudget: '13-Jan-26',
    keterangan: 'ATK GA & Litbang',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '5-Jan-26', keteranganDetail: 'Progres Azmi - Kertas A4 Dll', qty: 1, hargaSatuan: 500000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.9',
    noDoc: 44,
    noBukti: 'KK.03.130126',
    tanggalBudget: '13-Jan-26',
    keterangan: 'Lakban Baterai dll',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Perlengkapan', qty: 1, hargaSatuan: 494000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.10',
    noDoc: 45,
    noBukti: 'KK.01.220126',
    tanggalBudget: '22-Jan-26',
    keterangan: 'Fotocopy Raport Semester Ganjil',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Perlengkapan', qty: 1, hargaSatuan: 460000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.11',
    noDoc: 46,
    noBukti: 'B.03.100126',
    tanggalBudget: '10-Jan-26',
    keterangan: 'Listrik Januari 2026',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Tagihan Listrik Bulan Januari 2026', qty: 1, hargaSatuan: 4715989 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.14',
    noDoc: 47,
    noBukti: 'B.02.100126',
    tanggalBudget: '10-Jan-26',
    keterangan: 'Astinet Januari 2026',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '10-Jan-26', keteranganDetail: 'Transfer BSI a.n Smp Cendekia BAZNAS', qty: 1, hargaSatuan: 6382500 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.15',
    noDoc: 48,
    noBukti: 'B.02.070126',
    tanggalBudget: '7-Jan-26',
    keterangan: 'Laundry Karpet Masjid Putra',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '16-Jan-26', keteranganDetail: 'Bunda Laundry - Cuci Karpet Masjid', qty: 1, hargaSatuan: 888000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.15',
    noDoc: 49,
    noBukti: 'KK.02.150126',
    tanggalBudget: '15-Jan-26',
    keterangan: 'Prepare Rumah Tahfidz SCB',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Perlengkapan', qty: 1, hargaSatuan: 461000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.15',
    noDoc: 50,
    noBukti: 'KK.04.200126',
    tanggalBudget: '20-Jan-26',
    keterangan: 'Tissue Staker dan Pipa',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Perlengkapan', qty: 1, hargaSatuan: 460000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.15',
    noDoc: 51,
    noBukti: 'KK.03.200126',
    tanggalBudget: '20-Jan-26',
    keterangan: 'Kamper WC anti Nyam',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '6-Jan-26', keteranganDetail: 'Pewangi Gantung Dll', qty: 1, hargaSatuan: 472000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O3.1.3',
    noDoc: 52,
    noBukti: 'KK.03.190126',
    tanggalBudget: '19-Jan-26',
    keterangan: 'Perbaikan Pompa Air',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '7-Jan-26', keteranganDetail: 'Barokah Teknik - Tanda Jet Pump', qty: 1, hargaSatuan: 400000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O3.1.3',
    noDoc: 53,
    noBukti: 'KK.03.090126',
    tanggalBudget: '9-Jan-26',
    keterangan: 'Plumbing Pipa Air',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '30-Dec-25', keteranganDetail: 'TB. Arinda Jaya - Pipa Dll', qty: 1, hargaSatuan: 459000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O3.1.3',
    noDoc: 54,
    noBukti: 'KK.06.130126',
    tanggalBudget: '13-Jan-26',
    keterangan: 'Stop Keran dan Water Mur',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '4-Jan-26', keteranganDetail: 'TB. Arinda Jaya - Stop Kran Dll', qty: 1, hargaSatuan: 428000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O3.1.3',
    noDoc: 55,
    noBukti: 'KK.01.260126',
    tanggalBudget: '26-Jan-26',
    keterangan: 'Service Mesin Air Toren PDAM',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '21-Jan-26', keteranganDetail: 'Zumisu 3/4', qty: 1, hargaSatuan: 260000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O3.1.6',
    noDoc: 56,
    noBukti: 'KK.01.130126',
    tanggalBudget: '13-Jan-26',
    keterangan: 'BBM Mesin Rumput',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Transportasi', qty: 1, hargaSatuan: 160000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O4.1',
    noDoc: 57,
    noBukti: 'B.01.280126',
    tanggalBudget: '28-Jan-26',
    keterangan: 'Insentif Relawan Kesehatan Januari 2026',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '28-Jan-26', keteranganDetail: 'Transfer BSI a.n Rahmat Hidayat', qty: 1, hargaSatuan: 1215000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O4.1',
    noDoc: 58,
    noBukti: 'KK.08.200126',
    tanggalBudget: '20-Jan-26',
    keterangan: 'Reward 5R Okt 25',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '12-Nov-25', keteranganDetail: 'Anggrek 2 - Print Sertifikat', qty: 1, hargaSatuan: 7000 },
      { noBuktiDetail: '2', tanggalDetail: '19-Nov-25', keteranganDetail: 'KCCS - Reward', qty: 1, hargaSatuan: 204000 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O4.1',
    noDoc: 59,
    noBukti: 'KK.10.200126',
    tanggalBudget: '20-Jan-26',
    keterangan: 'Pengobatan Santri',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Makanan,Obat & Pengobatan', qty: 1, hargaSatuan: 500610 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O5.1',
    noDoc: 60,
    noBukti: 'KK.06.150126',
    tanggalBudget: '15-Jan-26',
    keterangan: 'Langganan Koran Nov-Des 25',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '12-Jan-26', keteranganDetail: 'Transfer BSI a.n Bogor Ekspres Media PT', qty: 1, hargaSatuan: 202500 }
    ]
  },
  {
    account: 'SMP',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'S3.1',
    noDoc: 61,
    noBukti: 'B.03.070126',
    tanggalBudget: '7-Jan-26',
    keterangan: 'Honor Relawan Guru Fisika Desember 2025',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '7-Jan-26', keteranganDetail: 'Transfer BSI a.n Susilawati', qty: 1, hargaSatuan: 1080000 }
    ]
  }
];

export const DEFAULT_BAZNAS_RINCIAN_SMA_JAN_2026: BaznasRincianItem[] = [
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'K1.1.7',
    noDoc: 1,
    noBukti: 'B.07.220126',
    tanggalBudget: '22-Jan-26',
    keterangan: 'Klaim Kesehatan an Ust Siswadi',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Pengobatan', qty: 1, hargaSatuan: 1316460 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O1.1.11',
    noDoc: 2,
    noBukti: 'B.06.160126',
    tanggalBudget: '16-Jan-26',
    keterangan: 'Klaim Kesehatan an Ust Roni',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Pembelian Obat & Berobat', qty: 1, hargaSatuan: 3762601 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O1.1.11',
    noDoc: 3,
    noBukti: 'B.09.220126',
    tanggalBudget: '22-Jan-26',
    keterangan: 'Klaim Kesehatan an Ustzh Suci',
    details: [
      { noBuktiDetail: '1', keteranganDetail: 'Perlengkapan', qty: 1, hargaSatuan: 624897 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 4,
    noBukti: 'KK.05.220126',
    tanggalBudget: '22-Jan-26',
    keterangan: 'Lampu 10 Watt',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '21-Jan-26', keteranganDetail: 'Noci - Lampu 10W Led', qty: 1, hargaSatuan: 518000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 5,
    noBukti: 'KK.01.300126',
    tanggalBudget: '30-Jan-26',
    keterangan: 'Busi dan Oli Mesin R',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '30-Dec-25', keteranganDetail: 'Besi 2t Dll', qty: 1, hargaSatuan: 245000 },
      { noBuktiDetail: '2', keteranganDetail: 'SPBU - Bensin Pertalite', qty: 1, hargaSatuan: 36000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 6,
    noBukti: 'KK.02.300126',
    tanggalBudget: '30-Jan-26',
    keterangan: 'BBM Mobil OPS',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '15-Jan-26', keteranganDetail: 'SPBU - Bensin Pertalite', qty: 1, hargaSatuan: 300000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 7,
    noBukti: 'KK.03.300126',
    tanggalBudget: '30-Jan-26',
    keterangan: 'BBM Mobil APV',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '13-Jan-26', keteranganDetail: 'SPBU - Bensin Pertalite', qty: 1, hargaSatuan: 400000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 8,
    noBukti: 'KK.04.300126',
    tanggalBudget: '30-Jan-26',
    keterangan: 'BBM Mobil APV Bandara',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '17-Jan-26', keteranganDetail: 'SPBU - Bensin Pertalite', qty: 1, hargaSatuan: 400000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 9,
    noBukti: 'KK.06.300126',
    tanggalBudget: '30-Jan-26',
    keterangan: 'BBM Mobil OPS APV',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '10-Jan-26', keteranganDetail: 'SPBU - Bensin Pertalite', qty: 1, hargaSatuan: 200000 },
      { noBuktiDetail: '2', tanggalDetail: '6-Jan-26', keteranganDetail: 'SPBU - Bensin Bio Solar', qty: 1, hargaSatuan: 300000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 10,
    noBukti: 'KK.07.300126',
    tanggalBudget: '30-Jan-26',
    keterangan: 'BBM Mobil OP Dramaga',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '10-Jan-26', keteranganDetail: 'SPBU - Bensin Bio Solar', qty: 1, hargaSatuan: 200000 },
      { noBuktiDetail: '2', tanggalDetail: '10-Jan-26', keteranganDetail: 'SPBU - Bensin Pertalite', qty: 1, hargaSatuan: 300000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 11,
    noBukti: 'KK.08.300126',
    tanggalBudget: '30-Jan-26',
    keterangan: 'BBM Mobil ELF',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '9-Jan-26', keteranganDetail: 'SPBU - Bensin Bio Solar', qty: 1, hargaSatuan: 200000 },
      { noBuktiDetail: '2', tanggalDetail: '8-Jan-26', keteranganDetail: 'SPBU - Bensin Bio Solar', qty: 1, hargaSatuan: 300000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.5',
    noDoc: 12,
    noBukti: 'KK.09.300126',
    tanggalBudget: '30-Jan-26',
    keterangan: 'BBM dan Tol BAZNAS',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Transportasi', qty: 1, hargaSatuan: 508000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.7',
    noDoc: 13,
    noBukti: 'B.06.220126',
    tanggalBudget: '22-Jan-26',
    keterangan: 'Tunj Komunikasi Adiwiyata Januari 2026',
    details: [
      { noBuktiDetail: '1', keteranganDetail: 'Bacth Transfer BSI', qty: 1, hargaSatuan: 995000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.12',
    noDoc: 14,
    noBukti: 'B.08.221026',
    tanggalBudget: '22-Jan-26',
    keterangan: 'Pulsa HP Admin Januari 2026',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '19-Jan-02', keteranganDetail: 'Transfer SeaBank Kartu Halo', qty: 1, hargaSatuan: 202300 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.13',
    noDoc: 15,
    noBukti: 'B.03.090126',
    tanggalBudget: '9-Jan-26',
    keterangan: 'PDAM Desember 2025',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '9-Jan-26', keteranganDetail: 'Transfer BSI a.n Sekolah Cendikia Baznas', qty: 1, hargaSatuan: 356950 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.14',
    noDoc: 16,
    noBukti: 'B.04.090126',
    tanggalBudget: '9-Jan-26',
    keterangan: 'Megavision Januari 26',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '9-Jan-26', keteranganDetail: 'Transfer BSI a.n SMP Cendekia BAZNAS', qty: 1, hargaSatuan: 438450 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.14',
    noDoc: 17,
    noBukti: 'B.05.160126',
    tanggalBudget: '16-Jan-26',
    keterangan: 'Indihome Januari 2026',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '16-Jan-26', keteranganDetail: 'Transfer BSI a.n Smp Cendekia Baznas', qty: 1, hargaSatuan: 1040350 },
      { noBuktiDetail: '2', tanggalDetail: '16-Jan-26', keteranganDetail: 'Transfer BSI a.n Smp Cendekia Baznas', qty: 1, hargaSatuan: 640750 },
      { noBuktiDetail: '3', tanggalDetail: '16-Jan-26', keteranganDetail: 'Transfer BSI a.n Smp Cendekia Baznas', qty: 1, hargaSatuan: 578590 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.15',
    noDoc: 18,
    noBukti: 'KK.04.220126',
    tanggalBudget: '22-Jan-26',
    keterangan: 'Gembok Besar Kunci',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '19-Jan-26', keteranganDetail: 'TB. Arinda Jaya - Gembok 24', qty: 1, hargaSatuan: 386000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.15',
    noDoc: 19,
    noBukti: 'KK.10.300126',
    tanggalBudget: '30-Jan-26',
    keterangan: 'Handle Pintu Klinik',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '20-Jan-26', keteranganDetail: "TB. Arinda Jaya - Batang Pipa 2'' Dll", qty: 1, hargaSatuan: 270000 },
      { noBuktiDetail: '2', tanggalDetail: '11-Jan-26', keteranganDetail: 'TB. Arinda Jaya - Handle Pintu', qty: 1, hargaSatuan: 240000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O2.1.17',
    noDoc: 20,
    noBukti: 'B.01.300126',
    tanggalBudget: '30-Jan-26',
    keterangan: 'Iuran Sampah Januari 2026',
    details: [
      { noBuktiDetail: '1', keteranganDetail: 'DKP Galuga - Jasa Angkutan Sampah', qty: 1, hargaSatuan: 250000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Januari',
    year: '2026',
    kodeBudget: 'O3.1.3',
    noDoc: 21,
    noBukti: 'KK.05.300126',
    tanggalBudget: '30-Jan-26',
    keterangan: 'Sok Drat Kran',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '16-Jan-26', keteranganDetail: 'TB. Arinda Jaya - Keramik Dll', qty: 1, hargaSatuan: 483000 }
    ]
  }
];

export const DEFAULT_BAZNAS_SETTLEMENT_SMA_JUNI_2026 = [
  {
    account: 'SMA',
    month: 'Juni',
    year: '2026',
    kodeBudget: 'A1.3.1',
    namaAnggaran: 'Berkah Ramadhan dan Wisuda Quran',
    noDoc: 161,
    noBukti: 'FS.04.290626',
    tanggalBudget: '29-Jun-26',
    keterangan: 'Pameran LTM 2026',
    debit: 'UM.24.060526',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Peralatan, Konsumsi & Transport', qty: 1, hargaSatuan: 950000 },
      { noBuktiDetail: 'b', keteranganDetail: 'Insentif', qty: 1, hargaSatuan: 300000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Juni',
    year: '2026',
    kodeBudget: 'K1.1.7',
    namaAnggaran: 'Dana Kesehatan Amil Tetap (Guru)',
    noDoc: 162,
    noBukti: 'B.05.240626',
    tanggalBudget: '24-Jun-26',
    keterangan: 'Klaim Kesehatan an Ust Siswadi',
    debit: '',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Pengobatan', qty: 1, hargaSatuan: 501500 }
    ]
  },
  {
    account: 'SMA',
    month: 'Juni',
    year: '2026',
    kodeBudget: 'K1.1.7',
    namaAnggaran: 'Dana Kesehatan Amil Tetap (Guru)',
    noDoc: 163,
    noBukti: 'B.06.240626',
    tanggalBudget: '24-Jun-26',
    keterangan: 'Klaim Kesehatan an Ust Ahmad',
    debit: '',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Obat & Suplement', qty: 1, hargaSatuan: 631540 }
    ]
  },
  {
    account: 'SMA',
    month: 'Juni',
    year: '2026',
    kodeBudget: 'K1.1.7',
    namaAnggaran: 'Dana Kesehatan Amil Tetap (Guru)',
    noDoc: 164,
    noBukti: 'B.01.260626',
    tanggalBudget: '26-Jun-26',
    keterangan: 'Klaim Kesehatan an Ustzh Hanifah',
    debit: '',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '31-Mar-26', keteranganDetail: 'Apotek KF Bojong Gede - Caplang dll', qty: 1, hargaSatuan: 969909 }
    ]
  },
  {
    account: 'SMA',
    month: 'Juni',
    year: '2026',
    kodeBudget: 'K1.1.9',
    namaAnggaran: 'Tunjangan Fungsional',
    noDoc: 165,
    noBukti: 'B.03.020626',
    tanggalBudget: '2-Jun-26',
    keterangan: 'Tunjangan Funsional Mei 2026',
    debit: '',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '2-Jun-26', keteranganDetail: 'Batch Transfer BSI', qty: 1, hargaSatuan: 1900000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Juni',
    year: '2026',
    kodeBudget: 'K1.4.7',
    namaAnggaran: 'Olimpiade Matematika',
    noDoc: 166,
    noBukti: 'B.13.040626',
    tanggalBudget: '4-Jun-26',
    keterangan: 'OSPENAS 2026',
    debit: '',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Konsumsi', qty: 1, hargaSatuan: 90000 },
      { noBuktiDetail: 'b', keteranganDetail: 'Insentif', qty: 9, hargaSatuan: 100000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Juni',
    year: '2026',
    kodeBudget: 'K1.8',
    namaAnggaran: 'Sukses PTN (Diagnostic Test dan Peminatan Siswa)',
    noDoc: 167,
    noBukti: 'B.12.040626',
    tanggalBudget: '4-Jun-26',
    keterangan: 'Supercamp UTBK Mandiri April Mei',
    debit: '',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '10-Oct-26', keteranganDetail: 'CV. Azzam Edutalent - Super Camp UTBK', qty: 1, hargaSatuan: 8400000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Juni',
    year: '2026',
    kodeBudget: 'O2.1.1',
    namaAnggaran: 'Biaya Pengadaan Perlengkapan Kantor',
    noDoc: 202,
    noBukti: 'KK.01.110626',
    tanggalBudget: '11-Jun-26',
    keterangan: 'Kebutuhan Kantor OP',
    debit: '',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Perlengkapan', qty: 1, hargaSatuan: 241000 },
      { noBuktiDetail: 'a', keteranganDetail: 'Perlengkapan', qty: 1, hargaSatuan: 131000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Juni',
    year: '2026',
    kodeBudget: 'O2.1.1',
    namaAnggaran: 'Biaya Pengadaan Perlengkapan Kantor',
    noDoc: 203,
    noBukti: 'KK.02.220626',
    tanggalBudget: '22-Jun-26',
    keterangan: 'Pemangkasan 6 Pohon',
    debit: '',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '9-Jun-26', keteranganDetail: 'Jasa Pemangkasan Pohon a.n Andri Halim', qty: 1, hargaSatuan: 360000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Juni',
    year: '2026',
    kodeBudget: 'O2.1.1',
    namaAnggaran: 'Biaya Pengadaan Perlengkapan Kantor',
    noDoc: 204,
    noBukti: 'KK.03.220626',
    tanggalBudget: '22-Jun-26',
    keterangan: 'Pemangkasan 10 pohon',
    debit: '',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '9-Jun-26', keteranganDetail: 'Jasa Pemangkasan Pohon a.n Andri Halim', qty: 1, hargaSatuan: 500000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Juni',
    year: '2026',
    kodeBudget: 'O2.1.17',
    namaAnggaran: 'Biaya Iuran Lingkungan',
    noDoc: 205,
    noBukti: 'B.09.040626',
    tanggalBudget: '4-Jun-26',
    keterangan: 'Iuran Sampah Mei 2026',
    debit: '',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '4-Jun-26', keteranganDetail: 'DKP Galuga - Retribusi Kebersihan Mei 2026', qty: 1, hargaSatuan: 1250000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Juni',
    year: '2026',
    kodeBudget: 'O3.1.2',
    namaAnggaran: 'Biaya Perbaikan pintu dan jendela',
    noDoc: 206,
    noBukti: 'FS.16.170626',
    tanggalBudget: '17-Jun-26',
    keterangan: 'Kunci Pintu Asrama Putera',
    debit: 'UM.02.050326',
    details: [
      { noBuktiDetail: '1', tanggalDetail: '14-Apr-26', keteranganDetail: 'TB. Arinda Jaya - Kunci Set & Jendela Frame', qty: 1, hargaSatuan: 2260000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Juni',
    year: '2026',
    kodeBudget: 'S3.1',
    namaAnggaran: 'Ekstrakulikuler',
    noDoc: 207,
    noBukti: 'FS.03.110626',
    tanggalBudget: '11-Jun-26',
    keterangan: 'IKMC 2026',
    debit: 'UM.05.230426',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Registrasi', qty: 1, hargaSatuan: 750000 },
      { noBuktiDetail: 'b', keteranganDetail: 'Insentif', qty: 1, hargaSatuan: 200000 }
    ]
  },
  {
    account: 'SMA',
    month: 'Juni',
    year: '2026',
    kodeBudget: 'S3.1',
    namaAnggaran: 'Ekstrakulikuler',
    noDoc: 208,
    noBukti: 'B.03.190626',
    tanggalBudget: '19-Jun-26',
    keterangan: 'Honor Pembina Ekskul Mei 2026',
    debit: '',
    details: [
      { noBuktiDetail: 'a', keteranganDetail: 'Batch Transfer BSI', qty: 1, hargaSatuan: 4440000 }
    ]
  }
];
