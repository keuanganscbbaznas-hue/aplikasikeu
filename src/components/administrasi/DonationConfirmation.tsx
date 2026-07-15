import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  Sparkles,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../../firebase';
import { collection, addDoc, getDoc, doc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getApiUrl } from '../../lib/utils';

const SHEET_ID = '1VmjYCnvWO0vrX5PinazbqR3jSIDnEoVAVfyMdvDs4VM';

export const DonationConfirmation = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisNote, setAnalysisNote] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    donaturName: '',
    contact: '',
    amount: '',
    targetAccount: '',
    notes: '',
    evidenceUrl: ''
  });
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const profileData = userDoc.data();
            setFormData(prev => ({ 
              ...prev, 
              donaturName: profileData.displayName || profileData.name || firebaseUser.displayName || 'Donatur',
              contact: profileData.email || firebaseUser.email || ''
            }));
          } else {
            setFormData(prev => ({ 
              ...prev, 
              donaturName: firebaseUser.displayName || 'Donatur',
              contact: firebaseUser.email || '' 
            }));
          }
        } catch (e) {
          console.error("Error setting donatur name:", e);
          setFormData(prev => ({ 
            ...prev, 
            donaturName: firebaseUser.displayName || 'Donatur',
            contact: firebaseUser.email || '' 
          }));
        }
      }
    });
    return () => unsub();
  }, []);

  const submitDonation = async (dataToSubmit: typeof formData) => {
    setLoading(true);
    try {
      let finalEvidenceUrl = dataToSubmit.evidenceUrl;
      let driveLink = "";

      // 1. Upload to local server FIRST to get a high-performance, non-base64 fallback
      if (dataToSubmit.evidenceUrl && dataToSubmit.evidenceUrl.startsWith('data:')) {
        try {
          const mimeType = dataToSubmit.evidenceUrl.split(';')[0].split(':')[1];
          const extension = mimeType.split('/')[1] || 'png';
          const filename = `bukti_donasi_${dataToSubmit.donaturName.replace(/\s+/g, '_')}_${Date.now()}.${extension}`;
          
          const localRes = await fetch(getApiUrl('/api/gallery/upload'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename,
              base64Data: dataToSubmit.evidenceUrl,
              mimeType
            })
          });
          if (localRes.ok) {
            const localData = await localRes.json();
            if (localData.success) {
              finalEvidenceUrl = localData.url; // Fast relative URL (e.g., /uploads/...) instead of 1MB base64
            }
          }
        } catch (localErr) {
          console.error("Gagal backup lokal:", localErr);
        }
      }

      // 2. Upload to Google Drive if evidence exists (use the original base64 to ensure full quality transfer)
      if (dataToSubmit.evidenceUrl) {
        try {
          const mimeType = dataToSubmit.evidenceUrl.split(';')[0].split(':')[1];
          const extension = mimeType.split('/')[1] || 'png';
          const filename = `bukti_donasi_${dataToSubmit.donaturName.replace(/\s+/g, '_')}_${Date.now()}.${extension}`;
          
          const uploadRes = await fetch(getApiUrl('/api/drive/upload'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename,
              base64Data: dataToSubmit.evidenceUrl,
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

      // 3. Save to Firestore (Internal App Database)
      const donationRef = await addDoc(collection(db, 'donations'), {
        ...dataToSubmit,
        evidenceUrl: finalEvidenceUrl,
        amount: Number(dataToSubmit.amount),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // 2. Sync to Google Sheets (External Database)
      const sheetData = [[
        donationRef.id,
        new Date().toLocaleString('id-ID'),
        dataToSubmit.donaturName,
        dataToSubmit.contact,
        dataToSubmit.amount,
        dataToSubmit.targetAccount,
        dataToSubmit.notes,
        'Pending',
        driveLink || (dataToSubmit.evidenceUrl ? "[Internal Image]" : "Tidak Ada Bukti")
      ]];

      const sheetRes = await fetch(getApiUrl('/api/sheets/append'), {
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

  const analyzeReceipt = async (base64String: string) => {
    setIsAnalyzing(true);
    setAnalysisNote(null);
    const toastId = toast.loading("Menganalisis & menyimpan bukti transfer otomatis via AI Gemini...");
    try {
      const response = await fetch(getApiUrl('/api/gemini/parse-donation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data: base64String })
      });

      if (!response.ok) {
        throw new Error("Gagal terhubung ke modul AI");
      }

      const textData = await response.text();
      let data;
      try {
        data = JSON.parse(textData);
      } catch {
        throw new Error("Respons tidak sesuai format JSON (mungkin karena file terlalu besar / 413 Entity Too Large)");
      }
      if (data && data.success && data.amount > 0) {
        const detectedName = data.senderName || formData.donaturName || 'Donatur';
        const detectedTarget = data.targetAccount === 'smp' || data.targetAccount === 'sma' ? data.targetAccount : 'smp';
        const detectedNotes = data.notes || "Otomatis terbaca via AI.";

        const updatedData = {
          ...formData,
          amount: String(data.amount),
          donaturName: detectedName,
          targetAccount: detectedTarget,
          notes: detectedNotes,
          evidenceUrl: base64String
        };

        setFormData(updatedData);
        setAnalysisNote(detectedNotes);
        
        toast.success(`Terbaca otomatis! Jumlah: Rp ${Number(data.amount).toLocaleString('id-ID')}. Menyimpan konfirmasi donasi otomatis...`, { id: toastId });
        
        // Save immediately and automatically
        await submitDonation(updatedData);
      } else {
        toast.warning("Sistem tidak berhasil mendeteksi nominal donasi otomatis. Silakan periksa kembali dan isi secara manual.", { id: toastId });
      }
    } catch (err) {
      console.error("Error analyzing receipt:", err);
      toast.error("Gagal melakukan analisis otomatis. Silakan isi nominal secara manual.", { id: toastId });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1500 * 1024) { // Let's raise the limit a bit (1.5MB) to handle mobile photo uploads easily 
        toast.error("Ukuran file maksimal 1.5MB untuk upload bukti donasi.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setEvidencePreview(base64String);
        setFormData(prev => ({ ...prev, evidenceUrl: base64String }));
        analyzeReceipt(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) {
      toast.error("Silakan isi jumlah nominal donasi.");
      return;
    }
    if (!formData.targetAccount) {
      toast.error("Silakan pilih rekening tujuan.");
      return;
    }
    await submitDonation(formData);
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
              {/* Account Profile Badge */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/80 flex items-center gap-4">
                <div className="h-12 w-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-sm">
                  {formData.donaturName ? formData.donaturName.slice(0, 2).toUpperCase() : <User size={18} />}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Akun Donatur Terbaca</p>
                  <p className="text-sm font-black text-slate-800">{formData.donaturName || 'Mencari akun...'}</p>
                  <p className="text-[11px] text-slate-500 font-bold">{formData.contact || 'Email belum terhubung'}</p>
                </div>
              </div>

              {/* Big prominent file upload wrapper */}
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Unggah Bukti Transfer Donasi</Label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full min-h-48 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-white hover:border-emerald-500 transition-all overflow-hidden relative group">
                    {evidencePreview ? (
                      <div className="w-full h-full p-2 flex flex-col justify-center items-center">
                        {evidencePreview.startsWith('data:application/pdf') ? (
                          <div className="flex flex-col items-center p-4">
                            <ClipboardCheck className="w-16 h-16 text-emerald-600 mb-2" />
                            <p className="text-xs font-bold text-slate-600">File PDF Terunggah</p>
                          </div>
                        ) : (
                          <img src={evidencePreview} alt="Preview Bukti Donasi" className="w-full max-h-64 object-contain rounded-xl" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                          <p className="text-white text-xs font-black uppercase tracking-widest">Ganti Bukti Transfer</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-8 pb-8 text-center px-4">
                        <Upload className="w-12 h-12 mb-4 text-emerald-600 animate-bounce" />
                        <p className="mb-2 text-sm text-slate-600 font-medium">
                          <span className="font-bold text-emerald-600">Klik untuk memilih</span> atau drag-and-drop bukti transfer di sini
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PNG, JPG, JPEG atau PDF (MAX. 1.5MB)</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                  </label>
                </div>
              </div>

              {/* Dynamic Analysis, Amount reading, and Account Selection details */}
              {evidencePreview && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
                      <Sparkles size={14} className="text-amber-500 fill-amber-500" />
                      Pembacaan Bukti Otomatis (AI)
                    </span>
                    {isAnalyzing && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-pulse">
                        <Loader2 size={12} className="animate-spin" />
                        Memindai...
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Amount Input */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                        <span>Jumlah Transfer Donasi</span>
                        {formData.amount && !isAnalyzing && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black animate-pulse">TERBACA OTOMATIS</span>
                        )}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">Rp</span>
                        <Input 
                          type="number" 
                          placeholder="Nilai transfer donasi" 
                          className="pl-10 h-12 font-black text-slate-800 rounded-xl bg-white border-slate-200" 
                          value={formData.amount}
                          onChange={(e) => setFormData({...formData, amount: e.target.value})}
                          required 
                        />
                      </div>
                    </div>

                    {/* Target Account Select */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rekening Tujuan</Label>
                      <Select 
                        required 
                        value={formData.targetAccount}
                        onValueChange={(val) => setFormData({...formData, targetAccount: val})}
                      >
                        <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 shadow-none">
                          <SelectValue placeholder="Pilih Rekening" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="smp">SMP: 1032913357 (SMP CENDEKIA BAZNAS)</SelectItem>
                          <SelectItem value="sma">SMA: 1054796605 (SMA CENDEKIA BAZNAS)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* AI Note detail */}
                  {analysisNote && (
                    <div className="text-xs bg-emerald-50 text-slate-700 p-3 rounded-xl border border-emerald-100/50 leading-relaxed font-semibold">
                      <span className="font-extrabold text-emerald-800 block mb-0.5">Detail Deteksi Penerimaan:</span>
                      {analysisNote}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Confirmation Explanation text area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Keterangan Konfirmasi</Label>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Membantu Akurasi</span>
                </div>
                <Textarea 
                  placeholder="Opsional: Tuliskan pesan, keterangan tambahan, atau doa Anda..." 
                  className="min-h-[100px] rounded-2xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all shadow-none placeholder:text-slate-400" 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <Button type="submit" disabled={loading || isAnalyzing} className="w-full h-14 bg-slate-900 hover:bg-emerald-600 transition-all text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 active:scale-[0.98]">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
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
