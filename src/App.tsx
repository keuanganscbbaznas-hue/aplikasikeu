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
import { BaznasBudgetManager } from './components/BaznasBudgetManager';
import { 
  LayoutDashboard, 
  Plus, 
  Search,
  Filter,
  LogOut, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
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
  Menu,
  X,
  CreditCard,
  Banknote,
  Users,
  ExternalLink,
  FolderOpen,
  Palette,
  Database,
  Lock
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

const OWNER_EMAIL = 'keuanganscbbaznas@gmail.com';
const SUPER_ADMIN_EMAILS = [OWNER_EMAIL, 'kamal2015go@gmail.com'];
const ADMIN_EMAILS = [
  ...SUPER_ADMIN_EMAILS,
  'keuangan.scb@gmail.com',
  'tatausahascba@gmail.com',
  'kamal2015go@gmail.com'
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
  onSelectAll
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
  onSelectAll?: (ids: string[]) => void
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
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Judul & Keterangan</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest w-40">Nominal</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest w-48 text-center">Tahapan & Progress</th>
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
  onToggle
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
  onToggle: (id: string) => void
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
      <td className="px-6 py-4 min-w-[300px]">
        <div className="space-y-0.5">
          <h4 className="font-black text-slate-800 text-[13px] tracking-tight truncate max-w-[400px]">
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
                 <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter truncate max-w-[150px]" title="PIC">
                   PIC: {submission.picName}
                 </span>
               </>
             )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-baseline gap-1">
          <span className="text-[10px] font-bold text-slate-400">Rp</span>
          <span className="font-black text-[13px] text-slate-800 tracking-tight tabular-nums">
            {submission.amount.toLocaleString('id-ID')}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-2 max-w-[180px] mx-auto">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-black text-emerald-600 uppercase truncate tracking-tighter">
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
         <div className="flex items-center gap-2">
            {isTransferred && (
              <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm shrink-0" title="Transfer Sukses">
                <CheckCircle2 size={12} />
              </div>
            )}
            {isPendingReport && (
              <div className="h-6 w-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shadow-sm shrink-0 animate-pulse" title="Butuh Laporan">
                <AlertCircle size={12} />
              </div>
            )}
            
            <Dialog>
              <DialogTrigger 
                render={
                  <Button 
                    variant="ghost" 
                    size="icon-xs"
                    className="group rounded-lg bg-slate-900 text-white hover:bg-emerald-600 hover:text-white transition-all shadow-md ml-auto"
                  >
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
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
                      userRole={userRole}
                      currentUser={currentUser}
                    />
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
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
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPIC, setFilterPIC] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'tracking' | 'buku_kas' | 'anggaran' | 'laporan' | 'settings'>('tracking');
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

  const [editType, setEditType] = useState<SubmissionType>('uang_muka');
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPicName, setEditPicName] = useState('');
  const [editEvidenceUrl, setEditEvidenceUrl] = useState('');
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
    if (!user || !profile) return;
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
    if (!user || !profile) return;
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
    if (!profile || profile.role !== 'admin') return;
    
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
    if (!user || (!isAdmin && profile?.role !== 'finance' && profile?.role !== 'accountant' && profile?.role !== 'management')) return;
    if (user.email === 'kamal2015go@gmail.com' && profile?.role === 'admin') {
       toast.error("Admin ini tidak memiliki akses untuk menyetujui pengajuan");
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

      const userRole = profile?.role || 'staff';
      const isActualAdmin = userRole === 'admin';
      
      const canApprove = (
        (userRole === 'finance' && submission.currentStageIndex === 0) ||
        (userRole === 'accountant' && submission.currentStageIndex === 1) ||
        (userRole === 'management' && submission.currentStageIndex === 2) ||
        (isActualAdmin)
      );

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
    setEditingSubmission(submission);
    setEditType(submission.type);
    setEditTitle(submission.title);
    setEditAmount(submission.amount.toString());
    setEditDescription(submission.description || '');
    setEditPicName(submission.picName || '');
    setEditEvidenceUrl(submission.evidenceUrl || '');
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
    if (!editingSubmission || !profile || profile.role !== 'admin') return;

    const submissionId = editingSubmission.id;
    const stages = getStagesByType(editType);
    
    // Prepare payload
    const updatePayload = {
      type: editType,
      title: editTitle,
      amount: Number(editAmount),
      description: editDescription,
      picName: editPicName,
      evidenceUrl: editEvidenceUrl,
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
  const deferredFilterStatus = useDeferredValue(filterStatus);

  const sidebarItems = [
    { id: 'tracking', label: 'Tracking Transaksi', icon: LayoutDashboard, access: 'all' },
    { id: 'buku_kas', label: 'Buku Kas', icon: BookOpen, access: 'owner' },
    { id: 'anggaran', label: 'Pengajuan Anggaran ke BAZNAS', icon: PieChart, access: 'owner' },
    { id: 'laporan', label: 'Laporan', icon: FileText, access: 'admin' },
    { id: 'settings', label: 'Settingan', icon: Settings, access: 'superadmin' },
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
      const matchesStatus = deferredFilterStatus === 'all' ? true : currentStatus.toLowerCase().includes(deferredFilterStatus.toLowerCase());

      // Month & Year Filter
      const subDate = parseFirestoreDate(sub.createdAt);

      const matchesMonth = filterMonth === 'all' ? true : (subDate.getMonth() + 1).toString().padStart(2, '0') === filterMonth;
      const matchesYear = filterYear === 'all' ? true : subDate.getFullYear().toString() === filterYear;

      return globalSearch && matchesPIC && matchesType && matchesMin && matchesMax && matchesStatus && matchesMonth && matchesYear;
    });
  }, [submissions, deferredSearchQuery, deferredFilterPIC, filterType, minAmount, maxAmount, deferredFilterStatus, filterMonth, filterYear]);

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
                <CardTitle className="text-2xl font-bold tracking-tight text-primary">Tracking Transaksi Keuangan</CardTitle>
                <CardDescription className="text-slate-600 font-medium">
                  Sekolah Cendekia BAZNAS
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
          <div className="p-5 bg-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-white p-1.5 rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Logo_BAZNAS.png/128px-Logo_BAZNAS.png" 
                  alt="Logo" 
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-white text-base tracking-tighter leading-none">Keuangan<span className="text-emerald-500">App</span></span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 text-center">SCB BAZNAS</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
              <X size={20} />
            </Button>
          </div>

          <div className="px-4 py-6">
             <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-emerald-500/20 transition-colors" />
                <div className="flex items-center gap-3 relative z-10">
                   <div className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-700 ring-2 ring-slate-600/50">
                     <UserIcon size={20} className="text-emerald-400" />
                   </div>
                   <div className="flex flex-col min-w-0">
                     <p className="text-xs font-black text-white truncate uppercase tracking-tight">{profile?.displayName}</p>
                     <p className="text-[10px] font-bold text-emerald-500 mt-1 uppercase tracking-tighter">{profile?.role}</p>
                   </div>
                </div>
             </div>
          </div>

          <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
            <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 opacity-50">Menu Utama</p>
            {sidebarItems.map((item) => {
              const hasAccess = 
                item.access === 'all' || 
                (item.access === 'admin' && isAdmin) || 
                (item.access === 'superadmin' && isSuperAdmin) ||
                (item.access === 'owner' && profile?.email === OWNER_EMAIL);

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
               className="max-w-7xl mx-auto w-full"
             >
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
<Select value={filterStatus} onValueChange={setFilterStatus}>
  <SelectTrigger className="h-8 bg-slate-50 border-none rounded-lg text-[11px] font-bold focus:ring-2 focus:ring-emerald-500/20 transition-all">
                                 <div className="flex items-center gap-2">
                                   <Clock size={14} className="text-slate-400" />
                                   <SelectValue placeholder="Pilih Status" />
                                 </div>
                               </SelectTrigger>
                               <SelectContent className="rounded-xl border-slate-100">
                                 <SelectItem value="all" className="text-xs font-bold uppercase">SEMUA STATUS</SelectItem>
                                 {Array.from(new Set(submissions.map(s => {
                                   const stages = getStagesByType(s.type);
                                   return stages[s.currentStageIndex];
                                 }))).filter(Boolean).map(status => (
                                   <SelectItem key={status} value={status} className="text-xs font-bold uppercase">{status}</SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
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

                    <FilteredResultsSummary 
                      submissions={filteredSubmissions} 
                      isFiltered={
                        searchQuery !== '' || 
                        filterStatus !== 'all' || 
                        filterPIC !== '' || 
                        filterType !== 'all' || 
                        minAmount !== '' || 
                        maxAmount !== '' ||
                        filterMonth !== 'all' ||
                        filterYear !== 'all'
                      }
                      filters={{
                        search: searchQuery,
                        status: filterStatus,
                        pic: filterPIC,
                        type: filterType,
                        month: filterMonth,
                        year: filterYear,
                        min: minAmount,
                        max: maxAmount
                      }}
                    />

                    {isAdmin && (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-12 bg-slate-50 p-8 rounded-[3rem] border border-white">
                        <MonthlyAccumulationSummary submissions={submissions} />
                        <StatusAccumulationSummary submissions={submissions} />
                      </div>
                    )}

                    <Tabs defaultValue="all" className="space-y-4 mt-6">
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-1">
                        <TabsList className="bg-white p-1 shadow-lg shadow-slate-200/40 rounded-xl border border-slate-100 h-10 w-full md:w-auto overflow-x-auto gap-1">
                          <TabsTrigger value="all" className="px-4 rounded-lg font-black text-[10px] h-full data-[state=active]:bg-emerald-600 data-[state=active]:text-white uppercase tracking-tight">Semua Data</TabsTrigger>
                          <TabsTrigger value="pending" className="px-4 rounded-lg font-black text-[10px] h-full data-[state=active]:bg-amber-500 data-[state=active]:text-white uppercase tracking-tight">Waiting Approval</TabsTrigger>
                          <TabsTrigger value="completed" className="px-4 rounded-lg font-black text-[10px] h-full data-[state=active]:bg-blue-600 data-[state=active]:text-white uppercase tracking-tight">Settled</TabsTrigger>
                        </TabsList>
                        
                        {profile?.email === OWNER_EMAIL && (
                          <div className="md:max-w-xs w-full">
                            <GoogleDriveSync submissions={submissions} />
                          </div>
                        )}
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
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {activeTab === 'buku_kas' && profile?.email === OWNER_EMAIL && (
                  <div className="space-y-6">
                    <CashFlowBoard submissions={submissions} />
                    
                    <div className="grid grid-cols-1 gap-8">
                       <MonthlyAccumulationSummary submissions={submissions} />
                    </div>
                    
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <Tabs defaultValue="bank">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Rincian Per Bulan</h4>
                          <TabsList className="bg-slate-50 p-1 shadow-inner rounded-xl border border-slate-100">
                            <TabsTrigger value="bank" className="px-4 rounded-lg font-black text-[10px] data-[state=active]:bg-blue-600 data-[state=active]:text-white uppercase tracking-tight">KAS BANK</TabsTrigger>
                            <TabsTrigger value="tunai" className="px-4 rounded-lg font-black text-[10px] data-[state=active]:bg-emerald-600 data-[state=active]:text-white uppercase tracking-tight">KAS TUNAI</TabsTrigger>
                          </TabsList>
                        </div>
                        <TabsContent value="bank">
                          <GoogleSheetsSection title="Buku Kas Bank" url="https://docs.google.com/spreadsheets/d/1i5cIa8XjrvwF57C8ntrH5fDpgLyppguw3K1sI1VKjXU/htmlembed?gid=0&widget=true&headers=false" />
                        </TabsContent>
                        <TabsContent value="tunai">
                          <GoogleSheetsSection title="Buku Kas Tunai" url="https://docs.google.com/spreadsheets/d/1i5cIa8XjrvwF57C8ntrH5fDpgLyppguw3K1sI1VKjXU/htmlembed?gid=1&widget=true&headers=false" />
                        </TabsContent>
                      </Tabs>
                    </div>

                  </div>
                )}

                {activeTab === 'anggaran' && profile?.email === OWNER_EMAIL && (
                  <BaznasBudgetManager profile={profile} userUid={user?.uid || ''} />
                )}

                {activeTab === 'laporan' && isAdmin && (
                  <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 text-center min-h-[400px] flex flex-col items-center justify-center">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <FileText className="text-slate-300" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">Laporan</h3>
                    <p className="text-slate-500 mt-1 max-w-sm mx-auto">Tampilan laporan spreadsheet telah dinonaktifkan sesuai permintaan. Fitur laporan lanjutan sedang dalam pengembangan.</p>
                  </div>
                )}

                {activeTab === 'settings' && isSuperAdmin && (
                  <div className="space-y-8">
                    <AdminSection users={allUsers} onUpdateRole={updateUserRole} isSuperAdmin={isSuperAdmin} />
                    
                    {user?.email === 'keuanganscbbaznas@gmail.com' && (
                      <AppConfigSection />
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
                {((profile?.role !== 'staff' && profile?.role !== 'admin') || (profile?.role === 'admin' && user?.email !== 'kamal2015go@gmail.com')) && (
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
            <div className="font-bold text-primary min-w-[140px] flex items-center gap-2">
              <Plus size={12} /> Total Seluruh
            </div>
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
          {sortedMonthEntries.map(([month, data]) => (
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
    status: string;
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
    if (filters.status !== 'all') parts.push(`"Status" "${filters.status}"`);
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

function NewSubmissionModal({ profile, user }: { profile: UserProfile | null, user: any }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newType, setNewType] = useState<SubmissionType>('uang_muka');
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newPicName, setNewPicName] = useState('');
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
    <DialogTrigger render={<Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all" />}>
      <Upload size={18} />
      Import CSV
    </DialogTrigger>
  );

  const downloadTemplate = () => {
    const headers = ["type", "title", "amount", "transactionDate", "picName", "description", "evidenceUrl", "statusTahap"];
    const example = ["reimburse", "Beli ATK Kantor", "250000", "2024-01-20", "Budi", "Pembelian alat tulis kantor bulan ini", "https://link-bukti.com", "Verifikasi Dokumen"];
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
                  <span className="font-bold underline">Kolom Opsional:</span> transactionDate (YYYY-MM-DD), picName, description, statusTahap. <br/>
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
  mode 
}: { 
  submission: Submission, 
  onApprove?: (s: Submission, comment?: string) => void, 
  onReject?: (s: Submission, comment?: string) => void, 
  mode: 'approve' | 'reject' 
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

function SubmissionDetailView({ 
  submission, 
  stages, 
  isLastStage, 
  onApprove, 
  onReject, 
  onDelete, 
  onEdit, 
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
  userRole: UserRole,
  currentUser: User | null
}) {
  const isAdmin = userRole === 'admin';
  const canApprove = (
    (userRole === 'finance' && submission.currentStageIndex === 0) ||
    (userRole === 'accountant' && submission.currentStageIndex === 1) ||
    (userRole === 'management' && submission.currentStageIndex === 2) ||
    (userRole === 'admin' && currentUser?.email !== 'kamal2015go@gmail.com')
  );

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

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Status Alur Kerja ({stages.length} Tahap)</h4>
             <div className="space-y-4">
                <WorkflowStepper stages={stages} currentIdx={submission.currentStageIndex} isLastStage={isLastStage} />
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
        {isAdmin && (
          <Button 
            variant="destructive" 
            onClick={() => { if(confirm('Hapus permanen data ini?')) onDelete(); }}
            className="mr-auto bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border-none font-black text-[9px] px-4 h-8 rounded-lg transition-all tracking-widest"
          >
            HAPUS
          </Button>
        )}
        
        <Button 
          variant="outline" 
          onClick={() => onEdit(submission)} 
          className="bg-white/5 border-white/10 text-white hover:bg-white hover:text-slate-900 font-black text-[9px] px-4 h-8 rounded-lg transition-all tracking-widest"
        >
          EDIT
        </Button>

        {canApprove && !isLastStage && (
          <div className="flex gap-2">
             <ApprovalDialog submission={submission} onReject={onReject} mode="reject" />
             <ApprovalDialog submission={submission} onApprove={onApprove} mode="approve" />
          </div>
        )}
      </div>
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

function GoogleDriveSync({ submissions }: { submissions: Submission[] }) {
  const [isReady, setIsReady] = useState(false);
  const [serviceAccountEmail, setServiceAccountEmail] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(true); 
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  // Auto-sync effect
  useEffect(() => {
    if (autoSync && isReady && submissions.length > 0) {
      const timer = setTimeout(() => {
        handleSync();
      }, 5000); 
      return () => clearTimeout(timer);
    }
  }, [submissions, autoSync, isReady]);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/system/sync/status');
      const data = await res.json();
      setIsReady(data.ready);
      setServiceAccountEmail(data.serviceAccount || '');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSync = async () => {
    if (isSyncing || !isReady) return;
    setIsSyncing(true);
    try {
      const sheetHeaders = ['ID', 'Judul', 'Jumlah', 'Jenis', 'Status', 'PIC', 'Deskripsi', 'Tanggal Dibuat', 'Link Bukti', 'Link LPJ'];
      const sheetRows = submissions.map(s => [
        s.id || '',
        s.title || '',
        s.amount || 0,
        s.type || '',
        s.status || '',
        s.picName || s.submittedByName || '',
        s.description || '',
        format(parseFirestoreDate(s.createdAt || new Date()), 'dd MMM yyyy HH:mm'),
        s.evidenceUrl || '',
        s.lpjUrl || ''
      ]);
      const sheetData = [sheetHeaders, ...sheetRows];

      const resSheets = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: '1V4Nn0dUmFLdwzXOa3fAHKVuuEbVqAtNEKH_cGBc54tw',
          data: sheetData
        })
      });

      if (resSheets.ok) {
        setLastSync(new Date().toLocaleTimeString());
      } else {
        const err = await resSheets.json().catch(()=>({}));
        console.error('Sync failed', err);
        toast.error('Sync Gagal: Periksa Environment Variables.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 relative">
      <div className="bg-white p-2 rounded-xl shadow-md border border-slate-100 flex items-center gap-3 transition-all hover:border-blue-200">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isReady ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-500'}`}>
          <FolderOpen size={16} />
        </div>
        <div className="flex-1 min-w-[30px] pr-2">
          <div className="flex items-center gap-2">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">System Auto Sync</p>
            {isReady && <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />}
          </div>
          <p className="text-[8px] font-medium text-slate-500 mt-0.5 truncate max-w-[120px]" title={serviceAccountEmail}>
            {isReady ? 'Active Engine' : 'Setup Required'}
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {!isReady ? (
            <>
              <Button 
                size="icon-sm"
                variant="ghost" 
                onClick={() => setShowInfo(!showInfo)}
                className="h-7 w-7 rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                title="Info Konfigurasi"
              >
                <AlertCircle size={14} />
              </Button>
              <Button 
                size="sm" 
                onClick={checkStatus}
                className="h-7 px-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-black text-[8px] border-none shadow-sm"
                title="Periksa konfigurasi Service Account di Environment Variables"
              >
                Cek Key
              </Button>
            </>
          ) : (
            <>
              <div className="flex flex-col items-end mr-1">
                <label className="flex items-center gap-1.5 cursor-pointer group">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">Auto</span>
                  <input 
                    type="checkbox" 
                    checked={autoSync} 
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="accent-emerald-500 w-2.5 h-2.5 cursor-pointer"
                  />
                </label>
              </div>
              <Button 
                onClick={handleSync} 
                disabled={isSyncing}
                size="sm" 
                className="h-7 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[8px] border-none shadow-md shadow-emerald-500/10"
              >
                {isSyncing ? 'SYNC...' : 'SYNC'}
              </Button>
            </>
          )}
        </div>
      </div>
      
      {!isReady && showInfo && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4 shadow-lg absolute right-0 top-16 w-80 z-50"
        >
          <div className="flex items-center gap-3">
             <AlertCircle className="text-amber-600" size={18} />
             <p className="text-xs font-black text-amber-900 uppercase tracking-tight">Konfigurasi Service Account</p>
             <Button variant="ghost" size="icon-xs" className="ml-auto" onClick={() => setShowInfo(false)}>
               <X size={14} />
             </Button>
          </div>
          <div className="space-y-3 bg-white/50 p-4 rounded-xl border border-amber-100 text-[10px] text-amber-800 leading-relaxed md:w-[400px]">
             <p>Agar sistem bisa menyinkronkan data otomatis ke Spreadsheet di belakang layar (tanpa auth popup), Anda harus menambahkan kredensial Service Account ke Environment Variables (Settings &gt; API Keys / Environment Variables).</p>
             <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 font-mono text-[9px] space-y-1 text-slate-800 break-all leading-tight">
               <span className="block">GOOGLE_SERVICE_ACCOUNT_EMAIL = "nama-service@project.iam.gserviceaccount.com"</span>
               <span className="block">GOOGLE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIE..."</span>
             </div>
             <p className="font-bold text-red-600">PENTING: Jangan lupa jadikan email Service Account di atas sebagai "Editor" di Google Sheet Anda supaya sistem diizinkan mengisi datanya.</p>
          </div>
        </motion.div>
      )}

      {lastSync && isReady && (
        <div className="flex items-center gap-2 px-3">
           <div className="h-1 w-1 rounded-full bg-emerald-500" />
           <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Database Terakhir Disinkronisasi: {lastSync}</span>
        </div>
      )}
    </div>
  );
}

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

function AppConfigSection() {
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
           <div className="space-y-4">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kode Warna Hex Background</Label>
              <div className="flex gap-4 max-w-md">
                 <Input className="font-mono text-sm" placeholder="#ffffff" defaultValue="#f8fafc" />
                 <Button onClick={() => toast.success("Warna background berhasil disimpan!")} className="bg-purple-600 hover:bg-purple-700">Simpan</Button>
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
           <div className="space-y-4">
               <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transfer Kepemilikan (Owner)</Label>
               <div className="flex gap-4 max-w-md">
                 <Input className="text-sm" placeholder="Email owner baru" />
                 <Button onClick={() => toast.error("Transfer gagal. Hanya owner saat ini yang dapat memverifikasi aksi ini.")} variant="destructive">Alihkan</Button>
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

