import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ClipboardCheck, 
  Send, 
  Upload, 
  CheckCircle2, 
  Banknote, 
  CreditCard,
  User,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const SHEET_ID = '1VmjYCnvWO0vrX5PinazbqR3jSIDnEoVAVfyMdvDs4VM';

export const DonationConfirmation = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    donaturName: '',
    contact: '',
    amount: '',
    targetAccount: '',
    notes: '',
    evidenceUrl: ''
  });
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 700 * 1024) {
        toast.error("Ukuran file maksimal 700KB untuk upload bukti donasi.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setEvidencePreview(base64String);
        setFormData(prev => ({ ...prev, evidenceUrl: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let finalEvidenceUrl = formData.evidenceUrl;
      let driveLink = "";

      // Upload to Google Drive if evidence exists
      if (formData.evidenceUrl) {
        try {
          const mimeType = formData.evidenceUrl.split(';')[0].split(':')[1];
          const extension = mimeType.split('/')[1] || 'png';
          const filename = `bukti_donasi_${formData.donaturName.replace(/\s+/g, '_')}_${Date.now()}.${extension}`;
          
          const uploadRes = await fetch('/api/drive/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename,
              base64Data: formData.evidenceUrl,
              mimeType
            })
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.success) {
              driveLink = uploadData.link;
              finalEvidenceUrl = driveLink; // Update Firestore link with Drive link
            } else if (uploadData.error === "Drive Quota Error") {
              console.warn("Drive sync skipped:", uploadData.message);
              // Store as base64 internally but warn the user about Drive sync
              toast.warning("Bukti tersimpan secara internal, namun gagal sinkron ke Drive karena kuota storage Service Account habis. Mohon bagikan folder Drive ke: " + uploadData.serviceAccount, {
                duration: 10000
              });
            } else {
              console.warn("Drive sync issue:", uploadData.error);
            }
          } else {
            console.warn("Gagal upload ke Drive, menggunakan link internal.");
          }
        } catch (uploadErr) {
          console.error("Drive upload error detail:", uploadErr);
        }
      }

      // 1. Save to Firestore (Internal App Database)
      const donationRef = await addDoc(collection(db, 'donations'), {
        ...formData,
        evidenceUrl: finalEvidenceUrl,
        amount: Number(formData.amount),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // 2. Sync to Google Sheets (External Database)
      const sheetData = [[
        donationRef.id,
        new Date().toLocaleString('id-ID'),
        formData.donaturName,
        formData.contact,
        formData.amount,
        formData.targetAccount,
        formData.notes,
        'Pending',
        driveLink || (formData.evidenceUrl ? "[Internal Image]" : "Tidak Ada Bukti")
      ]];

      const sheetRes = await fetch('/api/sheets/append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: SHEET_ID,
          range: 'Sheet1!A1', // Adjust sheet name if necessary
          data: sheetData
        })
      });

      if (!sheetRes.ok) {
        console.warn("Failed to sync to Google Sheets, but saved to Firestore.");
      }

      setLoading(false);
      setIsSubmitted(true);
      toast.success("Konfirmasi Donasi terkirim ke database dan keuanganscbbaznas@gmail.com");
    } catch (error: any) {
      console.error("Submission Error:", error);
      toast.error("Gagal mengirim konfirmasi: " + error.message);
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm px-6">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6"
        >
          <CheckCircle2 size={40} />
        </motion.div>
        <h2 className="text-2xl font-black text-slate-800 text-center">Berhasil Dikirim!</h2>
        <p className="text-slate-500 text-center mt-2 max-w-sm">Konfirmasi Anda telah dikirim ke <strong>keuanganscbbaznas@gmail.com</strong> dan akan segera diverifikasi.</p>
        <Button 
          variant="outline" 
          className="mt-8 rounded-xl px-8"
          onClick={() => setIsSubmitted(false)}
        >
          Kirim Konfirmasi Lainnya
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Konfirmasi Donasi</h2>
        <p className="text-base text-slate-500 font-medium mt-2 max-w-2xl leading-relaxed">
          Terima kasih atas kebaikan Anda. Silakan isi formulir konfirmasi transfer donasi untuk Sekolah Cendekia BAZNAS di bawah ini.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <Card className="xl:col-span-8 rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-8">
            <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                <ClipboardCheck size={20} />
              </div>
              Detail Transaksi Donasi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Nama Lengkap Donatur</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <Input 
                      placeholder="Contoh: Bpk. Ahmad" 
                      className="pl-10 h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all shadow-none" 
                      value={formData.donaturName}
                      onChange={(e) => setFormData({...formData, donaturName: e.target.value})}
                      required 
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Email / No. HP</Label>
                  <Input 
                    placeholder="Contoh: ahmad@email.com" 
                    className="h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all shadow-none" 
                    value={formData.contact}
                    onChange={(e) => setFormData({...formData, contact: e.target.value})}
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Jumlah Donasi (Nominal)</Label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <Input 
                      type="number" 
                      placeholder="Rp. 0" 
                      className="pl-10 h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all shadow-none" 
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      required 
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Rekening Tujuan</Label>
                  <Select 
                    required 
                    value={formData.targetAccount}
                    onValueChange={(val) => setFormData({...formData, targetAccount: val})}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50/50 border-slate-200 shadow-none focus:ring-primary/20">
                      <SelectValue placeholder="Pilih Rekening" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="smp">SMP: 1032913357 (SMP CENDEKIA BAZNAS)</SelectItem>
                      <SelectItem value="sma">SMA: 1054796605 (SMA CENDEKIA BAZNAS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Bukti Transfer</Label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full min-h-32 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-white hover:border-primary/50 transition-all overflow-hidden relative">
                    {evidencePreview ? (
                      <div className="w-full h-full p-2">
                        {evidencePreview.startsWith('data:application/pdf') ? (
                          <div className="flex flex-col items-center p-4">
                            <ClipboardCheck className="w-12 h-12 text-blue-500 mb-2" />
                            <p className="text-xs font-bold text-slate-600">File PDF Terunggah</p>
                          </div>
                        ) : (
                          <img src={evidencePreview} alt="Preview" className="w-full max-h-64 object-contain rounded-xl" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                          <p className="text-white text-xs font-black uppercase tracking-widest">Ganti File</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-slate-400" />
                        <p className="mb-2 text-sm text-slate-500"><span className="font-bold">Klik untuk upload</span> atau drag and drop</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PNG, JPG atau PDF (MAX. 5MB)</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Keterangan / Doa (Opsional)</Label>
                <Textarea 
                  placeholder="Tuliskan pesan atau doa anda..." 
                  className="min-h-[100px] rounded-2xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all shadow-none" 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full h-14 bg-slate-900 hover:bg-emerald-600 transition-all text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 active:scale-[0.98]">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    MEMPROSES...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send size={18} />
                    KIRIM KONFIRMASI KE EMAIL
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="xl:col-span-4 space-y-6">
          <Card className="rounded-[2rem] border-none bg-emerald-600 text-white shadow-xl shadow-emerald-900/20">
            <CardContent className="p-8">
              <h3 className="text-xl font-black mb-4 leading-tight">Konfirmasi Membantu Akurasi</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                   <div className="h-6 w-6 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                      <CheckCircle2 size={14} />
                   </div>
                   <p className="text-xs font-bold leading-relaxed">Memudahkan tim kami memverifikasi dana anda dengan cepat.</p>
                </li>
                <li className="flex items-start gap-3">
                   <div className="h-6 w-6 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                      <CheckCircle2 size={14} />
                   </div>
                   <p className="text-xs font-bold leading-relaxed">Menjaga transparansi dan akuntabilitas pelaporan keuangan.</p>
                </li>
                <li className="flex items-start gap-3">
                   <div className="h-6 w-6 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                      <CheckCircle2 size={14} />
                   </div>
                   <p className="text-xs font-bold leading-relaxed tracking-tight">Data akan langsung terkirim ke email Bagian Keuangan SCB.</p>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-slate-100 shadow-sm border">
             <CardContent className="p-6">
                <h3 className="font-black text-slate-800 mb-4 text-sm">Nomor Rekening Donasi</h3>
                <div className="space-y-3">
                   <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">SMP CENDEKIA BAZNAS</p>
                      <p className="text-sm font-black text-slate-800">1032913357</p>
                   </div>
                   <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">SMA CENDEKIA BAZNAS</p>
                      <p className="text-sm font-black text-slate-800">1054796605</p>
                   </div>
                </div>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
