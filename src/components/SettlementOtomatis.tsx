import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Submission, 
  UserProfile, 
  SettlementReport, 
  SettlementCategoryGroup, 
  SettlementItemDetail 
} from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { generateSettlementPDF } from '../lib/settlementPdfGenerator';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  FileText, 
  Download, 
  Send, 
  Save, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  FolderOpen, 
  Edit3, 
  Copy, 
  Receipt,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const DEFAULT_CATEGORIES = [
  'Konsumsi & Jamuan',
  'Perlengkapan & ATK',
  'Akomodasi & Transportasi',
  'Insentif & Honorarium',
  'Sewa & Operasional',
  'Lain-Lain'
];

export function SettlementOtomatis({ 
  profile, 
  user, 
  submissions = [] 
}: { 
  profile: UserProfile | null, 
  user: any, 
  submissions?: Submission[] 
}) {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [savedSettlements, setSavedSettlements] = useState<SettlementReport[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Form State
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [settlementNo, setSettlementNo] = useState(`STL.${format(new Date(), 'ddMM')}.${Math.floor(1000 + Math.random() * 9000)}`);
  const [picName, setPicName] = useState(profile?.displayName || '');
  const [picWhatsapp, setPicWhatsapp] = useState(profile?.whatsapp || '');
  const [divisi, setDivisi] = useState<string>('Operasional');
  const [sumberRekening, setSumberRekening] = useState<string>('SMP');
  const [tanggalSettlement, setTanggalSettlement] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [nominalUangMuka, setNominalUangMuka] = useState<string>('0');
  const [catatan, setCatatan] = useState('');

  // Category Groups State - Hanya menampilkan kategori yang memiliki item/anggaran aktif
  const [categories, setCategories] = useState<SettlementCategoryGroup[]>([
    {
      id: 'cat-1',
      categoryName: 'Konsumsi & Jamuan',
      items: [
        { id: 'item-1', description: 'Makan Peserta/Panitia', qty: 10, unit: 'Porsi', unitPrice: 25000, totalAmount: 250000 }
      ],
      categoryTotal: 250000
    }
  ]);

  const [newCatName, setNewCatName] = useState('');
  const [editingSettlementId, setEditingSettlementId] = useState<string | null>(null);

  // Search & Filter List
  const [searchQuery, setSearchQuery] = useState('');

  // Load Settlements from Firestore
  useEffect(() => {
    const q = query(collection(db, 'settlements'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: SettlementReport[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as SettlementReport));
      setSavedSettlements(list);
      setIsLoadingList(false);
    }, (error) => {
      console.error("Error loading settlements:", error);
      setIsLoadingList(false);
    });
    return () => unsub();
  }, []);

  // Filter Uang Muka Submissions for linking
  const uangMukaSubmissions = useMemo(() => {
    return submissions.filter(s => s.type === 'uang_muka');
  }, [submissions]);

  // When selecting a submission from dropdown
  const handleSelectSubmission = (subId: string) => {
    setSelectedSubmissionId(subId);
    if (!subId) return;

    const sub = submissions.find(s => s.id === subId);
    if (sub) {
      setTitle(sub.title ? `Settlement: ${sub.title}` : '');
      setPicName(sub.picName || sub.submittedByName || profile?.displayName || '');
      setPicWhatsapp(sub.picWhatsapp || profile?.whatsapp || '');
      setDivisi(sub.divisi || 'Operasional');
      setSumberRekening(sub.sumberRekening || 'SMP');
      setNominalUangMuka(sub.amount ? sub.amount.toString() : '0');
      if (sub.noDokumen) {
        setSettlementNo(`STL-${sub.noDokumen.replace(/[/\\?%*:|"<>]/g, '.')}`);
      }
      toast.success(`Data pengajuan Uang Muka "${sub.title}" berhasil dimuat.`);
    }
  };

  // Recalculate totals
  const totalRealisasi = useMemo(() => {
    return categories.reduce((sum, cat) => {
      const catSum = cat.items.reduce((iSum, item) => iSum + (Number(item.totalAmount) || 0), 0);
      return sum + catSum;
    }, 0);
  }, [categories]);

  const umNumber = Number(nominalUangMuka) || 0;
  const selisihDana = umNumber - totalRealisasi; // Positive = Sisa (Refund), Negative = Kurang (Reimburse), 0 = Nihil

  const statusBalance: 'sisa' | 'nihil' | 'kurang' = useMemo(() => {
    if (selisihDana > 0) return 'sisa';
    if (selisihDana < 0) return 'kurang';
    return 'nihil';
  }, [selisihDana]);

  // Handle adding category
  const handleAddCategory = (presetName?: string) => {
    const nameToAdd = (presetName || newCatName).trim();
    if (!nameToAdd) {
      toast.error("Nama kategori tidak boleh kosong.");
      return;
    }

    // Check if category already exists
    const existingIndex = categories.findIndex(c => c.categoryName.toLowerCase() === nameToAdd.toLowerCase());
    if (existingIndex !== -1) {
      handleAddItem(categories[existingIndex].id);
      toast.info(`Kategori "${nameToAdd}" sudah ada. Menambahkan item rincian.`);
      setNewCatName('');
      return;
    }

    const newCatId = `cat-${Date.now()}`;
    const newCat: SettlementCategoryGroup = {
      id: newCatId,
      categoryName: nameToAdd,
      items: [
        {
          id: `item-${Date.now()}-1`,
          description: '',
          qty: 1,
          unit: 'Buah',
          unitPrice: 0,
          totalAmount: 0
        }
      ],
      categoryTotal: 0
    };
    setCategories(prev => [...prev, newCat]);
    setNewCatName('');
    toast.success(`Kategori "${nameToAdd}" berhasil ditambahkan.`);
  };

  // Handle removing category
  const handleRemoveCategory = (catId: string) => {
    setCategories(prev => prev.filter(c => c.id !== catId));
  };

  // Handle adding item inside category
  const handleAddItem = (catId: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id === catId) {
        const newItem: SettlementItemDetail = {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          description: '',
          qty: 1,
          unit: 'Porsi',
          unitPrice: 0,
          totalAmount: 0
        };
        const updatedItems = [...cat.items, newItem];
        const updatedCatTotal = updatedItems.reduce((s, i) => s + (i.totalAmount || 0), 0);
        return { ...cat, items: updatedItems, categoryTotal: updatedCatTotal };
      }
      return cat;
    }));
  };

  // Handle updating item field
  const handleUpdateItem = (catId: string, itemId: string, field: keyof SettlementItemDetail, value: any) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id === catId) {
        const updatedItems = cat.items.map(item => {
          if (item.id === itemId) {
            const updated = { ...item, [field]: value };
            if (field === 'qty' || field === 'unitPrice') {
              const q = field === 'qty' ? Number(value) || 0 : item.qty;
              const p = field === 'unitPrice' ? Number(value) || 0 : item.unitPrice;
              updated.totalAmount = q * p;
            }
            return updated;
          }
          return item;
        });
        const updatedCatTotal = updatedItems.reduce((s, i) => s + (i.totalAmount || 0), 0);
        return { ...cat, items: updatedItems, categoryTotal: updatedCatTotal };
      }
      return cat;
    }));
  };

  // Handle removing item
  const handleRemoveItem = (catId: string, itemId: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id === catId) {
        const updatedItems = cat.items.filter(i => i.id !== itemId);
        const updatedCatTotal = updatedItems.reduce((s, i) => s + (i.totalAmount || 0), 0);
        return { ...cat, items: updatedItems, categoryTotal: updatedCatTotal };
      }
      return cat;
    }));
  };

  // Build Settlement Object (Hanya menyertakan kategori yang digunakan/memiliki item aktif)
  const getSettlementDataObject = (): SettlementReport => {
    const formattedCategories = categories
      .map(cat => {
        const validItems = (cat.items || [])
          .filter(item => (item.description || '').trim() !== '' || (item.totalAmount || 0) > 0)
          .map(item => ({
            ...item,
            totalAmount: (Number(item.qty) || 0) * (Number(item.unitPrice) || 0)
          }));
        const catTotal = validItems.reduce((s, i) => s + i.totalAmount, 0);
        return {
          ...cat,
          items: validItems,
          categoryTotal: catTotal
        };
      })
      .filter(cat => cat.items.length > 0 && cat.categoryTotal > 0);

    const calculatedTotalRealisasi = formattedCategories.reduce((s, c) => s + c.categoryTotal, 0);
    const calculatedSelisih = umNumber - calculatedTotalRealisasi;

    return {
      submissionId: selectedSubmissionId || undefined,
      title: title || 'Rincian Settlement Otomatis',
      settlementNo,
      picName,
      picWhatsapp,
      divisi,
      sumberRekening,
      tanggalSettlement,
      nominalUangMuka: umNumber,
      categories: formattedCategories,
      totalRealisasi: calculatedTotalRealisasi,
      selisihDana: calculatedSelisih,
      statusBalance: calculatedSelisih > 0 ? 'sisa' : calculatedSelisih < 0 ? 'kurang' : 'nihil',
      catatan,
      createdByName: profile?.displayName || user?.email || 'PIC',
      createdByEmail: user?.email || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
  };

  // Save to Firestore
  const handleSaveSettlement = async () => {
    if (!title.trim()) {
      toast.error("Judul Settlement wajib diisi!");
      return;
    }

    const dataObj = getSettlementDataObject();

    try {
      if (editingSettlementId) {
        await updateDoc(doc(db, 'settlements', editingSettlementId), {
          ...dataObj,
          updatedAt: serverTimestamp()
        });
        toast.success("Laporan Settlement berhasil diperbarui!");
        setEditingSettlementId(null);
      } else {
        await addDoc(collection(db, 'settlements'), dataObj);
        toast.success("Laporan Settlement Otomatis berhasil disimpan ke database!");
      }

      // If linked to a submission, optionally update the submission's LPJ details
      if (selectedSubmissionId) {
        try {
          await updateDoc(doc(db, 'submissions', selectedSubmissionId), {
            nominalPermohonanLaporan: dataObj.totalRealisasi,
            sisaDana: Math.abs(dataObj.selisihDana),
            penggunaanDana: `Rp ${dataObj.totalRealisasi.toLocaleString('id-ID')}`,
            updatedAt: serverTimestamp()
          });
          toast.success("Data Realisasi Uang Muka terkait berhasil disinkronkan.");
        } catch (subErr) {
          console.warn("Gagal update submission terkait:", subErr);
        }
      }

      setActiveTab('list');
    } catch (error: any) {
      console.error("Error saving settlement:", error);
      toast.error(`Gagal menyimpan: ${error.message || 'Terjadi kesalahan'}`);
    }
  };

  // PDF Export
  const handleDownloadPDF = () => {
    const dataObj = getSettlementDataObject();
    generateSettlementPDF(dataObj);
  };

  // WhatsApp Summary Message
  const formatWASummary = (settlement: SettlementReport) => {
    let msg = `*LAPORAN SETTLEMENT OTOMATIS - MONETA SCB*\n`;
    msg += `-------------------------------------------\n`;
    msg += `📦 *Judul:* ${settlement.title}\n`;
    msg += `📄 *No. Settlement:* ${settlement.settlementNo}\n`;
    msg += `👤 *PIC:* ${settlement.picName} (${settlement.divisi || '-'})\n`;
    msg += `📅 *Tanggal:* ${settlement.tanggalSettlement}\n`;
    msg += `🏦 *Rekening:* ${settlement.sumberRekening || '-'}\n\n`;

    msg += `*RINCIAN REALISASI PER KATEGORI:*\n`;
    settlement.categories.forEach((cat, idx) => {
      if (cat.items.length > 0) {
        msg += `\n*${idx + 1}. ${cat.categoryName.toUpperCase()}*\n`;
        cat.items.forEach((item, iIdx) => {
          msg += `  • ${item.description}: ${item.qty} ${item.unit} x Rp ${(item.unitPrice || 0).toLocaleString('id-ID')} = *Rp ${(item.totalAmount || 0).toLocaleString('id-ID')}*\n`;
        });
        msg += `  _Subtotal: Rp ${cat.categoryTotal.toLocaleString('id-ID')}_\n`;
      }
    });

    msg += `\n-------------------------------------------\n`;
    msg += `💵 *Uang Muka Awal:* Rp ${settlement.nominalUangMuka.toLocaleString('id-ID')}\n`;
    msg += `💰 *Total Realisasi:* Rp ${settlement.totalRealisasi.toLocaleString('id-ID')}\n`;

    if (settlement.statusBalance === 'sisa') {
      msg += `🔄 *SISA DANA (SETOR KEMBALI):* Rp ${settlement.selisihDana.toLocaleString('id-ID')}\n`;
      msg += `📌 *Rekening Setor:* BSI Kas SCB (SMP: 7179071988 / SMA: 7179072507)\n`;
    } else if (settlement.statusBalance === 'kurang') {
      msg += `🔵 *KURANG DANA (REIMBURSE PIC):* Rp ${Math.abs(settlement.selisihDana).toLocaleString('id-ID')}\n`;
    } else {
      msg += `⚪ *STATUS:* NIHIL / PAS (0)\n`;
    }

    msg += `\n_Dibuat via Aplikasi MONETA SCB_`;
    return msg;
  };

  const handleSendWA = () => {
    const settlement = getSettlementDataObject();
    const msg = formatWASummary(settlement);
    const cleaned = (picWhatsapp || '').replace(/\D/g, '');
    const phone = cleaned.startsWith('0') ? '62' + cleaned.slice(1) : cleaned;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Reset form
  const handleResetForm = () => {
    setSelectedSubmissionId('');
    setTitle('');
    setSettlementNo(`STL.${format(new Date(), 'ddMM')}.${Math.floor(1000 + Math.random() * 9000)}`);
    setNominalUangMuka('0');
    setCatatan('');
    setEditingSettlementId(null);
    setCategories([
      {
        id: 'cat-1',
        categoryName: 'Konsumsi & Jamuan',
        items: [],
        categoryTotal: 0
      },
      {
        id: 'cat-2',
        categoryName: 'Perlengkapan & ATK',
        items: [],
        categoryTotal: 0
      },
      {
        id: 'cat-3',
        categoryName: 'Akomodasi & Transportasi',
        items: [],
        categoryTotal: 0
      }
    ]);
    toast.info("Formulir telah dibersihkan.");
  };

  // Load saved settlement for edit
  const handleEditSettlement = (stl: SettlementReport) => {
    setEditingSettlementId(stl.id || null);
    setTitle(stl.title);
    setSettlementNo(stl.settlementNo);
    setPicName(stl.picName);
    setPicWhatsapp(stl.picWhatsapp || '');
    setDivisi(stl.divisi || 'Operasional');
    setSumberRekening(stl.sumberRekening || 'SMP');
    setTanggalSettlement(stl.tanggalSettlement || format(new Date(), 'yyyy-MM-dd'));
    setNominalUangMuka(stl.nominalUangMuka.toString());
    setCatatan(stl.catatan || '');
    setCategories(stl.categories || []);
    setActiveTab('create');
    toast.info(`Memuat data "${stl.title}" untuk diedit.`);
  };

  // Delete saved settlement
  const handleDeleteSettlement = async (stlId: string) => {
    if (!window.confirm("Hapus laporan settlement ini dari database?")) return;
    try {
      await deleteDoc(doc(db, 'settlements', stlId));
      toast.success("Settlement berhasil dihapus.");
    } catch (e) {
      toast.error("Gagal menghapus settlement.");
    }
  };

  // Filter list
  const filteredList = useMemo(() => {
    return savedSettlements.filter(s => {
      const q = searchQuery.toLowerCase();
      return (s.title || '').toLowerCase().includes(q) ||
             (s.picName || '').toLowerCase().includes(q) ||
             (s.settlementNo || '').toLowerCase().includes(q);
    });
  }, [savedSettlements, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full">
                FITUR OTOMATISASI REALISASI
              </Badge>
            </div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tighter leading-none flex items-center gap-3">
              <Calculator className="text-emerald-400" size={32} />
              SETTLEMENT <span className="text-emerald-400">OTOMATIS</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              Buat rincian laporan pertanggungjawaban (settlement) secara otomatis berbasis kategori budget (Konsumsi, ATK, Akomodasi, Insentif, dll). Sistem menghitung akumulasi realisasi dan sisa selisih dana secara realtime.
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button
              onClick={() => setActiveTab('create')}
              className={`h-11 px-5 rounded-2xl font-bold text-xs gap-2 transition-all ${
                activeTab === 'create'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Plus size={16} /> Buat Settlement
            </Button>

            <Button
              onClick={() => setActiveTab('list')}
              className={`h-11 px-5 rounded-2xl font-bold text-xs gap-2 transition-all ${
                activeTab === 'list'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <FolderOpen size={16} /> Arsip Settlement ({savedSettlements.length})
            </Button>
          </div>
        </div>
      </div>

      {activeTab === 'create' ? (
        /* CREATE / EDIT FORM VIEW */
        <div className="space-y-8">
          {/* Section 1: Informasi Header */}
          <Card className="border-slate-100 shadow-md rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <Receipt size={18} className="text-emerald-600" />
                    1. Informasional Settlement & Pengajuan Uang Muka
                  </CardTitle>
                  <CardDescription className="text-[11px] font-semibold text-slate-400">
                    Pilih pengajuan uang muka terkait (jika ada) untuk memuat data otomatis atau isi formulir di bawah ini.
                  </CardDescription>
                </div>

                {editingSettlementId && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold px-3 py-1">
                    Mode Edit Settlement
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Optional Link to Uang Muka Submission */}
              {uangMukaSubmissions.length > 0 && (
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-2">
                  <Label className="text-xs font-black text-emerald-800 uppercase tracking-wider block">
                    ⚡ Muat Dari Data Pengajuan Uang Muka
                  </Label>
                  <Select value={selectedSubmissionId} onValueChange={handleSelectSubmission}>
                    <SelectTrigger className="bg-white border-emerald-200 h-10 rounded-xl text-xs font-semibold">
                      <SelectValue placeholder="-- Pilih Pengajuan Uang Muka untuk Dimuat --" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-60">
                      <SelectItem value="">-- Manual Input (Kosongkan Link) --</SelectItem>
                      {uangMukaSubmissions.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.noDokumen ? `[${s.noDokumen}] ` : ''}{s.title} - Rp {s.amount.toLocaleString('id-ID')} ({s.picName || s.submittedByName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Judul Kegiatan / Settlement *</Label>
                  <Input
                    placeholder="Contoh: Settlement Laporan Kegiatan Program Pesantren Ramadhan 2026"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">No. Dokumen Settlement</Label>
                  <Input
                    value={settlementNo}
                    onChange={(e) => setSettlementNo(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Nama PIC Pengaju *</Label>
                  <Input
                    value={picName}
                    onChange={(e) => setPicName(e.target.value)}
                    placeholder="Nama Penanggung Jawab"
                    className="h-10 rounded-xl border-slate-200 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">No. WhatsApp PIC</Label>
                  <Input
                    value={picWhatsapp}
                    onChange={(e) => setPicWhatsapp(e.target.value)}
                    placeholder="08123456789"
                    className="h-10 rounded-xl border-slate-200 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Divisi / Unit</Label>
                  <Select value={divisi} onValueChange={setDivisi}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-medium">
                      <SelectValue placeholder="Pilih Divisi" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Operasional">Operasional</SelectItem>
                      <SelectItem value="Asrama">Asrama</SelectItem>
                      <SelectItem value="Akademik/Kesiswaan">Akademik/Kesiswaan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Sumber Rekening Kas</Label>
                  <Select value={sumberRekening} onValueChange={setSumberRekening}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-medium">
                      <SelectValue placeholder="Pilih Rekening" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="SMP">Kas SMP (7179071988)</SelectItem>
                      <SelectItem value="SMA">Kas SMA (7179072507)</SelectItem>
                      <SelectItem value="Donasi SMP">Donasi SMP</SelectItem>
                      <SelectItem value="Donasi SMA">Donasi SMA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tanggal Settlement</Label>
                  <Input
                    type="date"
                    value={tanggalSettlement}
                    onChange={(e) => setTanggalSettlement(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Nominal Pencairan Uang Muka Awal (Rp)</Label>
                  <Input
                    type="number"
                    value={nominalUangMuka}
                    onChange={(e) => setNominalUangMuka(e.target.value)}
                    placeholder="0"
                    className="h-10 rounded-xl border-emerald-300 bg-emerald-50/30 text-xs font-bold text-emerald-900"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Input Realisasi Berdasarkan Budget / Kategori */}
          <Card className="border-slate-100 shadow-md rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Layers size={18} className="text-emerald-600" />
                  2. Input Rincian Pengeluaran Berdasarkan Budget / Kategori
                </CardTitle>
                <CardDescription className="text-[11px] font-semibold text-slate-400">
                  Kelompokkan pengeluaran berdasarkan kategori budget (Konsumsi, Perlengkapan, Akomodasi, Insentif, dll).
                </CardDescription>
              </div>

              {/* Add Preset / Custom Category UI */}
              <div className="flex flex-wrap items-center gap-2">
                <Select onValueChange={(val: string) => handleAddCategory(val)}>
                  <SelectTrigger className="h-9 w-44 rounded-xl text-xs font-semibold bg-white border-slate-200">
                    <SelectValue placeholder="+ Pilih Preset Kategori" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {DEFAULT_CATEGORIES.map(preset => (
                      <SelectItem key={preset} value={preset}>
                        + {preset}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1.5">
                  <Input
                    placeholder="Atau Kategori Kustom..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="h-9 w-40 rounded-xl border-slate-200 text-xs"
                  />
                  <Button
                    onClick={() => handleAddCategory()}
                    size="sm"
                    className="h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 gap-1"
                  >
                    <Plus size={14} /> Tambah
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle size={15} className="text-emerald-600 shrink-0" />
                  <span>
                    Menampilkan <b>{categories.length}</b> kategori aktif. Kategori yang tidak digunakan anggarannya otomatis disembunyikan pada tampilan input dan hasil download PDF.
                  </span>
                </div>
              </div>

              {categories.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                  <p className="text-xs font-bold text-slate-500">Belum ada kategori anggaran yang ditambahkan.</p>
                  <p className="text-[11px] text-slate-400">Silakan pilih preset kategori atau tulis kategori baru di atas.</p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    {DEFAULT_CATEGORIES.slice(0, 4).map(cat => (
                      <Button
                        key={cat}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddCategory(cat)}
                        className="h-8 rounded-xl text-[11px] font-bold border-emerald-200 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100"
                      >
                        + {cat}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                categories.map((cat, catIdx) => (
                <div
                  key={cat.id}
                  className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs transition-all hover:border-slate-300"
                >
                  {/* Category Header */}
                  <div className="bg-slate-100/80 px-4 py-3 flex items-center justify-between border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <span className="h-6 w-6 rounded-lg bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center">
                        {catIdx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          {cat.categoryName}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {cat.items.length} Rincian Item
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-mono font-bold text-xs px-3 py-1">
                        Subtotal: Rp {cat.categoryTotal.toLocaleString('id-ID')}
                      </Badge>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCategory(cat.id)}
                        className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Hapus Kategori"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  {/* Items List Table / Inputs */}
                  <div className="p-4 space-y-3 bg-slate-50/30">
                    {cat.items.length === 0 ? (
                      <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                        <p className="text-xs text-slate-400 font-medium">Belum ada rincian item pengeluaran untuk kategori ini.</p>
                        <Button
                          onClick={() => handleAddItem(cat.id)}
                          variant="outline"
                          size="sm"
                          className="mt-2 h-8 text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl gap-1"
                        >
                          <Plus size={12} /> Tambah Item Rincian
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-12 gap-2 px-2 text-[9px] font-black text-slate-400 uppercase tracking-widest hidden md:grid">
                          <div className="col-span-5">Uraian / Keterangan Item *</div>
                          <div className="col-span-2 text-center">Vol / Qty</div>
                          <div className="col-span-2 text-center">Satuan</div>
                          <div className="col-span-2 text-right">Harga Satuan (Rp)</div>
                          <div className="col-span-1 text-center">Aksi</div>
                        </div>

                        {cat.items.map((item, itemIdx) => (
                          <div
                            key={item.id}
                            className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 bg-white rounded-xl border border-slate-200 items-center shadow-2xs"
                          >
                            {/* Uraian */}
                            <div className="col-span-1 md:col-span-5 space-y-1">
                              <span className="text-[9px] font-bold text-slate-400 md:hidden uppercase">Uraian</span>
                              <Input
                                placeholder="Contoh: Consumable ATK / Lunch Panitia"
                                value={item.description}
                                onChange={(e) => handleUpdateItem(cat.id, item.id, 'description', e.target.value)}
                                className="h-9 rounded-xl border-slate-200 text-xs font-medium"
                              />
                            </div>

                            {/* Qty */}
                            <div className="col-span-1 md:col-span-2 space-y-1">
                              <span className="text-[9px] font-bold text-slate-400 md:hidden uppercase">Qty</span>
                              <Input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => handleUpdateItem(cat.id, item.id, 'qty', e.target.value)}
                                className="h-9 rounded-xl border-slate-200 text-xs text-center font-bold"
                              />
                            </div>

                            {/* Satuan */}
                            <div className="col-span-1 md:col-span-2 space-y-1">
                              <span className="text-[9px] font-bold text-slate-400 md:hidden uppercase">Satuan</span>
                              <Input
                                placeholder="Porsi/Box/Hari"
                                value={item.unit}
                                onChange={(e) => handleUpdateItem(cat.id, item.id, 'unit', e.target.value)}
                                className="h-9 rounded-xl border-slate-200 text-xs text-center font-medium"
                              />
                            </div>

                            {/* Harga Satuan */}
                            <div className="col-span-1 md:col-span-2 space-y-1">
                              <span className="text-[9px] font-bold text-slate-400 md:hidden uppercase">Harga Satuan (Rp)</span>
                              <Input
                                type="number"
                                placeholder="0"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateItem(cat.id, item.id, 'unitPrice', e.target.value)}
                                className="h-9 rounded-xl border-slate-200 text-xs font-bold text-right"
                              />
                            </div>

                            {/* Total & Delete Button */}
                            <div className="col-span-1 md:col-span-1 flex items-center justify-between md:justify-center gap-2 pt-2 md:pt-0">
                              <span className="text-xs font-black text-emerald-700 md:hidden">
                                Total: Rp {item.totalAmount.toLocaleString('id-ID')}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(cat.id, item.id)}
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        ))}

                        <div className="flex justify-start pt-1">
                          <Button
                            onClick={() => handleAddItem(cat.id)}
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-bold border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl gap-1"
                          >
                            <Plus size={14} /> Tambah Item Rincian Ke {cat.categoryName}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )))}
            </CardContent>
          </Card>

          {/* Section 3: Ringkasan Kalkulasi & Action Buttons */}
          <Card className="border-slate-900 bg-slate-900 text-white shadow-2xl rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32" />

            <CardContent className="p-6 md:p-8 space-y-6 relative z-10">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-base font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                  <Calculator size={20} />
                  3. Kalkulasi & Rekapitutasi Hasil Settlement
                </h3>

                <Badge className="bg-white/10 text-white font-mono text-xs px-3 py-1 border-none">
                  Status: {statusBalance.toUpperCase()}
                </Badge>
              </div>

              {/* Grid Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pencairan Uang Muka</span>
                  <p className="text-2xl font-black text-white">
                    Rp {umNumber.toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Realisasi Pengeluaran</span>
                  <p className="text-2xl font-black text-blue-400">
                    Rp {totalRealisasi.toLocaleString('id-ID')}
                  </p>
                </div>

                <div className={`p-5 rounded-2xl border space-y-1 ${
                  statusBalance === 'sisa'
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : statusBalance === 'kurang'
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : 'bg-slate-800 border-slate-700'
                }`}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                    {statusBalance === 'sisa' ? 'Sisa Dana Harus Dikembalikan' : statusBalance === 'kurang' ? 'Kurang Dana (Reimburse)' : 'Selisih Balance'}
                  </span>
                  <p className={`text-2xl font-black ${
                    statusBalance === 'sisa'
                      ? 'text-emerald-400'
                      : statusBalance === 'kurang'
                      ? 'text-rose-400'
                      : 'text-slate-200'
                  }`}>
                    Rp {Math.abs(selisihDana).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Status Notice */}
              {statusBalance === 'sisa' && (
                <div className="p-4 bg-emerald-950/80 border border-emerald-500/30 rounded-2xl flex items-start gap-3 text-xs text-emerald-200">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-300">Sisa dana pengeluaran sebesar Rp {selisihDana.toLocaleString('id-ID')} wajib disetorkan kembali ke Rekening Kas SCB:</p>
                    <p className="mt-1 font-mono">BSI Kas SMP: 7179071988 | BSI Kas SMA: 7179072507</p>
                  </div>
                </div>
              )}

              {statusBalance === 'kurang' && (
                <div className="p-4 bg-rose-950/80 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-xs text-rose-200">
                  <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-300">Pengeluaran melebihi uang muka awal sebesar Rp {Math.abs(selisihDana).toLocaleString('id-ID')}.</p>
                    <p className="mt-1">Tim keuangan akan melakukan reimbursement kekurangannya kepada PIC.</p>
                  </div>
                </div>
              )}

              {/* Catatan Tambahan */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Catatan / Keterangan Tambahan</Label>
                <Input
                  placeholder="Catatan tambahan mengenai bukti kuitansi / kaji ulang settlement..."
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="bg-white/5 border-white/10 text-white text-xs rounded-xl h-10"
                />
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-800">
                <Button
                  onClick={handleSaveSettlement}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 h-12 rounded-2xl font-black text-xs uppercase tracking-wider gap-2 shadow-lg shadow-emerald-500/10"
                >
                  <Save size={16} /> {editingSettlementId ? 'Perbarui Settlement' : 'Simpan ke Database'}
                </Button>

                <Button
                  onClick={handleDownloadPDF}
                  className="bg-blue-600 hover:bg-blue-500 text-white h-12 rounded-2xl font-black text-xs uppercase tracking-wider gap-2 shadow-lg shadow-blue-600/10"
                >
                  <Download size={16} /> Unduh PDF Settlement
                </Button>

                <Button
                  onClick={handleSendWA}
                  className="bg-teal-600 hover:bg-teal-500 text-white h-12 rounded-2xl font-black text-xs uppercase tracking-wider gap-2 shadow-lg shadow-teal-600/10"
                >
                  <Send size={16} /> Kirim Ringkasan WA
                </Button>

                <Button
                  onClick={handleResetForm}
                  variant="outline"
                  className="border-slate-700 hover:bg-slate-800 text-slate-300 h-12 rounded-2xl font-bold text-xs gap-2"
                >
                  <RefreshCw size={16} /> Reset Formulir
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* SAVED SETTLEMENTS LIST VIEW */
        <Card className="border-slate-100 shadow-md rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <FolderOpen size={18} className="text-emerald-600" />
                Arsip Laporan Settlement Otomatis Tersimpan
              </CardTitle>
              <CardDescription className="text-[11px] font-semibold text-slate-400">
                Daftar laporan settlement yang telah disimpan oleh PIC/Admin.
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari settlement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-slate-200"
              />
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {isLoadingList ? (
              <div className="py-12 text-center text-slate-400 text-xs">Memuat data settlement...</div>
            ) : filteredList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Belum ada laporan settlement tersimpan. Klik "Buat Settlement" di atas.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredList.map((stl) => (
                  <Card key={stl.id} className="border-slate-200 hover:border-emerald-300 transition-all rounded-2xl overflow-hidden shadow-xs">
                    <CardHeader className="p-4 bg-slate-50 border-b border-slate-100">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className="text-[9px] font-mono font-bold bg-white text-slate-700">
                          {stl.settlementNo}
                        </Badge>

                        <Badge className={`text-[9px] font-bold ${
                          stl.statusBalance === 'sisa'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : stl.statusBalance === 'kurang'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {stl.statusBalance === 'sisa' ? 'SISA (RETURN)' : stl.statusBalance === 'kurang' ? 'REIMBURSE' : 'NIHIL'}
                        </Badge>
                      </div>

                      <CardTitle className="text-xs font-black text-slate-800 mt-2 line-clamp-2 leading-snug">
                        {stl.title}
                      </CardTitle>
                      <p className="text-[10px] text-slate-400 font-medium">PIC: {stl.picName} ({stl.divisi || '-'})</p>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-slate-400 font-medium block">Uang Muka</span>
                          <span className="font-bold text-slate-800">Rp {stl.nominalUangMuka.toLocaleString('id-ID')}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Realisasi</span>
                          <span className="font-bold text-blue-700">Rp {stl.totalRealisasi.toLocaleString('id-ID')}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateSettlementPDF(stl)}
                            className="h-8 text-[10px] font-bold px-2.5 rounded-lg border-slate-200 text-slate-700 gap-1"
                            title="Unduh PDF"
                          >
                            <Download size={12} /> PDF
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const msg = formatWASummary(stl);
                              navigator.clipboard.writeText(msg);
                              toast.success("Ringkasan WA disalin ke clipboard!");
                            }}
                            className="h-8 text-[10px] font-bold px-2.5 rounded-lg border-slate-200 text-slate-700 gap-1"
                            title="Salin WA"
                          >
                            <Copy size={12} /> WA
                          </Button>
                        </div>

                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditSettlement(stl)}
                            className="h-8 text-[10px] font-bold px-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                          >
                            <Edit3 size={12} /> Edit
                          </Button>

                          {stl.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteSettlement(stl.id!)}
                              className="h-8 text-[10px] font-bold px-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={12} />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
