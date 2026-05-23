import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ExternalLink,
  Image as ImageIcon,
  MessageSquare,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { getApiUrl } from '../../lib/utils';

const getDonationDate = (donation: any): Date => {
  if (!donation.createdAt) return new Date();
  if (typeof donation.createdAt.toDate === 'function') {
    return donation.createdAt.toDate();
  }
  if (donation.createdAt.seconds) {
    return new Date(donation.createdAt.seconds * 1000);
  }
  return new Date(donation.createdAt);
};

const sendWhatsApp = (phoneNumber: string, message: string) => {
  if (!phoneNumber) {
    toast.error("Nomor WhatsApp tidak ditemukan");
    return;
  }
  const cleanedPhone = phoneNumber.replace(/\D/g, '');
  const finalPhone = cleanedPhone.startsWith('0') ? '62' + cleanedPhone.slice(1) : cleanedPhone;
  const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

export const DonationList = () => {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'donations'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDonations(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getFullEvidenceUrl = (url: string) => {
    if (!url) return 'Tidak Ada Bukti';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return window.location.origin + url;
  };

  const syncToSheetsWithData = async (dataToSync: any[], silent = false) => {
    let toastId: string | number = '';
    if (!silent) {
      toastId = toast.loading("Menyinkronkan data donasi ke Google Sheet...");
    }
    setIsSyncing(true);
    try {
      const spreadsheetId = '1VmjYCnvWO0vrX5PinazbqR3jSIDnEoVAVfyMdvDs4VM';
      const headers = ["Tanggal", "Donatur", "Nominal", "Tujuan", "Bukti", "Status"];
      
      const sorted = [...dataToSync].sort((a, b) => {
        return getDonationDate(a).getTime() - getDonationDate(b).getTime();
      });

      const rows = sorted.map(d => {
        const dateStr = getDonationDate(d).toLocaleDateString('id-ID', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }) + ' ' + getDonationDate(d).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit'
        });

        return [
          dateStr,
          d.donaturName || 'Donatur Tanpa Nama',
          d.amount || 0,
          d.targetAccount === 'smp' ? 'SMP' : d.targetAccount === 'sma' ? 'SMA' : (d.targetAccount || '-'),
          getFullEvidenceUrl(d.evidenceUrl),
          d.status || 'pending'
        ];
      });

      const bodyData = [headers, ...rows];

      const res = await fetch(getApiUrl('/api/sheets/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          data: bodyData
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || errData.error || 'Gagal sinkronisasi');
      }

      if (!silent) {
        toast.success("Sinkronisasi Google Sheet berhasil!", { id: toastId });
      }
    } catch (error: any) {
      console.error("Sync Error:", error);
      if (!silent) {
        toast.error(`Gagal sinkronisasi: ${error.message}. Pastikan spreadsheet telah dibagikan sebagai Editor ke email Service Account.`, { id: toastId });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const syncToSheets = async () => {
    await syncToSheetsWithData(donations);
  };

  const updateStatus = async (id: string, status: 'verified' | 'rejected' | 'pending') => {
    try {
      await updateDoc(doc(db, 'donations', id), { status });
      const statusText = status === 'verified' ? 'verifikasi' : status === 'rejected' ? 'tolak' : 'kembalikan ke pending';
      toast.success(`Donasi berhasil di-${statusText}`);
      
      const updatedDonations = donations.map(d => d.id === id ? { ...d, status } : d);
      await syncToSheetsWithData(updatedDonations, true);
    } catch (error: any) {
      toast.error("Gagal update status: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'donations', id));
      toast.success("Data donasi berhasil dihapus");
      setDeleteId(null);
      
      const updatedDonations = donations.filter(d => d.id !== id);
      await syncToSheetsWithData(updatedDonations, true);
    } catch (error: any) {
      toast.error("Gagal menghapus data: " + error.message);
    }
  };

  const filteredDonations = donations.filter(d => 
    d.donaturName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.contact?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-50 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-xl font-black text-slate-900">Daftar Donasi</CardTitle>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input 
                  placeholder="Cari donatur..." 
                  className="pl-10 h-10 rounded-xl bg-slate-50 border-slate-100 placeholder:text-slate-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                onClick={syncToSheets}
                disabled={isSyncing}
                variant="outline"
                className="h-10 text-xs font-black tracking-tight rounded-xl border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center gap-2"
              >
                <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-orange-500 animate-spin' : 'bg-emerald-500 animate-pulse'}`} />
                {isSyncing ? 'Sinkronisasi...' : 'Sinkronkan Google Sheets'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-4">Tanggal</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-4">Donatur</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-4">Nominal</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-4">Tujuan</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-4 text-center">Bukti</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-4 text-center">Status</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-4 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20 text-slate-400 font-medium">Memuat data...</TableCell>
                  </TableRow>
                ) : filteredDonations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20 text-slate-400 font-medium">Belaum ada data donasi.</TableCell>
                  </TableRow>
                ) : (
                  filteredDonations.map((donation) => (
                     <TableRow key={donation.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="py-4">
                        <div className="text-[11px] font-bold text-slate-600">
                          {getDonationDate(donation).toLocaleDateString('id-ID')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {getDonationDate(donation).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-black text-slate-800 text-sm">{donation.donaturName}</div>
                        <div className="text-[10px] font-medium text-slate-500">{donation.contact}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-black text-emerald-600 text-sm">
                          Rp {donation.amount?.toLocaleString('id-ID')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-lg text-[10px] font-black uppercase tracking-widest border-slate-200 text-slate-500">
                          {donation.targetAccount === 'smp' ? 'SMP' : 'SMA'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {donation.evidenceUrl ? (
                          <Dialog>
                            <DialogTrigger render={
                              <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                                <ImageIcon size={16} />
                              </Button>
                            } />
                            <DialogContent className="max-w-2xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
                              <DialogHeader className="p-6 bg-slate-900">
                                <DialogTitle className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                                  <ImageIcon size={16} />
                                  Bukti Transfer - {donation.donaturName}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="p-6 bg-slate-50 flex items-center justify-center">
                                {donation.evidenceUrl.startsWith('http') ? (
                                  <div className="flex flex-col items-center gap-4">
                                    <img src={donation.evidenceUrl} alt="Bukti Transfer" className="max-h-[70vh] rounded-2xl shadow-lg" />
                                    <Button 
                                      render={
                                        <a href={donation.evidenceUrl} target="_blank" rel="noopener noreferrer">
                                          <ExternalLink size={14} className="mr-2" />
                                          Buka di Google Drive
                                        </a>
                                      } 
                                      variant="outline" 
                                      className="rounded-xl border-slate-200" 
                                    />
                                  </div>
                                ) : (
                                  <img src={donation.evidenceUrl} alt="Bukti Transfer" className="max-h-[70vh] rounded-2xl shadow-lg" />
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <span className="text-[10px] font-black uppercase text-slate-300 italic">No Proof</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`rounded-lg py-1 px-2 text-[10px] font-black uppercase tracking-widest shadow-none ${
                          donation.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                          donation.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {donation.status === 'verified' ? 'Verified' :
                           donation.status === 'rejected' ? 'Rejected' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button 
                            onClick={() => {
                              const currentStatus = donation.status || 'pending';
                              if (currentStatus === 'verified') {
                                updateStatus(donation.id, 'pending');
                              } else {
                                updateStatus(donation.id, 'verified');
                              }
                            }}
                            variant="ghost" 
                            size="sm" 
                            className={`h-8 w-8 rounded-lg transition-all ${
                              donation.status === 'verified' 
                                ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-500/20' 
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={donation.status === 'verified' ? "Batalkan Verifikasi" : "Verifikasi Donasi"}
                          >
                            <CheckCircle2 size={16} />
                          </Button>
                          
                          <Button 
                            onClick={() => {
                              const currentStatus = donation.status || 'pending';
                              if (currentStatus === 'rejected') {
                                updateStatus(donation.id, 'pending');
                              } else {
                                updateStatus(donation.id, 'rejected');
                              }
                            }}
                            variant="ghost" 
                            size="sm" 
                            className={`h-8 w-8 rounded-lg transition-all ${
                              donation.status === 'rejected' 
                                ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm shadow-rose-500/20' 
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title={donation.status === 'rejected' ? "Batalkan Penolakan" : "Tolak Donasi"}
                          >
                            <XCircle size={16} />
                          </Button>

                          <Button 
                            onClick={() => sendWhatsApp(donation.contact, `Halo ${donation.donaturName},\n\nTerima kasih telah berdonasi ke Sekolah Cendekia BAZNAS.\nDonasi Anda sebesar Rp ${donation.amount.toLocaleString('id-ID')} telah kami verifikasi.\n\nSemoga menjadi amal jariyah bagi penuntut ilmu. Syukron katsiran.`)}
                            variant="ghost" size="sm" className="h-8 w-8 rounded-lg text-slate-450 hover:text-emerald-600 hover:bg-emerald-50"
                            title="Kirim Terima Kasih WA"
                          >
                            <MessageSquare size={16} />
                          </Button>

                          <Button 
                            onClick={() => {
                              setDeleteId(donation.id);
                              setDeleteName(donation.donaturName || 'Donatur Tanpa Nama');
                            }}
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Hapus Data Donasi"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Konfirmasi Hapus */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-md rounded-[2rem] p-6 bg-white border border-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-black uppercase tracking-widest text-sm flex items-center gap-2">
              <Trash2 className="text-rose-500" size={16} />
              Konfirmasi Hapus Data
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-xs font-medium text-slate-600 leading-relaxed">
            Apakah Anda yakin ingin menghapus data donasi dari <strong className="text-slate-800">{deleteName}</strong> secara permanen? Tindakan ini tidak dapat dibatalkan.
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setDeleteId(null)}
              className="rounded-xl text-xs font-black uppercase tracking-wider"
            >
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteId && handleDelete(deleteId)}
              className="rounded-xl text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white"
            >
              Hapus Permanen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
