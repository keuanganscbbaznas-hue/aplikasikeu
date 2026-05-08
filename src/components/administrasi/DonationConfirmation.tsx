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
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export const DonationConfirmation = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setIsSubmitted(true);
      toast.success("Konfirmasi Donasi terkirim ke keuanganscbbaznas@gmail.com");
    }, 1500);
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Konfirmasi Donasi</h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Formulir konfirmasi transfer donasi untuk Sekolah Cendekia BAZNAS yang akan diteruskan ke tim keuangan.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 rounded-[2rem] border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
            <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <ClipboardCheck className="text-primary" size={20} />
              Formulir Konfirmasi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Nama Lengkap Donatur</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <Input placeholder="Contoh: Bpk. Ahmad" className="pl-10 h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all shadow-none" required />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Email / No. HP</Label>
                  <Input placeholder="Contoh: ahmad@email.com" className="h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all shadow-none" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Jumlah Donasi (Nominal)</Label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <Input type="number" placeholder="Rp. 0" className="pl-10 h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all shadow-none" required />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Rekening Tujuan</Label>
                  <Select required>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50/50 border-slate-200 shadow-none focus:ring-primary/20">
                      <SelectValue placeholder="Pilih Rekening" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="smp">Rekening SMP</SelectItem>
                      <SelectItem value="sma">Rekening SMA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Bukti Transfer</Label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-white hover:border-primary/50 transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-3 text-slate-400" />
                      <p className="mb-2 text-sm text-slate-500"><span className="font-bold">Klik untuk upload</span> atau drag and drop</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PNG, JPG atau PDF (MAX. 5MB)</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*,.pdf" />
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Keterangan / Doa (Opsional)</Label>
                <Textarea placeholder="Tuliskan pesan atau doa anda..." className="min-h-[100px] rounded-2xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all shadow-none" />
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

        <div className="lg:col-span-4 space-y-6">
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
        </div>
      </div>
    </div>
  );
};
