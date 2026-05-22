import React, { useState } from 'react';
import { 
  Info, 
  BookOpen, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle, 
  PhoneCall, 
  ArrowRight, 
  FileText, 
  Download, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Clock,
  Coins,
  ArrowRightCircle,
  FolderOpen,
  Laptop,
  CheckSquare,
  Users,
  Layers,
  Heart,
  Send,
  Sparkles,
  ClipboardCheck,
  BadgeAlert,
  Search,
  Calculator,
  Scan,
  Tag,
  PenTool,
  Handshake,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

export const InfoKeuanganSection = () => {
  const [activeTab, setActiveTab] = useState<'alur' | 'sop' | 'faq' | 'kontak'>('alur');
  const [activeSubTab, setActiveSubTab] = useState<'fase' | 'detail'>('fase');

  // 4 FASE UTAMA (Upper row in the mock image)
  const faseUtama = [
    {
      step: '1',
      title: 'PENGAJUAN PROGRAM',
      desc: 'SCB mengajukan program beserta RAB dan dokumen pendukung ke BAZNAS RI untuk mendapatkan persetujuan.',
      bgColor: 'bg-blue-600',
      textColor: 'text-white',
      borderColor: 'border-blue-700',
      icon: FileText
    },
    {
      step: '2',
      title: 'PENCAIRAN DANA',
      desc: 'Setelah program disetujui, BAZNAS RI menyalurkan dana ke SCB sesuai tahapan dan ketentuan yang berlaku.',
      bgColor: 'bg-emerald-600',
      textColor: 'text-white',
      borderColor: 'border-emerald-700',
      icon: Coins
    },
    {
      step: '3',
      title: 'PELAKSANAAN PROGRAM',
      desc: 'SCB melaksanakan program sesuai rencana dan menggunakan dana secara efektif, efisien, dan sesuai ketentuan.',
      bgColor: 'bg-amber-600',
      textColor: 'text-white',
      borderColor: 'border-amber-700',
      icon: Users
    },
    {
      step: '4',
      title: 'PELAPORAN KE BAZNAS RI',
      desc: 'SCB menyusun dan menyerahkan Laporan Pertanggungjawaban (LPJ) kepada BAZNAS RI.',
      bgColor: 'bg-purple-600',
      textColor: 'text-white',
      borderColor: 'border-purple-700',
      icon: ClipboardCheck
    }
  ];

  // 14 DETAILED STEPS (Middle section in mock image)
  const detailPelaporanSteps = [
    {
      step: 1,
      title: 'PENYERAHAN LAPORAN',
      desc: 'PIC/ Admin menyerahkan berkas fisik dokumen laporan pertanggungjawaban (UM) untuk bagian Keuangan.',
      estimasi: '1 hari',
      icon: FileText,
      colorClass: 'text-amber-600 bg-amber-50 border-amber-200'
    },
    {
      step: 2,
      title: 'VERIFIKASI KEUANGAN',
      desc: 'Memeriksa kelengkapan bukti transaksi (nota/kuitansi) dan keabsahan laporan yang diserahkan PIC.',
      estimasi: '3 hari',
      icon: Search,
      colorClass: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    {
      step: 3,
      title: 'PENYELESAIAN SELISIH',
      desc: 'Melakukan rekonsiliasi jika ada sisa uang (dikembalikan ke kas) atau kekurangan uang.',
      estimasi: '7 hari',
      icon: Calculator,
      colorClass: 'text-rose-600 bg-rose-50 border-rose-200'
    },
    {
      step: 4,
      title: 'PENCATATAN TRANSAKSI',
      desc: 'Menginput data transaksi laporan ke dalam buku besar atau sistem pembukuan organisasi.',
      estimasi: '2 hari',
      icon: Laptop,
      colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-200'
    },
    {
      step: 5,
      title: 'DIGITALISASI BERKAS',
      desc: 'Melakukan pemindaian (scanning) seluruh dokumentasi laporan untuk keperluan arsip digital.',
      estimasi: '9 hari',
      icon: Scan,
      colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    },
    {
      step: 6,
      title: 'PELIMPAHAN DOKUMEN',
      desc: 'Menyerahkan berkas fisik laporan kepada Akuntan untuk diproses pada tahap akuntansi.',
      estimasi: '1 hari',
      icon: FolderOpen,
      colorClass: 'text-teal-600 bg-teal-50 border-teal-200'
    },
    {
      step: 7,
      title: 'VERIFIKASI DOKUMEN & SINKRONISASI PEMBUKUAN',
      desc: 'Akuntan memeriksa dokumen satu persatu dan disusun sesuai tanggal kejadian transaksi & buku kas.',
      estimasi: '3 hari',
      icon: ClipboardCheck,
      colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-200'
    },
    {
      step: 8,
      title: 'PEMISAHAN DOKUMEN',
      desc: 'Memisahkan dokumen beban dengan uang muka dan memastikan uang muka terfiling ke dalam odner.',
      estimasi: '1 hari',
      icon: Layers,
      colorClass: 'text-slate-600 bg-slate-50 border-slate-200'
    },
    {
      step: 9,
      title: 'PENYUSUNAN SETTLEMENT',
      desc: 'Dokumen beban satu persatu disusun ke dalam format settlement sesuai pos anggarannya, diberi nomor urut & di print out.',
      estimasi: '5 hari',
      icon: FileText,
      colorClass: 'text-orange-600 bg-orange-50 border-orange-200'
    },
    {
      step: 10,
      title: 'FINALISASI & PENOMORAN',
      desc: 'Memverifikasi ulang settlement, disusun sesuai nomor urut dalam odner, diberi nomor urut di proyek & label.',
      estimasi: '3 hari',
      icon: CheckSquare,
      colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    },
    {
      step: 11,
      title: 'REKAP SETTLEMENT KE FORMAT BAZNAS',
      desc: 'Akuntan membuat rekap settlement ke format pertUM dari BAZNAS dan di print out.',
      estimasi: '2 hari',
      icon: Coins,
      colorClass: 'text-cyan-600 bg-cyan-50 border-cyan-200'
    },
    {
      step: 12,
      title: 'PEMBUATAN COVER, LABEL & BERITA ACARA',
      desc: 'Membuat cover, label odner dan berita acara penyerahan pertUM.',
      estimasi: '1 hari',
      icon: Tag,
      colorClass: 'text-amber-600 bg-amber-50 border-amber-200'
    },
    {
      step: 13,
      title: 'PENGESAHAN (TANDA TANGAN)',
      desc: 'Proses penandatanganan oleh: Akuntan, Keuangan, Manajer Operasional, dan Kepala Sekolah.',
      estimasi: '2 hari',
      icon: Handshake,
      colorClass: 'text-purple-600 bg-purple-50 border-purple-200'
    },
    {
      step: 14,
      title: 'PENYERAHAN AKHIR',
      desc: 'Dokumen laporan yang telah lengkap dan disahkan siap untuk diserahkan kepada BAZNAS.',
      estimasi: '1 hari',
      icon: Send,
      colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    }
  ];

  const sopBukti = [
    {
      title: 'Ketentuan Nota & Kuitansi Pembelian',
      desc: 'Semua bukti pembayaran harus berupa kuitansi cetak resmi/nota dari toko penyedia barang yang mencantumkan nama toko, logo/alamat, nomor telepon, tanggal yang jelas, serta rincian barang dan harga satuan.',
      type: 'wajib',
      icon: CheckCircle
    },
    {
      title: 'Cap / Stempel Toko Bersangkutan',
      desc: 'SOP BAZNAS mengharuskan adanya cap/stempel basah dari toko pada nota/kuitansi. Nota kosong atau tanpa stempel/tanda tangan pihak penjual tidak akan lolos verifikasi.',
      type: 'wajib',
      icon: CheckCircle
    },
    {
      title: 'Ketentuan Materai Fiskal',
      desc: 'Untuk transaksi senilai Rp 5.000.000 atau ke atas, WAJIB menggunakan Materai Rp 10.000 yang ditandatangani oleh pihak penjual dengan sebagian tanda tangan mengenai materai tersebut.',
      type: 'rekomendasi',
      icon: Info
    },
    {
      title: 'Dokumen Pendukung Tambahan',
      desc: 'Untuk kegiatan pelatihan, rapat koordinasi, atau workshop; WAJIB menyertakan daftar hadir peserta beserta foto dokumentasi kegiatan sebagai bukti pendukung utama pengeluaran.',
      type: 'rekomendasi',
      icon: Info
    }
  ];

  const faqs = [
    {
      q: 'Berapa hari batas waktu maksimal penyerahan laporan pertanggungjawaban (PertUM)?',
      a: 'Berdasarkan pedoman pengelolaan keuangan BAZNAS, batas akhir penyerahan berkas fisik dan pelaporan PertUM di aplikasi MONETA adalah 14 (empat belas) hari kalender setelah kegiatan selesai dilaksanakan.'
    },
    {
      q: 'Bagaimana jika nota fisik rusak, hilang, atau tidak memiliki stempel basah?',
      a: 'Anda wajib meminta kuitansi pengganti atau surat keterangan resmi dari toko penjual. Pengajuan pertanggungjawaban tanpa stempel basah atau bukti resmi lainnya tidak dapat diverifikasi oleh admin keuangan.'
    },
    {
      q: 'Apakah diperbolehkan melakukan perubahan alokasi pos anggaran di tengah jalan?',
      a: 'Perubahan alokasi pos anggaran diperbolehkan hanya dengan persetujuan khusus Kepala Sekolah dan Tim Keuangan sebelum uang muka dibelanjakan, serta harus dicantumkan dalam keterangan saat pengajuan revisi.'
    },
    {
      q: 'Mengapa laporan PertUM saya ditolak secara sistem?',
      a: 'Hal ini biasanya disebabkan oleh ketidaksesuaian nominal antara nota yang diunggah dengan input sistem, stempel toko yang tidak terlihat jelas (buram), atau ketiadaan lampiran daftar hadir dan dokumentasi kegiatan.'
    }
  ];

  const kontakLayanan = [
    {
      name: 'Ustadzah Asiah - Keuangan SCB',
      role: 'Uang Muka Kerja (PUM) & Operasional',
      phone: '0812-3456-7890',
      wa: 'https://wa.me/6281234567890'
    },
    {
      name: 'Ust Dany - Akuntan SCB',
      role: 'Penyusunan Settlement, Verifikasi & Audit LPJ',
      phone: '0899-8765-4321',
      wa: 'https://wa.me/6289987654321'
    }
  ];

  return (
    <div className="space-y-6 pt-4 border-t border-slate-200" id="info-keuangan-scb-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 uppercase">
              Alur Manajemen Keuangan
            </h2>
            <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">
              Dari Pengajuan Program, Pencairan Hingga Pelaporan Dari SCB ke BAZNAS RI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl max-w-max self-start md:self-auto border border-slate-200 shadow-inner">
          <button
            onClick={() => setActiveTab('alur')}
            className={`px-4 py-2 text-xs font-black tracking-tight rounded-lg transition-all uppercase ${
              activeTab === 'alur' 
                ? 'bg-white text-slate-900 shadow-md' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Alur Manajemen & Pelaporan
          </button>
          <button
            onClick={() => setActiveTab('sop')}
            className={`px-4 py-2 text-xs font-black tracking-tight rounded-lg transition-all uppercase ${
              activeTab === 'sop' 
                ? 'bg-white text-slate-900 shadow-md' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            SOP Bukti
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-4 py-2 text-xs font-black tracking-tight rounded-lg transition-all uppercase ${
              activeTab === 'faq' 
                ? 'bg-white text-slate-900 shadow-md' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            FAQ
          </button>
          <button
            onClick={() => setActiveTab('kontak')}
            className={`px-4 py-2 text-xs font-black tracking-tight rounded-lg transition-all uppercase ${
              activeTab === 'kontak' 
                ? 'bg-white text-slate-900 shadow-md' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Kontak Tim
          </button>
        </div>
      </div>

      {/* Info Alert Bar */}
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200/60 rounded-2xl p-4 flex gap-3 text-amber-900 shadow-sm">
        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5 animate-pulse" size={18} />
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-amber-800">Prinsip Pengelolaan Keuangan</p>
          <p className="text-[11px] font-semibold text-amber-700 mt-1 leading-relaxed">
            Harap selalu berpedoman pada asas <strong>Amanah</strong> (mengelola dana sesuai peruntukan), <strong>Transparan</strong> (seluruh proses dapat dipertanggungjawabkan), <strong>Akuntabel</strong> (didukung bukti sah & lengkap), dan <strong>Tepat Waktu</strong> (laporan disampaikan sesuai timeline).
          </p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-md overflow-hidden rounded-[2rem] bg-white">
        <CardContent className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'alur' && (
              <motion.div
                key="alur"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                {/* Visual Segment Controls within Alur */}
                <div className="flex border-b border-slate-100 pb-3 gap-4">
                  <button 
                    onClick={() => setActiveSubTab('fase')}
                    className={`text-sm font-black tracking-tight pb-3 relative uppercase transition-colors ${activeSubTab === 'fase' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    1. FASE MANAJEMEN UTAMA
                    {activeSubTab === 'fase' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
                  </button>
                  <button 
                    onClick={() => setActiveSubTab('detail')}
                    className={`text-sm font-black tracking-tight pb-3 relative uppercase transition-colors flex items-center gap-2 ${activeSubTab === 'detail' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    2. DETAIL ALUR PELAPORAN (14 LANGKAH)
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-mono scale-90 px-1.5 font-bold">1-14</Badge>
                    {activeSubTab === 'detail' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
                  </button>
                </div>

                {activeSubTab === 'fase' ? (
                  <div className="space-y-6">
                    <div className="text-center max-w-2xl mx-auto space-y-2">
                      <h4 className="text-lg font-black text-slate-800 tracking-tight uppercase">4 FASE BESAR SIKLUS KEUANGAN</h4>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Langkah strategis dari inisiasi hingga penyusunan LPJ ke BAZNAS RI</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {faseUtama.map((f, idx) => {
                        const Icon = f.icon;
                        return (
                          <div key={idx} className="relative group border border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-white hover:shadow-lg transition-all p-5 flex flex-col justify-between">
                            {idx < 3 && (
                              <div className="hidden md:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10 text-slate-300">
                                <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                              </div>
                            )}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                                  {f.step}
                                </span>
                                <div className={`p-2 rounded-xl text-white ${f.bgColor} shadow-md`}>
                                  <Icon size={18} />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <h5 className="text-xs font-black text-slate-900 tracking-tight uppercase">{f.title}</h5>
                                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{f.desc}</p>
                              </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">FASE PROSES</span>
                              <Badge className={`${f.bgColor} text-white text-[9px] scale-95`}>Aktif</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="text-center max-w-2xl mx-auto space-y-2">
                      <h4 className="text-lg font-black text-slate-800 tracking-tight uppercase">ALUR PELAPORAN (DARI SCB KE BAZNAS RI)</h4>
                      <p className="text-xs text-slate-400 font-semibold leading-relaxed">SOP 14 langkah administrasi pelaporan pertanggungjawaban secara berurutan dan disiplin</p>
                    </div>

                    <div className="bg-slate-50/40 border border-slate-100 rounded-3xl p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {detailPelaporanSteps.map((step, idx) => {
                          const StepIcon = step.icon;
                          return (
                            <div 
                              key={step.step}
                              className="relative flex flex-col justify-between border border-slate-100 hover:border-blue-200 rounded-2xl p-4 bg-white/80 hover:bg-white hover:shadow-md transition-all group"
                            >
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-[11px] shadow-sm">
                                    {step.step}
                                  </span>
                                  <div className={`p-1.5 rounded-lg border ${step.colorClass}`}>
                                    <StepIcon size={14} />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <h5 className="text-[11px] font-black text-slate-950 leading-tight uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                                    {step.title}
                                  </h5>
                                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                    {step.desc}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between text-[9px] text-slate-400 font-semibold font-mono">
                                <span className="uppercase text-slate-300">Estimasi waktu</span>
                                <span className="bg-slate-100 text-slate-700 py-0.5 px-1.5 rounded-md font-bold">{step.estimasi}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Dokumen yang diserahkan dan prinsip keuangan bento-like layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-7 bg-indigo-50/40 border border-indigo-100/60 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-md">
                            <ClipboardCheck size={16} />
                          </div>
                          <div>
                            <h5 className="text-xs font-black text-indigo-950 uppercase tracking-tight">DOKUMEN YANG DISERAHKAN KE BAZNAS RI</h5>
                            <p className="text-[10px] text-indigo-600 font-bold uppercase mt-0.5">Kelengkapan Berkas Wajib Laporan LPJ</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {[
                            'Rekap Settlement (Sistem MONETA)',
                            'Dokumen Pendukung Lengkap (Nota/Kuitansi Asli)',
                            'Berita Acara Penyerahan Berkas PertUM',
                            'Cover & Label Odner Berwarna Sesuai Unit',
                            'Laporan LPJ Lengkap & Dokumentasi Fisik'
                          ].map((doc, idx) => (
                            <div key={idx} className="flex items-center gap-2.5 p-2.5 bg-white border border-indigo-100/30 rounded-xl shadow-subtle">
                              <CheckCircle className="text-emerald-500 shrink-0" size={14} />
                              <span className="text-[10px] font-bold text-slate-700">{doc}</span>
                            </div>
                          ))}
                        </div>

                        <p className="text-[10px] text-indigo-500 font-semibold leading-relaxed">
                          * Seluruh dokumen wajib diarsip rapi ke dalam map odner dan disampaikan tepat waktu sesuai timeline yang telah diinstruksikan oleh BAZNAS RI.
                        </p>
                      </div>

                      <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 text-white rounded-3xl p-6 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-amber-400">
                            <Sparkles size={16} />
                            <h5 className="text-xs font-black uppercase tracking-widest">PRINSIP PENGELOLAAN KEUANGAN</h5>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                            Pilar pokok dalam kepatuhan, keandalan, dan transparansi anggaran Sekolah Cendekia BAZNAS (SCB).
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/80">
                          {[
                            { title: 'Amanah', desc: 'Mengelola dana sesuai peruntukan program.' },
                            { title: 'Transparan', desc: 'Seluruh proses transaksional terdata jujur.' },
                            { title: 'Akuntabel', desc: 'Didukung bukti nota fisik sah & lengkap.' },
                            { title: 'Tepat Waktu', desc: 'Laporan disampaikan tepat sesuai timeline.' }
                          ].map((p, idx) => (
                            <div key={idx} className="space-y-1">
                              <h6 className="text-[11px] font-black text-lime-400 flex items-center gap-1">
                                <Shield size={10} />
                                {p.title}
                              </h6>
                              <p className="text-[9px] text-slate-400 leading-snug">{p.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'sop' && (
              <motion.div
                key="sop"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    STANDAR DOKUMEN & VERIFIKASI TRANSAKSI (SOP BAZNAS)
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Aturan bukti transaksi wajib guna menghindari penolakan audit laporan pertanggungjawaban</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sopBukti.map((s, idx) => {
                    const IconComp = s.icon;
                    return (
                      <div key={idx} className="flex gap-4 p-5 hover:bg-slate-50/50 rounded-2xl border border-slate-100 transition-all bg-white shadow-subtle">
                        <div className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border ${
                          s.type === 'wajib' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                        }`}>
                          <IconComp size={18} />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-800 leading-tight tracking-tight">{s.title}</h4>
                            <Badge className={`text-[8px] font-black tracking-widest uppercase hover:bg-transparent ${
                              s.type === 'wajib' 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-50' 
                                : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-50'
                            }`} variant="outline">
                              {s.type}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{s.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>


              </motion.div>
            )}

            {activeTab === 'faq' && (
              <motion.div
                key="faq"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <HelpCircle size={16} className="text-emerald-600" />
                    TANYA JAWAB (FAQ) SEPUTAR ATURAN KEUANGAN
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Pertanyaan yang paling sering ditanyakan oleh masing-masing unit kerja</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {faqs.map((f, idx) => (
                    <div key={idx} className="p-5 border border-slate-100 rounded-2xl bg-slate-50/30 hover:border-slate-200 hover:bg-slate-50/70 transition-all flex gap-3">
                      <div className="h-6 w-6 text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md flex items-center justify-center shrink-0">Q</div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-black text-slate-800 leading-snug tracking-tight">{f.q}</h4>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{f.a}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'kontak' && (
              <motion.div
                key="kontak"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <PhoneCall size={16} className="text-teal-600" />
                    KONTAK UTAMA LAYANAN KEUANGAN SCB
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Butuh bantuan darurat atau konsultasi? Hubungi langsung personil penanggungjawab dibawah ini</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                  {kontakLayanan.map((k, idx) => (
                    <div key={idx} className="border border-slate-100 bg-slate-50/20 hover:bg-slate-50/80 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-subtle hover:border-slate-200">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-teal-50 border border-teal-100 text-teal-600 rounded-xl flex items-center justify-center">
                            <PhoneCall size={14} />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 leading-tight">{k.name}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{k.role}</p>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">Melayani verifikasi bukti pembelian, konsultasi format RAB, dan kendala pencairan sistem MONETA.</p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-mono font-medium text-slate-400 uppercase">Jam Kerja: 08:00 - 16:00</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};
