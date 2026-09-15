const fs = require("fs");

const raw = `TGL, NO. DOC , ALOKASI ANGGARAN , PIC ,KETERANGAN,DEBET,KREDIT,SALDO AKHIR
,,,,SALDO AWAL,,,30.759.759
15-Jan-26,Titipan Uang Saku,Titipan Uang Saku,Titipan Uang Saku,SANTRI BINAAN,450.000,,31.209.759
15-Jan-26,Donasi Koperasi,Donasi Koperasi,Fuad,Dana SHU koperasi bidang Sosial Trf Dari - KOPERASI CENDEKIA SYARIAH,2.810.305,,34.020.064
20-Jan-26,CAD.01.200126,Biaya Transport,Feri,CA BBM Ambulance Trf Ke - FERRI WIDIANTARA,,500.000,33.520.064
20-Jan-26,CAD.02.200126,Biaya Transport,Feri,CA BBM Ambulance Trf Ke - FERRI WIDIANTARA,,200.000,33.320.064
20-Jan-26,CAD.03.200126,Biaya Transport,Sarah,CA Menjemput Wali Santri Trf Ke - SARAH ROUDHOTUL AULIA,,550.000,32.770.064
21-Jan-26,KK.01.220126,BOSP,Dany,PertCA Sosialisasi BOSP Trf Dari - DANY WAHYUDI,110.000,,32.880.064
22-Jan-26,CAD.01.220126,Biaya Transport,Yogi,CA BBM Mobil APV Trf Ke - YOGI SYAHPUTRA,,500.000,32.380.064
22-Jan-26,CAD.02.220126,Biaya Transport,Yogi,Ambil Roti ke BAZNAS Trf Ke - YOGI SYAHPUTRA,,500.000,31.880.064
23-Jan-26,Donasi,Donasi,Ahmad,donasi ZIS narasumber khatib dan pa nen Trf Dari - AHMAD KAMALUDDIN AFIF,540.000,,32.420.064
23-Jan-26,CAD.01.230126,Biaya Transport,Yogi,CA Bbm mobil ELF Trf Ke - YOGI SYAHPUTRA,,500.000,31.920.064
30-Jan-26,KK.01.300126,Biaya Rumah Tangga,Suci,Konsumsi Rapat Neoschool Trf Ke - SUCI SAFARI MUHAZIRIN,,68.000,31.852.064
30-Jan-26,KK.02.300126,Biaya Cetak dan FC,Suci,ATK Kantor dan Foto Trf Ke - SUCI SAFARI MUHAZIRIN,,137.500,31.714.564
30-Jan-26,CAD.01.300126,Biaya Transport,Yogi,CA BBM Survei Faktual 1 Trf Ke - YOGI SYAHPUTRA,,500.000,31.214.564
30-Jan-26,CAD.02.300126,Biaya Transport,Yogi,CA BBM Survei Faktual 2 Trf Ke - YOGI SYAHPUTRA,,500.000,30.714.564
30-Jan-26,CAD.03.300126,Biaya Transport,Yogi,CA BBM Survei Faktual 3 Trf Ke - YOGI SYAHPUTRA,,500.000,30.214.564
30-Jan-26,CAD.04.300126,Biaya Transport,Yogi,CA BBM Survei Faktual 4 Trf Ke - YOGI SYAHPUTRA,,500.000,29.714.564
30-Jan-26,CAD.05.300126,Biaya Transport,Yogi,CA BBM Survei Faktual 5 Trf Ke - YOGI SYAHPUTRA,,500.000,29.214.564
31-Jan-26,Biaya Admin,Biaya Admin,Biaya Admin,Biaya Administrasi,,15.000,29.199.564
5-Feb-26,Titipan Uang Saku,Titipan Uang Saku,BAZNAS,SANTRI BINAAN 3 SISWA,450.000,,29.649.564
7-Feb-26,Titipan Uang Saku,Titipan Uang Saku,Hanifah,Titipan Uang Saku Siswa Riau Trf Ke - HANIFAH,,900.000,28.749.564
7-Feb-26,Titipan Uang Saku,Titipan Uang Saku,BAZNAS,Saku Januri dan Februari 2026 Trf Dari - BAZNAS PROVINSI PAPUA,3.300.000,,32.049.564
22-Feb-26,Donasi,Donasi,Helmi,Pemindahbukuan Trf Dari - HELMI NURSIRWAN,1.000.000,,33.049.564
23-Feb-26,Donasi,Donasi,Ahmad,Donasi Zis TPG Trf Dari - AHMAD KAMALUDDIN AFIF,285.000,,33.334.564
28-Feb-26,Biaya Admin,Biaya Admin,Biaya Admin,Biaya Administrasi,,15.000,33.319.564
3-Mar-26,,Biaya Transport,,CA Antar Kelas 12 Taman Islam Trf Ke - FERRI WIDIANTARA,,300.000,33.019.564
3-Mar-26,,BOS,,Penggantian Biaya Admin Dana BOS Trf Ke - NANANG KURNIA,,55.000,32.964.564
4-Mar-26,,FINANCE,,Penukaran Uang Baru Koperasi 10jt Trf Ke - BSI NET BANKING KCP MERDEKA,,10.000.000,22.964.564
5-Mar-26,,Titipan Uang Saku,,UM Uang Saku Santri BAZNAS Riau Pap ua Trf Ke - HANIFAH,,7.500.000,15.464.564
6-Mar-26,,TPG,,infaq tpg januari februari Trf Dari - MUHAMMAD GILANG PERMANA,500.000,,15.964.564
6-Mar-26,,TPG,,donasi serdik Trf Dari - SUMARNI PUTRI,570.000,,16.534.564
6-Mar-26,,TPG,,infaq TPG Jan Trf Dari - MAULIDA GITA CAHYANI,282.000,,16.816.564
10-Mar-26,,FINANCE,,Pemindahbukuan Trf Dari - MUHAMAD AZAR,500.000,,17.316.564
10-Mar-26,,Titipan Uang Saku,,SANTRI BINAAN 3 SISWA,450.000,,17.766.564
10-Mar-26,,FINANCE,,BIFAST - TRF Dari - Bank Seabank DAUD BACHTIAR,500.000,,18.266.564
10-Mar-26,,FINANCE,,Penukaran uang Trf Dari - AHMAD KAMALUDDIN AFIF,1.000.000,,19.266.564
10-Mar-26,,FINANCE,,Pemindahbukuan Trf Dari - HELMI NURSIRWAN,1.000.000,,20.266.564
10-Mar-26,,FINANCE,,tukar Trf Dari - SISWADI DINIANTO,1.000.001,,21.266.565
10-Mar-26,,FINANCE,,tuker cash 500 Rb fahmi Trf Dari - FAHMI HIDAYAH SUBANDI,500.000,,21.766.565
10-Mar-26,,FINANCE,,BIFAST - TRF Dari - Bank Seabank HANA USWATUN HASANAH,500.000,,22.266.565
10-Mar-26,,FINANCE,,tukran uang Trf Dari - INDAH FEBRI ANNISA,500.000,,22.766.565
10-Mar-26,,FINANCE,,tukaran uang sihab Trf Dari - SIHABUDIN,500.000,,23.266.565
10-Mar-26,,FINANCE,,tuker uang 10000 Trf Dari - MUHAMAD AZAR,500.000,,23.766.565
10-Mar-26,,FINANCE,,tukar uang Trf Dari - WINDI,1.000.000,,24.766.565
10-Mar-26,,FINANCE,,tukeran uang cash Trf Dari - HERI KISWANTO,500.000,,25.266.565
10-Mar-26,,FINANCE,,Tuker Uang Baru,,10.000.000,15.266.565
10-Mar-26,,FINANCE,,Tukar uang baru Dany Trf Dari - DANY WAHYUDI,1.000.000,,16.266.565
11-Mar-26,,TPG,,TGP 2 bulan Trf Dari - EVI SILVIA,564.000,,16.830.565
11-Mar-26,,FINANCE,,tukar uang 100 5 lembar Trf Dari - FUAD HABIBI SIREGAR,500.000,,17.330.565
11-Mar-26,,FINANCE,,Tukar Uang Baru Trf Dari - SUCI SAFARI MUHAZIRIN,500.000,,17.830.565
11-Mar-26,,FINANCE,,Pemindahbukuan Trf Dari - DINA MUTIA RAHMAH,500.000,,18.330.565
11-Mar-26,,FINANCE,,tuker uang Trf Dari - NUR ASIAH,1.000.000,,19.330.565
12-Mar-26,,FINANCE,,Hajan dan Hilmi Trf Dari - MUHAMMAD HAJAN MAKBULA,1.000.000,,20.330.565
12-Mar-26,,FINANCE,,tukar uang baru ramadhan Trf Dari - Nur Aliman Syidik,500.000,,20.830.565
12-Mar-26,,FINANCE,,tukar uang Trf Dari - MUHAMMAD GILANG PERMANA,500.000,,21.330.565
12-Mar-26,,FINANCE,,Pemindahbukuan Trf Dari - MUHAMMAD HASAN TUTUPOHO,500.000,,21.830.565
12-Mar-26,,FINANCE,,Pemindahbukuan Trf Dari - MUHAMAD DIRHAM NUGRAHA,500.000,,22.330.565
12-Mar-26,,FINANCE,,tukar uang baru farhan Trf Dari - FARHAN INSAN,500.000,,22.830.565
13-Mar-26,,TPG,,sdqh TPG jan feb 26 Trf Dari - SISWADI DINIANTO,525.000,,23.355.565
13-Mar-26,,TPG,,zis tpg feb Trf Dari - AHMAD KAMALUDDIN AFIF,280.000,,23.635.565
13-Mar-26,,FINANCE,,FL1105821279-1270-58212790 Trf Dari - PT FLIP,500.000,,24.135.565
14-Mar-26,,Donasi,,zis narsum pemateri kegiatan Trf Dari - AHMAD KAMALUDDIN AFIF,850.000,,24.985.565
15-Mar-26,,Donasi,,zis panen sayur Trf Dari - AHMAD KAMALUDDIN AFIF,350.000,,25.335.565
31-Mar-26,,FINANCE,,tuker uang satu setengah juta Trf Dari - FUAD HABIBI SIREGAR,1.500.000,,26.835.565
31-Mar-26,,Biaya Admin,,Biaya Administrasi,,15.000,26.820.565
9-Apr-26,,Donasi,,BIFAST - TRF Dari - Bank Seabank SUCI SAFARI MUHAZIRIN S PI,26.000,,26.846.565
13-Apr-26,,Titipan Uang Saku,,uang saku scb kalsel Trf Dari - ABDUL HAKIM,3.000.000,,29.846.565
13-Apr-26,,Titipan Uang Saku,,UANG SAKU 3 SANTRI BINAAN BAZNAS,450.000,,30.296.565
15-Apr-26,,TPG,,BIFAST - TRF Dari - Bank Seabank NANANG KURNIA,200.000,,30.496.565
15-Apr-26,,TPG,,BIFAST - TRF Dari - Bank Seabank SIHABUDIN,500.000,,30.996.565
18-Apr-26,,TPG,,sdqh TPG Januari Februari 26 Trf Dari - MUHAMMAD FAT CHURROHMAN,440.000,,31.436.565
18-Apr-26,,TPG,,Donasi Zis TPG dan narsum Trf Dari - AHMAD KAMALUDDIN AFIF,530.000,,31.966.565
23-Apr-26,,Titipan Uang Saku,,Saku Santri April Trf Dari - BAZNAS PROVINSI PAPUA,1.650.000,,33.616.565
23-Apr-26,,Titipan Uang Saku,,UM Uang Saku Santri Kalsel April Trf Ke - HANIFAH,,3.000.000,30.616.565
24-Apr-26,,TPG,,infak tpg maret dan april Trf Dari - SUMARNI PUTRI,570.000,,31.186.565
25-Apr-26,,TPG,,BIFAST - TRF Dari - BANK BNI HERI KISWANTO,637.500,,31.824.065
25-Apr-26,,Donasi,,BIFAST - TRF Dari - Bank BRI Jkt ASEP OKI HANDOKO,3.000.000,,34.824.065
30-Apr-26,,Biaya Admin,,Biaya Administrasi,,15.000,34.809.065
6-Mei-26,,TPG,,Infaq TPG feb mar apr Trf Dari - MAULIDA GITA CAHYANI,846.000,,35.655.065
8-Mei-26,,TPG,,TPG maret april Trf Dari - EVI SILVIA,564.000,,36.219.065
8-Mei-26,,TPG,,sdqh tpg mrt apr26 Trf Dari - SISWADI DINIANTO,525.034,,36.744.099
12-Mei-26,,Titipan Uang Saku,,Saku Santri mei 2026 Trf Dari - BAZNAS PROVINSI PAPUA,1.650.000,,38.394.099
12-Mei-26,,Titipan Uang Saku,,saku santri mei 2026 Trf Dari - BAZNAS PROVINSI PAPUA,1.650.000,,40.044.099
12-Mei-26,,Donasi,,BIFAST - TRF Dari - Bank BRI Jkt RD AHMAD GOZALI,100.000,,40.144.099
14-Mei-26,,TPG,,sedekah tpg maret april 26 Trf Dari - MUHAMMAD FAT CHURROHMAN,547.500,,40.691.599
19-Mei-26,,TPG,,Infaq Sertifikasi Trf Dari - NANANG KURNIA,200.000,,40.891.599
21-Mei-26,,BOS,,UM Biaya Partisipasi Kegiatan Subra yon Trf Ke - DANY WAHYUDI,,4.650.500,36.241.099
26-Mei-26,,Biaya Transport,,CA Antar Daging Qurban Trf Ke - YOGI SYAHPUTRA,,350.000,35.891.099
26-Mei-26,,Biaya Transport,,CA Antar Berkas Keuangan Trf Ke - YOGI SYAHPUTRA,,500.000,35.391.099
26-Mei-26,,Biaya Rumah Tangga,,CA Perbaikan TOA Jalur Trf Ke - WINDI,,500.000,34.891.099
26-Mei-26,,TPG,,infak tpg bulan mei 2026 Trf Dari - SUMARNI PUTRI,285.000,,35.176.099
28-Mei-26,,Biaya Transport,,CA Antar Jemput Pemateri Trf Ke - YOGI SYAHPUTRA,,500.000,34.676.099
29-Mei-26,,Donasi,,donasi zis TPG Ahmad Kamal Trf Dari - AHMAD KAMALUDDIN AFIF,285.000,,34.961.099
31-Mei-26,,Biaya Admin,,Biaya Administrasi,,15.000,34.946.099
3-Jun-26,,TPG,,Infaq Sertifikasi Trf Dari - NANANG KURNIA,250.000,,35.196.099
3-Jun-26,,TPG,,BIFAST - TRF Dari - Bank Seabank SIHABUDIN,500.000,,35.696.099
4-Jun-26,,Titipan Uang Saku,,UM Uang Saku Siswa Riau Maret April Trf Ke - HANIFAH,,900.000,34.796.099
4-Jun-26,,Titipan Uang Saku,,UM Uang Saku Siswa Papua Apr Jun Trf Ke - HANIFAH,,4.950.000,29.846.099
12-Jun-26,,Titipan Uang Saku,,SANTRI BINAAN BAZNAS JUNI 2026,450.000,,30.296.099
17-Jun-26,,Donasi,,146810zaperjne Trf Dari - DANA BAZNAS ZAKAT,89.162.500,,119.458.599
19-Jun-26,,Donasi,,BIFAST - TRF Dari - Bank BRI Jkt RD AHMAD GOZALI,100.000,,119.558.599
22-Jun-26,,Biaya Rumah Tangga,,Biaya Pemindahbukuan e-Banking,,110,119.558.489
22-Jun-26,,Biaya Rumah Tangga,,260622100938-6045085224689999-10329 13357-TPD-IB-UBP,,1.017.040,118.541.449
24-Jun-26,,PIP,,UM Pengurusan PIP SMP SMA Trf Ke - Nur Aliman Syidik,,1.965.000,116.576.449
25-Jun-26,,Donasi,,Donasi zis narsum Trf Dari - AHMAD KAMALUDDIN AFIF,250.000,,116.826.449
26-Jun-26,,Donasi,,"Pengembalian Sisa Pembelian Donasi Laptop Trf Ke - DANA BAZNAS
ZAKAT",,5.350,116.821.099
26-Jun-26,,Donasi,,Dana Talangan Pembelian Donasi Lapt op Trf Ke - SMA CENDEKIA BAZNAS 1,,88.000.000,28.821.099
26-Jun-26,,Donasi,,donasi zis tpg Trf Dari - AHMAD KAMALUDDIN AFIF,285.000,,29.106.099
30-Jun-26,,Biaya Admin,,Biaya Administrasi,,15.000,29.091.099
8-Jul-26,,Biaya Transport,,CA Nganter Santri ke BTM Trf Ke - YOGI SYAHPUTRA,,"300,000",29.090.799
9-Jul-26,,Biaya Transport,,CA Antar Survei Trf Ke - YOGI SYAHPUTRA,,"500,000",29.090.299
9-Jul-26,,TPG,,tpg sertifikasi bulan mei  juni Trf Dari - MUHAMMAD FAT CHURROHMAN,"400,000",,29.090.699
10-Jul-26,,FINANCE,,260710101838-417134301000-103291335 7-BPJSTK-IB-UBP,,11.325.269,17.765.430
10-Jul-26,,Donasi,,BIFAST - TRF Dari - Bank BTPN HAMDAN,"15,000",,17.765.445
16-Jul-26,,Biaya Rumah Tangga,,CA Pipa Tambahan Cianten Trf Ke - WINDI,,"500,000",17.764.945
16-Jul-26,,Biaya Rumah Tangga,,Pipa Tambahan Cianten 2 Trf Ke - WINDI,,"500,000",17.764.445
16-Jul-26,,Biaya Rumah Tangga,,CA Instalasi Pipa Cianten Trf Ke - WINDI,,"500,000",17.763.945
16-Jul-26,,FINANCE,,Pengembalian Talangan BPJS TK Juli 2026 Trf Dari - SMP CENDEKIA BAZNAS 1,11.325.270,,29.089.215
16-Jul-26,,Donasi,,BIFAST - TRF Dari - Bank BRI Jkt RD AHMAD GOZALI,"100,000",,29.089.315
17-Jul-26,,TPG,,donasi TPG sis bln Mei Juni Trf Dari - SISWADI DINIANTO,"534,000",,29.089.849
17-Jul-26,,TPG,,TPG Mei Juni Trf Dari - EVI SILVIA,"564,000",,29.090.413
18-Jul-26,,Biaya Transport,,CA Antar Paskibra Cibinong Trf Ke - YOGI SYAHPUTRA,,"400,000",29.090.013
20-Jul-26,,Donasi,,Dana dari MBG untuk SCB Trf Dari - HILMI MUHAMMAD YUSRIN,4.130.000,,33.220.013
22-Jul-26,,Wakaf Sumur,,wakaf sumur scb Trf Dari - HANIFAH,1.200.000,,34.420.013
23-Jul-26,,Titipan Uang Saku,,MHS BINAAN BAZNAS AN FILZA GHASSANI,"450,000",,34.420.463
26-Jul-26,,Wakaf Sumur,,wakaf sumur Trf Dari - HANIFAH,"200,000",,34.420.663
28-Jul-26,,Biaya Rumah Tangga,,CA Konsumsi Rapat Manajemen Trf Ke - SUCI SAFARI MUHAZIRIN,,"500,000",34.420.163
31-Jul-26,,Titipan Uang Saku,,Saku 7Santri SCB Trf Dari - BAZNAS PROVINSI PAPUA,1.050.000,,35.470.163
31-Jul-26,,Biaya Admin,,Biaya Administrasi,,"15,000",35.470.148
1-Agu-26,,Wakaf Sumur,,wakaf sumur Trf Dari - HANIFAH,750.000,,36.220.148
3-Agu-26,,Donasi,,Donasi M Rasyid Maulana Trf Dari - SUCI SAFARI MUHAZIRIN,45.000,,36.265.148
4-Agu-26,,Biaya Rumah Tangga,,UM Tutup Sumur Masjid Trf Ke - WINDI,,1.580.000,34.685.148
4-Agu-26,,Biaya Rumah Tangga,,UM Instalasi Pipa Air Trf Ke - WINDI,,742.000,33.943.148
4-Agu-26,,Biaya Rumah Tangga,,UM Mesin Semi Jet Pump Sumur Trf Ke - WINDI,,2.525.000,31.418.148
4-Agu-26,,Donasi,,Dana MBG untuk SCB Trf Dari - HILMI MUHAMMAD YUSRIN,950.000,,32.368.148
14-Agu-26,,Titipan Uang Saku,,BIFAST - TRF Dari - Bank BRI Jkt TEGUH SUSILO,450.000,,32.818.148
21-Agu-26,,Donasi,,BIFAST - TRF Dari - Bank BRI Jkt RD AHMAD GOZALI,100.000,,32.918.148
21-Agu-26,,Biaya Transport,,Akomodasi Pimpinan BAZNAS Trf Ke - YOGI SYAHPUTRA,,1.500.000,31.418.148
25-Agu-26,,Biaya Transport,,CA BBM Mobil APV Bengkel Trf Ke - YOGI SYAHPUTRA,,500.000,30.918.148
25-Agu-26,,Biaya Transport,,CA BBM APV Trf Ke - YOGI SYAHPUTRA,,300.000,30.618.148
25-Agu-26,,Biaya Rumah Tangga,,Akomodasi Retribusi PBG SCB Trf Ke - NUR ASIAH,,2.745.000,27.873.148
25-Agu-26,,Biaya Transport,,CA Rapat Pertemuan BAZNAS Siak Trf Ke - FIRMAN MAULANA AKHSAN,,700.000,27.173.148
26-Agu-26,,Titipan Uang Saku,,Uang Saku Agustus 7 Santri Trf Dari - BAZNAS PROVINSI PAPUA,150.000,,27.323.148
26-Agu-26,,Biaya Transport,,Akomodasi Antar BAZNAS RIAU Trf Ke - YOGI SYAHPUTRA,,500.000,26.823.148
26-Agu-26,,Biaya Transport,,CA Pengisian Genset Trf Ke - YOGI SYAHPUTRA,,350.000,26.473.148
28-Agu-26,,Biaya Transport,,CA Antar ke Puskesmas dan Bk Trf Ke - FERRI WIDIANTARA,,300.000,26.173.148
31-Agu-26,,Biaya Transport,,CA Antar Santri Sakit - TRF Ke - YOGI SYAHPUTRA,,300.000,25.873.148
31-Agu-26,,Biaya Transport,,CA Antar Berkas Keuangan - TRF Ke - YOGI SYAHPUTRA,,500.000,25.373.148
31-Agu-26,,Biaya Transport,,CA BBM Ke Medika Dramaga - TRF Ke - FERRI WIDIANTARA,,300.000,25.073.148
31-Agu-26,,Biaya Admin,,Biaya Administrasi,,15.000,25.058.148`;

function parseCSV(text) {
  const lines = [];
  let curLine = [];
  let curVal = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      curLine.push(curVal.trim());
      curVal = "";
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && text[i+1] === '\n') i++;
      curLine.push(curVal.trim());
      if (curLine.some(x => x.length > 0)) lines.push(curLine);
      curLine = [];
      curVal = "";
    } else {
      curVal += c;
    }
  }
  if (curVal || curLine.length) {
    curLine.push(curVal.trim());
    if (curLine.some(x => x.length > 0)) lines.push(curLine);
  }
  return lines;
}

function parseNum(str) {
  if (!str) return 0;
  // Handle formats like "300,000" or "450.000" or "10.000.000" or "525.034"
  let clean = str.replace(/["\s]/g, "");
  // If it has both . and , or commas for thousands:
  // In Indonesian currency: 450.000 is 450000. 525.034 is 525034.
  // Sometimes user wrote "300,000" (comma as thousand separator).
  // Notice: 110 (Biaya Pemindahbukuan) is 110.
  // 5.350 is 5350.
  // Let check if clean has commas or dots:
  if (clean.includes(",") && !clean.includes(".")) {
    // e.g. "300,000" -> 300000
    clean = clean.replace(/,/g, "");
  } else {
    // e.g. "30.759.759" or "450.000"
    clean = clean.replace(/\./g, "");
  }
  return parseFloat(clean) || 0;
}

const rows = parseCSV(raw);
console.log("Total rows:", rows.length);

const parsedData = [];
let running = 30759759;

rows.slice(2).forEach((r, idx) => {
  const [tgl, docNo, alloc, pic, desc, debetStr, kreditStr, saldoStr] = r;
  const debet = parseNum(debetStr);
  const kredit = parseNum(kreditStr);
  running = running + debet - kredit;
  const recordedSaldo = parseNum(saldoStr);
  
  parsedData.push({
    id: `TX-2026-${String(idx + 1).padStart(3, "0")}`,
    date: tgl,
    docNo: docNo || "-",
    allocation: alloc || "Lain-lain",
    pic: pic || "-",
    description: desc.replace(/\s+/g, " "),
    debet,
    kredit,
    calculatedSaldo: running,
    recordedSaldo
  });
});

fs.writeFileSync("./scripts/parsed_donations.json", JSON.stringify(parsedData, null, 2));
console.log("Parsed " + parsedData.length + " transactions successfully.");
console.log("Final balance calculated:", running, "recorded:", parsedData[parsedData.length - 1].recordedSaldo);
