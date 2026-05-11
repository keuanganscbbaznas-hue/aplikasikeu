import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const TEMPLATES = [
  { 
    id: '1', 
    name: 'Berita Acara Serah Terima (BAST)', 
    description: 'Dokumen bukti serah terima barang atau jasa antara pihak-pihak terkait.', 
    category: 'Logistik',
    fileName: 'Template_BAST_SCB.doc',
    content: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; padding: 40px;">
          <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
            <h2 style="margin: 0; text-transform: uppercase;">Sekolah Cendekia BAZNAS</h2>
            <p style="margin: 5px 0; font-size: 12px;">Jl. KH. Umar Cirangkong Ds. Cemplang, Kec. Cibungbulang, Kab. Bogor, Jawa Barat</p>
          </div>
          <h3 style="text-align: center; text-decoration: underline;">BERITA ACARA SERAH TERIMA</h3>
          <p style="text-align: center; margin-top: -10px;">Nomor: [Nomor Surat]</p>
          
          <p>Pada hari ini [Hari], tanggal [Tanggal], kami yang bertanda tangan di bawah ini:</p>
          <ol>
            <li><strong>Nama:</strong> [Nama Penerima]<br/><strong>Jabatan:</strong> [Jabatan]<br/>Selanjutnya disebut <strong>PIHAK PERTAMA</strong></li>
            <li><strong>Nama:</strong> [Nama Penyerah]<br/><strong>Jabatan:</strong> [Jabatan]<br/>Selanjutnya disebut <strong>PIHAK KEDUA</strong></li>
          </ol>
          
          <p>PIHAK PERTAMA telah menyerahkan kepada PIHAK KEDUA, dan PIHAK KEDUA telah menerima dari PIHAK PERTAMA berupa:</p>
          <table border="1" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 8px;">No</th>
                <th style="padding: 8px;">Nama Barang/Jasa</th>
                <th style="padding: 8px;">Jumlah</th>
                <th style="padding: 8px;">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="padding: 8px; text-align: center;">1</td><td style="padding: 8px;">...</td><td style="padding: 8px;">...</td><td style="padding: 8px;">...</td></tr>
            </tbody>
          </table>
          
          <p>Demikian Berita Acara ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
          
          <table style="width: 100%; margin-top: 50px;">
            <tr>
              <td style="width: 50%; text-align: center;">PIHAK PERTAMA<br/><br/><br/><br/>( ____________________ )</td>
              <td style="width: 50%; text-align: center;">PIHAK KEDUA<br/><br/><br/><br/>( ____________________ )</td>
            </tr>
          </table>
        </body>
      </html>
    `
  },
  { 
    id: '2', 
    name: 'Surat Perintah Kerja (SPK)', 
    description: 'Template surat perintah kerja untuk pelaksanaan pekerjaan tertentu sesuai standar SCB.', 
    category: 'Kontrak',
    fileName: 'Template_SPK_SCB.doc',
    content: `
      <html>
        <body style="font-family: 'Times New Roman', Times, serif; line-height: 1.4; padding: 40px; font-size: 12pt;">
          <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #1e40af;">SEKOLAH CENDEKIA BAZNAS</h2>
            <p style="margin: 2px 0; font-size: 10pt;">Jl. KH. Umar Cirangkong - Ds. Cemplang, Cibungbulang - Kab. Bogor - Jawa Barat</p>
            <p style="margin: 2px 0; font-size: 9pt;">Kontak: (0251) 8591072 / bit.ly/lokasiSCB</p>
          </div>
          
          <h3 style="text-align: center; text-decoration: underline; margin-bottom: 5px;">SURAT PERINTAH KERJA</h3>
          <p style="text-align: center; margin-top: 0;">No: [Nomor]/SPK-HR/SCB/[Bulan]/[Tahun]</p>
          
          <p>Yang bertanda tangan di bawah ini selanjutnya di sebut sebagai <strong>pihak ke I</strong>:</p>
          <table style="margin-left: 20px;">
            <tr><td>I</td><td style="width: 80px;">Nama</td><td>: Ahmad Kamaluddin Afif</td></tr>
            <tr><td></td><td>Jabatan</td><td>: Kepala Sekolah Cendekia BAZNAS</td></tr>
            <tr><td></td><td>Alamat</td><td>: Sekolah Cendekia BAZNAS Jl Cirangkong no 14 Ds. Cemplang Kec. Cibungbulang Kab Bogor 16630</td></tr>
          </table>
          
          <p>Dengan ini telah memberi perintah untuk melaksanakan pekerjaan kepada yang di sebut <strong>pihak ke II</strong>:</p>
          <table style="margin-left: 20px;">
            <tr><td>II</td><td style="width: 120px;">Nama (NIK)</td><td>: [Nama Pihak II] ([NIK])</td></tr>
            <tr><td></td><td>Alamat</td><td>: [Alamat Pihak II]</td></tr>
          </table>
          
          <div style="margin: 20px 0; margin-left: 20px;">
            <p>Macam / jenis / pekerjaan : [Jenis Pekerjaan]<br/>
            Nilai Kontrak Pekerjaan : Rp. [Nominal]/hari<br/>
            Waktu Pelaksanaan : [Tanggal Mulai] - [Tanggal Selesai]</p>
          </div>
          
          <strong>Syarat-syarat pekerjaan:</strong>
          <ol style="font-size: 10pt;">
            <li>Pekerjaan dilaksanakan sejak surat perintah kerja ini di terbitkan dan harus diselesaikan sesuai waktu pelaksanaan.</li>
            <li>Penerima perintah kerja bersedia menaati peraturan yang berlaku di Sekolah Cendekia BAZNAS.</li>
            <li>Penerima perintah kerja ini harus mengisi presensi yang disediakan sebagai bukti kehadiran.</li>
            <li>Penerima perintah kerja ini sanggup memberikan jaminan mutu atas pekerjaannya.</li>
          </ol>
          
          <p><strong>Sistem Pembayaran:</strong> Pembayaran dilakukan secara transfer ke rekening [Bank] [Nomor Rekening] a.n [Nama Pemilik] setiap bulannya.</p>
          
          <p>Demikian Surat Perintah Kerja ini kami buat untuk di laksanakan sebaik-baiknya.</p>
          <p>Dikeluarkan di: Bogor, [Tanggal]</p>
          
          <table style="width: 100%; margin-top: 40px; text-align: center;">
            <tr>
              <td style="width: 50%;">Pihak I<br/><br/><br/><br/><strong>( Ahmad Kamaluddin Afif )</strong><br/>Kepala Sekolah Cendekia BAZNAS</td>
              <td style="width: 50%;">Pihak II<br/><br/><br/><br/><strong>( [Nama Pihak II] )</strong></td>
            </tr>
          </table>
        </body>
      </html>
    `
  },
  { 
    id: '3', 
    name: 'Berita Acara Kehilangan Dokumen', 
    description: 'Dokumen pengganti bukti laporan yang hilang sebagai kelengkapan pertanggungjawaban.', 
    category: 'Pelaporan',
    fileName: 'Template_Berita_Acara_Kehilangan_SCB.doc',
    content: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; padding: 40px;">
          <table style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 15px;">
            <tr>
              <td style="width: 20%;"><img src="https://cendekiabaznas.sch.id/wp-content/uploads/2021/04/Logo-SCB-New.png" width="80" alt="SCB Logo" /></td>
              <td style="width: 60%; text-align: center;">
                <h2 style="margin: 0; font-size: 18pt;">SEKOLAH CENDEKIA BAZNAS</h2>
                <p style="margin: 5px 0;">Jl. KH. Umar Cirangkong Ds. Cemplang</p>
                <p style="margin: 5px 0;">Kec. Cibungbulang Kab. Bogor, Jawa Barat</p>
              </td>
              <td style="width: 20%; text-align: right;"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Logo_BAZNAS.png/800px-Logo_BAZNAS.png" width="80" alt="BAZNAS Logo" /></td>
            </tr>
          </table>
          
          <h3 style="text-align: center; text-decoration: underline; margin-top: 30px;">BERITA ACARA KEHILANGAN DOKUMEN</h3>
          
          <p style="margin-top: 30px;">Yang bertanda tangan dibawah ini:</p>
          <table style="margin-left: 20px; font-weight: bold;">
            <tr><td style="width: 150px;">Nama</td><td>: Nur Asiah</td></tr>
            <tr><td>Nama Lembaga</td><td>: SCB</td></tr>
          </table>
          
          <p style="margin-top: 30px; text-indent: 50px;">Pada tanggal 25 Juli 2023 (jelaskan kronologi kehilangannya)</p>
          
          <p style="margin-top: 30px; text-align: justify;">Oleh karena itu Berita Acara Kehilangan ini dibuat sebagai dokumen pengganti bukti laporan tersebut yang ditanda tangani oleh saya sendiri, disetujui oleh head dept dan juga di ketahui tangani oleh kepala SCB. Demikian berita acara ini saya buat sebagai laporan kelengkapan pertanggung jawaban.</p>
          
          <table style="width: 100%; margin-top: 80px; text-align: center;">
            <tr>
              <td style="width: 33%;">Dibuat Oleh,<br/><br/><br/><br/><strong>Nur Asiah</strong></td>
              <td style="width: 33%;">Disetujui,<br/><br/><br/><br/><strong>Mohamad Roni</strong></td>
              <td style="width: 33%;">Diketahui,<br/><br/><br/><br/><strong>Ahmad Kamaluddin Afif</strong></td>
            </tr>
          </table>
        </body>
      </html>
    `
  },
];

export const DocumentTemplates = () => {
  const [search, setSearch] = React.useState('');

  const handleDownload = (template: typeof TEMPLATES[0]) => {
    const element = document.createElement("a");
    // Using blob with proper MIME type for Word, although it's HTML content
    const file = new Blob([template.content], {type: 'application/msword'});
    element.href = URL.createObjectURL(file);
    element.download = template.fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const filteredTemplates = TEMPLATES.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Template Dokumen Keuangan</h2>
          <p className="text-sm text-slate-500 font-medium">Download template surat dan dokumen standar keuangan.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input 
            placeholder="Cari template..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                  <FileText size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-widest leading-none">
                      {template.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 truncate leading-tight">{template.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{template.description}</p>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDownload(template)}
                    className="w-full mt-4 rounded-xl gap-2 border-slate-200 group-hover:border-primary group-hover:bg-primary/5 transition-all text-[10px] font-black uppercase tracking-widest"
                  >
                    <Download size={14} />
                    Download Template
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
           <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
              <Search size={32} />
           </div>
           <h3 className="text-lg font-bold text-slate-800">Tidak ada template ditemukan</h3>
           <p className="text-sm text-slate-500">Coba kata kunci lain.</p>
        </div>
      )}
    </div>
  );
};
