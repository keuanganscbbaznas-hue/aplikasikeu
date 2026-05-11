import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
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
  Image as ImageIcon
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from 'sonner';

export const DonationList = () => {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const updateStatus = async (id: string, status: 'verified' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'donations', id), { status });
      toast.success(`Donasi berhasil di-${status === 'verified' ? 'verifikasi' : 'tolak'}`);
    } catch (error: any) {
      toast.error("Gagal update status: " + error.message);
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
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input 
                placeholder="Cari donatur..." 
                className="pl-10 h-10 rounded-xl bg-slate-50 border-slate-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                          {donation.createdAt?.toDate().toLocaleDateString('id-ID')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {donation.createdAt?.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
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
                        <div className="flex items-center justify-center gap-1">
                          {donation.status === 'pending' && (
                            <>
                              <Button 
                                onClick={() => updateStatus(donation.id, 'verified')}
                                variant="ghost" size="sm" className="h-8 w-8 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                <CheckCircle2 size={16} />
                              </Button>
                              <Button 
                                onClick={() => updateStatus(donation.id, 'rejected')}
                                variant="ghost" size="sm" className="h-8 w-8 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              >
                                <XCircle size={16} />
                              </Button>
                            </>
                          )}
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
    </div>
  );
};
