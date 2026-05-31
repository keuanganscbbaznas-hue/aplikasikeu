import React, { useRef, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { 
  FileText, 
  PenTool, 
  Trash2, 
  Check, 
  RefreshCw, 
  Download, 
  Upload, 
  Smile, 
  User, 
  Activity, 
  CreditCard 
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface FPPPConfig {
  verifikatorName: string;
  managerName: string;
  kepalaName: string;
  bankName: string;
  budgetName: string;
  budgetSaldo: string;
  headDeptName?: string;
  useDefaultAkuntanSign: boolean;
  useDefaultRoniSign: boolean;
  useDefaultKamalSign: boolean;
  useDefaultKasirSign: boolean;
  akuntanDefaultSign: string;
  roniDefaultSign: string;
  kamalDefaultSign: string;
  kasirDefaultSign: string;
}

interface FPPPGeneratorSettingsProps {
  fpppConfig: FPPPConfig | null;
  onRefreshConfig?: () => void;
}

export function FPPPGeneratorSettings({ fpppConfig, onRefreshConfig }: FPPPGeneratorSettingsProps) {
  // Config state
  const [verifikatorName, setVerifikatorName] = useState('Akuntan SCB');
  const [managerName, setManagerName] = useState('M. Roni');
  const [kepalaName, setKepalaName] = useState('Ahmad Kamal');
  const [bankName, setBankName] = useState('BANK SYARIAH INDONESIA (BSI)');
  const [budgetName, setBudgetName] = useState('Anggaran SCB BAZNAS');
  const [budgetSaldo, setBudgetSaldo] = useState('Sesuai RKAT');
  const [headDeptName, setHeadDeptName] = useState('Ust Siswadi');
  
  const [useDefaultAkuntanSign, setUseDefaultAkuntanSign] = useState(false);
  const [useDefaultRoniSign, setUseDefaultRoniSign] = useState(false);
  const [useDefaultKamalSign, setUseDefaultKamalSign] = useState(false);
  const [useDefaultKasirSign, setUseDefaultKasirSign] = useState(false);

  // Stored signatures (base64)
  const [akuntanSign, setAkuntanSign] = useState('');
  const [roniSign, setRoniSign] = useState('');
  const [kamalSign, setKamalSign] = useState('');
  const [kasirSign, setKasirSign] = useState('');

  // UI state
  const [selectedSlot, setSelectedSlot] = useState<'akuntan' | 'roni' | 'kamal' | 'kasir'>('akuntan');
  const [sigText, setSigText] = useState('');
  const [selectedFont, setSelectedFont] = useState<'brush' | 'calligraphy' | 'classic' | 'playful'>('brush');
  
  // Canvas drawing reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Sync state whenever fpppConfig from parent loads/re-reads
  useEffect(() => {
    if (fpppConfig) {
      setVerifikatorName(fpppConfig.verifikatorName || 'Akuntan SCB');
      setManagerName(fpppConfig.managerName || 'M. Roni');
      setKepalaName(fpppConfig.kepalaName || 'Ahmad Kamal');
      setBankName(fpppConfig.bankName || 'BANK SYARIAH INDONESIA (BSI)');
      setBudgetName(fpppConfig.budgetName || 'Anggaran SCB BAZNAS');
      setBudgetSaldo(fpppConfig.budgetSaldo || 'Sesuai RKAT');
      setHeadDeptName(fpppConfig.headDeptName || 'Ust Siswadi');
      
      setUseDefaultAkuntanSign(!!fpppConfig.useDefaultAkuntanSign);
      setUseDefaultRoniSign(!!fpppConfig.useDefaultRoniSign);
      setUseDefaultKamalSign(!!fpppConfig.useDefaultKamalSign);
      setUseDefaultKasirSign(!!fpppConfig.useDefaultKasirSign);

      setAkuntanSign(fpppConfig.akuntanDefaultSign || '');
      setRoniSign(fpppConfig.roniDefaultSign || '');
      setKamalSign(fpppConfig.kamalDefaultSign || '');
      setKasirSign(fpppConfig.kasirDefaultSign || '');
    }
  }, [fpppConfig]);

  // Handle saving the text config
  const handleSaveTextConfig = async () => {
    const toastId = toast.loading("Menyimpan konfigurasi template...");
    try {
      const fpppRef = doc(db, 'config', 'fppp');
      await setDoc(fpppRef, {
        verifikatorName,
        managerName,
        kepalaName,
        bankName,
        budgetName,
        budgetSaldo,
        headDeptName,
        useDefaultAkuntanSign,
        useDefaultRoniSign,
        useDefaultKamalSign,
        useDefaultKasirSign,
        akuntanDefaultSign: akuntanSign,
        roniDefaultSign: roniSign,
        kamalDefaultSign: kamalSign,
        kasirDefaultSign: kasirSign
      }, { merge: true });

      toast.success("Konfigurasi FPPP berhasil disimpan!", { id: toastId });
      if (onRefreshConfig) onRefreshConfig();
    } catch (e: any) {
      console.error(e);
      toast.error("Gagal menyimpan konfigurasi: " + e.message, { id: toastId });
    }
  };

  // Canvas Drawing mouse & touch event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e3a8a'; // Elegant Blue Ink

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const drawPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Save drew signature base64 to state + config
  const saveDrewSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Check if canvas is empty before saving
    const buffer = new Uint32Array(
      canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    const hasData = buffer.some(color => color !== 0);
    
    if (!hasData) {
      toast.error("Silakan gambar tanda tangan Anda di canvas terlebih dahulu!");
      return;
    }

    const base64 = canvas.toDataURL('image/png');
    await applySignatureToSlot(base64);
  };

  // Generate signature using computer fonts
  const generateTypedSignature = async () => {
    if (!sigText.trim()) {
      toast.error("Ketik nama Anda terlebih dahulu untuk generate!");
      return;
    }

    const testCanvas = document.createElement('canvas');
    testCanvas.width = 300;
    testCanvas.height = 110;
    const ctx = testCanvas.getContext('2d');
    if (!ctx) return;

    // Background transparent
    ctx.clearRect(0, 0, testCanvas.width, testCanvas.height);
    
    let fontStyle = "italic 28px 'Brush Script MT', 'Lucida Handwriting', cursive";
    if (selectedFont === 'calligraphy') {
      fontStyle = "bold italic 26px 'Georgia', serif";
    } else if (selectedFont === 'classic') {
      fontStyle = "italic 24px 'Courier New', Courier, monospace";
    } else if (selectedFont === 'playful') {
      fontStyle = "italic 28px 'Comic Sans MS', cursive, sans-serif";
    }

    ctx.font = fontStyle;
    ctx.fillStyle = '#1e3a8a'; // blue ink
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sigText, testCanvas.width / 2, testCanvas.height / 2);

    const base64 = testCanvas.toDataURL('image/png');
    await applySignatureToSlot(base64);
  };

  // Handle uploaded PNG signature files
  const handleUploadedSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await applySignatureToSlot(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const applySignatureToSlot = async (base64: string) => {
    const slotLabels = {
      akuntan: 'Akuntan SCB',
      roni: 'Roni',
      kamal: 'Kamal',
      kasir: 'Kasir'
    };
    
    const toastId = toast.loading(`Menyimpan tanda tangan ${slotLabels[selectedSlot]}...`);
    
    try {
      if (selectedSlot === 'akuntan') {
        setAkuntanSign(base64);
      } else if (selectedSlot === 'roni') {
        setRoniSign(base64);
      } else if (selectedSlot === 'kamal') {
        setKamalSign(base64);
      } else if (selectedSlot === 'kasir') {
        setKasirSign(base64);
      }

      // Update Firestore database instantly
      const fpppRef = doc(db, 'config', 'fppp');
      const updatePayload: any = {};
      updatePayload[`${selectedSlot}DefaultSign`] = base64;
      
      await setDoc(fpppRef, updatePayload, { merge: true });
      toast.success(`Tanda tangan ${slotLabels[selectedSlot]} berhasil diperbarui!`, { id: toastId });
      
      // Clear draws and typed texts
      clearCanvas();
      setSigText('');
      
      if (onRefreshConfig) onRefreshConfig();
    } catch (err: any) {
      toast.error("Gagal menyimpan tanda tangan: " + err.message, { id: toastId });
    }
  };

  const deleteSignatureFromSlot = async (slot: 'akuntan' | 'roni' | 'kamal' | 'kasir') => {
    if (confirm("Apakah Anda yakin ingin menghapus tanda tangan template ini?")) {
      const toastId = toast.loading("Menghapus...");
      try {
        if (slot === 'akuntan') setAkuntanSign('');
        else if (slot === 'roni') setRoniSign('');
        else if (slot === 'kamal') setKamalSign('');
        else if (slot === 'kasir') setKasirSign('');

        const fpppRef = doc(db, 'config', 'fppp');
        const updatePayload: any = {};
        updatePayload[`${slot}DefaultSign`] = "";
        
        await setDoc(fpppRef, updatePayload, { merge: true });
        toast.success("Tanda tangan berhasil dihapus!", { id: toastId });
        if (onRefreshConfig) onRefreshConfig();
      } catch (err: any) {
        toast.error("Gagal menghapus: " + err.message, { id: toastId });
      }
    }
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kolom Kiri: Konfigurasi Identitas dan Teks FPPP */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="py-4 px-5 bg-slate-50/70 border-b">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <FileText size={15} className="text-purple-600" />
                Identitas & Default FPPP
              </CardTitle>
              <CardDescription className="text-[11px]">
                Ubah informasi default teks yang tercetak pada template FPPP secara mandiri
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500">Nama Verifikator</Label>
                <Input 
                  value={verifikatorName} 
                  onChange={(e) => setVerifikatorName(e.target.value)} 
                  className="text-xs h-9 rounded-xl font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500">Nama Manager Operasional</Label>
                <Input 
                  value={managerName} 
                  onChange={(e) => setManagerName(e.target.value)} 
                  className="text-xs h-9 rounded-xl font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500">Nama Kepala Sekolah / SCB</Label>
                <Input 
                  value={kepalaName} 
                  onChange={(e) => setKepalaName(e.target.value)} 
                  className="text-xs h-9 rounded-xl font-medium"
                />
              </div>

              <Separator className="my-2" />

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500">Nama Head Dept Default</Label>
                <Select value={headDeptName} onValueChange={setHeadDeptName}>
                  <SelectTrigger className="w-full text-xs h-9 rounded-xl font-medium">
                    <SelectValue placeholder="Pilih Head Dept" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ust Siswadi" className="text-xs">Ust Siswadi</SelectItem>
                    <SelectItem value="Ust Helmi" className="text-xs">Ust Helmi</SelectItem>
                    <SelectItem value="Ust Roni" className="text-xs">Ust Roni</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500">Nama Bank Tujuan Default</Label>
                <Input 
                  value={bankName} 
                  onChange={(e) => setBankName(e.target.value)} 
                  className="text-xs h-9 rounded-xl font-medium font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500">Nama Budget FPPP Default</Label>
                <Input 
                  value={budgetName} 
                  onChange={(e) => setBudgetName(e.target.value)} 
                  className="text-xs h-9 rounded-xl font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500">Keterangan Saldo Budget</Label>
                <Input 
                  value={budgetSaldo} 
                  onChange={(e) => setBudgetSaldo(e.target.value)} 
                  className="text-xs h-9 rounded-xl font-medium"
                />
              </div>

              <Button 
                onClick={handleSaveTextConfig}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-10 text-xs font-bold"
              >
                Simpan Konfigurasi FPPP
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Kolom Tengah-Kanan: Canvas/Signature Generator */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Default Auto Signature Inclusion toggles */}
          <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
            <CardContent className="p-5">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Activity size={14} className="text-indigo-600" />
                Otomatisasi Tanda Tangan Hasil Download
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-4 font-medium">
                Aktifkan opsi di bawah agar tanda tangan template yang disimpan di bawah langsung disisipkan secara otomatis saat Anda mengunduh dokumen FPPP, meskipun pengajuan tersebut belum ditandatangani secara manual di dashboard.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none bg-white ${useDefaultAkuntanSign ? 'border-emerald-300 shadow-sm' : 'border-slate-100'}`}>
                  <input 
                    type="checkbox"
                    checked={useDefaultAkuntanSign}
                    onChange={(e) => {
                      setUseDefaultAkuntanSign(e.target.checked);
                      toast.info(e.target.checked ? "Ttd default Akuntan SCB diaktifkan" : "Ttd default Akuntan SCB dinonaktifkan");
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Ttd Auto Akuntan</span>
                    <span className="text-[10px] text-slate-400">Verifikator</span>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none bg-white ${useDefaultRoniSign ? 'border-emerald-300 shadow-sm' : 'border-slate-100'}`}>
                  <input 
                    type="checkbox"
                    checked={useDefaultRoniSign}
                    onChange={(e) => {
                      setUseDefaultRoniSign(e.target.checked);
                      toast.info(e.target.checked ? "Ttd default M. Roni diaktifkan untuk unduhan FPPP" : "Ttd default M. Roni dinonaktifkan");
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Ttd Auto Roni</span>
                    <span className="text-[10px] text-slate-400">Manager Operasional</span>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none bg-white ${useDefaultKamalSign ? 'border-emerald-300 shadow-sm' : 'border-slate-100'}`}>
                  <input 
                    type="checkbox"
                    checked={useDefaultKamalSign}
                    onChange={(e) => {
                      setUseDefaultKamalSign(e.target.checked);
                      toast.info(e.target.checked ? "Ttd default Ahmad Kamal diaktifkan untuk unduhan FPPP" : "Ttd default Ahmad Kamal dinonaktifkan");
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Ttd Auto Kamal</span>
                    <span className="text-[10px] text-slate-400">Kepala SCB</span>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none bg-white ${useDefaultKasirSign ? 'border-emerald-300 shadow-sm' : 'border-slate-100'}`}>
                  <input 
                    type="checkbox"
                    checked={useDefaultKasirSign}
                    onChange={(e) => {
                      setUseDefaultKasirSign(e.target.checked);
                      toast.info(e.target.checked ? "Cap/Ttd Kasir diaktifkan" : "Cap/Ttd Kasir dinonaktifkan");
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Cap Auto Kasir</span>
                    <span className="text-[10px] text-slate-400">Kasir / Bendahara</span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end mt-4">
                <Button 
                  onClick={handleSaveTextConfig} 
                  variant="outline" 
                  size="sm"
                  className="bg-white hover:bg-slate-50 text-indigo-600 border-indigo-200 h-8 font-bold text-[11px] gap-1 px-4 rounded-xl"
                >
                  <Check size={13} /> Simpan Pengaturan Otomatisasi
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* MAIN SIGNATURE GENERATOR CANVAS */}
          <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="py-4 px-5 bg-slate-50 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <PenTool size={15} className="text-indigo-600" />
                  Generator Tanda Tangan Digital
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Buat ttd digital online lalu simpan langsung untuk template FPPP
                </CardDescription>
              </div>
              
              <Select 
                value={selectedSlot} 
                onValueChange={(val) => setSelectedSlot(val as any)}
              >
                <SelectTrigger className="w-[200px] h-8 text-xs bg-white font-bold text-slate-700">
                  <SelectValue placeholder="Pilih Orang / Slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="akuntan" className="text-xs font-medium">Verifikator: {verifikatorName}</SelectItem>
                  <SelectItem value="roni" className="text-xs font-medium">Manager: {managerName}</SelectItem>
                  <SelectItem value="kamal" className="text-xs font-medium">Kepala SCB: {kepalaName}</SelectItem>
                  <SelectItem value="kasir" className="text-xs font-medium">Kasir / Bendahara Admin</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-5">
              
              <Tabs defaultValue="draw" className="w-full">
                <TabsList className="bg-slate-50 p-1 rounded-xl w-full flex mb-4 border">
                  <TabsTrigger value="draw" className="flex-1 rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Draw / Gambar</TabsTrigger>
                  <TabsTrigger value="type" className="flex-1 rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Type / Ketik</TabsTrigger>
                  <TabsTrigger value="upload" className="flex-1 rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">Upload File</TabsTrigger>
                </TabsList>

                {/* Draw Canvas */}
                <TabsContent value="draw" className="space-y-4">
                  <div className="flex flex-col items-center justify-center p-3 border border-slate-200 bg-slate-50 rounded-2xl relative select-none">
                    <canvas 
                      ref={canvasRef} 
                      width={480} 
                      height={130} 
                      onMouseDown={startDrawing}
                      onMouseMove={drawPos}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={drawPos}
                      onTouchEnd={stopDrawing}
                      className="max-w-full bg-white border border-slate-300 rounded-xl cursor-crosshair shadow-inner"
                    />
                    <div className="absolute top-4 left-4 text-[9px] bg-slate-900/60 font-medium px-2 py-0.5 text-white rounded-lg pointer-events-none">PAD TANGGAPAN BLUE INK</div>
                    <p className="text-[10px] text-slate-400 font-medium mt-2">Gunakan mouse atau layar sentuh untuk menggambar tanda tangan di atas.</p>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button 
                      onClick={clearCanvas} 
                      variant="ghost" 
                      size="sm"
                      className="h-9 font-bold text-xs text-red-500 hover:text-red-600 hover:bg-red-50 gap-1 rounded-xl"
                    >
                      <Trash2 size={13} /> Reset Pad
                    </Button>
                    <Button 
                      onClick={saveDrewSignature} 
                      size="sm"
                      className="h-9 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1 rounded-xl"
                    >
                      <Check size={13} /> Simpan TTD Hasil Coretan
                    </Button>
                  </div>
                </TabsContent>

                {/* Type handwriting */}
                <TabsContent value="type" className="space-y-4">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-500">Ketik Nama Tanda Tangan</Label>
                      <Input 
                        placeholder="Contoh: M Roni" 
                        value={sigText}
                        onChange={(e) => setSigText(e.target.value)}
                        className="text-sm rounded-xl"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-500">Pilih Gaya Tulisan Cursive</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                          { id: 'brush', label: 'Brush Script', style: "font-serif italic text-purple-600 font-bold" },
                          { id: 'calligraphy', label: 'Calligraphy Style', style: "font-mono italic text-blue-600 font-black" },
                          { id: 'classic', label: 'Classic Signature', style: "font-sans italic text-slate-600 font-bold" },
                          { id: 'playful', label: 'Playful Cursive', style: "font-sans text-green-600 font-bold italic" }
                        ].map((font) => (
                          <div 
                            key={font.id}
                            onClick={() => setSelectedFont(font.id as any)}
                            className={`p-3 border rounded-xl text-center cursor-pointer transition-all ${selectedFont === font.id ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-black scale-[1.02]' : 'bg-white hover:border-slate-300 border-slate-200'}`}
                          >
                            <p className={`text-xs ${font.style}`}>{sigText || font.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center min-h-[50px]">
                      <span className={`text-lg font-bold text-indigo-900 border-b border-dashed border-indigo-400 pb-1 italic ${
                        selectedFont === 'brush' ? 'font-serif' : 
                        selectedFont === 'calligraphy' ? 'font-mono' :
                        selectedFont === 'classic' ? 'font-sans underline' : 'font-sans line-through'
                      }`}>
                        {sigText || "(Preview Huruf Cursive Tanda tangan)"}
                      </span>
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        onClick={generateTypedSignature}
                        className="bg-indigo-600 hover:bg-indigo-700 font-bold text-xs gap-1 rounded-xl"
                      >
                        <PenTool size={13} /> Generate & Simpan Gaya TTD
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Upload Image */}
                <TabsContent value="upload" className="space-y-4">
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50 transition-colors flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
                      <Upload size={18} />
                    </div>
                    <Label htmlFor="sigFile" className="text-xs font-black text-slate-800 tracking-tight cursor-pointer">
                      Pilih dan Unggah File PNG Ttd/Cap
                    </Label>
                    <p className="text-[10px] text-slate-400 mt-1 mb-4">Mendukung format gambar PNG transparan agar hasil cetak FPPP bersih dan rapi</p>
                    <Input 
                      type="file" 
                      accept="image/png" 
                      id="sigFile" 
                      onChange={handleUploadedSignature}
                      className="hidden" 
                    />
                    <Button 
                      onClick={() => document.getElementById('sigFile')?.click()}
                      variant="outline" 
                      size="sm"
                      className="text-xs h-8 border-slate-300 rounded-xl"
                    >
                      Browse Storage
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {/* LIST OF SAVED SIG PREVIEWS WITH DETAILS */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4">Galeri Tanda Tangan Template Saat Ini</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* Slot Akuntan */}
                  <div className="p-4 rounded-2xl border border-slate-100 bg-white relative flex flex-col items-center justify-between min-h-[160px]">
                    <span className="absolute top-2 left-2 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Akuntan</span>
                    <div className="flex-1 flex items-center justify-center py-4">
                      {akuntanSign ? (
                        <img src={akuntanSign} alt="Akuntan Sign" className="max-h-[70px] max-w-full object-contain filter drop-shadow-sm" />
                      ) : (
                        <div className="text-[10px] text-slate-400 font-medium italic">Belum diset (Menggunakan fallback teks biasa)</div>
                      )}
                    </div>
                    <div className="w-full pt-2 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Verifikator</span>
                      {akuntanSign && (
                        <Button 
                          onClick={() => deleteSignatureFromSlot('akuntan')}
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={11} />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Slot Roni */}
                  <div className="p-4 rounded-2xl border border-slate-100 bg-white relative flex flex-col items-center justify-between min-h-[160px]">
                    <span className="absolute top-2 left-2 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Roni</span>
                    <div className="flex-1 flex items-center justify-center py-4">
                      {roniSign ? (
                        <img src={roniSign} alt="Ron Sign" className="max-h-[70px] max-w-full object-contain filter drop-shadow-sm" />
                      ) : (
                        <div className="text-[10px] text-slate-400 font-medium italic">Belum diset (Menggunakan fallback teks biasa)</div>
                      )}
                    </div>
                    <div className="w-full pt-2 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Verifikator / Manager</span>
                      {roniSign && (
                        <Button 
                          onClick={() => deleteSignatureFromSlot('roni')}
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={11} />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Slot Kamal */}
                  <div className="p-4 rounded-2xl border border-slate-100 bg-white relative flex flex-col items-center justify-between min-h-[160px]">
                    <span className="absolute top-2 left-2 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Kamal</span>
                    <div className="flex-1 flex items-center justify-center py-4">
                      {kamalSign ? (
                        <img src={kamalSign} alt="Kamal Sign" className="max-h-[70px] max-w-full object-contain filter drop-shadow-sm" />
                      ) : (
                        <div className="text-[10px] text-slate-400 font-medium italic">Belum diset (Menggunakan fallback teks biasa)</div>
                      )}
                    </div>
                    <div className="w-full pt-2 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Kepala SCB</span>
                      {kamalSign && (
                        <Button 
                          onClick={() => deleteSignatureFromSlot('kamal')}
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={11} />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Slot Kasir */}
                  <div className="p-4 rounded-2xl border border-slate-100 bg-white relative flex flex-col items-center justify-between min-h-[160px]">
                    <span className="absolute top-2 left-2 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Kasir</span>
                    <div className="flex-1 flex items-center justify-center py-4">
                      {kasirSign ? (
                        <img src={kasirSign} alt="Kasir Sign" className="max-h-[70px] max-w-full object-contain filter drop-shadow-sm" />
                      ) : (
                        <div className="text-[10px] text-slate-400 font-medium italic">Belum diset (Tanda tangan manual kasir)</div>
                      )}
                    </div>
                    <div className="w-full pt-2 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Kasir / Bendahara</span>
                      {kasirSign && (
                        <Button 
                          onClick={() => deleteSignatureFromSlot('kasir')}
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={11} />
                        </Button>
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
