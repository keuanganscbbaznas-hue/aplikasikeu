import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Search, Plus, Trash2, Upload, FileCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { db, auth } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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

export const DocumentTemplates = ({ isOwner = false }: { isOwner?: boolean }) => {
  const [search, setSearch] = useState('');
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(true);

  // Form states for new template upload
  const [isOpenDocDialog, setIsOpenDocDialog] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Logistik');
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'document_templates'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      setCustomTemplates(docs);
      setLoadingCustom(false);
    }, (error) => {
      console.error("Error fetching custom templates:", error);
      setLoadingCustom(false);
      handleFirestoreError(error, OperationType.LIST, 'document_templates');
    });

    return () => unsubscribe();
  }, []);

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

  const handleDownloadCustom = (template: any) => {
    try {
      const base64Content = template.content;
      let mimeType = template.fileType || 'application/octet-stream';
      let base64Data = base64Content;
      
      if (base64Content.includes(';base64,')) {
        const parts = base64Content.split(';base64,');
        mimeType = parts[0].split(':')[1] || mimeType;
        base64Data = parts[1];
      }
      
      const raw = window.atob(base64Data);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      
      const file = new Blob([uInt8Array], { type: mimeType });
      const element = document.createElement("a");
      element.href = URL.createObjectURL(file);
      element.download = template.fileName;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success(`Berhasil mengunduh ${template.fileName}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal mengunduh berkas: " + err.message);
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus template "${name}"?`)) {
      return;
    }
    
    const toastId = toast.loading("Menghapus template...");
    try {
      await deleteDoc(doc(db, 'document_templates', id));
      toast.success(`Berhasil menghapus template "${name}"`, { id: toastId });
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(`Gagal menghapus template: ${err.message}`, { id: toastId });
      handleFirestoreError(err, OperationType.DELETE, `document_templates/${id}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) { // 1MB limit for Firestore
      toast.error("Ukuran berkas melebihi 1MB. Silakan pilih berkas yang lebih kecil.");
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName || !uploadCategory || !selectedFile) {
      toast.error("Nama, kategori, dan berkas template wajib diisi.");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Mengunggah template...");
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Content = event.target?.result as string;
        
        try {
          await addDoc(collection(db, 'document_templates'), {
            name: uploadName,
            category: uploadCategory,
            description: uploadDescription || 'Tidak ada deskripsi',
            fileName: selectedFile.name,
            fileType: selectedFile.type || 'application/octet-stream',
            content: base64Content,
            createdAt: new Date().toISOString()
          });

          toast.success("Template berhasil ditambahkan!", { id: toastId });
          setIsUploading(false);
          setIsOpenDocDialog(false);
          
          // Reset states
          setUploadName('');
          setUploadCategory('Logistik');
          setUploadDescription('');
          setSelectedFile(null);
        } catch (dbErr: any) {
          console.error("Firestore Upload Error:", dbErr);
          toast.error("Gagal menyimpan template ke basis data: " + dbErr.message, { id: toastId });
          setIsUploading(false);
          handleFirestoreError(dbErr, OperationType.CREATE, 'document_templates');
        }
      };

      reader.onerror = () => {
        throw new Error("Gagal membaca berkas.");
      };

      reader.readAsDataURL(selectedFile);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Gagal mengunggah template: " + error.message, { id: toastId });
      setIsUploading(false);
    }
  };

  // Merge static templates and custom templates nicely
  const formattedStatics = TEMPLATES.map(t => ({
    id: `static-${t.id}`,
    isStatic: true,
    name: t.name,
    category: t.category,
    description: t.description,
    fileName: t.fileName,
    content: t.content
  }));

  const formattedCustoms = customTemplates.map(t => ({
    id: t.id,
    isStatic: false,
    name: t.name,
    category: t.category,
    description: t.description,
    fileName: t.fileName,
    fileType: t.fileType,
    content: t.content
  }));

  const allTemplates = [...formattedCustoms, ...formattedStatics];

  const filteredTemplates = allTemplates.filter(t => 
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
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {isOwner && (
            <Dialog open={isOpenDocDialog} onOpenChange={setIsOpenDocDialog}>
              <DialogTrigger 
                render={
                  <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-10 font-bold text-xs shadow-md shadow-emerald-950/10 transition-all uppercase tracking-wider flex items-center justify-center gap-2">
                    <Plus size={16} />
                    Unggah Template
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-6 bg-white shadow-2xl border-none">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Upload className="text-emerald-600" size={20} />
                    Unggah Template Dokumen
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleUploadTemplate} className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Nama Template</Label>
                    <Input 
                      placeholder="Contoh: Surat Penugasan BAZNAS"
                      value={uploadName}
                      onChange={(e) => setUploadName(e.target.value)}
                      required
                      className="rounded-xl border-slate-200 h-10 text-sm focus-visible:ring-emerald-500"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Kategori</Label>
                    <Select value={uploadCategory} onValueChange={setUploadCategory}>
                      <SelectTrigger className="rounded-xl border-slate-200 h-10 text-sm focus-visible:ring-emerald-500">
                        <SelectValue placeholder="Pilih Kategori" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-150 rounded-xl shadow-lg">
                        <SelectItem value="Logistik">Logistik</SelectItem>
                        <SelectItem value="Kontrak">Kontrak</SelectItem>
                        <SelectItem value="Pelaporan">Pelaporan</SelectItem>
                        <SelectItem value="HR">HR & Kepegawaian</SelectItem>
                        <SelectItem value="Kesiswaan">Kesiswaan</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Deskripsi Singkat</Label>
                    <Textarea 
                      placeholder="Jelaskan kegunaan template dokumen ini secara singkat..."
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      rows={3}
                      className="rounded-xl border-slate-200 text-sm focus-visible:ring-emerald-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">Pilih Berkas (.doc, .docx, .xlsx, .pdf, dll.)</Label>
                    <div 
                      onClick={() => document.getElementById('template-file-input')?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer hover:bg-emerald-50/20 transition-all group"
                    >
                      <Input 
                        id="template-file-input"
                        type="file"
                        onChange={handleFileChange}
                        accept=".doc,.docx,.xls,.xlsx,.pdf,.txt,.rtf,.html,.xml,.csv,.png,.jpg,.jpeg"
                        className="hidden"
                      />
                      <Upload className="mx-auto mb-2 text-slate-400 group-hover:text-emerald-500" size={24} />
                      {selectedFile ? (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-emerald-750 truncate max-w-full px-2">{selectedFile.name}</p>
                          <p className="text-[10px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-black text-slate-700">Pilih berkas template</p>
                          <p className="text-[10px] text-slate-400 mt-1">Ukuran maksimal 1MB per berkas</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 justify-end pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      disabled={isUploading}
                      onClick={() => setIsOpenDocDialog(false)}
                      className="rounded-xl text-xs h-10 font-bold"
                    >
                      Batal
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isUploading || !selectedFile}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-10 text-xs font-bold px-6 flex items-center gap-2"
                    >
                      {isUploading ? 'Sedang Menyimpan...' : 'Simpan Template'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input 
              placeholder="Cari template..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl w-full"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative bg-white">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                  <FileText size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-widest leading-none">
                      {template.category}
                    </span>
                    {!template.isStatic && isOwner && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteTemplate(template.id, template.name)}
                        className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0 transition-all opacity-0 group-hover:opacity-100"
                        title="Hapus custom template"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 truncate leading-tight" title={template.name}>{template.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2" title={template.description}>{template.description}</p>
                  
                  {template.isStatic ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDownload(template as any)}
                      className="w-full mt-4 rounded-xl gap-2 border-slate-200 group-hover:border-primary group-hover:bg-primary/5 transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                      <Download size={14} />
                      Download Template
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDownloadCustom(template)}
                      className="w-full mt-4 rounded-xl gap-2 border-emerald-250 hover:bg-emerald-50 text-emerald-700 font-bold hover:border-emerald-500 transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                      <Download size={14} title={template.fileName} />
                      Download Template Custom
                    </Button>
                  )}
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
