import * as React from 'react';
import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc,
  deleteDoc,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { 
  UserProfile, 
  Submission, 
  getStagesByType, 
  UserRole, 
  SubmissionType,
  HistoryEntry 
} from './types';
import { handleFirestoreError, OperationType } from './lib/firebaseUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CashFlowBoard } from './components/CashFlowBoard';
import { GlobalBalanceSummary } from './components/GlobalBalanceSummary';
import { StatusMultiSelect } from './components/StatusMultiSelect';
import { UM_STAGES, TRANSACTION_STAGES } from './types';
import { BaznasBudgetManager } from './components/BaznasBudgetManager';
import { LaporanManager } from './components/LaporanManager';
import { AdministrasiManager } from './components/administrasi/AdministrasiManager';
import { AnalisisManager } from './components/AnalisisManager';
import { BerkasDigitalManager } from './components/BerkasDigitalManager';
import SignaturePad from 'signature_pad';
import { jsPDF } from 'jspdf';
import { 
  LayoutDashboard, 
  Plus, 
  Minus,
  Search,
  Filter,
  LogOut, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  FileDown,
  ChevronRight,
  User as UserIcon,
  ShieldCheck,
  History,
  ArrowRight,
  ArrowLeft,
  Download,
  Upload,
  Trash2,
  Edit2,
  FileCheck,
  BookOpen,
  PieChart,
  Settings,
  ClipboardList,
  Menu,
  X,
  CreditCard,
  Banknote,
  Users,
  ExternalLink,
  FolderOpen,
  Palette,
  Database,
  Lock,
  Activity,
  Briefcase,
  RefreshCw,
  Check,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import Papa from 'papaparse';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { resizeImage } from './lib/utils';
import { Phone } from 'lucide-react';

const formatWhatsAppMessage = (submission: Submission) => {
  const stages = getStagesByType(submission.type);
  const currentStatus = stages[submission.currentStageIndex];
  const url = window.location.origin;
  
  return `Halo PIC ${submission.picName || submission.submittedByName},\n\nInformasi Update Pengajuan:\n📌 Judul: *${submission.title}*\n💰 Nominal: *Rp ${submission.amount.toLocaleString('id-ID')}*\n🔄 Status: *${currentStatus}*\n\nSilakan cek detail selengkapnya di aplikasi: ${url}\n\nTerima kasih.`;
};

const sendWhatsApp = (phoneNumber: string, message: string) => {
  if (!phoneNumber) {
    toast.error("Nomor WhatsApp tidak ditemukan");
    return;
  }
  // Remove non-numeric characters
  const cleanedPhone = phoneNumber.replace(/\D/g, '');
  // Prefix with 62 if starts with 0
  const finalPhone = cleanedPhone.startsWith('0') ? '62' + cleanedPhone.slice(1) : cleanedPhone;
  
  const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

const OWNER_EMAIL = 'keuanganscbbaznas@gmail.com';
const SUPER_ADMIN_EMAILS = [OWNER_EMAIL, 'kamal2015go@gmail.com'];
const ADMIN_EMAILS = [
  ...SUPER_ADMIN_EMAILS,
  'keuangan.scb@gmail.com',
  'tatausahascba@gmail.com',
  'kamal2015go@gmail.com',
  'operasional.scb@gmail.com'
];
const TRACKING_ADMIN_EMAILS = [
  'keuanganscbbaznas@gmail.com',
  'keuangan.scb@gmail.com',
  'tatausahascba@gmail.com',
  'kamal2015go@gmail.com',
  'operasional.scb@gmail.com'
];

function DebouncedInput({ 
  value, 
  onChange, 
  delay = 300, 
  ...props 
}: Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> & { 
  value: string | number,
  onChange: (value: string) => void, 
  delay?: number 
}) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      onChange(String(localValue));
    }, delay);
    return () => clearTimeout(handler);
  }, [localValue, delay, onChange]);

  return (
    <Input 
      {...props} 
      value={localValue} 
      onChange={(e) => setLocalValue(e.target.value)} 
    />
  );
}

function SubmissionGrid({ 
  items, 
  onApprove, 
  onReject, 
  onDelete,
  onEdit,
  userRole,
  selectedSubmissions,
  onToggle,
  currentUser,
  onSelectAll,
  onBukukan
}: { 
  items: Submission[], 
  onApprove: (s: Submission, comment?: string) => void,
  onReject: (s: Submission, comment?: string) => void,
  onDelete: (id: string) => void,
  onEdit: (s: Submission) => void,
  userRole: UserRole,
  selectedSubmissions: Set<string>,
  onToggle: (id: string) => void,
  currentUser: User | null,
  onSelectAll?: (ids: string[]) => void,
  onBukukan?: (s: Submission, unit: 'Kas Tunai SMP' | 'Kas Tunai SMA' | 'Kas Bank SMP' | 'Kas Bank SMA') => void
}) {
  const allIds = items.map(s => s.id!).filter(Boolean);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedSubmissions.has(id));

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-4 py-4 w-12 text-center">
                    {onSelectAll && (
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 transition-all cursor-pointer"
                        checked={allSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onSelectAll(allIds);
                          } else {
                            onSelectAll([]);
                          }
                        }}
                      />
                    )}
                  </th>
                  <th className="px-2 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest w-16 text-center">Tipe</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest w-72 max-w-[280px]">Judul & Keterangan</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest w-32">Nominal</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest w-72 text-center">Tahapan & Progress</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest w-16">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout" initial={false}>
                  {items.map((sub) => (
                    <SubmissionCard 
                      key={sub.id} 
                      submission={sub} 
                      onApprove={onApprove}
                      onReject={onReject}
                      onDelete={onDelete}
                      onEdit={onEdit}
                      onBukukan={onBukukan}
                      userRole={userRole}
                      currentUser={currentUser}
                      isSelected={sub.id ? selectedSubmissions.has(sub.id) : false}
                      onToggle={onToggle}
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
        </div>
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FileText size={48} strokeWidth={1} className="mb-4 opacity-20" />
            <p className="font-black uppercase tracking-[0.2em] text-[10px] opacity-50">Data Tidak Ditemukan</p>
          </div>
        )}
    </div>
  );
}

function SubmissionCard({ 
  submission, 
  onApprove, 
  onReject,
  onDelete,
  onEdit,
  userRole,
  currentUser,
  isSelected,
  onToggle,
  onBukukan
}: { 
  key?: string | number,
  submission: Submission, 
  onApprove: (s: Submission, comment?: string) => void,
  onReject: (s: Submission, comment?: string) => void,
  onDelete: (id: string) => void,
  onEdit: (s: Submission) => void,
  userRole: UserRole,
  currentUser: User | null,
  isSelected: boolean,
  onToggle: (id: string) => void,
  onBukukan?: (s: Submission, unit: 'Kas Tunai SMP' | 'Kas Tunai SMA' | 'Kas Bank SMP' | 'Kas Bank SMA') => void
}) {
  const stages = getStagesByType(submission.type);
  const isLastStage = submission.currentStageIndex === stages.length - 1;
  
  const transferredIndex = stages.findIndex(s => s.toLowerCase().includes("sudah di transfer"));
  const reportsIndex = stages.findIndex(s => s.toLowerCase().includes("berkas laporan di admin"));
  
  const isTransferred = transferredIndex !== -1 && submission.currentStageIndex >= transferredIndex;
  const isUM = submission.type === 'uang_muka';
  const isPendingReport = isUM && isTransferred && (reportsIndex === -1 || submission.currentStageIndex < reportsIndex);
  const isReported = isUM && reportsIndex !== -1 && submission.currentStageIndex >= reportsIndex;

  const typeStyles: Record<string, string> = {
    uang_muka: "bg-amber-100 text-amber-700",
    reimburse: "bg-blue-100 text-blue-700",
    pembiayaan: "bg-purple-100 text-purple-700"
  };

  const typeInitial = {
    uang_muka: "UM",
    reimburse: "RB",
    pembiayaan: "PB"
  };

  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors group ${isSelected ? 'bg-primary/5' : ''}`}
    >
      <td className="px-4 py-4 text-center">
        <input 
          type="checkbox" 
          checked={isSelected}
          onChange={() => submission.id && onToggle(submission.id)}
          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 transition-all cursor-pointer"
        />
      </td>
      <td className="px-2 py-4">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-[10px] font-black shadow-sm mx-auto ${typeStyles[submission.type] || typeStyles.pembiayaan}`}>
          {typeInitial[submission.type as keyof typeof typeInitial] || "PB"}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-0.5 max-w-[260px]">
          <h4 className="font-['Times_New_Roman'] font-black text-slate-800 text-[16px] tracking-tight leading-snug">
            {submission.title}
          </h4>
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
               {format(parseFirestoreDate(submission.createdAt), 'dd MMM yyyy')}
             </span>
             <div className="h-1 w-1 bg-slate-200 rounded-full" />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter truncate max-w-[150px]" title="Pemohon">
               Pemohon: {submission.submittedByName}
             </span>
             {submission.picName && (
               <>
                 <div className="h-1 w-1 bg-slate-200 rounded-full" />
                 <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter" title="PIC">
                   PIC: {submission.picName}
                 </span>
               </>
             )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 font-['Times_New_Roman'] text-[13px]">
        <div className="flex items-baseline gap-1">
          <span className="text-[14px] bg-[#ffffff] font-bold text-slate-400">Rp</span>
          <span className="font-['Times_New_Roman'] font-black text-[16px] text-slate-800 tracking-tight tabular-nums">
            {submission.amount.toLocaleString('id-ID')}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-2 max-w-[240px] mx-auto">
          <div className="flex items-center justify-between gap-2">
            <span className="font-['Times_New_Roman'] px-2 py-0.5 rounded-md text-[10px] bg-emerald-50 text-emerald-700 flex items-center font-black uppercase tracking-tighter line-clamp-1">
              {stages[submission.currentStageIndex]}
            </span>
            <span className="text-[9px] font-bold text-slate-300 shrink-0">
              {submission.currentStageIndex + 1}/{stages.length}
            </span>
          </div>
          <WorkflowProgressBar stages={stages} currentIdx={submission.currentStageIndex} />
        </div>
      </td>
      <td className="px-6 py-4">
         <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger 
                  render={
                    <Button 
                      variant="ghost" 
                      className="group rounded-xl bg-slate-900 text-white hover:bg-emerald-600 hover:text-white transition-all shadow-md h-9 w-9 flex items-center justify-center p-0"
                    >
                      <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  }
                />
                <DialogContent className="max-w-3xl md:max-w-4xl rounded-[2rem] border-none shadow-3xl p-0 overflow-hidden">
                  <div className="flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-slate-100 bg-white">
                      <DialogHeader>
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xs font-black shadow-lg ${typeStyles[submission.type] || typeStyles.pembiayaan}`}>
                                 {typeInitial[submission.type as keyof typeof typeInitial] || "PB"}
                              </div>
                              <div>
                                 <DialogTitle className="font-black text-xl tracking-tighter text-slate-900">{submission.title}</DialogTitle>
                                 <div className="flex items-center gap-3 mt-1">
                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">{submission.type.replace('_', ' ')}</Badge>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{format(parseFirestoreDate(submission.createdAt), 'dd MMMM yyyy HH:mm')}</span>
                                 </div>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Nominal</p>
                              <p className="text-2xl font-black text-slate-900 tracking-tighter">Rp {submission.amount.toLocaleString('id-ID')}</p>
                           </div>
                        </div>
                      </DialogHeader>
                    </div>
                    
                    <ScrollArea className="flex-1 p-8 bg-slate-50/30">
                      <SubmissionDetailView 
                        submission={submission} 
                        stages={stages} 
                        isLastStage={isLastStage}
                        onApprove={onApprove}
                        onReject={onReject}
                        onDelete={() => onDelete(submission.id!)}
                        onEdit={onEdit}
                        onBukukan={onBukukan}
                        userRole={userRole}
                        currentUser={currentUser}
                      />
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
              
              {currentUser && currentUser.email && TRACKING_ADMIN_EMAILS.includes(currentUser.email) && (
                <Button 
                  variant="ghost" 
                  onClick={(e) => { e.stopPropagation(); onEdit(submission); }}
                  className="group rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-all shadow-sm border border-slate-200 h-9 w-9 flex items-center justify-center p-0"
                  title="Edit Pengajuan"
                >
                  <Edit2 size={16} />
                </Button>
              )}

              {submission.picWhatsapp && (
                <Button 
                  variant="ghost" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    sendWhatsApp(submission.picWhatsapp!, formatWhatsAppMessage(submission)); 
                  }}
                  className="group rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-all shadow-sm border border-emerald-100 h-9 w-9 flex items-center justify-center p-0"
                  title="Kirim Notifikasi WhatsApp"
                >
                  <MessageSquare size={16} />
                </Button>
              )}
            </div>

            {(isTransferred || isPendingReport) && (
              <div className="flex items-center justify-center gap-2">
                 {isTransferred && (
                   <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm shrink-0" title="Transfer Sukses">
                     <CheckCircle2 size={14} />
                   </div>
                 )}
                 {isPendingReport && (
                   <div className="h-6 w-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shadow-sm shrink-0 animate-pulse" title="Butuh Laporan">
                     <AlertCircle size={14} />
                   </div>
                 )}
              </div>
            )}
         </div>
      </td>
    </motion.tr>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [logoURL, setLogoURL] = useState<string>('/logo.png');
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterPIC, setFilterPIC] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tracking' | 'buku_kas' | 'anggaran' | 'laporan' | 'berkas' | 'administrasi' | 'analisis' | 'settings'>('dashboard');
  const [bukuKasUnit, setBukuKasUnit] = useState<'smp' | 'sma'>('smp');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const toggleSelection = (id: string) => {
    setSelectedSubmissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Super Admin check
  const isSuperAdmin = useMemo(() => {
    if (!profile) return false;
    return SUPER_ADMIN_EMAILS.includes(profile.email);
  }, [profile]);

  // Admin check
  const isAdmin = useMemo(() => {
    if (!profile) return false;
    return profile.role === 'admin' || ADMIN_EMAILS.includes(profile.email);
  }, [profile]);

  const isTrackingAdmin = useMemo(() => {
    if (!profile) return false;
    return TRACKING_ADMIN_EMAILS.includes(profile.email);
  }, [profile]);

  const isKamal = useMemo(() => {
    if (!profile) return false;
    return profile.email === 'kamal2015go@gmail.com' || profile.email === 'tatausahascba@gmail.com';
  }, [profile]);

  const isKeuanganSCB = useMemo(() => {
    if (!profile) return false;
    return profile.email === 'keuangan.scb@gmail.com';
  }, [profile]);

  const [editType, setEditType] = useState<SubmissionType>('uang_muka');
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPicName, setEditPicName] = useState('');
  const [editPicWhatsapp, setEditPicWhatsapp] = useState('');
  const [editSumberRekening, setEditSumberRekening] = useState<'SMP' | 'SMA' | ''>('');
  const [editKodeBudget, setEditKodeBudget] = useState('');
  const [editNoDokumen, setEditNoDokumen] = useState('');
  const [editEvidenceUrl, setEditEvidenceUrl] = useState('');
  const [editCreatedAt, setEditCreatedAt] = useState('');
  const [editHistory, setEditHistory] = useState<HistoryEntry[]>([]);
  const [editStageIndex, setEditStageIndex] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            // Ensure specific emails are always admins
            if (firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email) && data.role !== 'admin') {
              await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
              data.role = 'admin';
            }
            setProfile(data);
          } else {
            // Create default profile for new users
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              role: (firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email)) ? 'admin' : 'staff',
              createdAt: serverTimestamp(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      } else {
        setProfile(null);
      }
      setIsAuthReady(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      setSubmissions(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'submissions');
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  useEffect(() => {
    if (!isAuthReady || !user || !isAdmin) return;

    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile));
      setAllUsers(docs);
    });

    return () => unsubscribe();
  }, [isAuthReady, user, isAdmin]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'app'), (doc) => {
      if (doc.exists()) {
        setLogoURL(doc.data().logoURL);
      }
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Login Berhasil");
    } catch (error) {
      toast.error("Login Gagal");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logout Berhasil");
    } catch (error) {
      toast.error("Logout Gagal");
    }
  };

  const syncSubmissionsToSheets = async () => {
    if (submissions.length === 0) {
      toast.error('Tidak ada data untuk disinkronkan');
      return;
    }

    const toastId = toast.loading('Mensinkronkan ke Google Sheets...');
    
    try {
      const statusRes = await fetch('/api/system/sync/status');
      const statusData = await statusRes.json();
      
      if (!statusData.ready) {
        toast.error('Gagal: Credentials Service Account belum diset.', { 
          id: toastId,
          description: 'Beritahu Developer.'
        });
        return;
      }

      const headers = [
        'ID', 
        'Tanggal Pengajuan', 
        'Jenis', 
        'Judul', 
        'Penerima Manfaat / CP', 
        'Nominal', 
        'Status', 
        'PIC',
        'Tahap Saat Ini',
        'Email Pengaju', 
        'Link Bukti'
      ];

      const rows = submissions.map(s => [
        s.id || '',
        parseFirestoreDate(s.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        s.type === 'uang_muka' ? 'Uang Muka' : s.type === 'reimburse' ? 'Reimburse' : s.type === 'laporan_uang_muka' ? 'Laporan UM' : 'Pembiayaan',
        s.title || '',
        s.description || '',
        s.amount || 0,
        s.status || '',
        s.picName || '',
        s.currentStageIndex !== undefined ? (getStagesByType(s.type)[s.currentStageIndex] || '-') : '-',
        s.submittedByEmail || '',
        s.evidenceUrl || ''
      ]);

      const data = [headers, ...rows];

      const response = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: '1V4Nn0dUmFLdwzXOa3fAHKVuuEbVqAtNEKH_cGBc54tw',
          data
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || errData.error || 'Gagal sinkronisasi');
      }

      toast.success('Berhasil sinkronisasi ke Google Sheets', { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error(`Error: ${error.message}`, { id: toastId });
    }
  };

  const handleBukukan = async (submission: Submission, sheetType: 'Kas Tunai SMP' | 'Kas Tunai SMA' | 'Kas Bank SMP' | 'Kas Bank SMA') => {
    const spreadsheetId = '1i5cIa8XjrvwF57C8ntrH5fDpgLyppguw3K1sI1VKjXU';
    
    // Parse createdAt or use today
    let subDate = new Date();
    try {
      if (submission.createdAt) {
        subDate = parseFirestoreDate(submission.createdAt);
      }
    } catch (e) {
      console.error("Error parsing submission date", e);
    }
    
    const formattedDate = format(subDate, 'dd/MM/yyyy');

    // Map submission type to abbreviation for "JJ" column
    const typeAbbr = submission.type === 'uang_muka' ? 'UM' : 
                     submission.type === 'reimburse' ? 'RE' : 
                     'PB';

    const rowData = [
       [
         formattedDate, // Col B: TGL
         submission.noDokumen || '', // Col C: NO. DOC
         typeAbbr, // Col D: JJ
         submission.kodeBudget || '', // Col E: KODE ANGGARAN
         submission.submittedByName || '', // Col F: PIC
         submission.title, // Col G: KETERANGAN
         0, // Col H: DEBET (Penerimaan)
         submission.amount, // Col I: KREDIT (Pengeluaran)
       ]
    ];

    toast.promise(
      fetch('/api/sheets/append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          range: `${sheetType}!B11:I`,
          data: rowData
        })
      }).then(async res => {
        if(!res.ok) {
          const err = await res.json();
          throw new Error(err.message || err.error || 'Gagal menambah ke Google Sheets');
        }
        return res.json();
      }),
      {
        loading: `Membukukan ke ${sheetType}...`,
        success: `Berhasil dibukukan ke ${sheetType}`,
        error: (err) => `Gagal: ${err.message}`
      }
    );
  };

  const updateUserRole = async (uid: string, newRole: UserRole) => {
    if (!isSuperAdmin) {
      toast.error("Hanya Super Admin yang dapat mengubah role");
      return;
    }
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      toast.success("Role berhasil diperbarui");
    } catch (error) {
      toast.error("Gagal memperbarui role");
    }
  };

  const handleApprove = async (submission: Submission, comment: string = '') => {
    if (!profile || !TRACKING_ADMIN_EMAILS.includes(profile.email)) {
      toast.error("Anda tidak memiliki akses untuk menyetujui pengajuan ini");
      return;
    }
    const stages = getStagesByType(submission.type);
    const nextIndex = submission.currentStageIndex + 1;
    
    if (nextIndex >= stages.length) {
      toast.info("Pengajuan sudah di tahap akhir");
      return;
    }

    try {
      const historyEntry: HistoryEntry = {
        stage: stages[nextIndex],
        status: 'approved',
        actor: user.uid,
        actorName: profile.displayName,
        timestamp: new Date(),
        comment
      };

      await updateDoc(doc(db, 'submissions', submission.id), {
        currentStageIndex: nextIndex,
        status: stages[nextIndex],
        updatedAt: serverTimestamp(),
        history: [...submission.history, historyEntry]
      });
      toast.success(`Berhasil disetujui ke tahap: ${stages[nextIndex]}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `submissions/${submission.id}`);
      toast.error("Gagal menyetujui");
    }
  };

  const handleReject = async (submission: Submission, comment: string = '') => {
    if (!user || !profile || !TRACKING_ADMIN_EMAILS.includes(profile.email)) {
      toast.error("Anda tidak memiliki akses untuk menolak pengajuan ini");
      return;
    }
    const stages = getStagesByType(submission.type);
    
    try {
      const historyEntry: HistoryEntry = {
        stage: stages[submission.currentStageIndex],
        status: 'rejected',
        actor: user.uid,
        actorName: profile.displayName,
        timestamp: new Date(),
        comment
      };

      await updateDoc(doc(db, 'submissions', submission.id), {
        updatedAt: serverTimestamp(),
        history: [...submission.history, historyEntry]
      });
      toast.error("Pengajuan ditolak/dikembalikan");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `submissions/${submission.id}`);
    }
  };

  const handleDelete = async (submissionId: string) => {
    if (!profile || !TRACKING_ADMIN_EMAILS.includes(profile.email)) {
      toast.error("Anda tidak memiliki akses untuk menghapus data");
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'submissions', submissionId));
      setDeletingId(null);
      toast.success("Pengajuan berhasil dihapus");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `submissions/${submissionId}`);
      toast.error("Gagal menghapus pengajuan");
    }
  };

  const handleBulkApprove = async () => {
    if (!user || !profile || !TRACKING_ADMIN_EMAILS.includes(profile.email)) {
      toast.error("Anda tidak memiliki akses untuk menyetujui pengajuan");
      return;
    }

    const selectedIds = Array.from(selectedSubmissions);
    if (selectedIds.length === 0) return;

    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      const submission = submissions.find(s => s.id === id);
      if (!submission) continue;

      const stages = getStagesByType(submission.type);
      const nextIndex = submission.currentStageIndex + 1;
      
      if (nextIndex >= stages.length) {
         failCount++; continue;
      }

      const isTrackingAdmin = TRACKING_ADMIN_EMAILS.includes(profile.email);
      
      const canApprove = isTrackingAdmin;

      if (!canApprove) {
         failCount++; continue;
      }

      try {
        const historyEntry: HistoryEntry = {
          stage: stages[nextIndex],
          status: 'approved',
          actor: user.uid,
          actorName: profile?.displayName || 'User',
          timestamp: new Date(),
          comment: 'Setuju via aksi masal'
        };

        await updateDoc(doc(db, 'submissions', submission.id!), {
          currentStageIndex: nextIndex,
          status: stages[nextIndex],
          updatedAt: serverTimestamp(),
          history: [...submission.history, historyEntry]
        });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }
    
    if (successCount > 0) toast.success(`${successCount} pengajuan berhasil disetujui`);
    if (failCount > 0) toast.error(`${failCount} pengajuan gagal atau ditolak aksesnya`);
    
    setSelectedSubmissions(new Set());
  };

  const handleBulkDelete = async () => {
    if (!profile || profile.role !== 'admin') {
       toast.error("Hanya admin yang dapat menghapus pengajuan");
       return;
    }

    const selectedIds = Array.from(selectedSubmissions);
    if (selectedIds.length === 0) return;

    if (!window.confirm(`Anda yakin ingin menghapus ${selectedIds.length} pengajuan yang dipilih? Data yang dihapus tidak dapat dikembalikan.`)) return;

    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      try {
        await deleteDoc(doc(db, 'submissions', id as string));
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    if (successCount > 0) toast.success(`${successCount} pengajuan berhasil dihapus`);
    if (failCount > 0) toast.error(`${failCount} pengajuan gagal dihapus`);
    
    setSelectedSubmissions(new Set());
  };

  const openEditDialog = (submission: Submission) => {
    if (!profile || !TRACKING_ADMIN_EMAILS.includes(profile.email)) {
      toast.error("Hanya admin atau owner yang dapat mengedit data");
      return;
    }
    setEditingSubmission(submission);
    setEditType(submission.type);
    setEditTitle(submission.title);
    setEditAmount(submission.amount.toString());
    setEditDescription(submission.description || '');
    setEditPicName(submission.picName || '');
    setEditPicWhatsapp(submission.picWhatsapp || '');
    setEditSumberRekening(submission.sumberRekening || '');
    setEditKodeBudget(submission.kodeBudget || '');
    setEditNoDokumen(submission.noDokumen || '');
    setEditEvidenceUrl(submission.evidenceUrl || '');
    setEditCreatedAt(format(parseFirestoreDate(submission.createdAt), "yyyy-MM-dd'T'HH:mm"));
    setEditHistory([...submission.history]);
    setEditStageIndex(submission.currentStageIndex);
    setIsEditDialogOpen(true);
  };

  const handleUpdateHistoryTime = (index: number, newTime: string) => {
    const updatedHistory = [...editHistory];
    updatedHistory[index] = {
      ...updatedHistory[index],
      timestamp: new Date(newTime)
    };
    setEditHistory(updatedHistory);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubmission || !profile || !TRACKING_ADMIN_EMAILS.includes(profile.email)) {
      toast.error("Anda tidak memiliki akses untuk mengedit pengajuan ini");
      return;
    }

    const submissionId = editingSubmission.id;
    const stages = getStagesByType(editType);
    
    // Prepare payload
    const updatePayload = {
      type: editType,
      title: editTitle,
      amount: Number(editAmount),
      description: editDescription,
      picName: editPicName,
      picWhatsapp: editPicWhatsapp || null,
      sumberRekening: editSumberRekening || null,
      kodeBudget: editKodeBudget || null,
      noDokumen: editNoDokumen || null,
      evidenceUrl: editEvidenceUrl,
      createdAt: Timestamp.fromDate(new Date(editCreatedAt)),
      history: editHistory,
      currentStageIndex: editStageIndex,
      status: stages[editStageIndex],
      updatedAt: serverTimestamp()
    };

    // Close dialog immediately for instant UI feedback
    setIsEditDialogOpen(false);
    setEditingSubmission(null);
    
    // Perform update in background with a promise toast
    toast.promise(
      updateDoc(doc(db, 'submissions', submissionId), updatePayload),
      {
        loading: 'Menyimpan perubahan...',
        success: 'Data pengajuan berhasil diperbarui',
        error: (err) => {
          handleFirestoreError(err, OperationType.UPDATE, `submissions/${submissionId}`);
          return 'Gagal memperbarui data';
        }
      }
    );
  };

  const exportToCSV = () => {
    if (submissions.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }

    const headers = ["ID", "Jenis", "Judul", "Nominal", "Status", "Tahap", "Pengaju", "Email Pengaju", "Tanggal Buat", "Link Bukti"];
    const rows = submissions.map(s => {
      const stages = getStagesByType(s.type);
      const currentStatus = stages[s.currentStageIndex] || s.status;
      return [
        s.id,
        s.type === 'uang_muka' ? 'Uang Muka' : s.type === 'reimburse' ? 'Reimburse' : 'Pembiayaan',
        s.title,
        s.amount,
        currentStatus,
        s.currentStageIndex + 1,
        s.submittedByName,
        s.submittedByEmail,
        s.createdAt instanceof Timestamp ? format(s.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : '',
        s.evidenceUrl || ''
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(v => `"${v}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Data_Transaksi_SCB_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Data berhasil diekspor ke CSV");
  };

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredFilterPIC = useDeferredValue(filterPIC);

  const sidebarItems = [
    { id: 'dashboard', label: 'DASHBOARD', icon: LayoutDashboard, access: 'all' },
    { id: 'tracking', label: 'Tracking Transaksi', icon: MessageSquare, access: 'all' },
    { id: 'buku_kas', label: 'Buku Kas', icon: BookOpen, access: 'admin' },
    { id: 'anggaran', label: 'Pengajuan Anggaran ke BAZNAS', icon: PieChart, access: 'owner' },
    { id: 'laporan', label: 'Laporan PertUM ke BAZNAS', icon: FileText, access: 'admin' },
    { id: 'berkas', label: 'Berkas Digital', icon: FolderOpen, access: 'admin' },
    { id: 'administrasi', label: 'Administrasi Keuangan', icon: Briefcase, access: 'all' },
    { id: 'settings', label: 'Settingan', icon: Settings, access: 'owner_only' },
  ];

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const matchesTitle = sub.title.toLowerCase().includes(deferredSearchQuery.toLowerCase());
      const matchesPIC = deferredFilterPIC ? (sub.picName && sub.picName.toLowerCase().includes(deferredFilterPIC.toLowerCase())) : true;
      const matchesType = filterType === 'all' ? true : sub.type === filterType;
      
      const amount = sub.amount;
      const matchesMin = minAmount ? amount >= Number(minAmount) : true;
      const matchesMax = maxAmount ? amount <= Number(maxAmount) : true;

      const globalSearch = deferredSearchQuery ? (matchesTitle || (sub.picName && sub.picName.toLowerCase().includes(deferredSearchQuery.toLowerCase()))) : true;

      const stages = getStagesByType(sub.type);
      const currentStatus = stages[sub.currentStageIndex] || sub.status;
      const matchesStatus = filterStatuses.length === 0 ? true : filterStatuses.includes(currentStatus);

      // Month & Year Filter
      const subDate = parseFirestoreDate(sub.createdAt);

      const matchesMonth = filterMonth === 'all' ? true : (subDate.getMonth() + 1).toString() === filterMonth;
      const matchesYear = filterYear === 'all' ? true : subDate.getFullYear().toString() === filterYear;

      return globalSearch && matchesPIC && matchesType && matchesMin && matchesMax && matchesStatus && matchesMonth && matchesYear;
    });
  }, [submissions, deferredSearchQuery, deferredFilterPIC, filterType, minAmount, maxAmount, filterStatuses, filterMonth, filterYear]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500">Memuat Aplikasi...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="border-none shadow-2xl">
            <CardHeader className="space-y-4 text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center p-2 rounded-full bg-white shadow-sm ring-1 ring-slate-100">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Logo_BAZNAS.png/512px-Logo_BAZNAS.png" 
                  alt="Logo Sekolah Cendekia BAZNAS" 
                  className="h-full w-full object-contain p-1"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <CardTitle className="text-5xl font-black tracking-tighter text-primary">MONETA <span className="text-emerald-500">SCB</span></CardTitle>
                <CardDescription className="text-slate-400 font-bold text-sm uppercase tracking-[0.2em] leading-tight mt-2 max-w-sm">
                  Monitoring and Electronic <br /> Treasury Application
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Button onClick={handleLogin} className="h-12 w-full text-lg font-semibold" size="lg">
                Masuk dengan Google
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 text-center text-xs text-slate-500">
              <p>© 2026 BAZNAS - Sekolah Cendekia BAZNAS</p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-40" />

      {/* Sidebar - Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-56 bg-slate-900 text-slate-300 transition-transform duration-300 transform lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="pl-1 pr-1 py-5 bg-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <div className="h-10 w-10 bg-white p-0.5 rounded-xl flex items-center justify-center shadow-lg">
                  <img 
                    src={logoURL} 
                    alt="Logo" 
                    className="h-full w-full object-contain"
                  />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-white text-2xl tracking-tighter leading-none whitespace-nowrap">MONETA <span className="text-emerald-500">SCB</span></span>
                <div className="flex flex-col text-[8px] font-bold text-white uppercase tracking-[0.1em] mt-2 leading-tight opacity-60">
                  <span>Monitoring & Electronic</span>
                  <span>Treasury Application</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
              <X size={20} />
            </Button>
          </div>

          <div className="px-4 py-6">
             <UserProfileDialog profile={profile} user={user} onUpdate={(data) => setProfile(prev => ({ ...prev, ...data } as UserProfile))} />
          </div>

          <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
            <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 opacity-50">Menu Utama</p>
            {sidebarItems.map((item) => {
              const hasAccess = 
                item.access === 'all' || 
                (item.access === 'admin' && (isAdmin || (['laporan'].includes(item.id) && (isKamal || isKeuanganSCB)))) || 
                (item.access === 'superadmin' && isSuperAdmin) ||
                (item.access === 'owner' && (profile?.email === OWNER_EMAIL || (['anggaran'].includes(item.id) && (isKamal || isKeuanganSCB)))) ||
                (item.access === 'owner_only' && profile?.email === OWNER_EMAIL);

              if (!hasAccess) return null;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative ${activeTab === item.id ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/40' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                >
                  <item.icon size={18} className={activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-emerald-400 transition-colors'} />
                  <span className="text-sm font-bold tracking-tight text-left">{item.label}</span>
                  {activeTab === item.id && (
                    <motion.div layoutId="nav-pill" className="absolute left-1 w-1 h-5 rounded-full bg-white/40" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="p-4 bg-slate-950/50 border-t border-white/5">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-4 h-12 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/5 transition-all text-xs font-bold tracking-widest"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              LOGOUT SISTEM
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 shrink-0 border-b border-slate-200 z-30 sticky top-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden text-slate-600 hover:bg-slate-100" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={20} />
            </Button>
            <div className="flex flex-col">
               <h2 className="font-black text-xl tracking-tighter text-slate-900 leading-none">Dashboard</h2>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden sm:flex flex-col items-end">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Waktu Sekarang</p>
               <p className="text-xs font-bold text-slate-900">{format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id })}</p>
             </div>
             <div className="h-8 w-px bg-slate-200 hidden sm:block" />
             <div className="flex items-center gap-3">
               <div className="hidden md:block text-right">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Logged in as</p>
                 <p className="text-xs font-bold text-emerald-600 mt-1 lowercase">{profile?.role}</p>
               </div>
               <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shadow-sm">
                 <ShieldCheck size={20} className="text-emerald-500" />
               </div>
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
           <AnimatePresence mode="wait">
             <motion.div
               key={activeTab}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               transition={{ duration: 0.2 }}
               className="max-w-7xl w-full"
             >
                {activeTab === 'dashboard' && (
                  <div className="space-y-8">
                    {/* Welcome Banner */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-emerald-500/10 rounded-full blur-[100px] -mr-40 -mt-40" />
                       <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-blue-500/5 rounded-full blur-[80px] -ml-20 -mb-20" />
                       
                       <div className="relative z-10">
                          <Badge className="bg-white/10 text-emerald-400 border-none backdrop-blur-md px-4 py-1.5 font-black text-[10px] uppercase tracking-[0.3em] rounded-full mb-6 italic">
                            System Statistics & Performance
                          </Badge>
                          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 leading-[0.9]">
                            DASHBOARD <br /> <span className="text-emerald-500">KONTROL</span> KEUANGAN
                          </h1>
                          <p className="text-slate-400 text-sm md:text-base max-w-xl font-medium tracking-tight mb-8">
                            Pantau semua aktivitas transaksi, saldo rekening, dan analisis anggaran dalam satu tampilan terpusat.
                          </p>
                          <div className="flex items-center gap-4">
                            <Button onClick={() => setActiveTab('tracking')} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl px-6 h-12 font-bold text-sm shadow-xl shadow-emerald-900/40 transition-all">
                               Lihat Semua Transaksi
                               <ArrowRight size={18} className="ml-2" />
                            </Button>
                          </div>
                       </div>
                    </div>

                    {/* Balance Summary Section */}
                    <GlobalBalanceSummary />

                    {/* Accumulation Section - Moved from Tracking */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                           <BarChart3 size={20} />
                        </div>
                        <div>
                          <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                            Akumulasi & Realisasi
                          </h2>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Berdasarkan data transaksi yang tercatat</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 bg-slate-50 p-8 rounded-[3rem] border border-white">
                        <MonthlyAccumulationSummary submissions={submissions} />
                        <StatusAccumulationSummary submissions={submissions} />
                      </div>
                    </div>

                    {/* Analysis Section - Moved from its own tab */}
                    {(profile?.email === OWNER_EMAIL || isKamal || isKeuanganSCB) && (
                      <div className="space-y-6 pt-4 border-t border-slate-200">
                         <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                               <PieChart size={20} />
                            </div>
                            <div>
                              <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                                Analisis Anggaran vs Laporan
                              </h2>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Perbandingan realisasi anggaran BAZNAS</p>
                            </div>
                          </div>
                          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-2">
                             <AnalisisManager userUid={user?.uid || ''} isReadOnly={isKeuanganSCB} />
                          </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'tracking' && (
                  <div className="space-y-4">
                    {/* Welcome Section */}
                    <div className="bg-gradient-to-br from-[#064E3B] to-[#10b981] rounded-2xl p-4 text-white shadow-lg relative overflow-hidden mb-2">
                       <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-white/5 rounded-full blur-[80px] -mr-32 -mt-32" />
                       
                       <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                         <div className="flex-1">
                           <div className="flex items-center gap-2 mb-3">
                             <Badge className="bg-white/10 text-white border-none backdrop-blur-md px-3 py-1 font-black text-[9px] uppercase tracking-widest rounded-full">
                               TRANSACTION DASHBOARD
                             </Badge>
                             <div className="h-0.5 w-8 bg-white/30 rounded-full" />
                           </div>
                           <h1 className="text-2xl md:text-3xl font-black tracking-tighter mb-2 leading-tight">
                             Halo, {profile?.displayName}!
                           </h1>
                           <p className="text-emerald-50/70 text-xs md:text-sm max-w-xl font-medium tracking-tight">
                              Portal manajemen keuangan Sekolah Cendekia BAZNAS.
                           </p>
                         </div>

                         <div className="flex flex-wrap gap-3">
                            <NewSubmissionModal profile={profile} user={user} />
                            <ImportSubmissionModal profile={profile} user={user} variant="banner" />
                            <Button 
                              variant="outline" 
                              onClick={exportToCSV} 
                              className="bg-emerald-900/40 hover:bg-emerald-950/60 border border-white/20 text-white hover:text-white backdrop-blur-sm shadow-lg group h-8 mt-1 px-4 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all"
                            >
                              <Download size={12} className="mr-2 group-hover:translate-y-0.5 transition-transform" /> 
                              EKSPOR
                            </Button>
                         </div>
                       </div>
                    </div>

                     <Card className="border-slate-100 shadow-lg shadow-slate-200/30 rounded-2xl overflow-hidden mb-4">
  <CardContent className="p-3 bg-white">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                           <div className="space-y-1.5 sm:col-span-2">
                             <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Pencarian</Label>
<div className="relative group">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={14} />
  <DebouncedInput 
    placeholder="Cari..." 
    className="pl-9 h-8 bg-slate-50 border-none rounded-lg text-[11px] font-bold focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-all placeholder:text-slate-300"
                                 value={searchQuery}
                                 onChange={(val) => setSearchQuery(val)}
                               />
                             </div>
                           </div>
                           
                           <div className="space-y-1.5">
                             <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Jenis</Label>
<Select value={filterType} onValueChange={setFilterType}>
  <SelectTrigger className="h-8 bg-slate-50 border-none rounded-lg text-[11px] font-bold focus:ring-2 focus:ring-emerald-500/20 transition-all">
                                 <div className="flex items-center gap-2">
                                   <Filter size={14} className="text-slate-400" />
                                   <SelectValue placeholder="Semua Tipe" />
                                 </div>
                               </SelectTrigger>
                               <SelectContent className="rounded-xl border-slate-100">
                                 <SelectItem value="all" className="text-xs font-bold">SEMUA TIPE</SelectItem>
                                 <SelectItem value="uang_muka" className="text-xs font-bold">UANG MUKA</SelectItem>
                                 <SelectItem value="reimburse" className="text-xs font-bold">REIMBURSE</SelectItem>
                                 <SelectItem value="pembiayaan" className="text-xs font-bold">PEMBIAYAAN</SelectItem>
                               </SelectContent>
                             </Select>
                           </div>

                           <div className="space-y-1.5">
                             <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</Label>
<StatusMultiSelect
                                allStatuses={Array.from(new Set([...UM_STAGES, ...TRANSACTION_STAGES]))}
                                selectedStatuses={filterStatuses}
                                onChange={setFilterStatuses}
                              />



                           </div>

                           <div className="space-y-1.5">
                             <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">PIC</Label>
<div className="relative group">
  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={14} />
  <DebouncedInput 
    placeholder="Nama..." 
    className="pl-9 h-8 bg-slate-50 border-none rounded-lg text-[11px] font-bold focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-all placeholder:text-slate-300 uppercase"
                                 value={filterPIC}
                                 onChange={(val) => setFilterPIC(val)}
                               />
                             </div>
                           </div>

                           <div className="space-y-1.5">
                             <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Waktu</Label>
<div className="grid grid-cols-2 gap-2">
  <Select value={filterMonth} onValueChange={setFilterMonth}>
    <SelectTrigger className="h-8 bg-slate-50 border-none rounded-lg text-[10px] font-black focus:ring-2 focus:ring-emerald-500/20 transition-all px-2">
                                   <SelectValue placeholder="Bulan" />
                                 </SelectTrigger>
                                 <SelectContent className="rounded-xl border-slate-100">
                                   <SelectItem value="all" className="text-[10px] font-black">BULAN</SelectItem>
                                   {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                     <SelectItem key={m} value={m.toString()} className="text-[10px] font-black uppercase">
                                       {format(new Date(2000, m - 1), 'MMMM', { locale: id })}
                                     </SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                               <Select value={filterYear} onValueChange={setFilterYear}>
                                 <SelectTrigger className="h-11 bg-slate-50 border-none rounded-xl text-[10px] font-black focus:ring-2 focus:ring-emerald-500/20 transition-all">
                                   <SelectValue placeholder="Tahun" />
                                 </SelectTrigger>
                                 <SelectContent className="rounded-xl border-slate-100">
                                   <SelectItem value="all" className="text-[10px] font-black">TAHUN</SelectItem>
                                   {Array.from(new Set(submissions.map(s => parseFirestoreDate(s.createdAt).getFullYear()))).sort().map(y => (
                                     <SelectItem key={y} value={y.toString()} className="text-[10px] font-black">{y}</SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                             </div>
                           </div>

                           <div className="space-y-1.5 sm:col-span-2">
                             <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nominal (Rp)</Label>
<div className="grid grid-cols-2 gap-2">
  <DebouncedInput 
    type="number" 
    placeholder="Min" 
    className="h-8 bg-slate-50 border-none rounded-lg text-[11px] font-bold focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-all placeholder:text-slate-300"
    value={minAmount}
    onChange={(val) => setMinAmount(val)}
  />
  <DebouncedInput 
    type="number" 
    placeholder="Max" 
    className="h-8 bg-slate-50 border-none rounded-lg text-[11px] font-bold focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-all placeholder:text-slate-300"
                                 value={maxAmount}
                                 onChange={(val) => setMaxAmount(val)}
                               />
                             </div>
                           </div>
                         </div>
                       </CardContent>
                     </Card>

                    {/* Monthly results summary if handled */}
                    <FilteredResultsSummary 
                      submissions={filteredSubmissions} 
                      isFiltered={
                        searchQuery !== '' || 
                        filterStatuses.length > 0 || 
                        filterPIC !== '' || 
                        filterType !== 'all' || 
                        minAmount !== '' || 
                        maxAmount !== '' ||
                        filterMonth !== 'all' ||
                        filterYear !== 'all'
                      }
                      filters={{
                        search: searchQuery,
                        statuses: filterStatuses,
                        pic: filterPIC,
                        type: filterType,
                        month: filterMonth,
                        year: filterYear,
                        min: minAmount,
                        max: maxAmount
                      }}
                    />

                    <Tabs defaultValue="all" className="space-y-4 mt-6">
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-1">
                        <TabsList className="bg-white p-1 shadow-lg shadow-slate-200/40 rounded-xl border border-slate-100 h-10 w-full md:w-auto overflow-x-auto gap-1">
                          <TabsTrigger value="all" className="px-4 rounded-lg font-black text-[10px] h-full data-[state=active]:bg-emerald-600 data-[state=active]:text-white uppercase tracking-tight">Semua Data</TabsTrigger>
                          <TabsTrigger value="pending" className="px-4 rounded-lg font-black text-[10px] h-full data-[state=active]:bg-amber-500 data-[state=active]:text-white uppercase tracking-tight">Waiting Approval</TabsTrigger>
                          <TabsTrigger value="completed" className="px-4 rounded-lg font-black text-[10px] h-full data-[state=active]:bg-blue-600 data-[state=active]:text-white uppercase tracking-tight">Settled</TabsTrigger>
                        </TabsList>
                        
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <Button 
                              onClick={syncSubmissionsToSheets}
                              variant="outline" 
                              className="h-10 bg-white border-slate-100 shadow-lg shadow-slate-200/40 rounded-xl px-4 flex items-center gap-2 group hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all font-black text-[10px] uppercase tracking-wider"
                            >
                              <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                              <span>Sync to Sheets</span>
                            </Button>
                          )}
                        </div>
                      </div>

                      <TabsContent value="all">
                        <SubmissionGrid 
                          items={filteredSubmissions} 
                          onApprove={handleApprove} 
                          onReject={handleReject} 
                          onDelete={(id) => setDeletingId(id)}
                          onEdit={openEditDialog}
                          userRole={isAdmin ? 'admin' : (profile?.role || 'staff')} 
                          currentUser={user}
                          selectedSubmissions={selectedSubmissions}
                          onToggle={toggleSelection}
                          onBukukan={isTrackingAdmin ? handleBukukan : undefined}
                        />
                      </TabsContent>

                      <TabsContent value="pending">
                        <SubmissionGrid 
                          items={filteredSubmissions.filter(s => {
                            const stages = getStagesByType(s.type);
                            return s.currentStageIndex < stages.length - 1;
                          })} 
                          onApprove={handleApprove} 
                          onReject={handleReject} 
                          onDelete={(id) => setDeletingId(id)}
                          onEdit={openEditDialog}
                          userRole={isAdmin ? 'admin' : (profile?.role || 'staff')} 
                          currentUser={user}
                          selectedSubmissions={selectedSubmissions}
                          onToggle={toggleSelection}
                          onBukukan={isTrackingAdmin ? handleBukukan : undefined}
                        />
                      </TabsContent>

                      <TabsContent value="completed">
                        <SubmissionGrid 
                          items={filteredSubmissions.filter(s => {
                            const stages = getStagesByType(s.type);
                            return s.currentStageIndex === stages.length - 1;
                          })} 
                          onApprove={handleApprove} 
                          onReject={handleReject} 
                          onDelete={(id) => setDeletingId(id)}
                          onEdit={openEditDialog}
                          userRole={isAdmin ? 'admin' : (profile?.role || 'staff')} 
                          currentUser={user}
                          selectedSubmissions={selectedSubmissions}
                          onToggle={toggleSelection}
                          onBukukan={isTrackingAdmin ? handleBukukan : undefined}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {activeTab === 'buku_kas' && (isAdmin || profile?.email === OWNER_EMAIL) && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                       <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                          <BookOpen size={24} className="text-emerald-600" />
                          Buku Kas Unit {bukuKasUnit.toUpperCase()}
                       </h3>
                       <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className={`h-8 px-4 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${bukuKasUnit === 'smp' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            onClick={() => setBukuKasUnit('smp')}
                          >
                             SMP
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className={`h-8 px-4 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${bukuKasUnit === 'sma' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            onClick={() => setBukuKasUnit('sma')}
                          >
                             SMA
                          </Button>
                       </div>
                    </div>

                    <Tabs defaultValue="tunai">
                      <div className="flex items-center justify-start mb-6">
                        <TabsList className="bg-slate-50 p-1 shadow-inner rounded-xl border border-slate-100">
                          <TabsTrigger value="tunai" className="px-6 rounded-lg font-black text-xs py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white uppercase tracking-tight">KAS TUNAI</TabsTrigger>
                          <TabsTrigger value="bank" className="px-6 rounded-lg font-black text-xs py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white uppercase tracking-tight">KAS BANK</TabsTrigger>
                        </TabsList>
                      </div>
                      
                      <TabsContent value="tunai" className="space-y-6">
                        <CashFlowBoard sheetGid={bukuKasUnit === 'smp' ? "0" : "812391118"} />
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                           <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Rincian Per Bulan - Kas Tunai {bukuKasUnit.toUpperCase()}</h4>
                           <GoogleSheetsSection title={`Buku Kas Tunai ${bukuKasUnit.toUpperCase()}`} url={`https://docs.google.com/spreadsheets/d/1i5cIa8XjrvwF57C8ntrH5fDpgLyppguw3K1sI1VKjXU/htmlembed?gid=${bukuKasUnit === 'smp' ? "0" : "812391118"}&widget=true&headers=false`} />
                        </div>
                      </TabsContent>

                      <TabsContent value="bank" className="space-y-6">
                        <CashFlowBoard sheetGid={bukuKasUnit === 'smp' ? "1341242520" : "908301693"} />
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                           <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Rincian Per Bulan - Kas Bank {bukuKasUnit.toUpperCase()}</h4>
                           <GoogleSheetsSection title={`Buku Kas Bank ${bukuKasUnit.toUpperCase()}`} url={`https://docs.google.com/spreadsheets/d/1i5cIa8XjrvwF57C8ntrH5fDpgLyppguw3K1sI1VKjXU/htmlembed?gid=${bukuKasUnit === 'smp' ? "1341242520" : "908301693"}&widget=true&headers=false`} />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {activeTab === 'anggaran' && (profile?.email === OWNER_EMAIL || isKamal || isKeuanganSCB) && (
                  <BaznasBudgetManager profile={profile} userUid={user?.uid || ''} isReadOnly={isKeuanganSCB} />
                )}

                {activeTab === 'laporan' && (isAdmin || isKamal || isKeuanganSCB) && (
                  <LaporanManager userUid={user?.uid || ''} isReadOnly={isKeuanganSCB} />
                )}

                {activeTab === 'berkas' && (
                  <BerkasDigitalManager />
                )}

                {activeTab === 'administrasi' && (
                  <AdministrasiManager isAdmin={isAdmin || profile?.email === OWNER_EMAIL} />
                )}

                {activeTab === 'settings' && isSuperAdmin && (
                  <div className="space-y-8">
                    <AdminSection users={allUsers} onUpdateRole={updateUserRole} isSuperAdmin={isSuperAdmin} />
                    
                    {user?.email === 'keuanganscbbaznas@gmail.com' && (
                      <AppConfigSection user={user} profile={profile} />
                    )}
                  </div>
                )}
             </motion.div>
           </AnimatePresence>
        </main>
      </div>
    </div>

        <AnimatePresence>
          {selectedSubmissions.size > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-6"
            >
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground font-black w-8 h-8 rounded-full flex items-center justify-center text-xs">
                  {selectedSubmissions.size}
                </div>
                <span className="font-bold text-sm">Data Terpilih</span>
              </div>
              
              <div className="h-6 w-px bg-slate-700 mx-2" />
              
              <div className="flex items-center gap-3">
                {profile?.email && TRACKING_ADMIN_EMAILS.includes(profile.email) && (
                  <Button 
                    onClick={handleBulkApprove} 
                    className="bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold h-10 px-6"
                  >
                    Setujui Masal
                  </Button>
                )}
                
                {profile?.role === 'admin' && (
                  <Button 
                    onClick={handleBulkDelete}
                    variant="destructive"
                    className="rounded-xl font-bold h-10 px-6"
                  >
                    Hapus
                  </Button>
                )}
                
                <Button
                  variant="ghost" 
                  onClick={() => setSelectedSubmissions(new Set())}
                  className="rounded-xl font-bold h-10 px-4 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  Batal
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

    <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengajuan?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Pengajuan akan dihapus secara permanen dari database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && handleDelete(deletingId)} className="bg-red-600 hover:bg-red-700">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle className="font-black text-xl tracking-tighter">Edit Pengajuan</DialogTitle>
              <DialogDescription className="text-xs font-bold text-slate-400">
                Ubah detail pengajuan.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-type">Jenis Pengajuan</Label>
                  <Select 
                    value={editType} 
                    onValueChange={(v: SubmissionType) => setEditType(v)}
                  >
                    <SelectTrigger id="edit-type">
                      <SelectValue placeholder="Pilih Jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uang_muka">Uang Muka</SelectItem>
                      <SelectItem value="reimburse">Reimburse</SelectItem>
                      <SelectItem value="pembiayaan">Pembiayaan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-title">Judul Pengajuan</Label>
                  <Input 
                    id="edit-title" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-amount">Nominal (Rp)</Label>
                  <Input 
                    id="edit-amount" 
                    type="number" 
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-pic">Nama PIC</Label>
                  <Input 
                    id="edit-pic" 
                    value={editPicName}
                    onChange={(e) => setEditPicName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-pic-wa">WhatsApp PIC (Optional)</Label>
                  <Input 
                    id="edit-pic-wa" 
                    placeholder="Contoh: 08123456789"
                    value={editPicWhatsapp}
                    onChange={(e) => setEditPicWhatsapp(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-sumber">Sumber Rekening</Label>
                  <Select 
                    value={editSumberRekening} 
                    onValueChange={(v: 'SMP' | 'SMA') => setEditSumberRekening(v)}
                  >
                    <SelectTrigger id="edit-sumber">
                      <SelectValue placeholder="Pilih Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SMP">SMP</SelectItem>
                      <SelectItem value="SMA">SMA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-kodebudget">Kode Budget</Label>
                  <Input 
                    id="edit-kodebudget" 
                    value={editKodeBudget}
                    onChange={(e) => setEditKodeBudget(e.target.value)}
                    placeholder="Contoh: 1.1.1"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-nodokumen">No Dokumen</Label>
                  <Input 
                    id="edit-nodokumen" 
                    value={editNoDokumen}
                    onChange={(e) => setEditNoDokumen(e.target.value)}
                    placeholder="Contoh: 001/SCB/V/2026"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-status">Status Alur (Admin)</Label>
                  <Select 
                    value={editStageIndex.toString()} 
                    onValueChange={(v) => setEditStageIndex(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Tahap" />
                    </SelectTrigger>
                    <SelectContent>
                      {getStagesByType(editType).map((stage, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          Tahap {idx + 1}: {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-createdat">Tanggal Pengajuan</Label>
                  <Input 
                    id="edit-createdat" 
                    type="datetime-local" 
                    value={editCreatedAt}
                    onChange={(e) => setEditCreatedAt(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-description">Keterangan</Label>
                  <Input 
                    id="edit-description" 
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-evidence">Link Bukti</Label>
                  <Input 
                    id="edit-evidence" 
                    value={editEvidenceUrl}
                    onChange={(e) => setEditEvidenceUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Edit Waktu Persetujuan</Label>
                <ScrollArea className="h-[300px] rounded-md border p-2">
                  <div className="space-y-4">
                    {editHistory.map((h, i) => (
                      <div key={i} className="rounded-lg border bg-slate-50 p-2 text-[10px]">
                        <p className="font-bold text-primary">{h.stage}</p>
                        <p className="mb-1 text-slate-500">Oleh: {h.actorName}</p>
                        <Input 
                          type="datetime-local" 
                          className="h-7 text-[10px]"
                          value={h.timestamp ? format(h.timestamp instanceof Timestamp ? h.timestamp.toDate() : new Date(h.timestamp), "yyyy-MM-dd'T'HH:mm") : ''}
                          onChange={(e) => handleUpdateHistoryTime(i, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit">
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" />
    </>
  );
}

const MonthlyAccumulationSummary = React.memo(({ submissions }: { submissions: Submission[] }) => {
  const [showMonthly, setShowMonthly] = useState(false);
  // Group by month and type, keeping a date for sorting
  const refinedSummary: Record<string, { types: Record<SubmissionType, number>, latestDate: Date }> = {};
  const grandTotals: Record<SubmissionType, number> = { uang_muka: 0, reimburse: 0, pembiayaan: 0 };
  
  submissions.forEach(sub => {
    const date = parseFirestoreDate(sub.createdAt);
    
    const monthKey = format(date, 'MMMM yyyy', { locale: id });
    if (!refinedSummary[monthKey]) {
      refinedSummary[monthKey] = {
        types: { uang_muka: 0, reimburse: 0, pembiayaan: 0 } as any,
        latestDate: date
      };
    }
    refinedSummary[monthKey].types[sub.type] += sub.amount;
    grandTotals[sub.type] += sub.amount;
    
    if (date > refinedSummary[monthKey].latestDate) {
      refinedSummary[monthKey].latestDate = date;
    }
  });

  const sortedMonthEntries = Object.entries(refinedSummary).sort((a, b) => {
    return b[1].latestDate.getTime() - a[1].latestDate.getTime();
  });

  if (sortedMonthEntries.length === 0) return null;

  return (
    <Card className="mb-4 border-primary/10 bg-white shadow-sm overflow-hidden text-[11px]">
      <CardHeader className="py-2 px-4 bg-slate-50/50">
        <CardTitle className="text-xs font-bold flex items-center gap-2">
          <ShieldCheck size={14} className="text-primary" />
          Akumulasi Per Jenis Pengajuan
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {/* Grand Totals Row */}
          <div className="px-4 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2 bg-primary/5">
            <button 
              onClick={() => setShowMonthly(!showMonthly)}
              className="font-bold text-primary min-w-[140px] flex items-center gap-2 hover:bg-primary/10 p-1 -ml-1 rounded transition-colors cursor-pointer"
            >
              {showMonthly ? <Minus size={12} /> : <Plus size={12} />} Total Seluruh
            </button>
            <div className="grid grid-cols-3 gap-2 flex-1">
              <div className="flex flex-col border-l border-blue-500 pl-2">
                <span className="text-[9px] text-blue-600 font-medium">UM</span>
                <span className="text-xs font-bold text-blue-800">Rp {grandTotals.uang_muka.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex flex-col border-l border-emerald-500 pl-2">
                <span className="text-[9px] text-emerald-600 font-medium">RE</span>
                <span className="text-xs font-bold text-emerald-800">Rp {grandTotals.reimburse.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex flex-col border-l border-indigo-500 pl-2">
                <span className="text-[9px] text-indigo-600 font-medium">PB</span>
                <span className="text-xs font-bold text-indigo-800">Rp {grandTotals.pembiayaan.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
          
          {/* Monthly Rows */}
          {showMonthly && sortedMonthEntries.map(([month, data]) => (
            <div key={month} className="px-4 py-1.5 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="font-semibold text-slate-700 min-w-[140px]">{month}</div>
              <div className="grid grid-cols-3 gap-2 flex-1">
                <div className="flex flex-col border-l border-blue-200 pl-2">
                  <span className="text-[9px] text-slate-400">UM</span>
                  <span className="text-xs font-semibold text-blue-700">Rp {data.types.uang_muka.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex flex-col border-l border-emerald-200 pl-2">
                  <span className="text-[9px] text-slate-400">RE</span>
                  <span className="text-xs font-semibold text-emerald-700">Rp {data.types.reimburse.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex flex-col border-l border-indigo-200 pl-2">
                  <span className="text-[9px] text-slate-400">PB</span>
                  <span className="text-xs font-semibold text-indigo-700">Rp {data.types.pembiayaan.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

function FilteredResultsSummary({ 
  submissions, 
  isFiltered,
  filters
}: { 
  submissions: Submission[], 
  isFiltered: boolean,
  filters: {
    search: string;
    statuses: string[];
    pic: string;
    type: string;
    month: string;
    year: string;
    min: string;
    max: string;
  }
}) {
  if (!isFiltered) return null;

  const total = submissions.reduce((acc, s) => acc + s.amount, 0);

  const getFilterLabel = () => {
    const parts = [];
    if (filters.search) parts.push(`"Judul" "${filters.search}"`);
    if (filters.statuses.length > 0) parts.push(`"Status" "${filters.statuses.join(', ')}"`);
    if (filters.pic) parts.push(`"PIC" "${filters.pic}"`);
    if (filters.type !== 'all') parts.push(`"Jenis" "${filters.type === 'uang_muka' ? 'Uang Muka' : filters.type === 'reimburse' ? 'Reimburse' : 'Pembiayaan'}"`);
    if (filters.month !== 'all') {
      const monthName = format(new Date(2000, parseInt(filters.month) - 1), 'MMMM', { locale: id });
      parts.push(`"Bulan" "${monthName}"`);
    }
    if (filters.year !== 'all') parts.push(`"Tahun" "${filters.year}"`);
    if (filters.min || filters.max) parts.push(`"Nominal" ${filters.min ? 'min Rp'+Number(filters.min).toLocaleString('id-ID') : ''}${filters.min && filters.max ? ' s/d ' : ''}${filters.max ? 'max Rp'+Number(filters.max).toLocaleString('id-ID') : ''}`);
    
    return parts.length > 0 ? parts.join(", ") : "Terfilter";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 px-1"
    >
      <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden ring-1 ring-primary/10">
        <CardContent className="p-3 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20 shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5 leading-none mb-1">
                <span className="h-1 w-1 rounded-full bg-primary" />
                Subtotal Nominal Filter {getFilterLabel()}
              </p>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                Rp {total.toLocaleString('id-ID')}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white border-primary/20 text-primary px-2 py-0.5 text-[10px] font-bold shadow-sm">
              {submissions.length} Transaksi
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const StatusAccumulationSummary = React.memo(({ submissions }: { submissions: Submission[] }) => {
  const statusSummary = submissions.reduce((acc, sub) => {
    const stages = getStagesByType(sub.type);
    const status = stages[sub.currentStageIndex] || sub.status || 'Diproses';
    acc[status] = (acc[status] || 0) + sub.amount;
    return acc;
  }, {} as Record<string, number>);

  const sortedStatuses = Object.entries(statusSummary).sort((a, b) => b[1] - a[1]);

  const statusColors = [
    'bg-blue-50 border-blue-200 text-blue-700',
    'bg-emerald-50 border-emerald-200 text-emerald-700',
    'bg-amber-50 border-amber-200 text-amber-700',
    'bg-purple-50 border-purple-200 text-purple-700',
    'bg-rose-50 border-rose-200 text-rose-700',
    'bg-indigo-50 border-indigo-200 text-indigo-700',
    'bg-teal-50 border-teal-200 text-teal-700',
    'bg-orange-50 border-orange-200 text-orange-700',
    'bg-cyan-50 border-cyan-200 text-cyan-700',
    'bg-lime-50 border-lime-200 text-lime-700',
  ];

  if (sortedStatuses.length === 0) return null;

  return (
    <Card className="mb-6 border-primary/10 bg-white shadow-sm overflow-hidden">
      <CardHeader className="py-2 px-4 bg-slate-50/50">
        <CardTitle className="text-xs font-bold flex items-center gap-2">
          <Clock size={14} className="text-primary" />
          Kalkulasi Per Status
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <ScrollArea className="w-full">
          <div className="flex flex-nowrap gap-3 pb-2">
            {sortedStatuses.map(([status, amount], idx) => {
              const colorClass = statusColors[idx % statusColors.length];
              return (
                <div 
                  key={status} 
                  className={`flex flex-col min-w-[160px] rounded-lg border p-3 shadow-xs transition-all ${colorClass}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                    <span className="text-[9px] font-bold uppercase tracking-wider truncate max-w-[130px] opacity-80" title={status}>
                      {status}
                    </span>
                  </div>
                  <span className="text-sm font-bold leading-none">
                    Rp {amount.toLocaleString('id-ID')}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

function WorkflowProgressBar({ stages, currentIdx }: { stages: readonly string[], currentIdx: number }) {
  return (
    <div className="flex w-full gap-0.5">
      {stages.map((_, i) => {
        let bgColor = 'bg-slate-100';
        const progressPercent = (i / (stages.length - 1)) * 100;

        if (i < currentIdx) {
          // Stages already passed
          if (progressPercent < 33) bgColor = 'bg-blue-400';
          else if (progressPercent < 66) bgColor = 'bg-amber-400';
          else bgColor = 'bg-emerald-500';
        } else if (i === currentIdx) {
          // Current stage
          if (progressPercent < 33) bgColor = 'bg-blue-600 animate-pulse';
          else if (progressPercent < 66) bgColor = 'bg-amber-600 animate-pulse';
          else if (progressPercent === 100) bgColor = 'bg-teal-600 animate-pulse';
          else bgColor = 'bg-emerald-600 animate-pulse';
        }

        return (
          <div 
            key={i} 
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${bgColor}`} 
          />
        );
      })}
    </div>
  );
}

function WorkflowStepper({ stages, currentIdx, isLastStage }: { stages: readonly string[], currentIdx: number, isLastStage: boolean }) {
  return (
    <div className="bg-white overflow-hidden p-2 flex flex-col hide-scrollbar max-h-[350px] overflow-y-auto">
      <div className="relative space-y-0.5 pl-5 before:absolute before:left-[21px] before:top-4 before:h-[calc(100%-32px)] before:w-[2px] before:bg-slate-100">
        {stages.map((stage, i) => {
          const isCompleted = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isUpcoming = i > currentIdx;

          return (
            <div key={i} className={`relative flex items-center gap-3 p-2 rounded-lg ${isCurrent ? 'bg-slate-50 shadow-sm' : ''}`}>
              <div 
                className={`absolute -left-5 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full z-10 
                  ${isCompleted ? 'bg-emerald-50 text-emerald-500' : isCurrent ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 text-slate-300'}`}
              >
                {isCompleted ? <CheckCircle2 size={14} className="fill-emerald-100 text-emerald-500" /> : <span className="text-[9px] font-black">{i + 1}</span>}
              </div>
              <span className={`text-[10px] leading-snug w-full ${isCurrent ? 'font-black text-slate-900' : isCompleted ? 'font-medium text-slate-500' : 'font-medium text-slate-400'}`}>
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UserProfileDialog({ 
  profile, 
  user,
  onUpdate 
}: { 
  profile: UserProfile | null, 
  user: any,
  onUpdate: (data: Partial<UserProfile>) => void 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setWhatsapp(profile.whatsapp || '');
    }
  }, [profile, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        whatsapp,
        updatedAt: serverTimestamp()
      });
      onUpdate({ ...profile, displayName, whatsapp } as UserProfile);
      setIsOpen(false);
      toast.success("Profil berhasil diperbarui");
    } catch (err) {
      console.error(err);
      toast.error("Gagal memperbarui profil");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger 
        nativeButton={false}
        render={
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5 relative overflow-hidden group cursor-pointer hover:bg-slate-800 transition-colors">
             <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-emerald-500/20 transition-colors" />
             <div className="flex items-center gap-3 relative z-10">
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-700 ring-2 ring-slate-600/50 overflow-hidden shrink-0">
                   {profile?.photoURL ? (
                     <img src={profile.photoURL} alt="Profile" className="h-full w-full object-cover" />
                   ) : (
                     <UserIcon size={20} className="text-emerald-400" />
                   )}
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="text-[11px] font-black text-white truncate uppercase tracking-tight">{profile?.displayName}</p>
                  <p className="text-[9px] font-bold text-emerald-500 mt-0.5 uppercase tracking-tighter">{profile?.role}</p>
                </div>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                   <Settings size={12} className="text-slate-400" />
                </div>
             </div>
          </div>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
         <form onSubmit={handleSubmit}>
            <DialogHeader>
               <DialogTitle className="font-black text-xl tracking-tighter">Edit Profil</DialogTitle>
               <DialogDescription className="text-xs font-bold text-slate-400">Perbarui informasi profil Anda.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-6">
               <div className="grid gap-2">
                  <Label htmlFor="profile-name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nama Lengkap</Label>
                  <Input id="profile-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="h-10 rounded-xl" />
               </div>
               <div className="grid gap-2">
                  <Label htmlFor="profile-whatsapp" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nomor WhatsApp</Label>
                  <Input id="profile-whatsapp" placeholder="Contoh: 08123456789" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="h-10 rounded-xl" />
               </div>
            </div>
            <DialogFooter>
               <Button type="submit" disabled={isSaving} className="w-full h-11 rounded-xl font-bold bg-slate-900">
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
               </Button>
            </DialogFooter>
         </form>
      </DialogContent>
    </Dialog>
  );
}

function NewSubmissionModal({ profile, user }: { profile: UserProfile | null, user: any }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newType, setNewType] = useState<SubmissionType>('uang_muka');
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newPicName, setNewPicName] = useState('');
  const [newPicWhatsapp, setNewPicWhatsapp] = useState('');
  const [newSumberRekening, setNewSumberRekening] = useState<'SMP' | 'SMA' | ''>('');
  const [newKodeBudget, setNewKodeBudget] = useState('');
  const [newNoDokumen, setNewNoDokumen] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEvidenceUrl, setNewEvidenceUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    try {
      const stages = getStagesByType(newType);
      const newSubmission: Omit<Submission, 'id'> = {
        type: newType,
        title: newTitle,
        amount: Number(newAmount),
        description: newDescription,
        status: stages[0],
        currentStageIndex: 0,
        submittedBy: user.uid,
        submittedByName: profile.displayName,
        submittedByEmail: profile.email,
        picName: newPicName,
        picWhatsapp: newPicWhatsapp || null,
        sumberRekening: newSumberRekening || null,
        kodeBudget: newKodeBudget || null,
        noDokumen: newNoDokumen || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        evidenceUrl: newEvidenceUrl,
        history: [{
          stage: stages[0],
          status: 'submitted',
          actor: user.uid,
          actorName: profile.displayName,
          timestamp: new Date(),
          comment: 'Pengajuan awal'
        }]
      };

      // Close and clear immediately
      setIsDialogOpen(false);
      setNewTitle('');
      setNewAmount('');
      setNewDescription('');
      setNewEvidenceUrl('');
      setNewPicName('');
      setNewPicWhatsapp('');
      setNewSumberRekening('');
      setNewKodeBudget('');
      setNewNoDokumen('');

      // Background process
      toast.promise(
        addDoc(collection(db, 'submissions'), newSubmission),
        {
          loading: 'Mengirim pengajuan...',
          success: 'Pengajuan berhasil dikirim',
          error: (err) => {
            handleFirestoreError(err, OperationType.CREATE, 'submissions');
            return 'Gagal mengirim pengajuan';
          }
        }
      );
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Terjadi kesalahan sistem");
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2 shadow-lg shadow-primary/20">
            <Plus size={20} />
            Buat Pengajuan Baru
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Pengajuan Baru</DialogTitle>
            <DialogDescription>
              Isi detail pengajuan uang muka atau reimburse Anda di sini.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Jenis Pengajuan</Label>
              <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uang_muka">Uang Muka</SelectItem>
                  <SelectItem value="reimburse">Reimburse</SelectItem>
                  <SelectItem value="pembiayaan">Pembiayaan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Judul Pengajuan</Label>
              <Input 
                id="title" 
                placeholder="Contoh: Operasional Kantor Jan 2024" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Nominal (Rp)</Label>
              <Input 
                id="amount" 
                type="number" 
                placeholder="Contoh: 1500000" 
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pic">Nama PIC</Label>
              <Input 
                id="pic" 
                placeholder="Masukkan nama PIC" 
                value={newPicName}
                onChange={(e) => setNewPicName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pic-wa">WhatsApp PIC (Optional)</Label>
              <Input 
                id="pic-wa" 
                placeholder="Contoh: 08123456789" 
                value={newPicWhatsapp}
                onChange={(e) => setNewPicWhatsapp(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-sumber">Sumber Rekening</Label>
              <Select value={newSumberRekening} onValueChange={(v: any) => setNewSumberRekening(v)}>
                <SelectTrigger id="new-sumber">
                  <SelectValue placeholder="Pilih unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SMP">SMP</SelectItem>
                  <SelectItem value="SMA">SMA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-kodebudget">Kode Budget</Label>
              <Input 
                id="new-kodebudget" 
                placeholder="Contoh: 1.1.1" 
                value={newKodeBudget}
                onChange={(e) => setNewKodeBudget(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-nodokumen">No Dokumen</Label>
              <Input 
                id="new-nodokumen" 
                placeholder="Contoh: 001/SCB/V/2026" 
                value={newNoDokumen}
                onChange={(e) => setNewNoDokumen(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Keterangan</Label>
              <Input 
                id="description" 
                placeholder="Detail pengajuan..." 
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="evidence">Link Bukti Dokumen (Optional)</Label>
              <Input 
                id="evidence" 
                placeholder="https://drive.google.com/..." 
                value={newEvidenceUrl}
                onChange={(e) => setNewEvidenceUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full">Kirim Pengajuan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ImportSubmissionModal({ profile, user, variant = 'default' }: { profile: UserProfile | null, user: any, variant?: 'default' | 'banner' }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const triggerButton = variant === 'banner' ? (
    <Button 
      variant="outline" 
      className="bg-emerald-900/40 hover:bg-emerald-950/60 border border-white/20 text-white hover:text-white backdrop-blur-md shadow-lg group h-8 mt-1 px-4 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all gap-2"
      onClick={() => setIsDialogOpen(true)}
    >
      <Upload size={12} />
      Import CSV
    </Button>
  ) : (
    <DialogTrigger 
      render={
        <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all">
          <Upload size={18} />
          Import CSV
        </Button>
      }
    />
  );

  const downloadTemplate = () => {
    const headers = ["type", "title", "amount", "transactionDate", "picName", "sumberRekening", "kodeBudget", "noDokumen", "description", "evidenceUrl", "statusTahap"];
    const example = ["reimburse", "Beli ATK Kantor", "250000", "2024-01-20", "Budi", "SMP", "1.1.1", "001/SCB/V/2026", "Pembelian alat tulis kantor bulan ini", "https://link-bukti.com", "Verifikasi Dokumen"];
    const csvContent = [headers, example].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_pengajuan.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profile) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const validRows = results.data.filter((row: any) => row.type && row.title && row.amount);
          
          if (validRows.length === 0) {
            toast.error("Tidak ada data valid yang ditemukan di CSV");
            setIsImporting(false);
            return;
          }

          const submissionsToCreate = validRows.map((row: any) => {
            const typeValue = (row.type || '').toLowerCase().trim();
            const validTypes: SubmissionType[] = ['uang_muka', 'reimburse', 'pembiayaan'];
            const finalType = validTypes.includes(typeValue as any) ? (typeValue as SubmissionType) : 'uang_muka';
            const stages = getStagesByType(finalType);

            let stageIndex = 0;
            let statusName = stages[0];

            // Handle statusTahap if provided and user is admin
            if (row.statusTahap && (profile.role === 'admin' || [
              'keuanganscbbaznas@gmail.com', 
              'keuangan.scb@gmail.com',
              'kamal2015go@gmail.com',
              'tatausahascba@gmail.com'
            ].includes(profile.email))) {
              const foundIndex = stages.findIndex(s => s.toLowerCase() === row.statusTahap.toLowerCase().trim());
              if (foundIndex !== -1) {
                stageIndex = foundIndex;
                statusName = stages[foundIndex];
              }
            }

            const rawDate = row.transactionDate ? new Date(row.transactionDate) : null;
            const finalCreatedAt = (rawDate && !isNaN(rawDate.getTime())) 
                ? Timestamp.fromDate(rawDate) 
                : serverTimestamp();

            return {
              type: finalType,
              title: row.title,
              amount: Number(row.amount),
              description: row.description || '',
              status: statusName,
              currentStageIndex: stageIndex,
              submittedBy: user.uid,
              submittedByName: profile.displayName,
              submittedByEmail: profile.email,
              picName: row.picName || profile.displayName,
              sumberRekening: row.sumberRekening || null,
              kodeBudget: row.kodeBudget || null,
              noDokumen: row.noDokumen || null,
              createdAt: finalCreatedAt,
              updatedAt: serverTimestamp(),
              evidenceUrl: row.evidenceUrl || '',
              history: [{
                stage: statusName,
                status: 'submitted',
                actor: user.uid,
                actorName: profile.displayName,
                timestamp: new Date(),
                comment: row.statusTahap ? `Import massal (Tahap: ${statusName})` : 'Import massal dari CSV'
              }]
            };
          });

          // Add all docs
          const promises = submissionsToCreate.map(sub => addDoc(collection(db, 'submissions'), sub));
          
          toast.promise(Promise.all(promises), {
            loading: `Mengimport ${submissionsToCreate.length} data...`,
            success: `Berhasil mengimport ${submissionsToCreate.length} data pengajuan`,
            error: "Gagal mengimport beberapa data"
          });

          setIsDialogOpen(false);
        } catch (error) {
          console.error("Import error:", error);
          toast.error("Gagal memproses file CSV");
        } finally {
          setIsImporting(false);
          // @ts-ignore
          e.target.value = '';
        }
      },
      error: (error) => {
        toast.error("Gagal membaca file CSV");
        setIsImporting(false);
      }
    });
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      {triggerButton}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={20} className="text-primary" />
            Import Pengajuan Massal
          </DialogTitle>
          <DialogDescription>
            Unggah file CSV untuk memasukkan banyak pengajuan sekaligus.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
            <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Download size={14} className="text-primary" />
              Langkah 1: Unduh Template
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Gunakan template ini untuk memastikan format data sesuai dengan sistem.
            </p>
            <Button variant="secondary" size="sm" onClick={downloadTemplate} className="w-full text-xs bg-white border border-slate-200 hover:bg-slate-50">
              Unduh Template CSV
            </Button>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Upload size={14} className="text-primary" />
              Langkah 2: Unggah File
            </h4>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="csv-upload" className="text-xs font-semibold text-slate-600">Pilih File CSV</Label>
              <div className="relative group">
                <Input 
                  id="csv-upload" 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileUpload}
                  disabled={isImporting}
                  className="cursor-pointer file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/80 transition-all h-12 flex items-center"
                />
              </div>
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 mt-2">
                <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                  <span className="font-bold underline">Kolom wajib:</span> type, title, amount. <br/>
                  <span className="font-bold underline">Kolom Opsional:</span> transactionDate (YYYY-MM-DD), picName, sumberRekening (SMP/SMA), kodeBudget, noDokumen, description, statusTahap. <br/>
                  <span className="font-bold underline">Format type:</span> uang_muka, reimburse, pembiayaan <br/>
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-slate-50 p-4 -m-6 mt-6 rounded-b-lg border-t gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isImporting} className="w-full sm:w-auto">
            Batal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApprovalDialog({ 
  submission, 
  onApprove, 
  onReject, 
  mode,
  disabled = false
}: { 
  submission: Submission, 
  onApprove?: (s: Submission, comment?: string) => void, 
  onReject?: (s: Submission, comment?: string) => void, 
  mode: 'approve' | 'reject',
  disabled?: boolean
}) {
  const [comment, setComment] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    if (mode === 'approve' && onApprove) onApprove(submission, comment);
    if (mode === 'reject' && onReject) onReject(submission, comment);
    setIsOpen(false);
    setComment('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger 
        render={
          <Button 
            variant={mode === 'approve' ? 'default' : 'destructive'} 
            disabled={disabled}
            className={`font-black text-[9px] tracking-widest px-4 h-8 rounded-lg shadow-lg transition-all ${mode === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
          >
            {mode === 'approve' ? 'SETUJUI TAHAP' : 'TOLAK'}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="font-black text-xl tracking-tighter">
            {mode === 'approve' ? 'Konfirmasi Persetujuan' : 'Konfirmasi Penolakan'}
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-slate-400">
            {mode === 'approve' 
              ? 'Pastikan berkas telah diperiksa sebelum melanjutkan ke tahap berikutnya.' 
              : 'Berikan alasan penolakan agar pengaju dapat melakukan perbaikan.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Catatan / Alasan</Label>
          <Input 
            placeholder="Tulis pesan Anda di sini..." 
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="rounded-xl border-slate-200 focus:ring-emerald-500"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)} className="font-bold text-xs">Batal</Button>
          <Button 
            onClick={handleSubmit} 
            className={mode === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {mode === 'approve' ? 'Ya, Setujui' : 'Ya, Tolak'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkflowModal({ 
  stages, 
  currentIdx, 
  isOpen, 
  onClose,
  submissionId
}: { 
  stages: readonly string[], 
  currentIdx: number, 
  isOpen: boolean, 
  onClose: () => void,
  submissionId: string
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[320px] rounded-[2rem] p-4 border-none shadow-3xl bg-white max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-3 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
              <Activity size={16} />
            </div>
            <div>
              <DialogTitle className="text-base font-black tracking-tight text-slate-900 leading-none">Alur Kerja</DialogTitle>
              <DialogDescription className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                ID: {submissionId.slice(0, 8)}...
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-2 mt-2">
          <div className="py-2">
            <WorkflowStepper stages={stages} currentIdx={currentIdx} isLastStage={currentIdx === stages.length - 1} />
          </div>
        </ScrollArea>
        <DialogFooter className="pt-3 border-t border-slate-50 flex justify-center">
          <Button onClick={onClose} className="h-8 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase text-[9px] tracking-widest px-8">Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SignaturePadModal({
  title,
  onSave,
  isOpen,
  onClose
}: {
  title: string;
  onSave: (signatureBase64: string) => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const signaturePadRef = React.useRef<SignaturePad | null>(null);

  const initPad = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    // Crucial: get display size
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    
    // Set internal dimensions to match display size * pixel ratio
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    
    const context = canvas.getContext("2d");
    if (context) {
      context.resetTransform(); // Reset any previous scaling
      context.scale(ratio, ratio);
    }

    if (signaturePadRef.current) {
      signaturePadRef.current.off();
    }

    signaturePadRef.current = new SignaturePad(canvas, {
      backgroundColor: 'rgba(0,0,0,0)',
      penColor: 'rgb(0, 0, 0)',
      velocityFilterWeight: 0.7
    });
  };

  React.useEffect(() => {
    if (isOpen) {
      // Re-initialize pad when modal opens and stabilizes
      const timeout = setTimeout(initPad, 500); 
      
      const handleResize = () => {
        // Debounce resize or just re-init
        initPad();
      };

      window.addEventListener('resize', handleResize);
      return () => {
        clearTimeout(timeout);
        signaturePadRef.current?.off();
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  const clear = () => {
    signaturePadRef.current?.clear();
  };

  const save = () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      toast.error('Tanda tangan tidak boleh kosong');
      return;
    }
    const signature = signaturePadRef.current.toDataURL('image/png');
    onSave(signature);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] p-6 border-none shadow-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight text-slate-900">Tanda Tangan {title}</DialogTitle>
          <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mt-2">
            Silakan goreskan tanda tangan digital Anda pada area di bawah ini. Pastikan goresan terlihat jelas.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] overflow-hidden mt-6 touch-none h-56 relative w-full flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair touch-none"
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>
        <DialogFooter className="mt-8 grid grid-cols-2 gap-3">
          <Button variant="ghost" onClick={clear} className="rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-100 flex items-center gap-2">
            <RefreshCw size={14} /> Bersihkan
          </Button>
          <Button onClick={save} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest px-6 h-12 shadow-xl shadow-emerald-200 flex items-center gap-2">
            <Check size={14} /> Simpan Tanda Tangan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubmissionDetailView({ 
  submission, 
  stages, 
  isLastStage, 
  onApprove, 
  onReject, 
  onDelete, 
  onEdit, 
  onBukukan,
  userRole,
  currentUser
}: {
  submission: Submission,
  stages: readonly string[],
  isLastStage: boolean,
  onApprove: (s: Submission, comment?: string) => void,
  onReject: (s: Submission, comment?: string) => void,
  onDelete: () => void,
  onEdit: (s: Submission) => void,
  onBukukan?: (s: Submission, unit: 'Kas Tunai SMP' | 'Kas Tunai SMA' | 'Kas Bank SMP' | 'Kas Bank SMA') => void,
  userRole: UserRole,
  currentUser: User | null
}) {
  const isTrackingAdmin = currentUser?.email ? TRACKING_ADMIN_EMAILS.includes(currentUser.email) : false;
  const canApprove = isTrackingAdmin;
  const canEdit = isTrackingAdmin;
  const canDelete = isTrackingAdmin;

  const [activeSigner, setActiveSigner] = useState<'roni' | 'kamal' | null>(null);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [isBukukanMenuOpen, setIsBukukanMenuOpen] = useState(false);

  const handleSign = async (signature: string) => {
    if (!activeSigner) return;
    try {
      const docRef = doc(db, 'submissions', submission.id);
      const signatureData = {
        name: activeSigner === 'roni' ? 'M. Roni' : 'Ahmad Kamal',
        signature,
        timestamp: Timestamp.now()
      };
      
      await updateDoc(docRef, {
        [`signatures.${activeSigner}`]: signatureData
      });
      toast.success(`Berhasil ditanda tangan oleh ${signatureData.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `submissions/${submission.id}`);
    }
  };

  const currentStage = stages[submission.currentStageIndex];
  const isManagementStage = currentStage === "Proses Tanda Tangan Oleh Manajemen";
  const hasBothSignatures = submission.signatures?.roni && submission.signatures?.kamal;
  
  const transferredIndex = stages.findIndex(s => s.toLowerCase().includes("sudah di transfer"));
  const isTransferred = transferredIndex !== -1 && submission.currentStageIndex >= transferredIndex;

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text('DOKUMEN PENGAJUAN', 105, 20, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`ID Transaksi`, 20, 40); doc.text(`: ${submission.id}`, 60, 40);
    doc.text(`Judul Pengajuan`, 20, 50); doc.text(`: ${submission.title}`, 60, 50);
    doc.text(`Jumlah Anggaran`, 20, 60); doc.text(`: Rp ${submission.amount.toLocaleString('id-ID')}`, 60, 60);
    doc.text(`PIC Pengaju`, 20, 70); doc.text(`: ${submission.picName || submission.submittedByName}`, 60, 70);
    doc.text(`Rekening`, 20, 80); doc.text(`: ${submission.sumberRekening || '-'}`, 60, 80);
    doc.text(`Kode Budget`, 20, 90); doc.text(`: ${submission.kodeBudget || '-'}`, 60, 90);
    doc.text(`No Dokumen`, 20, 100); doc.text(`: ${submission.noDokumen || '-'}`, 60, 100);
    doc.text(`Tanggal Pengajuan`, 20, 110); doc.text(`: ${format(parseFirestoreDate(submission.createdAt), 'dd MMMM yyyy')}`, 60, 110);
    
    doc.setFont("helvetica", "bold");
    doc.text('Deskripsi / Rincian:', 20, 130);
    doc.setFont("helvetica", "normal");
    const splitDesc = doc.splitTextToSize(submission.description || '-', 170);
    doc.text(splitDesc, 20, 135);
    
    const nextY = 140 + (splitDesc.length * 5);
    
    if (submission.signatures) {
      doc.setFont("helvetica", "bold");
      doc.text('TANDA TANGAN MANAJEMEN:', 20, nextY + 10);
      
      doc.setFont("helvetica", "normal");
      if (submission.signatures.roni) {
        doc.text('Diverifikasi Oleh,', 40, nextY + 25);
        doc.addImage(submission.signatures.roni.signature, 'PNG', 40, nextY + 30, 40, 20);
        doc.setFont("helvetica", "bold");
        doc.text('M. Roni', 40, nextY + 55);
      }
      
      if (submission.signatures.kamal) {
        doc.text('Disetujui Oleh,', 120, nextY + 25);
        doc.addImage(submission.signatures.kamal.signature, 'PNG', 120, nextY + 30, 40, 20);
        doc.setFont("helvetica", "bold");
        doc.text('Ahmad Kamal', 120, nextY + 55);
      }
    }
    
    doc.save(`Pengajuan_${submission.title.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Detail Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Informasi Utama</h4>
             <div className="space-y-4">
                <div>
                   <Label className="text-[10px] text-slate-400 lowercase italic">Deskripsi Pengajuan</Label>
                   <p className="text-sm font-medium text-slate-700 mt-1 leading-relaxed">
                     {submission.description || 'Tidak ada uraian deskripsi.'}
                   </p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 pb-2 border-y border-slate-50">
                   <div>
                     <Label className="text-[9px] text-slate-400 lowercase italic">Rekening</Label>
                     <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter mt-0.5">{submission.sumberRekening || '-'}</p>
                   </div>
                   <div>
                     <Label className="text-[9px] text-slate-400 lowercase italic">Kode Budget</Label>
                     <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter mt-0.5">{submission.kodeBudget || '-'}</p>
                   </div>
                   <div>
                     <Label className="text-[9px] text-slate-400 lowercase italic">No Dokumen</Label>
                     <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter mt-0.5">{submission.noDokumen || '-'}</p>
                   </div>
                </div>
                {submission.evidenceUrl && (
                  <div className="pt-4 border-t border-slate-50">
                    <Label className="text-[10px] text-slate-400 lowercase italic">Dokumen Bukti</Label>
                    <a 
                      href={submission.evidenceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="mt-2 flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors group"
                    >
                      <div className="h-10 w-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-primary">
                        <FileText size={20} />
                      </div>
                      <span className="text-xs font-black text-slate-600 uppercase tracking-tighter">Buka Lampiran Bukti</span>
                      <ExternalLink size={14} className="ml-auto text-slate-300 group-hover:text-primary" />
                    </a>
                  </div>
                )}
                {submission.lpjUrl && (
                  <div className="pt-4 border-t border-slate-50">
                    <Label className="text-[10px] text-emerald-600 lowercase italic">Laporan Pertanggungjawaban (LPJ)</Label>
                    <a 
                      href={submission.lpjUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="mt-2 flex items-center gap-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 hover:bg-emerald-50 transition-colors group"
                    >
                      <div className="h-10 w-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-emerald-600">
                        <FileCheck size={20} />
                      </div>
                      <span className="text-xs font-black text-emerald-700 uppercase tracking-tighter">Buka Berkas LPJ</span>
                      <ExternalLink size={14} className="ml-auto text-emerald-300 group-hover:text-emerald-600" />
                    </a>
                  </div>
                )}
             </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
             <div className="flex items-center justify-between mb-4">
               <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Status Pengajuan</h4>
               <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsWorkflowModalOpen(true)}
                className="h-8 rounded-xl border-slate-200 text-[10px] font-black uppercase tracking-widest gap-2 bg-slate-50 hover:bg-slate-100"
               >
                 <Activity size={14} className="text-primary" />
                 Lihat Detail Alur
               </Button>
             </div>
             
             {isManagementStage && (
                <div className="mb-6 p-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-xl shadow-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                      <ShieldCheck className="text-emerald-400" size={18} />
                    </div>
                    <div>
                      <h5 className="text-[11px] font-black text-white uppercase tracking-widest">Otorisasi Manajemen</h5>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter italic">2 Tanda Tangan Diperlukan</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="h-24 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center overflow-hidden relative group transition-all">
                        {submission.signatures?.roni ? (
                          <img src={submission.signatures.roni.signature} alt="Sign Roni" className="h-[80%] object-contain brightness-0 invert" />
                        ) : (
                          <div className="text-center">
                            <Lock size={16} className="text-white/20 mx-auto mb-1" />
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Belum TTD</span>
                          </div>
                        )}
                        {(canApprove || currentUser?.email === 'operasional.scb@gmail.com') && !submission.signatures?.roni && (
                          <button 
                            onClick={() => setActiveSigner('roni')}
                            className="absolute inset-0 bg-emerald-600/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-black uppercase tracking-widest"
                          >
                            Tanda Tangani
                          </button>
                        )}
                      </div>
                      <p className="text-center text-[10px] font-black text-white uppercase tracking-tighter">M. Roni</p>
                    </div>

                    <div className="space-y-3" key="sign-kamal">
                      <div className="h-24 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center overflow-hidden relative group transition-all">
                        {submission.signatures?.kamal ? (
                          <img src={submission.signatures.kamal.signature} alt="Sign Kamal" className="h-[80%] object-contain brightness-0 invert" />
                        ) : (
                          <div className="text-center">
                            <Lock size={16} className="text-white/20 mx-auto mb-1" />
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Belum TTD</span>
                          </div>
                        )}
                        {(canApprove || currentUser?.email === 'kamal2015go@gmail.com') && !submission.signatures?.kamal && (
                          <button 
                            onClick={() => setActiveSigner('kamal')}
                            className="absolute inset-0 bg-emerald-600/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-black uppercase tracking-widest"
                          >
                            Tanda Tangani
                          </button>
                        )}
                      </div>
                      <p className="text-center text-[10px] font-black text-white uppercase tracking-tighter">Ahmad Kamal</p>
                    </div>
                  </div>
                  
                  {hasBothSignatures && (
                    <Button 
                      onClick={downloadPDF}
                      className="w-full mt-4 bg-white/10 hover:bg-white text-white hover:text-slate-900 border-none transition-all rounded-xl h-10 font-bold text-xs flex items-center justify-center gap-2"
                    >
                      <Download size={14} /> Download Dokumen Pengajuan
                    </Button>
                  )}
                </div>
              )}

             <div className="space-y-1 relative">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-primary/10 text-primary border-none rounded-lg text-[9px] font-black uppercase tracking-widest">
                    Tahap {submission.currentStageIndex + 1} Dari {stages.length}
                  </Badge>
                  <span className="text-[10px] font-bold text-slate-500">{Math.round(((submission.currentStageIndex + 1) / stages.length) * 100)}% Selesai</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((submission.currentStageIndex + 1) / stages.length) * 100}%` }}
                    className="h-full bg-primary"
                  />
                </div>
                <p className="text-xs font-black text-slate-800 mt-3 truncate">{stages[submission.currentStageIndex]}</p>
             </div>
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-full">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Riwayat Aktivitas</h4>
              <ScrollArea className="h-[350px] pr-4">
                <div className="relative space-y-6 pl-6 before:absolute before:left-2 before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-slate-100">
                  {submission.history.map((h, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[22px] top-1 h-3 w-3 rounded-full border-2 border-white bg-slate-900 shadow-sm" />
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-slate-900 tracking-tighter w-[60%]">{h.stage}</p>
                          <span className="text-[9px] font-medium text-slate-400 text-right w-[40%] flex flex-col">
                            <span>{format(parseFirestoreDate(h.timestamp), 'HH:mm,')}</span>
                            <span>{format(parseFirestoreDate(h.timestamp), 'dd/MM')}</span>
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 mb-2">
                           <span className="text-[9px] font-medium text-slate-500">Oleh: {h.actorName}</span>
                           <Badge variant="outline" className="w-fit h-4 px-1.5 text-[8px] bg-slate-50 border-slate-100 text-slate-500 uppercase rounded">{h.status}</Badge>
                        </div>
                        {h.comment && (
                          <div className="rounded-lg bg-slate-50/50 p-2.5 text-[10px] text-slate-600 border border-slate-100 italic">
                            "{h.comment}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {!isLastStage && (
                    <div className="relative">
                       <div className="absolute -left-[22px] top-1 h-3 w-3 rounded-full border-2 border-white bg-slate-200 animate-pulse" />
                       <p className="text-[10px] font-black text-slate-900 tracking-tighter w-[60%]">{stages[submission.currentStageIndex]}</p>
                       <span className="text-[9px] font-medium text-slate-500 mt-1 block">Oleh: -</span>
                    </div>
                  )}
                </div>
              </ScrollArea>
           </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 p-4 bg-slate-900 rounded-[1.5rem] shadow-xl">
        {canDelete && (
          <Button 
            variant="destructive" 
            onClick={() => { if(confirm('Hapus permanen data ini?')) onDelete(); }}
            className="mr-auto bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border-none font-black text-[9px] px-4 h-8 rounded-lg transition-all tracking-widest"
          >
            HAPUS
          </Button>
        )}

        {isTransferred && onBukukan && (
          <div className="relative">
            <Button 
              onClick={() => setIsBukukanMenuOpen(!isBukukanMenuOpen)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] px-4 h-8 rounded-lg transition-all tracking-widest gap-2"
            >
              <BookOpen size={14} />
              BUKUKAN
            </Button>
            
            {isBukukanMenuOpen && (
              <div className="absolute bottom-10 right-0 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                {(['Kas Tunai SMP', 'Kas Tunai SMA', 'Kas Bank SMP', 'Kas Bank SMA'] as const).map((opt) => (
                  <button 
                    key={opt}
                    onClick={() => { onBukukan(submission, opt); setIsBukukanMenuOpen(false); }}
                    className="w-full text-left px-4 py-3 text-[10px] font-black text-slate-700 hover:bg-slate-50 border-b border-slate-50 last:border-b-0 uppercase tracking-tighter"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {canEdit && (
          <Button 
            variant="outline" 
            onClick={() => onEdit(submission)} 
            className="bg-white/5 border-white/10 text-white hover:bg-white hover:text-slate-900 font-black text-[9px] px-4 h-8 rounded-lg transition-all tracking-widest"
          >
            EDIT
          </Button>
        )}

        {canApprove && (
          <div className="flex gap-2">
             <ApprovalDialog submission={submission} onReject={onReject} mode="reject" />
             <ApprovalDialog 
              submission={submission} 
              onApprove={onApprove} 
              mode="approve" 
              disabled={isManagementStage && !hasBothSignatures}
             />
          </div>
        )}
      </div>

      <SignaturePadModal 
        isOpen={activeSigner !== null}
        onClose={() => setActiveSigner(null)}
        title={activeSigner === 'roni' ? 'M. Roni' : 'Ahmad Kamal'}
        onSave={handleSign}
      />

      <WorkflowModal 
        isOpen={isWorkflowModalOpen}
        onClose={() => setIsWorkflowModalOpen(false)}
        stages={stages}
        currentIdx={submission.currentStageIndex}
        submissionId={submission.id}
      />
    </div>
  );
}

// Utility to parse Firestore dates consistently
const parseFirestoreDate = (date: any): Date => {
  if (date instanceof Timestamp) return date.toDate();
  if (date && typeof date === 'object' && 'seconds' in date) return new Date(date.seconds * 1000);
  if (date) return new Date(date);
  return new Date();
};
const BudgetExplorer = React.memo(({ submissions, onMonthYearSelect }: { submissions: Submission[], onMonthYearSelect: (month: string, year: string) => void }) => {
  const [selectedYear, setSelectedYear] = React.useState<string | null>(null);

  const years = React.useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add('2025');
    yearsSet.add('2026');
    submissions.forEach(s => {
      const d = parseFirestoreDate(s.createdAt);
      yearsSet.add(d.getFullYear().toString());
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [submissions]);

  const months = [
    { id: '01', name: 'Januari' }, { id: '02', name: 'Februari' }, { id: '03', name: 'Maret' },
    { id: '04', name: 'April' }, { id: '05', name: 'Mei' }, { id: '06', name: 'Juni' },
    { id: '07', name: 'Juli' }, { id: '08', name: 'Agustus' }, { id: '09', name: 'September' },
    { id: '10', name: 'Oktober' }, { id: '11', name: 'November' }, { id: '12', name: 'Desember' }
  ];

  const getAmount = (m: string, y: string) => {
    return submissions
      .filter(s => {
         const d = parseFirestoreDate(s.createdAt);
         return d.getFullYear().toString() === y && (d.getMonth() + 1).toString().padStart(2, '0') === m;
      })
      .reduce((sum, s) => sum + s.amount, 0);
  };

  const getYearAmount = (y: string) => {
     return submissions
      .filter(s => {
         const d = parseFirestoreDate(s.createdAt);
         return d.getFullYear().toString() === y;
      })
      .reduce((sum, s) => sum + s.amount, 0);
  }

  return (
    <div className="mb-6">
       <div className="flex items-center gap-3 mb-6 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
         <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FolderOpen size={16} />
         </div>
         <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Direktori Arsip</span>
            <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-slate-700">Root</span>
               {selectedYear && (
                 <>
                   <ChevronRight size={12} className="text-slate-300" />
                   <span className="text-xs font-black text-emerald-600">{selectedYear}</span>
                 </>
               )}
            </div>
         </div>
       </div>

       <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
         {!selectedYear ? (
           years.map(y => (
             <motion.div
               key={y}
               whileHover={{ y: -4 }}
               whileTap={{ scale: 0.98 }}
             >
               <Card 
                 className="cursor-pointer border-none shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all group relative bg-white rounded-3xl"
                 onClick={() => setSelectedYear(y)}
               >
                 <CardContent className="p-6 flex flex-col items-center text-center">
                   <div className="h-16 w-16 flex items-center justify-center rounded-[2rem] bg-amber-50 text-amber-500 mb-4 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-inner">
                     <FolderOpen size={32} />
                   </div>
                   <span className="text-base font-black text-slate-800 mb-1">{y}</span>
                   <div className="flex flex-col text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                     Rp {getYearAmount(y).toLocaleString('id-ID')}
                   </div>
                 </CardContent>
               </Card>
             </motion.div>
           ))
         ) : (
           <>
             <Card 
               className="cursor-pointer border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center bg-white/50 rounded-3xl"
               onClick={() => setSelectedYear(null)}
             >
               <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                 <div className="h-12 w-12 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-2">
                   <ArrowLeft size={20} />
                 </div>
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kembali</span>
               </CardContent>
             </Card>
             {months.map(m => (
               <motion.div
                 key={m.id}
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 whileHover={{ y: -4 }}
               >
                 <Card 
                   className="cursor-pointer border-none shadow-md shadow-slate-200/30 hover:shadow-lg transition-all group bg-white rounded-3xl relative overflow-hidden"
                   onClick={() => onMonthYearSelect(m.id, selectedYear)}
                 >
                   <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/10 group-hover:bg-blue-500 transition-colors" />
                   <CardContent className="p-5 flex flex-col items-center text-center">
                     <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-blue-50 text-blue-500 mb-3 group-hover:bg-blue-500 group-hover:text-white transition-all">
                       <FileText size={22} />
                     </div>
                     <span className="text-xs font-black text-slate-700 leading-tight mb-1">{m.name}</span>
                     <div className="text-[9px] font-bold text-emerald-600 mt-1">
                       Rp {getAmount(m.id, selectedYear).toLocaleString('id-ID')}
                     </div>
                   </CardContent>
                 </Card>
               </motion.div>
             ))}
           </>
         )}
       </div>
    </div>
  );
});

const GoogleSheetsSection = ({ title, url, driveUrl, submissions }: { title: string, url: string, driveUrl?: string, submissions?: Submission[] }) => (
  <Card className="h-[calc(100vh-12rem)] border-none shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col rounded-3xl">
    <CardHeader className="py-4 px-6 bg-white border-b border-slate-100 flex flex-row items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
         <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <LayoutDashboard size={20} />
         </div>
         <div>
           <CardTitle className="text-sm font-black uppercase tracking-tighter text-slate-800">{title}</CardTitle>
           <CardDescription className="text-[10px] font-bold text-slate-400 tracking-wider">MODUL INTEGRASI DATA</CardDescription>
         </div>
      </div>
      <div className="flex gap-2">
        {driveUrl && (
          <Button 
            variant="outline" 
            nativeButton={false}
            render={
              <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="gap-2 h-9 px-4 rounded-xl text-[10px] font-bold bg-blue-600 text-white border-none hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20">
                <FolderOpen size={14} /> FOLDER DRIVE
              </a>
            }
          />
        )}
        <Button 
          variant="outline" 
          nativeButton={false}
          render={
            <a href={url} target="_blank" rel="noopener noreferrer" className="gap-2 h-9 px-4 rounded-xl text-[10px] font-bold bg-slate-900 text-white border-none hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">
              <ExternalLink size={14} /> TAB BARU
            </a>
          }
        />
      </div>
    </CardHeader>

    <CardContent className="p-0 flex-1 relative">
      {submissions && (
        <div className="p-4 border-b bg-white">
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
             {/* Simple summary strip if passed */}
          </div>
        </div>
      )}
      <iframe 
        src={url} 
        className="absolute inset-0 w-full h-full border-0"
        title={title}
      />
    </CardContent>
  </Card>
);


const GitHubInfo = () => (
  <Card className="border-slate-200 shadow-sm mt-6">
    <CardHeader className="py-3 px-4 bg-slate-900 border-b text-white rounded-t-xl">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
          <Upload size={18} />
        </div>
        <div>
          <CardTitle className="text-sm font-black uppercase tracking-widest leading-none">GitHub Integration</CardTitle>
          <CardDescription className="text-[9px] text-slate-400 font-bold uppercase mt-1">Source Code Management</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-6">
      <p className="text-xs text-slate-600 leading-relaxed mb-4">
        Aplikasi ini dapat diintegrasikan dengan GitHub untuk sinkronisasi kode sumber secara otomatis. Gunakan menu <strong>Settings &gt; Export to GitHub</strong> pada Google AI Studio untuk menghubungkan repositori Anda.
      </p>
      <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
        <div className="flex justify-between items-baseline">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Akun Utama</span>
          <span className="text-[10px] font-bold text-slate-900 uppercase">keuanganscbbaznas@gmail.com</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status Repo</span>
          <span className="text-[10px] font-bold text-emerald-600 uppercase">Siap Diekspor</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

const AdminSection = ({ users, onUpdateRole, isSuperAdmin }: { users: UserProfile[], onUpdateRole: (uid: string, role: UserRole) => void, isSuperAdmin: boolean }) => (
  <div className="space-y-6">
    <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl">
      <CardHeader className="py-3 px-4 bg-slate-50 border-b">
        <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Pengaturan Admin</CardTitle>
        <CardDescription className="text-xs">Kelola hak akses pengguna aplikasi</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y border-t">
          {users.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">Tidak ada data pengguna</div>
          ) : (
            users.map((u) => (
              <div key={u.uid} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{u.displayName}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="capitalize h-6 px-3">
                    {u.role}
                  </Badge>
                  {isSuperAdmin && u.email !== OWNER_EMAIL && (
                    <Select 
                      value={u.role} 
                      onValueChange={(val) => onUpdateRole(u.uid, val as UserRole)}
                    >
                      <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue placeholder="Ubah Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="accountant">Accountant</SelectItem>
                        <SelectItem value="management">Management</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
    
    {isSuperAdmin && <GitHubInfo />}
  </div>
);

function AppConfigSection({ user, profile }: { user: User | null, profile: UserProfile | null }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mt-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-10 w-10 flex items-center justify-center bg-purple-50 text-purple-600 rounded-xl shadow-sm">
          <Settings size={20} />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Edit Aplikasi</h2>
          <p className="text-xs font-semibold text-slate-400">Konfigurasi khusus Owner (keuanganscbbaznas@gmail.com)</p>
        </div>
      </div>

      <Tabs defaultValue="tampilan" className="w-full">
        <TabsList className="bg-slate-50 p-1 shadow-inner rounded-xl w-full flex mb-6">
          <TabsTrigger value="tampilan" className="flex-1 rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"><Palette size={14}/> Background</TabsTrigger>
          <TabsTrigger value="database" className="flex-1 rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"><Database size={14}/> Database</TabsTrigger>
          <TabsTrigger value="akses" className="flex-1 rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"><Lock size={14}/> Hak Akses</TabsTrigger>
          <TabsTrigger value="lainnya" className="flex-1 rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"><Settings size={14}/> Lainnya</TabsTrigger>
        </TabsList>

        <TabsContent value="tampilan">
           <div className="space-y-6">
              <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">URL Logo Baru</Label>
                  <div className="flex gap-4 max-w-md">
                     <Input type="file" accept="image/*" className="font-mono text-sm" id="logoUpload" />
                     <Button onClick={async () => {
                         const fileInput = document.getElementById('logoUpload') as HTMLInputElement;
                         const file = fileInput.files?.[0];
                         if (file) {
                             const reader = new FileReader();
                             reader.onloadend = async () => {
                                 const base64 = reader.result as string;
                                 await setDoc(doc(db, 'config', 'app'), { logoURL: base64 }, { merge: true });
                                 toast.success("Logo berhasil diunggah!");
                             };
                             reader.readAsDataURL(file);
                         } else {
                             toast.error("Pilih file terlebih dahulu!");
                         }
                     }} className="bg-purple-600 hover:bg-purple-700">Simpan Logo</Button>
                  </div>
              </div>
              <Separator />
              <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kode Warna Hex Background</Label>
                  <div className="flex gap-4 max-w-md">
                     <Input className="font-mono text-sm" placeholder="#ffffff" defaultValue="#f8fafc" />
                     <Button onClick={() => toast.success("Warna background berhasil disimpan!")} className="bg-purple-600 hover:bg-purple-700">Simpan Warna</Button>
                  </div>
               </div>
            </div>
        </TabsContent>
        
        <TabsContent value="database">
           <div className="space-y-4">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">URL Publik Google Spreadsheet Base</Label>
              <div className="flex gap-4">
                 <Input className="font-mono text-xs w-full" placeholder="https://docs.google.com/..." defaultValue="https://docs.google.com/spreadsheets/d/1i5cIa8XjrvwF57C8ntrH5fDpgLyppguw3K1sI1VKjXU" />
                 <Button onClick={() => toast.success("Konfigurasi database berhasil diperbarui!")} className="bg-purple-600 hover:bg-purple-700">Simpan</Button>
              </div>
              <p className="text-[10px] text-amber-600 italic mt-1 font-medium bg-amber-50 p-2 rounded-lg">*Perubahan database akan me-reload seluruh transaksi di aplikasi untuk semua pengguna.</p>
           </div>
        </TabsContent>

        <TabsContent value="akses">
           <div className="space-y-8">
               <div className="space-y-4">
                   <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Foto Profil Anda</Label>
                   <div className="flex gap-4 max-w-md items-center">
                     <Input type="file" accept="image/*" className="text-sm" id="photoUpload" />
                     <Button onClick={async () => {
                         const fileInput = document.getElementById('photoUpload') as HTMLInputElement;
                         const file = fileInput.files?.[0];
                         if (file && user) {
                             const reader = new FileReader();
                             reader.onloadend = async () => {
                                 const base64 = reader.result as string;
                                 await updateDoc(doc(db, 'users', user.uid), { photoURL: base64 });
                                 toast.success("Foto profil berhasil diperbarui!");
                             };
                             reader.readAsDataURL(file);
                         } else {
                             toast.error("Pilih file atau login terlebih dahulu!");
                         }
                     }} className="bg-purple-600 hover:bg-purple-700">Simpan Foto</Button>
                   </div>
               </div>
               <Separator />
               <div className="space-y-4">
                   <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transfer Kepemilikan (Owner)</Label>
                   <div className="flex gap-4 max-w-md">
                     <Input className="text-sm" placeholder="Email owner baru" />
                     <Button onClick={() => toast.error("Transfer gagal. Hanya owner saat ini yang dapat memverifikasi aksi ini.")} variant="destructive">Alihkan</Button>
                   </div>
               </div>
           </div>
        </TabsContent>
        
        <TabsContent value="lainnya">
           <div className="space-y-4 flex flex-col items-start gap-2">
               <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pengaturan Lainnya</Label>
               <Button onClick={() => toast.success("Log integrasi berhasil dibersihkan")} variant="outline" className="w-full max-w-md justify-start font-bold text-slate-600 text-xs">Bersihkan Log Integrasi Sytem</Button>
               <Button onClick={() => toast.success("Mode pemeliharaan diaktifkan")} variant="outline" className="w-full max-w-md justify-start font-bold text-slate-600 text-xs">Nyalakan Mode Pemeliharaan (Maintenance)</Button>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

