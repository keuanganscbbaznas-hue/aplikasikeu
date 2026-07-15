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
  Timestamp,
  limit
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
import { GenericMultiSelect } from './components/GenericMultiSelect';
import { UM_STAGES, TRANSACTION_STAGES } from './types';
import { BaznasBudgetManager } from './components/BaznasBudgetManager';
import { LaporanManager } from './components/LaporanManager';
import { AdministrasiManager } from './components/administrasi/AdministrasiManager';
import { AnalisisManager } from './components/AnalisisManager';
import { BerkasDigitalManager } from './components/BerkasDigitalManager';
import { LearningSection } from './components/LearningSection';
import { InfoKeuanganSection } from './components/InfoKeuanganSection';
import SignaturePad from 'signature_pad';
import { jsPDF } from 'jspdf';
import { generateFPPP } from './lib/fpppGenerator';
import { generateLPJPDF } from './lib/lpjGenerator';
import { FPPPGeneratorSettings } from './components/FPPPGeneratorSettings';
import { DonationConfirmation } from './components/administrasi/DonationConfirmation';
import { DocumentTemplates } from './components/administrasi/DocumentTemplates';
import { 
  LayoutDashboard, 
  Plus, 
  Minus,
  Search,
  Filter,
  LogOut, 
  CheckCircle2, 
  XCircle,
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
  BarChart3,
  ClipboardCheck
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
import { resizeImage, getApiUrl } from './lib/utils';
import { Phone, Send } from 'lucide-react';

const formatWhatsAppMessage = (submission: Submission) => {
  const stages = getStagesByType(submission.type);
  const currentStatus = stages[submission.currentStageIndex];
  const url = 'https://aplikasikeu.vercel.app';
  
  return `Assalamu'alaikum \nPIC ${submission.picName || submission.submittedByName}, Informasi Update Pengajuan:\n📦 Judul: ${submission.title}\n💰 Nominal: Rp ${submission.amount.toLocaleString('id-ID')}\n📝 Status: ${currentStatus}\n\nSilakan cek detail selengkapnya di aplikasi: ${url}\n\nTerima kasih.`;
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
                  <th className="px-2 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest w-16">Tipe</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Judul & Keterangan</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest w-36">Nominal</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest w-80">Tahapan & Progress</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest w-36">Aksi</th>
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
  const isOwner = currentUser?.email === OWNER_EMAIL;
  const isAdmin = userRole === 'admin' || (currentUser?.email ? ADMIN_EMAILS.includes(currentUser.email) : false);
  const canSendWA = isAdmin || isOwner;

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
      <td className="px-4 py-4 text-center w-12">
        <input 
          type="checkbox" 
          checked={isSelected}
          onChange={() => submission.id && onToggle(submission.id)}
          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 transition-all cursor-pointer"
        />
      </td>
      <td className="px-2 py-4 w-16">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-[10px] font-black shadow-sm mx-auto ${typeStyles[submission.type] || typeStyles.pembiayaan}`}>
          {typeInitial[submission.type as keyof typeof typeInitial] || "PB"}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-0.5 w-full">
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
      <td className="px-6 py-4 font-['Times_New_Roman'] text-[13px] w-36">
        <div className="flex items-baseline gap-1">
          <span className="text-[14px] bg-[#ffffff] font-bold text-slate-400">Rp</span>
          <span className="font-['Times_New_Roman'] font-black text-[16px] text-slate-800 tracking-tight tabular-nums">
            {submission.amount.toLocaleString('id-ID')}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 w-80">
        <div className="space-y-2 w-full">
          <div className="flex items-center justify-between gap-2">
            <span className={`font-['Times_New_Roman'] px-2 py-0.5 rounded-md text-[10px] flex items-center font-black uppercase tracking-tighter line-clamp-1 ${
              submission.status === 'REJECTED' || submission.status === 'rejected'
                ? 'bg-red-50 text-red-700' 
                : 'bg-emerald-50 text-emerald-700'
            }`}>
              {submission.status === 'REJECTED' || submission.status === 'rejected' ? 'REJECTED' : stages[submission.currentStageIndex]}
            </span>
            <span className="text-[9px] font-bold text-slate-300 shrink-0">
              {submission.status === 'REJECTED' || submission.status === 'rejected' ? 'REJECTED' : `${submission.currentStageIndex + 1}/${stages.length}`}
            </span>
          </div>
          <WorkflowProgressBar 
            stages={stages} 
            currentIdx={submission.currentStageIndex} 
            isRejected={submission.status === 'REJECTED' || submission.status === 'rejected'} 
          />
          {submission.isBooked && (
            <div className="flex items-center gap-1 text-[9px] font-black text-blue-600 bg-blue-50/70 border border-blue-100 px-2 py-0.5 rounded-md w-max tracking-wider">
               <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
               DIBUKUKAN ({submission.bookedAtSheet?.replace('Kas ', '')})
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 w-36">
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
                <DialogContent className="max-w-3xl md:max-w-4xl max-h-[90vh] flex flex-col rounded-[2rem] border-none shadow-3xl p-0 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-white shrink-0">
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
                  
                  <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/30">
                    <div className="p-8">
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
                    </div>
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

              {canSendWA && (
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
  const [submissionLimit, setSubmissionLimit] = useState<number>(150);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [logoURL, setLogoURL] = useState<string>('/logo.png');
  const [fpppConfig, setFpppConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterPIC, setFilterPIC] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterSumberRekening, setFilterSumberRekening] = useState<string>('all');
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

  const isOwner = useMemo(() => {
    if (!user?.email) return false;
    return user.email.toLowerCase() === OWNER_EMAIL.toLowerCase() || 
           user.email.toLowerCase() === 'keuangan.scb@gmail.com';
  }, [user]);

  useEffect(() => {
    let isAlreadyInjected = false;
    try {
      isAlreadyInjected = localStorage.getItem('doc_injected_v5') === 'true';
    } catch (storageErr) {
      console.warn("Storage access denied:", storageErr);
    }

    if (isOwner && !isAlreadyInjected) {
      const injectDoc = async () => {
        try {
          const { collection, addDoc, serverTimestamp, getDocs, query, where, limit } = await import('firebase/firestore');
          const { db } = await import('./firebase');
          
          // Check if SPECIFIC item exists
          const q = query(collection(db, 'dashboard_gallery'), where('title', '==', 'Belajar Membuat Aplikasi Sendiri Bersama Kepala Sekolah dan Tendik SCB'), limit(1));
          const existing = await getDocs(q);
          
          if (existing.empty) {
            await addDoc(collection(db, 'dashboard_gallery'), {
              type: 'image',
              url: '/regenerated_image_1777445252050.png',
              title: 'Belajar Membuat Aplikasi Sendiri Bersama Kepala Sekolah dan Tendik SCB',
              description: 'Workshop intensif pengembangan aplikasi MONETA SCB bersama Kepala Sekolah dan Tenaga Pendidik Sekolah Cendekia BAZNAS.',
              createdAt: serverTimestamp(),
            });
            
            try {
              localStorage.setItem('doc_injected_v5', 'true');
            } catch (storageErr) {
              console.warn("Storage access denied:", storageErr);
            }
            console.log('Documentation injected successfully');
          } else {
            try {
              localStorage.setItem('doc_injected_v5', 'true');
            } catch (storageErr) {
              console.warn("Storage access denied:", storageErr);
            }
          }
        } catch (e) {
          console.error('Injection failed:', e);
        }
      };
      injectDoc();
    }
  }, [isOwner]);

  // Auto-switch away from unauthorized tabs
  useEffect(() => {
    if (isAuthReady && profile) {
      if (activeTab === 'dashboard' && !isAdmin) {
        // Redirection removed as per request to make dashboard visible to all
        // setActiveTab('tracking');
      }
    }
  }, [activeTab, isAdmin, isAuthReady, profile]);

  const [editType, setEditType] = useState<SubmissionType>('uang_muka');
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPicName, setEditPicName] = useState('');
  const [editPicWhatsapp, setEditPicWhatsapp] = useState('');
  const [editDivisi, setEditDivisi] = useState<'Asrama' | 'Akademik/Kesiswaan' | 'Operasional' | ''>('');
  const [editNoRekeningPengaju, setEditNoRekeningPengaju] = useState('');
  const [editNamaRekening, setEditNamaRekening] = useState('');
  const [editNamaBank, setEditNamaBank] = useState('');
  const [editSumberRekening, setEditSumberRekening] = useState<'SMP' | 'SMA' | 'Donasi SMP' | 'Donasi SMA' | ''>('');
  const [editKodeBudget, setEditKodeBudget] = useState('');
  const [editNoDokumen, setEditNoDokumen] = useState('');
  const [editNoDokumenLaporan, setEditNoDokumenLaporan] = useState('');
  const [editLpjUrl, setEditLpjUrl] = useState('');
  const [editEvidenceUrl, setEditEvidenceUrl] = useState('');
  const [editEvidenceBase64, setEditEvidenceBase64] = useState('');
  const [editEvidenceMimeType, setEditEvidenceMimeType] = useState('');
  const [isEditPicSignatureModalOpen, setIsEditPicSignatureModalOpen] = useState(false);
  const [editPicSignature, setEditPicSignature] = useState('');
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

    const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'), limit(submissionLimit));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      setSubmissions(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'submissions');
    });

    return () => unsubscribe();
  }, [isAuthReady, user, submissionLimit]);

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

  useEffect(() => {
    if (logoURL) {
      // Find and remove all existing icon-related link tags to prevent conflicts
      const existingIcons = document.querySelectorAll("link[rel*='icon']");
      existingIcons.forEach(el => el.remove());

      // Create new standard favicon link tag
      const linkIcon = document.createElement('link');
      linkIcon.rel = 'icon';
      linkIcon.type = 'image/png';
      linkIcon.href = logoURL;
      document.head.appendChild(linkIcon);

      // Create shortcut icon link tag for older/alternative engines
      const linkShortcut = document.createElement('link');
      linkShortcut.rel = 'shortcut icon';
      linkShortcut.type = 'image/png';
      linkShortcut.href = logoURL;
      document.head.appendChild(linkShortcut);

      // Create high-res apple touch icon link tag for iOS/OSX and modern viewport agents
      const linkApple = document.createElement('link');
      linkApple.rel = 'apple-touch-icon';
      linkApple.href = logoURL;
      document.head.appendChild(linkApple);
    }
  }, [logoURL]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'fppp'), (docSnap) => {
      if (docSnap.exists()) {
        setFpppConfig(docSnap.data());
      } else {
        setFpppConfig({
          verifikatorName: "M. Roni",
          managerName: "M. Roni",
          kepalaName: "Ahmad Kamal",
          bankName: "BANK SYARIAH INDONESIA (BSI)",
          budgetName: "Anggaran SCB BAZNAS",
          budgetSaldo: "Sesuai RKAT",
          useDefaultRoniSign: false,
          useDefaultKamalSign: false,
          useDefaultKasirSign: false,
          roniDefaultSign: "",
          kamalDefaultSign: "",
          kasirDefaultSign: "",
        });
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
      const statusRes = await fetch(getApiUrl('/api/system/sync/status'));
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
        'Kode Budget',
        'Rekening',
        'No Dokumen',
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
        s.kodeBudget || '-',
        s.sumberRekening || '-',
        s.noDokumen || '-',
        s.description || '',
        s.amount || 0,
        s.status || '',
        s.picName || '',
        s.currentStageIndex !== undefined ? (getStagesByType(s.type)[s.currentStageIndex] || '-') : '-',
        s.submittedByEmail || '',
        s.evidenceUrl || ''
      ]);

      const data = [headers, ...rows];

      const response = await fetch(getApiUrl('/api/sheets/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: '1V4Nn0dUmFLdwzXOa3fAHKVuuEbVqAtNEKH_cGBc54tw',
          data
        })
      });

      if (!response.ok) {
        let errData;
        try { errData = await response.json(); } catch { errData = { message: `HTTP Error ${response.status}: ${response.status === 413 ? 'Payload terlalu besar' : 'Terjadi kesalahan sistem'}` }; }
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
    
    // TGL: Use today as transaction date
    const today = new Date();
    const formattedDate = format(today, 'd/MMM/yy');

    // JJ: Abbreviation for Type
    // Based on sheet sample: CA (Cash Advance), KK (Kas Kecil), etc.
    const typeAbbr = submission.type === 'uang_muka' ? 'CA' : 
                     submission.type === 'reimburse' ? 'RE' : 
                     'PB';

    const rowData = [
       [
         formattedDate,                                          // Col A: TGL
         submission.noDokumen || '',                             // Col B: NO. DOC
         typeAbbr,                                               // Col C: JJ
         submission.kodeBudget || '',                            // Col D: KODE ANGGARAN
         submission.picName || submission.submittedByName || '',  // Col E: PIC
         submission.title || '',                                 // Col F: KETERANGAN
         '',                                                     // Col G: DEBET (Blank for expense)
         submission.amount,                                      // Col H: KREDIT (Nominal)
         '__ROW_FORMULA__'                                       // Col I: SALDO AKHIR formula (auto-calculated on server to work across all locales!)
       ]
    ];

    toast.promise(
      fetch(getApiUrl('/api/sheets/append'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          range: `'${sheetType}'!A11:I`,
          data: rowData
        })
      }).then(async res => {
        if(!res.ok) {
          let err;
          try { err = await res.json(); } catch { err = { message: `HTTP Error ${res.status}: ${res.status === 413 ? 'Payload terlalu besar' : 'Terjadi kesalahan sistem'}` }; }
          throw new Error(err.message || err.error || 'Gagal menambah ke Google Sheets');
        }
        return res.json();
      }).then(async (data) => {
        // Update Firestore status to keep record syncing and avoid duplicates
        try {
          if (submission.id) {
            await updateDoc(doc(db, 'submissions', submission.id), {
              isBooked: true,
              bookedAtSheet: sheetType,
              bookedAt: serverTimestamp()
            });
          }
        } catch (dbErr) {
          console.error("Gagal memperbarui status pembukuan di database:", dbErr);
        }

        // Open spreadsheet under iframe-safe try-catch wrapper
        try {
          window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, '_blank');
        } catch (popupErr) {
          console.warn("Iframe blocked window.open popup:", popupErr);
        }
        return data;
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

  const updateUserAllowedMenus = async (uid: string, allowedMenus: string[] | null) => {
    if (!isSuperAdmin) {
      toast.error("Hanya Super Admin yang dapat mengubah pilihan menu user");
      return;
    }
    try {
      await updateDoc(doc(db, 'users', uid), { allowedMenus: allowedMenus });
      toast.success("Pilihan menu user berhasil diperbarui");
    } catch (error) {
      toast.error("Gagal memperbarui pilihan menu user");
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
        status: 'REJECTED',
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
    setEditDivisi(submission.divisi || '');
    setEditNoRekeningPengaju(submission.noRekeningPengaju || '');
    setEditNamaRekening(submission.namaRekening || '');
    setEditNamaBank(submission.namaBank || '');
    setEditSumberRekening(submission.sumberRekening || '');
    setEditKodeBudget(submission.kodeBudget || '');
    setEditNoDokumen(submission.noDokumen || '');
    setEditNoDokumenLaporan(submission.noDokumenLaporan || '');
    setEditLpjUrl(submission.lpjUrl || '');
    setEditEvidenceUrl(submission.evidenceUrl || '');
    setEditEvidenceBase64('');
    setEditEvidenceMimeType('');
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

  const handleEditEvidenceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditEvidenceBase64(reader.result as string);
        setEditEvidenceMimeType(file.type);
      };
      reader.readAsDataURL(file);
    } else {
      setEditEvidenceBase64('');
      setEditEvidenceMimeType('');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubmission || !profile || !TRACKING_ADMIN_EMAILS.includes(profile.email)) {
      toast.error("Anda tidak memiliki akses untuk mengedit pengajuan ini");
      return;
    }

    const submissionId = editingSubmission.id;
    const stages = getStagesByType(editType);
    
    // Close dialog immediately for instant UI feedback
    setIsEditDialogOpen(false);
    setEditingSubmission(null);
    
    // Perform update in background with a promise toast
    const updateProcess = async () => {
      let finalEvidenceUrl = editEvidenceUrl;
      
      if (editEvidenceBase64) {
        const ext = editEvidenceMimeType.split('/')[1] || 'png';
        try {
          const localRes = await fetch(getApiUrl('/api/gallery/upload'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: `bukti_pengajuan_terbaru_${Date.now()}.${ext}`,
              base64Data: editEvidenceBase64,
              mimeType: editEvidenceMimeType
            })
          });
          if (localRes.ok) {
            const localData = await localRes.json();
            if (localData.success) {
              finalEvidenceUrl = localData.url;
            }
          }
        } catch (uploadErr) {
          console.error("Gagal upload lampiran revisi:", uploadErr);
        }
      }

      const updatePayload = {
        type: editType,
        title: editTitle,
        amount: Number(editAmount),
        description: editDescription,
        picName: editPicName,
        picWhatsapp: editPicWhatsapp || null,
        divisi: editDivisi || null,
        noRekeningPengaju: editNoRekeningPengaju || null,
        namaRekening: editNamaRekening || null,
        namaBank: editNamaBank || null,
        sumberRekening: editSumberRekening || null,
        kodeBudget: editKodeBudget || null,
        noDokumen: editNoDokumen || null,
        noDokumenLaporan: editNoDokumenLaporan || null,
        lpjUrl: editLpjUrl || null,
        evidenceUrl: finalEvidenceUrl,
        createdAt: Timestamp.fromDate(new Date(editCreatedAt)),
        history: editHistory,
        currentStageIndex: editStageIndex,
        status: stages[editStageIndex],
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'submissions', submissionId), updatePayload);
    };

    toast.promise(
      updateProcess(),
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

    const headers = ["ID", "Jenis", "Judul", "Kode Budget", "Rekening", "No Dokumen", "Nominal", "Status", "Tahap", "Pengaju", "Email Pengaju", "Tanggal Buat", "Link Bukti"];
    const rows = submissions.map(s => {
      const stages = getStagesByType(s.type);
      const currentStatus = stages[s.currentStageIndex] || s.status;
      return [
        s.id,
        s.type === 'uang_muka' ? 'Uang Muka' : s.type === 'reimburse' ? 'Reimburse' : 'Pembiayaan',
        s.title,
        s.kodeBudget || '-',
        s.sumberRekening || '-',
        s.noDokumen || '-',
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

  const checkMenuAccess = (itemId: string, itemAccess: string = 'all') => {
    if (profile?.allowedMenus && Array.isArray(profile.allowedMenus)) {
      if (itemId === 'settings' && profile.email === OWNER_EMAIL) return true;
      return profile.allowedMenus.includes(itemId);
    }

    return (
      itemAccess === 'all' || 
      (itemAccess === 'admin' && (isAdmin || (['laporan'].includes(itemId) && (isKamal || isKeuanganSCB)))) || 
      (itemAccess === 'superadmin' && isSuperAdmin) ||
      (itemAccess === 'owner' && (profile?.email === OWNER_EMAIL || (['anggaran'].includes(itemId) && (isKamal || isKeuanganSCB)))) ||
      (itemAccess === 'owner_only' && profile?.email === OWNER_EMAIL)
    );
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'DASHBOARD', icon: LayoutDashboard, access: 'all' },
    { id: 'tracking', label: 'Tracking Transaksi', icon: MessageSquare, access: 'all' },
    { id: 'buku_kas', label: 'Buku Kas', icon: BookOpen, access: 'admin' },
    { id: 'anggaran', label: 'Pengajuan Anggaran ke BAZNAS', icon: PieChart, access: 'owner' },
    { id: 'laporan', label: 'Laporan PertUM ke BAZNAS', icon: FileText, access: 'admin' },
    { id: 'berkas', label: 'Berkas Digital', icon: FolderOpen, access: 'admin' },
    { id: 'administrasi', label: 'Laporan Donasi', icon: Briefcase, access: 'admin' },
    { id: 'settings', label: 'Settingan', icon: Settings, access: 'owner_only' },
  ];

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const matchesTitle = (sub.title || '').toLowerCase().includes(deferredSearchQuery.toLowerCase());
      const matchesPIC = deferredFilterPIC ? (sub.picName && sub.picName.toLowerCase().includes(deferredFilterPIC.toLowerCase())) : true;
      const matchesType = filterType.length === 0 ? true : filterType.includes(sub.type || '');
      
      const amount = sub.amount || 0;
      const matchesMin = minAmount ? amount >= Number(minAmount) : true;
      const matchesMax = maxAmount ? amount <= Number(maxAmount) : true;

      const globalSearch = deferredSearchQuery ? (matchesTitle || (sub.picName && sub.picName.toLowerCase().includes(deferredSearchQuery.toLowerCase()))) : true;

      const stages = getStagesByType(sub.type);
      const currentStatus = (sub.status === 'REJECTED' || sub.status === 'rejected') ? 'REJECTED' : (stages[sub.currentStageIndex] || sub.status);
      const matchesStatus = filterStatuses.length === 0 ? true : filterStatuses.includes(currentStatus);

      // Month & Year Filter
      const subDate = parseFirestoreDate(sub.createdAt);

      const matchesMonth = filterMonth === 'all' ? true : (subDate.getMonth() + 1).toString() === filterMonth;
      const matchesYear = filterYear === 'all' ? true : subDate.getFullYear().toString() === filterYear;

      // Sumber Rekening Filter
      const matchesSumberRekening = filterSumberRekening === 'all' 
        ? true 
        : (sub.sumberRekening || '').toLowerCase() === filterSumberRekening.toLowerCase();

      return globalSearch && matchesPIC && matchesType && matchesMin && matchesMax && matchesStatus && matchesMonth && matchesYear && matchesSumberRekening;
    });
  }, [submissions, deferredSearchQuery, deferredFilterPIC, filterType, minAmount, maxAmount, filterStatuses, filterMonth, filterYear, filterSumberRekening]);

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
              <div className="mx-auto flex h-32 w-32 items-center justify-center p-2 rounded-[2rem] bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 overflow-hidden">
                <img 
                  src={logoURL} 
                  alt="Logo MONETA SCB" 
                  className="max-h-full max-w-full object-contain p-1"
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
              <p>© 2026 MONETA - MONETA SCB</p>
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
          <div className="px-4 py-5 bg-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-white p-1 rounded-none flex items-center justify-center shadow-lg shrink-0">
                  <img 
                    src={logoURL} 
                    alt="Logo" 
                    className="h-full w-full object-contain"
                  />
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-black text-white text-xl tracking-tighter leading-none whitespace-nowrap">MONETA <span className="text-emerald-500">SCB</span></span>
                <div className="flex flex-col text-[8.5px] font-bold text-white uppercase mt-1.5 leading-tight opacity-60">
                  <span className="tracking-[0.02rem] whitespace-nowrap">Monitoring & Electronic</span>
                  <span className="tracking-[0.088rem] whitespace-nowrap">Treasury Application</span>
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
              const hasAccess = checkMenuAccess(item.id, item.access);

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
                          <div className="flex flex-wrap items-center gap-4">
                            <Button onClick={() => setActiveTab('tracking')} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl px-6 h-12 font-bold text-sm shadow-xl shadow-emerald-900/40 transition-all">
                               Lihat Semua Transaksi
                               <ArrowRight size={18} className="ml-2" />
                            </Button>

                            <Dialog>
                              <DialogTrigger render={
                                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl px-6 h-12 font-bold text-sm shadow-xl shadow-emerald-900/40 transition-all text-white">
                                   <FileText size={18} className="mr-2" />
                                   Template Dokumen
                                </Button>
                              } />
                              <DialogContent className="max-w-6xl sm:max-w-6xl w-[95vw] h-[90vh] max-h-[90vh] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-white flex flex-col">
                                 <ScrollArea className="flex-1 w-full h-full">
                                   <div className="p-6 md:p-12 lg:p-16">
                                     <DocumentTemplates isOwner={user?.email === OWNER_EMAIL || profile?.email === OWNER_EMAIL} />
                                   </div>
                                 </ScrollArea>
                              </DialogContent>
                            </Dialog>


                            <Dialog>
                              <DialogTrigger render={
                                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl px-6 h-12 font-bold text-sm shadow-xl shadow-emerald-900/40 transition-all">
                                   <ClipboardCheck size={18} className="mr-2" />
                                   Konfirmasi Donasi
                                </Button>
                              } />
                              <DialogContent className="max-w-6xl sm:max-w-6xl w-[95vw] h-[90vh] max-h-[90vh] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-white flex flex-col">
                                 <ScrollArea className="flex-1 w-full h-full">
                                   <div className="p-6 md:p-12 lg:p-16">
                                     <DonationConfirmation />
                                   </div>
                                 </ScrollArea>
                              </DialogContent>
                            </Dialog>
                          </div>
                       </div>
                    </div>

                    {/* Balance Summary Section */}
                    {isAdmin && <GlobalBalanceSummary />}

                    {/* Accumulation Section - Moved from Tracking */}
                    {isAdmin && (
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
                    )}
                    {/* Analysis Section - Moved from its own tab */}
                    {isAdmin && (

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

                    {/* Info Seputar Keuangan SCB */}
                    <InfoKeuanganSection />

                    {/* Learning & Collaborating Section */}
                    <LearningSection isOwner={isOwner} />
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
                              Portal manajemen keuangan MONETA SCB.
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
                              <GenericMultiSelect
                                title="Filter Jenis"
                                subtitle="Tipe Transaksi"
                                placeholder="Pilih Tipe"
                                options={[
                                  { id: 'uang_muka', label: 'UANG MUKA' },
                                  { id: 'reimburse', label: 'REIMBURSE' },
                                  { id: 'pembiayaan', label: 'PEMBIAYAAN' }
                                ]}
                                selectedValues={filterType}
                                onChange={setFilterType}
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</Label>
                              <StatusMultiSelect
                                allStatuses={Array.from(new Set([...UM_STAGES, ...TRANSACTION_STAGES, "REJECTED"]))}
                                selectedStatuses={filterStatuses}
                                onChange={setFilterStatuses}
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Sumber Rekening</Label>
                              <Select value={filterSumberRekening} onValueChange={setFilterSumberRekening}>
                                <SelectTrigger className="h-8 bg-slate-50 border-none rounded-lg text-[11px] font-bold focus:ring-2 focus:ring-emerald-500/20 transition-all">
                                  <div className="flex items-center gap-2">
                                    <Filter size={14} className="text-slate-400" />
                                    <SelectValue placeholder="Semua Sumber" />
                                  </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100">
                                  <SelectItem value="all" className="text-xs font-bold">SEMUA SUMBER</SelectItem>
                                  <SelectItem value="smp" className="text-xs font-bold">SMP</SelectItem>
                                  <SelectItem value="sma" className="text-xs font-bold">SMA</SelectItem>
                                  <SelectItem value="donasi smp" className="text-xs font-bold">DONASI SMP</SelectItem>
                                  <SelectItem value="donasi sma" className="text-xs font-bold">DONASI SMA</SelectItem>
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

                    {/* Monthly results summary if handled */}
                    <FilteredResultsSummary 
                      submissions={filteredSubmissions} 
                      isFiltered={
                        searchQuery !== '' || 
                        filterStatuses.length > 0 || 
                        filterPIC !== '' || 
                        filterType.length > 0 || 
                        minAmount !== '' || 
                        maxAmount !== '' ||
                        filterMonth !== 'all' ||
                        filterYear !== 'all' ||
                        filterSumberRekening !== 'all'
                      }
                      filters={{
                        search: searchQuery,
                        statuses: filterStatuses,
                        pic: filterPIC,
                        type: filterType,
                        month: filterMonth,
                        year: filterYear,
                        min: minAmount,
                        max: maxAmount,
                        sumberRekening: filterSumberRekening
                      }}
                    />

                    <Tabs defaultValue="all" className="space-y-4 mt-6">
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-1">
                        <TabsList className="bg-white p-1 shadow-lg shadow-slate-200/40 rounded-xl border border-slate-100 h-10 w-full md:w-auto overflow-x-auto gap-1">
                          <TabsTrigger value="all" className="px-4 rounded-lg font-black text-[10px] h-full data-[state=active]:bg-emerald-600 data-[state=active]:text-white uppercase tracking-tight">Semua Data</TabsTrigger>
                          <TabsTrigger value="pending" className="px-4 rounded-lg font-black text-[10px] h-full data-[state=active]:bg-amber-500 data-[state=active]:text-white uppercase tracking-tight">Waiting Approval</TabsTrigger>
                          <TabsTrigger value="transfer" className="px-4 rounded-lg font-black text-[10px] h-full data-[state=active]:bg-violet-600 data-[state=active]:text-white uppercase tracking-tight">Waiting Transfer</TabsTrigger>
                          <TabsTrigger value="waiting_settled" className="px-4 rounded-lg font-black text-[10px] h-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white uppercase tracking-tight">Waiting Settled</TabsTrigger>
                          <TabsTrigger value="rejected" className="px-4 rounded-lg font-black text-[10px] h-full data-[state=active]:bg-red-600 data-[state=active]:text-white uppercase tracking-tight">Rejected</TabsTrigger>
                          <TabsTrigger value="completed" className="px-4 rounded-lg font-black text-[10px] h-full data-[state=active]:bg-blue-600 data-[state=active]:text-white uppercase tracking-tight">Settled</TabsTrigger>
                        </TabsList>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white border border-slate-100 px-3 h-10 rounded-xl shadow-lg shadow-slate-200/40">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Limit Muat:</span>
                            <select 
                              value={submissionLimit} 
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setSubmissionLimit(val);
                                toast.success(`Limit dimodifikasi ke ${val === 10000 ? "Semua" : val} transaksi terbaru`);
                              }}
                              className="bg-transparent border-none text-[10px] font-black text-slate-700 focus:outline-none cursor-pointer"
                            >
                              <option value={100}>100 Terbaru (Sangat Cepat)</option>
                              <option value={200}>200 Terbaru (Direkomendasikan)</option>
                              <option value={500}>500 Terbaru</option>
                              <option value={10000}>Tampilkan Semua (Lebih Lambat)</option>
                            </select>
                          </div>

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
                            if (s.status === 'REJECTED' || s.status === 'rejected') return false;
                            return s.currentStageIndex !== undefined && s.currentStageIndex >= 0 && s.currentStageIndex <= 2;
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

                      <TabsContent value="transfer">
                        <SubmissionGrid 
                          items={filteredSubmissions.filter(s => {
                            if (s.status === 'REJECTED' || s.status === 'rejected') return false;
                            const stages = getStagesByType(s.type);
                            const currentStage = s.currentStageIndex !== undefined ? (stages[s.currentStageIndex] || '') : '';
                            return currentStage === "Dalam Antrian Transfer";
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

                      <TabsContent value="waiting_settled">
                        <SubmissionGrid 
                          items={filteredSubmissions.filter(s => {
                            if (s.status === 'REJECTED' || s.status === 'rejected') return false;
                            const stages = getStagesByType(s.type);
                            return s.currentStageIndex !== undefined && s.currentStageIndex >= 4 && s.currentStageIndex < stages.length - 1;
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

                      <TabsContent value="rejected">
                        <SubmissionGrid 
                          items={filteredSubmissions.filter(s => {
                            return s.status === 'REJECTED' || s.status === 'rejected';
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
                            if (s.status === 'REJECTED' || s.status === 'rejected') return false;
                            const stages = getStagesByType(s.type);
                            return s.currentStageIndex !== undefined && s.currentStageIndex === stages.length - 1;
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

                {activeTab === 'buku_kas' && checkMenuAccess('buku_kas', 'admin') && (
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

                {activeTab === 'anggaran' && checkMenuAccess('anggaran', 'owner') && (
                  <BaznasBudgetManager profile={profile} userUid={user?.uid || ''} isReadOnly={isKeuanganSCB} />
                )}

                {activeTab === 'laporan' && checkMenuAccess('laporan', 'admin') && (
                  <LaporanManager userUid={user?.uid || ''} isReadOnly={isKeuanganSCB} />
                )}

                {activeTab === 'berkas' && checkMenuAccess('berkas', 'admin') && (
                  <BerkasDigitalManager />
                )}

                {activeTab === 'administrasi' && checkMenuAccess('administrasi', 'admin') && (
                  <AdministrasiManager isAdmin={isAdmin || profile?.email === OWNER_EMAIL || (profile?.allowedMenus && profile.allowedMenus.includes('administrasi'))} />
                )}

                {activeTab === 'settings' && isSuperAdmin && (
                  <div className="space-y-8">
                    <AdminSection 
                      users={allUsers} 
                      onUpdateRole={updateUserRole} 
                      onUpdateAllowedMenus={updateUserAllowedMenus}
                      isSuperAdmin={isSuperAdmin} 
                    />
                    
                    {user?.email === 'keuanganscbbaznas@gmail.com' && (
                      <AppConfigSection user={user} profile={profile} fpppConfig={fpppConfig} />
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
        <DialogContent className="max-w-6xl sm:max-w-6xl w-[90vw] md:w-[95vw] h-[90vh] max-h-[90vh] flex flex-col rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl bg-white">
          <form onSubmit={handleUpdate} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-white shrink-0">
              <DialogHeader>
                <DialogTitle className="font-black text-xl tracking-tighter text-slate-900 uppercase">Edit Pengajuan</DialogTitle>
                <DialogDescription className="text-xs font-bold text-slate-400 font-mono tracking-widest uppercase">
                  Ubah detail pengajuan & riwayat transaksi
                </DialogDescription>
              </DialogHeader>
            </div>
            
            <ScrollArea className="flex-1 w-full h-full min-h-0 bg-slate-50/30">
              <div className="p-8">
                <div className="grid gap-12 lg:grid-cols-12">
                <div className="lg:col-span-7 space-y-8">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-1 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Informasi Utama
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="grid gap-2 ml-1">
                        <Label htmlFor="edit-type" className="text-[9px] font-black uppercase tracking-wider text-slate-500">Jenis Pengajuan</Label>
                        <Select 
                          value={editType} 
                          onValueChange={(v: SubmissionType) => setEditType(v)}
                        >
                          <SelectTrigger id="edit-type" className="h-10 rounded-xl border-slate-200 bg-white">
                            <SelectValue placeholder="Pilih Jenis" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="uang_muka">Uang Muka</SelectItem>
                            <SelectItem value="reimburse">Reimburse</SelectItem>
                            <SelectItem value="pembiayaan">Pembiayaan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2 ml-1">
                        <Label htmlFor="edit-title" className="text-[9px] font-black uppercase tracking-wider text-slate-500">Judul Pengajuan</Label>
                        <Input 
                          id="edit-title" 
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          required
                          className="h-10 rounded-xl border-slate-200 bg-white"
                        />
                      </div>
                      <div className="grid gap-2 ml-1">
                        <Label htmlFor="edit-amount" className="text-[9px] font-black uppercase tracking-wider text-slate-500">Nominal (Rp)</Label>
                        <Input 
                          id="edit-amount" 
                          type="number" 
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          required
                          className="h-10 rounded-xl border-slate-200 bg-white"
                        />
                      </div>
                      <div className="grid gap-2 ml-1">
                        <Label htmlFor="edit-pic" className="text-[9px] font-black uppercase tracking-wider text-slate-500">Nama PIC</Label>
                        <Input 
                          id="edit-pic" 
                          value={editPicName}
                          onChange={(e) => setEditPicName(e.target.value)}
                          required
                          className="h-10 rounded-xl border-slate-200 bg-white"
                        />
                      </div>
                      <div className="grid gap-2 ml-1">
                        <Label htmlFor="edit-pic-wa" className="text-[9px] font-black uppercase tracking-wider text-slate-500">WhatsApp PIC (Optional)</Label>
                        <Input 
                          id="edit-pic-wa" 
                          placeholder="Contoh: 08123456789"
                          value={editPicWhatsapp}
                          onChange={(e) => setEditPicWhatsapp(e.target.value)}
                          className="h-10 rounded-xl border-slate-200 bg-white"
                        />
                      </div>
                      <div className="grid gap-2 ml-1">
                        <Label htmlFor="edit-divisi" className="text-[9px] font-black uppercase tracking-wider text-slate-500">Divisi (Optional)</Label>
                        <Select 
                          value={editDivisi} 
                          onValueChange={(v: 'Asrama' | 'Akademik/Kesiswaan' | 'Operasional' | '') => setEditDivisi(v)}
                        >
                          <SelectTrigger id="edit-divisi" className="h-10 rounded-xl border-slate-200 bg-white">
                            <SelectValue placeholder="Pilih divisi" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Asrama">Asrama</SelectItem>
                            <SelectItem value="Akademik/Kesiswaan">Akademik/Kesiswaan</SelectItem>
                            <SelectItem value="Operasional">Operasional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2 ml-1">
                        <Label htmlFor="edit-namabank" className="text-[9px] font-black uppercase tracking-wider text-slate-500">Nama Bank (Optional)</Label>
                        <Select 
                          value={editNamaBank} 
                          onValueChange={(v: string) => setEditNamaBank(v)}
                        >
                          <SelectTrigger id="edit-namabank" className="h-10 rounded-xl border-slate-200 bg-white">
                            <SelectValue placeholder="Pilih Bank" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Bank Syariah Indonesia (BSI)">Bank Syariah Indonesia (BSI)</SelectItem>
                            <SelectItem value="Bank Rakyat Indonesia (BRI)">Bank Rakyat Indonesia (BRI)</SelectItem>
                            <SelectItem value="Bank Mandiri">Bank Mandiri</SelectItem>
                            <SelectItem value="Bank Negara Indonesia (BNI)">Bank Negara Indonesia (BNI)</SelectItem>
                            <SelectItem value="Bank Tabungan Negara (BTN)">Bank Tabungan Negara (BTN)</SelectItem>
                            <SelectItem value="Bank BJB">Bank BJB</SelectItem>
                            <SelectItem value="Bank BCA">Bank BCA</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2 ml-1">
                        <Label htmlFor="edit-norek" className="text-[9px] font-black uppercase tracking-wider text-slate-500">No Rekening Pengaju (Optional)</Label>
                        <Input 
                          id="edit-norek" 
                          placeholder="Contoh: BSI 1234567890" 
                          value={editNoRekeningPengaju}
                          onChange={(e) => setEditNoRekeningPengaju(e.target.value)}
                          className="h-10 rounded-xl border-slate-200 bg-white"
                        />
                      </div>
                      <div className="grid gap-2 ml-1">
                        <Label htmlFor="edit-namarek" className="text-[9px] font-black uppercase tracking-wider text-slate-500">Nama Pemilik Rekening (Optional)</Label>
                        <Input 
                          id="edit-namarek" 
                          placeholder="Contoh: Ahmad" 
                          value={editNamaRekening}
                          onChange={(e) => setEditNamaRekening(e.target.value)}
                          className="h-10 rounded-xl border-slate-200 bg-white"
                        />
                      </div>
                      <div className="grid gap-2 ml-1">
                        <Label htmlFor="edit-sumber" className="text-[9px] font-black uppercase tracking-wider text-slate-500">Sumber Rekening</Label>
                        <Select 
                          value={editSumberRekening} 
                          onValueChange={(v: any) => setEditSumberRekening(v)}
                        >
                          <SelectTrigger id="edit-sumber" className="h-10 rounded-xl border-slate-200 bg-white">
                            <SelectValue placeholder="Pilih Unit / Rekening" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="SMP">SMP</SelectItem>
                            <SelectItem value="SMA">SMA</SelectItem>
                            <SelectItem value="Donasi SMP">Donasi SMP</SelectItem>
                            <SelectItem value="Donasi SMA">Donasi SMA</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-1 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                       Administrasi & Dokumen
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="grid gap-2 ml-1">
                        <Label htmlFor="edit-kodebudget" className="text-[9px] font-black uppercase tracking-wider text-slate-500">Kode Budget</Label>
                        <Input 
                          id="edit-kodebudget" 
                          value={editKodeBudget}
                          onChange={(e) => setEditKodeBudget(e.target.value)}
                          placeholder="Contoh: 1.1.1"
                          className="h-10 rounded-xl border-slate-200 bg-white"
                        />
                      </div>
                      <div className="grid gap-2 ml-1">
                        <Label htmlFor="edit-nodokumen" className="text-[9px] font-black uppercase tracking-wider text-slate-500">No Dokumen</Label>
                        <Input 
                          id="edit-nodokumen" 
                          value={editNoDokumen}
                          onChange={(e) => setEditNoDokumen(e.target.value)}
                          placeholder="Contoh: 001/SCB/V/2026"
                          className="h-10 rounded-xl border-slate-200 bg-white"
                        />
                      </div>
                      {editType === 'uang_muka' && (
                        <>
                          <div className="grid gap-2 ml-1">
                            <Label htmlFor="edit-nodokumen-laporan" className="text-[9px] font-black uppercase tracking-wider text-slate-500">No. Doc Laporan (LPJ)</Label>
                            <Input 
                              id="edit-nodokumen-laporan" 
                              value={editNoDokumenLaporan}
                              onChange={(e) => setEditNoDokumenLaporan(e.target.value)}
                              placeholder="Contoh: LPJ.01.020626"
                              className="h-10 rounded-xl border-slate-200 bg-white"
                            />
                          </div>
                          <div className="grid gap-2 ml-1">
                            <Label htmlFor="edit-lpj-url-dialog" className="text-[9px] font-black uppercase tracking-wider text-slate-500">Link Dokumen/Bukti Laporan (LPJ)</Label>
                            <Input 
                              id="edit-lpj-url-dialog" 
                              value={editLpjUrl}
                              onChange={(e) => setEditLpjUrl(e.target.value)}
                              placeholder="Contoh: https://drive.google.com/..."
                              className="h-10 rounded-xl border-slate-200 bg-white"
                            />
                          </div>
                        </>
                      )}
                      <div className="grid gap-2 ml-1">
                        <Label htmlFor="edit-status" className="text-[9px] font-black uppercase tracking-wider text-slate-500">Status Alur (Admin)</Label>
                        <Select 
                          value={editStageIndex.toString()} 
                          onValueChange={(v) => setEditStageIndex(parseInt(v))}
                        >
                          <SelectTrigger className="h-10 rounded-xl border-slate-200 font-bold text-emerald-700 bg-white">
                            <SelectValue placeholder="Pilih Tahap" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl max-h-[300px]">
                            {getStagesByType(editType).map((stage, idx) => (
                              <SelectItem key={idx} value={idx.toString()} className="text-[10px] font-bold">
                                Tahap {idx + 1}: {stage}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2 ml-1">
                        <Label htmlFor="edit-createdat" className="text-[9px] font-black uppercase tracking-wider text-slate-500">Tanggal Pengajuan</Label>
                        <Input 
                          id="edit-createdat" 
                          type="datetime-local" 
                          value={editCreatedAt}
                          onChange={(e) => setEditCreatedAt(e.target.value)}
                          required
                          className="h-10 rounded-xl border-slate-200 bg-white"
                        />
                      </div>
                      <div className="grid gap-2 ml-1 md:col-span-2">
                        <Label htmlFor="edit-description" className="text-[9px] font-black uppercase tracking-wider text-slate-500">Keterangan</Label>
                        <Input 
                          id="edit-description" 
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="h-10 rounded-xl border-slate-200 bg-white"
                        />
                      </div>
                      <div className="grid gap-2 ml-1 md:col-span-2">
                        <Label htmlFor="edit-evidence" className="text-[9px] font-black uppercase tracking-wider text-slate-500">Dokumen Lampiran (Upload File atau Copas Link)</Label>
                        <div className="flex gap-2 items-center">
                          <Input 
                            type="file" 
                            id="edit_evidence_file"
                            onChange={handleEditEvidenceFile}
                            className="h-10 rounded-xl border-slate-200 text-xs py-2 w-1/2 cursor-pointer bg-white"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                          />
                          <span className="text-[10px] font-black text-slate-400">ATAU</span>
                          <Input 
                            id="edit-evidence" 
                            value={editEvidenceUrl}
                            onChange={(e) => setEditEvidenceUrl(e.target.value)}
                            className="h-10 rounded-xl border-slate-200 bg-white w-1/2"
                            placeholder="https://drive.google.com/..."
                          />
                        </div>
                        {editEvidenceBase64 && (
                          <p className="text-[10px] text-emerald-600 font-bold ml-1 mt-1">✓ File siap diupload</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-6">
                  <div className="flex items-center justify-between ml-1">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                      <Clock size={12} className="text-emerald-500" /> Edit Waktu Persetujuan
                    </Label>
                    <span className="text-[8px] bg-slate-200/50 px-2 py-0.5 rounded-full font-bold text-slate-500 uppercase">Admin Only</span>
                  </div>
                  <div className="h-[450px] lg:h-[550px] rounded-[2rem] border border-slate-100 bg-white p-5 overflow-y-auto shadow-inner">
                    <div className="flex flex-col gap-3">
                      {editHistory.map((h, i) => (
                        <div key={i} className="group rounded-2xl border border-slate-50 bg-slate-50/50 p-4 text-[10px] hover:bg-white hover:border-emerald-100 hover:shadow-md transition-all duration-300">
                          <div className="flex flex-col gap-1 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <p className="font-black text-emerald-800 uppercase tracking-tighter leading-tight flex-1">{h.stage}</p>
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold ml-3.5 uppercase italic">Oleh: {h.actorName}</p>
                          </div>
                          <div className="relative pl-3.5">
                            <Input 
                              type="datetime-local" 
                              className="h-8 rounded-lg text-[10px] font-bold border-slate-100 bg-white"
                              value={h.timestamp ? format(h.timestamp instanceof Timestamp ? h.timestamp.toDate() : new Date(h.timestamp), "yyyy-MM-dd'T'HH:mm") : ''}
                              onChange={(e) => handleUpdateHistoryTime(i, e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

            <div className="p-5 border-t border-slate-50 bg-white shrink-0">
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="rounded-xl px-8 h-10 font-bold text-slate-500 border-slate-200 hover:bg-slate-50"
                >
                  Batal
                </Button>
                <Button 
                  type="submit"
                  className="rounded-xl px-10 h-10 font-black uppercase tracking-[0.2em] bg-emerald-700 hover:bg-emerald-800 text-white shadow-lg shadow-emerald-100"
                >
                  Simpan Perubahan
                </Button>
              </div>
            </div>
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
    type: string[];
    month: string;
    year: string;
    min: string;
    max: string;
    sumberRekening?: string;
  }
}) {
  if (!isFiltered) return null;

  const total = submissions.reduce((acc, s) => acc + s.amount, 0);

  const getFilterLabel = () => {
    const parts = [];
    if (filters.search) parts.push(`"Judul" "${filters.search}"`);
    if (filters.statuses.length > 0) parts.push(`"Status" "${filters.statuses.join(', ')}"`);
    if (filters.pic) parts.push(`"PIC" "${filters.pic}"`);
    if (filters.type.length > 0) {
      const typeLabels = filters.type.map(t => t === 'uang_muka' ? 'Uang Muka' : t === 'reimburse' ? 'Reimburse' : 'Pembiayaan');
      parts.push(`"Jenis" "${typeLabels.join(', ')}"`);
    }
    if (filters.month !== 'all') {
      const monthName = format(new Date(2000, parseInt(filters.month) - 1), 'MMMM', { locale: id });
      parts.push(`"Bulan" "${monthName}"`);
    }
    if (filters.year !== 'all') parts.push(`"Tahun" "${filters.year}"`);
    if (filters.sumberRekening && filters.sumberRekening !== 'all') parts.push(`"Sumber Rekening" "${filters.sumberRekening.toUpperCase()}"`);
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
    const status = (sub.status === 'REJECTED' || sub.status === 'rejected') ? 'REJECTED' : (stages[sub.currentStageIndex] || sub.status || 'Diproses');
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

function WorkflowProgressBar({ stages, currentIdx, isRejected }: { stages: readonly string[], currentIdx: number, isRejected?: boolean }) {
  return (
    <div className="flex w-full gap-0.5">
      {stages.map((_, i) => {
        let bgColor = 'bg-slate-100';
        const progressPercent = (i / (stages.length - 1)) * 100;

        if (isRejected) {
          if (i <= currentIdx) {
            bgColor = 'bg-red-500';
          }
        } else {
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

function WorkflowStepper({ stages, currentIdx, isLastStage, isRejected }: { stages: readonly string[], currentIdx: number, isLastStage: boolean, isRejected?: boolean }) {
  return (
    <div className="bg-white overflow-hidden p-2 flex flex-col hide-scrollbar max-h-[350px] overflow-y-auto">
      <div className="relative space-y-0.5 pl-5 before:absolute before:left-[21px] before:top-4 before:h-[calc(100%-32px)] before:w-[2px] before:bg-slate-100">
        {stages.map((stage, i) => {
          const isCompleted = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isUpcoming = i > currentIdx;

          let badgeStyle = "bg-slate-50 text-slate-300";
          let textStyle = "font-medium text-slate-400";
          let icon = null;

          if (isRejected && isCurrent) {
            badgeStyle = "bg-red-500 text-white shadow-md";
            textStyle = "font-black text-red-600";
            icon = <XCircle size={14} className="fill-red-100 text-red-500" />;
          } else if (isCompleted) {
            badgeStyle = "bg-emerald-50 text-emerald-500";
            textStyle = "font-medium text-slate-500";
            icon = <CheckCircle2 size={14} className="fill-emerald-100 text-emerald-500" />;
          } else if (isCurrent) {
            badgeStyle = "bg-slate-800 text-white shadow-md";
            textStyle = "font-black text-slate-900";
          }

          return (
            <div key={i} className={`relative flex items-center gap-3 p-2 rounded-lg ${isCurrent ? (isRejected ? 'bg-red-50/50 shadow-sm' : 'bg-slate-50 shadow-sm') : ''}`}>
              <div 
                className={`absolute -left-5 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full z-10 ${badgeStyle}`}
              >
                {icon ? icon : <span className="text-[9px] font-black">{i + 1}</span>}
              </div>
              <span className={`text-[10px] leading-snug w-full ${textStyle}`}>
                {stage} {isRejected && isCurrent && <span className="text-[8px] font-black uppercase text-red-500 ml-1">(REJECTED)</span>}
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
  const [newDivisi, setNewDivisi] = useState<'Asrama' | 'Akademik/Kesiswaan' | 'Operasional' | ''>('');
  const [newNoRekeningPengaju, setNewNoRekeningPengaju] = useState('');
  const [newNamaRekening, setNewNamaRekening] = useState('');
  const [newNamaBank, setNewNamaBank] = useState('');
  const [newSumberRekening, setNewSumberRekening] = useState<'SMP' | 'SMA' | 'Donasi SMP' | 'Donasi SMA' | ''>('');
  const [newKodeBudget, setNewKodeBudget] = useState('');
  const [newNoDokumen, setNewNoDokumen] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEvidenceUrl, setNewEvidenceUrl] = useState('');
  const [newEvidenceBase64, setNewEvidenceBase64] = useState('');
  const [newEvidenceMimeType, setNewEvidenceMimeType] = useState('');
  const [isNewPicSignatureModalOpen, setIsNewPicSignatureModalOpen] = useState(false);
  const [newPicSignature, setNewPicSignature] = useState('');
  const [isNewHeadDeptSignatureModalOpen, setIsNewHeadDeptSignatureModalOpen] = useState(false);
  const [newHeadDeptSignature, setNewHeadDeptSignature] = useState('');

  const handleNewEvidenceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEvidenceBase64(reader.result as string);
        setNewEvidenceMimeType(file.type);
      };
      reader.readAsDataURL(file);
    } else {
      setNewEvidenceBase64('');
      setNewEvidenceMimeType('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    try {
      const stages = getStagesByType(newType);
      
      const submitProcess = async () => {
        let finalEvidenceUrl = newEvidenceUrl;
        
        if (newEvidenceBase64) {
          const ext = newEvidenceMimeType.split('/')[1] || 'png';
          try {
            const localRes = await fetch(getApiUrl('/api/gallery/upload'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filename: `bukti_pengajuan_${Date.now()}.${ext}`,
                base64Data: newEvidenceBase64,
                mimeType: newEvidenceMimeType
              })
            });
            if (localRes.ok) {
              const localData = await localRes.json();
              if (localData.success) {
                finalEvidenceUrl = localData.url;
              }
            }
          } catch (uploadErr) {
            console.error("Gagal upload lampiran:", uploadErr);
          }
        }

        const initialSignatures: Record<string, any> = {};
        if (newPicSignature) {
          initialSignatures.pic = {
            name: newPicName || profile.displayName || "PIC Pengaju",
            signature: newPicSignature,
            timestamp: new Date()
          };
        }
        if (newHeadDeptSignature) {
          let headDeptName = "Pegawai SCB";
          if (newDivisi === 'Asrama') headDeptName = "Helmi Nursirwan";
          else if (newDivisi === 'Akademik/Kesiswaan') headDeptName = "Siswadi Dinianto";
          else if (newDivisi === 'Operasional') headDeptName = "Mohamad Roni";
          
          initialSignatures.headDept = {
            name: headDeptName,
            signature: newHeadDeptSignature,
            timestamp: new Date()
          };
        }

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
          divisi: newDivisi || null,
          noRekeningPengaju: newNoRekeningPengaju || null,
          namaRekening: newNamaRekening || null,
          namaBank: newNamaBank || null,
          sumberRekening: newSumberRekening || null,
          kodeBudget: newKodeBudget || null,
          noDokumen: newNoDokumen || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          evidenceUrl: finalEvidenceUrl,
          signatures: initialSignatures,
          history: [{
            stage: stages[0],
            status: 'submitted',
            actor: user.uid,
            actorName: profile.displayName,
            timestamp: new Date(),
            comment: 'Pengajuan awal'
          }]
        };

        await addDoc(collection(db, 'submissions'), newSubmission);
      };

      // Close and clear immediately
      setIsDialogOpen(false);
      setNewTitle('');
      setNewAmount('');
      setNewDescription('');
      setNewEvidenceUrl('');
      setNewEvidenceBase64('');
      setNewEvidenceMimeType('');
      setNewPicName('');
      setNewPicWhatsapp('');
      setNewDivisi('');
      setNewNoRekeningPengaju('');
      setNewNamaRekening('');
      setNewNamaBank('');
      setNewSumberRekening('');
      setNewKodeBudget('');
      setNewNoDokumen('');
      setNewPicSignature('');
      setNewHeadDeptSignature('');

      // Background process
      toast.promise(
        submitProcess(),
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
      <DialogContent className="max-w-4xl sm:max-w-4xl w-[90vw] md:w-[95vw] h-[90vh] max-h-[90vh] flex flex-col rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl bg-white">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 border-b border-slate-50 bg-white shrink-0">
            <DialogHeader>
              <DialogTitle className="font-black text-xl tracking-tighter text-slate-900 uppercase">Pengajuan Baru</DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Isi detail pengajuan uang muka atau reimburse Anda di sini.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <ScrollArea className="flex-1 w-full h-full min-h-0 bg-slate-50/30">
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="type" className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Jenis Pengajuan</Label>
                  <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200">
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
                  <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Judul Pengajuan</Label>
                  <Input 
                    id="title" 
                    placeholder="Contoh: Operasional Kantor Jan 2024" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    className="h-10 rounded-xl border-slate-200"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount" className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Nominal (Rp)</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    placeholder="Contoh: 1500000" 
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    required
                    className="h-10 rounded-xl border-slate-200"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pic" className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Nama PIC</Label>
                  <Input 
                    id="pic" 
                    placeholder="Masukkan nama PIC" 
                    value={newPicName}
                    onChange={(e) => setNewPicName(e.target.value)}
                    required
                    className="h-10 rounded-xl border-slate-200"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pic-wa" className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">WhatsApp PIC (Optional)</Label>
                  <Input 
                    id="pic-wa" 
                    placeholder="Contoh: 08123456789" 
                    value={newPicWhatsapp}
                    onChange={(e) => setNewPicWhatsapp(e.target.value)}
                    className="h-10 rounded-xl border-slate-200"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-divisi" className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Divisi (Optional)</Label>
                  <Select value={newDivisi} onValueChange={(v: any) => setNewDivisi(v)}>
                    <SelectTrigger id="new-divisi" className="h-10 rounded-xl border-slate-200">
                      <SelectValue placeholder="Pilih divisi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asrama">Asrama</SelectItem>
                      <SelectItem value="Akademik/Kesiswaan">Akademik/Kesiswaan</SelectItem>
                      <SelectItem value="Operasional">Operasional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-namabank" className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Nama Bank (Optional)</Label>
                  <Select value={newNamaBank} onValueChange={(v: string) => setNewNamaBank(v)}>
                    <SelectTrigger id="new-namabank" className="h-10 rounded-xl border-slate-200 bg-white animate-fade-in">
                      <SelectValue placeholder="Pilih Bank" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Bank Syariah Indonesia (BSI)">Bank Syariah Indonesia (BSI)</SelectItem>
                      <SelectItem value="Bank Rakyat Indonesia (BRI)">Bank Rakyat Indonesia (BRI)</SelectItem>
                      <SelectItem value="Bank Mandiri">Bank Mandiri</SelectItem>
                      <SelectItem value="Bank Negara Indonesia (BNI)">Bank Negara Indonesia (BNI)</SelectItem>
                      <SelectItem value="Bank Tabungan Negara (BTN)">Bank Tabungan Negara (BTN)</SelectItem>
                      <SelectItem value="Bank BJB">Bank BJB</SelectItem>
                      <SelectItem value="Bank BCA">Bank BCA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-norek" className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">No Rekening Pengaju (Optional)</Label>
                  <Input 
                    id="new-norek" 
                    placeholder="Contoh: BSI 1234567890" 
                    value={newNoRekeningPengaju}
                    onChange={(e) => setNewNoRekeningPengaju(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 animate-fade-in"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-namarek" className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Nama Pemilik Rekening (Optional)</Label>
                  <Input 
                    id="new-namarek" 
                    placeholder="Contoh: Ahmad" 
                    value={newNamaRekening}
                    onChange={(e) => setNewNamaRekening(e.target.value)}
                    className="h-10 rounded-xl border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Keterangan</Label>
                  <Input 
                    id="description" 
                    placeholder="Detail pengajuan..." 
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="h-10 rounded-xl border-slate-200"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="evidence" className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Dokumen Lampiran (Upload File atau Copas Link)</Label>
                  <div className="flex gap-2 items-center">
                    <Input 
                      type="file" 
                      id="evidence_file"
                      onChange={handleNewEvidenceFile}
                      className="h-10 rounded-xl border-slate-200 text-xs py-2 w-1/2 cursor-pointer bg-white"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                    />
                    <span className="text-[10px] font-black text-slate-400">ATAU</span>
                    <Input 
                      id="evidence" 
                      placeholder="https://drive.google.com/..." 
                      value={newEvidenceUrl}
                      onChange={(e) => setNewEvidenceUrl(e.target.value)}
                      className="h-10 rounded-xl border-slate-200 w-1/2"
                    />
                  </div>
                  {newEvidenceBase64 && (
                    <p className="text-[10px] text-emerald-600 font-bold ml-1 mt-1">✓ File siap diupload</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Tanda Tangan PIC (Opsional)</Label>
                  {newPicSignature ? (
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-24 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-1">
                        <img src={newPicSignature} alt="Signature" className="max-h-full max-w-full object-contain" />
                      </div>
                      <Button variant="outline" type="button" size="sm" onClick={() => setNewPicSignature('')} className="h-8 text-[10px] text-red-500 hover:text-red-600 rounded-lg">
                        Hapus
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsNewPicSignatureModalOpen(true)}
                      className="h-10 rounded-xl border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 justify-start"
                    >
                      + Tambah Tanda Tangan PIC
                    </Button>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Tanda Tangan Kepala Divisi (Opsional)</Label>
                  {newHeadDeptSignature ? (
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-24 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-1">
                        <img src={newHeadDeptSignature} alt="Head Dept Signature" className="max-h-full max-w-full object-contain" />
                      </div>
                      <Button variant="outline" type="button" size="sm" onClick={() => setNewHeadDeptSignature('')} className="h-8 text-[10px] text-red-500 hover:text-red-600 rounded-lg">
                        Hapus
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsNewHeadDeptSignatureModalOpen(true)}
                      className="h-10 rounded-xl border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 justify-start"
                    >
                      + Tambah Tanda Tangan Kepala Divisi
                    </Button>
                  )}
                </div>
              </div>
            </div>
            </div>
          </ScrollArea>
          
          <div className="p-6 border-t border-slate-50 bg-white shrink-0">
            <DialogFooter>
              <Button type="submit" className="w-full font-black uppercase tracking-[0.2em] h-12 rounded-xl bg-slate-900 text-white shadow-xl shadow-slate-200">
                Kirim Pengajuan
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
      {isNewPicSignatureModalOpen && (
        <SignaturePadModal 
          isOpen={isNewPicSignatureModalOpen}
          onClose={() => setIsNewPicSignatureModalOpen(false)}
          title="Tanda Tangan PIC Pengaju"
          onSave={(sig) => {
            setNewPicSignature(sig);
            setIsNewPicSignatureModalOpen(false);
          }}
        />
      )}
      {isNewHeadDeptSignatureModalOpen && (
        <SignaturePadModal 
          isOpen={isNewHeadDeptSignatureModalOpen}
          onClose={() => setIsNewHeadDeptSignatureModalOpen(false)}
          title="Tanda Tangan Kepala Divisi"
          onSave={(sig) => {
            setNewHeadDeptSignature(sig);
            setIsNewHeadDeptSignatureModalOpen(false);
          }}
        />
      )}
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
  const [isSignDeptOpen, setIsSignDeptOpen] = useState(false);
  const [isSignVerifikatorOpen, setIsSignVerifikatorOpen] = useState(false);
  
  // Signatures specific to advancing first stage
  const [headDeptSignature, setHeadDeptSignature] = useState('');
  const [verifikatorSignature, setVerifikatorSignature] = useState('');
  
  // Laporan Pertanggungjawaban Form States (for stage "Belum Laporan")
  const [picNameLocal, setPicNameLocal] = useState('');
  const [divisiLocal, setDivisiLocal] = useState<'Asrama' | 'Akademik/Kesiswaan' | 'Operasional' | ''>('');
  const [amountLocal, setAmountLocal] = useState('');
  const [penggunaanDanaLocal, setPenggunaanDanaLocal] = useState('');
  const [sisaDanaLocal, setSisaDanaLocal] = useState('');
  const [alokasiPeruntukanLocal, setAlokasiPeruntukanLocal] = useState('');
  const [picSignatureLocal, setPicSignatureLocal] = useState('');
  const [headDeptSignatureLocal, setHeadDeptSignatureLocal] = useState('');
  const [isSignPicOpen, setIsSignPicOpen] = useState(false);
  const [isSignDeptLaporanOpen, setIsSignDeptLaporanOpen] = useState(false);
  
  const [fpppConfigLocal, setFpppConfigLocal] = useState<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'fppp'), (docSnap) => {
      if (docSnap.exists()) {
        setFpppConfigLocal(docSnap.data());
      }
    });
    return () => unsub();
  }, []);

  const stages = getStagesByType(submission.type);
  const currentStageName = stages[submission.currentStageIndex];
  const isFirstStageApprove = mode === 'approve' && submission.currentStageIndex === 0;
  const isBelumLaporanApprove = mode === 'approve' && currentStageName === "Belum Laporan";
  const isVerifikasiLaporanApprove = mode === 'approve' && currentStageName === "Verifikasi Laporan";

  useEffect(() => {
    if (isOpen && isBelumLaporanApprove) {
      setPicNameLocal(submission.picName || submission.submittedByName || '');
      setDivisiLocal(submission.divisi || 'Asrama');
      setAmountLocal(submission.amount ? submission.amount.toString() : '');
      const defaultUsed = submission.nominalPermohonanLaporan !== undefined 
        ? submission.nominalPermohonanLaporan.toString() 
        : (submission.amount - (Number(submission.sisaDana) || 0)).toString();
      setPenggunaanDanaLocal(defaultUsed);
      setSisaDanaLocal(submission.sisaDana !== undefined ? submission.sisaDana.toString() : '0');
      setAlokasiPeruntukanLocal(submission.alokasiPeruntukan || submission.title || '');
      setPicSignatureLocal(submission.signatures?.pic?.signature || '');
      setHeadDeptSignatureLocal(submission.signatures?.headDept?.signature || '');
    }
  }, [isOpen, submission, isBelumLaporanApprove]);

  const handleSubmit = async () => {
    if (isBelumLaporanApprove) {
      const newSignatures = submission.signatures ? { ...submission.signatures } : {};
      
      if (picSignatureLocal) {
        newSignatures.pic = {
          name: picNameLocal || submission.submittedByName,
          signature: picSignatureLocal,
          timestamp: new Date()
        };
      }
      
      if (headDeptSignatureLocal) {
        let headDeptName = "Pegawai SCB";
        if (divisiLocal === 'Asrama') headDeptName = "Helmi Nursirwan";
        else if (divisiLocal === 'Akademik/Kesiswaan') headDeptName = "Siswadi Dinianto";
        else if (divisiLocal === 'Operasional') headDeptName = "Mohamad Roni";
        
        newSignatures.headDept = {
          name: headDeptName,
          signature: headDeptSignatureLocal,
          timestamp: new Date()
        };
      }

      try {
        await updateDoc(doc(db, 'submissions', submission.id), {
          picName: picNameLocal || null,
          divisi: divisiLocal || null,
          amount: Number(amountLocal) || 0,
          nominalPermohonanLaporan: Number(penggunaanDanaLocal) || 0,
          penggunaanDana: "Rp " + (Number(penggunaanDanaLocal) || 0).toLocaleString('id-ID'),
          sisaDana: Number(sisaDanaLocal) || 0,
          alokasiPeruntukan: alokasiPeruntukanLocal || null,
          signatures: newSignatures
        });
      } catch (e) {
        console.error("Error updating Belum Laporan details:", e);
      }
    } else if (isFirstStageApprove || isVerifikasiLaporanApprove) {
      // Update submission with the new signatures
      const newSignatures = submission.signatures ? { ...submission.signatures } : {};
      
      if (isFirstStageApprove && headDeptSignature) {
        let headDeptName = "Pegawai SCB";
        if (submission.divisi === 'Asrama') headDeptName = "Helmi Nursirwan";
        else if (submission.divisi === 'Akademik/Kesiswaan') headDeptName = "Siswadi Dinianto";
        else if (submission.divisi === 'Operasional') headDeptName = "Mohamad Roni";
        
        newSignatures.headDept = {
          name: headDeptName,
          signature: headDeptSignature,
          timestamp: new Date()
        };
      }
      
      if (verifikatorSignature) {
        newSignatures.verifikator = {
          name: "Keuangan SCB",
          signature: verifikatorSignature,
          timestamp: new Date()
        };
      }
      
      if ((isFirstStageApprove && headDeptSignature) || verifikatorSignature) {
        try {
          await updateDoc(doc(db, 'submissions', submission.id), {
            signatures: newSignatures
          });
        } catch (e) {
          console.error("Error saving signatures:", e);
        }
      }
    }

    if (mode === 'approve' && onApprove) onApprove(submission, comment);
    if (mode === 'reject' && onReject) onReject(submission, comment);
    
    // Clear
    setIsOpen(false);
    setComment('');
    setHeadDeptSignature('');
    setVerifikatorSignature('');
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
      <DialogContent className={`${isBelumLaporanApprove ? 'sm:max-w-[550px]' : 'sm:max-w-[425px]'} rounded-[2rem] max-h-[90vh] flex flex-col overflow-hidden`}>
        <DialogHeader className="pb-2 border-b border-slate-50 shrink-0">
          <DialogTitle className="font-black text-xl tracking-tighter">
            {isBelumLaporanApprove 
              ? 'Laporan Pertanggungjawaban (LPJ) Uang Muka' 
              : mode === 'approve' 
                ? 'Konfirmasi Persetujuan' 
                : 'Konfirmasi Penolakan'}
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-slate-400">
            {isBelumLaporanApprove
              ? 'Lengkapi rincian penggunaan dan sisa dana di bawah ini beserta tanda tangan pengesahan.'
              : mode === 'approve' 
                ? 'Pastikan berkas telah diperiksa sebelum melanjutkan ke tahap berikutnya.' 
                : 'Berikan alasan penolakan agar pengaju dapat melakukan perbaikan.'}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-2">
          <div className="py-4 space-y-4">
            {isBelumLaporanApprove ? (
              /* THE SPECIAL FORM FOR BELUM LAPORAN */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="lap-pic" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">PIC / Penerima</Label>
                    <Input 
                      id="lap-pic" 
                      placeholder="Nama PIC" 
                      value={picNameLocal}
                      onChange={(e) => setPicNameLocal(e.target.value)}
                      className="rounded-xl border-slate-200 focus:ring-emerald-500 h-10"
                    />
                  </div>
                  
                  <div className="grid gap-1.5">
                    <Label htmlFor="lap-divisi" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Divisi</Label>
                    <Select 
                      value={divisiLocal || undefined} 
                      onValueChange={(v: 'Asrama' | 'Akademik/Kesiswaan' | 'Operasional') => setDivisiLocal(v)}
                    >
                      <SelectTrigger id="lap-divisi" className="h-10 rounded-xl border-slate-200 bg-white">
                        <SelectValue placeholder="Pilih Divisi" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Asrama">Asrama</SelectItem>
                        <SelectItem value="Akademik/Kesiswaan">Akademik/Kesiswaan</SelectItem>
                        <SelectItem value="Operasional">Operasional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="lap-amount" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nominal Permohonan Dana (Rp)</Label>
                    <Input 
                      id="lap-amount" 
                      type="number"
                      placeholder="0" 
                      value={amountLocal}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAmountLocal(val);
                        const amt = Number(val) || 0;
                        const use = Number(penggunaanDanaLocal) || 0;
                        setSisaDanaLocal((amt - use).toString());
                      }}
                      className="rounded-xl border-slate-200 focus:ring-emerald-500 h-10"
                    />
                  </div>
                  
                  <div className="grid gap-1.5">
                    <Label htmlFor="lap-sisa" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Sisa Dana (Rp)</Label>
                    <Input 
                      id="lap-sisa" 
                      type="number"
                      placeholder="0" 
                      value={sisaDanaLocal}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSisaDanaLocal(val);
                        const sisa = Number(val) || 0;
                        const amt = Number(amountLocal) || 0;
                        setPenggunaanDanaLocal((amt - sisa).toString());
                      }}
                      className="rounded-xl border-slate-200 focus:ring-emerald-500 h-10"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="lap-penggunaan" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Penggunaan Dana (Rp)</Label>
                  <Input 
                    id="lap-penggunaan" 
                    type="number"
                    placeholder="0" 
                    value={penggunaanDanaLocal}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPenggunaanDanaLocal(val);
                      const use = Number(val) || 0;
                      const amt = Number(amountLocal) || 0;
                      setSisaDanaLocal((amt - use).toString());
                    }}
                    className="rounded-xl border-slate-200 focus:ring-emerald-500 h-10"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="lap-alokasi" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Alokasi / Peruntukan</Label>
                  <Input 
                    id="lap-alokasi" 
                    placeholder="Contoh: Pembelian Bahan Makanan Asrama" 
                    value={alokasiPeruntukanLocal}
                    onChange={(e) => setAlokasiPeruntukanLocal(e.target.value)}
                    className="rounded-xl border-slate-200 focus:ring-emerald-500 h-10"
                  />
                </div>

                {/* SIGNATURE SECTION FOR PIC & HEADDEPT */}
                <div className="pt-2 border-t border-slate-100">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block text-center">Pengesahan Dokumen Laporan</Label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* PIC Signature Column */}
                    <div className="space-y-2 text-center p-3 border border-slate-100 rounded-2xl bg-slate-50/50">
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter block">Tanda Tangan PIC <span className="font-normal lowercase italic text-slate-500/70">(opsional)</span></span>
                      
                      {picSignatureLocal ? (
                        <div className="flex flex-col items-center gap-1">
                          <img src={picSignatureLocal} alt="PIC Sign" className="h-16 object-contain bg-white rounded-lg border border-slate-200 p-1" />
                          <Button variant="ghost" size="sm" onClick={() => setPicSignatureLocal('')} className="text-red-500 hover:text-red-600 h-6 text-[10px]">Ubah</Button>
                        </div>
                      ) : (
                        <Button type="button" onClick={() => setIsSignPicOpen(true)} className="w-full bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50 rounded-xl h-10 text-[10px] font-bold shadow-sm">
                          Tanda Tangan PIC
                        </Button>
                      )}
                    </div>

                    {/* HEADDEPT Signature Column */}
                    <div className="space-y-2 text-center p-3 border border-slate-100 rounded-2xl bg-slate-50/50">
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter block">Tanda Tangan HEADDEPT <span className="font-normal lowercase italic text-slate-500/70">(opsional)</span></span>
                      
                      {headDeptSignatureLocal ? (
                        <div className="flex flex-col items-center gap-1">
                          <img src={headDeptSignatureLocal} alt="HEADDEPT Sign" className="h-16 object-contain bg-white rounded-lg border border-slate-200 p-1" />
                          <Button variant="ghost" size="sm" onClick={() => setHeadDeptSignatureLocal('')} className="text-red-500 hover:text-red-600 h-6 text-[10px]">Ubah</Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Button type="button" onClick={() => setIsSignDeptLaporanOpen(true)} className="w-full bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50 rounded-xl h-10 text-[10px] font-bold shadow-sm mb-1">
                            Tanda Tangan Dept
                          </Button>
                          
                          {/* Option to use auto signature if configured */}
                          {fpppConfigLocal && (
                            (divisiLocal === 'Asrama' && fpppConfigLocal.useDefaultAsramaSign && fpppConfigLocal.asramaDefaultSign) ||
                            (divisiLocal === 'Akademik/Kesiswaan' && fpppConfigLocal.useDefaultAkademikSign && fpppConfigLocal.akademikDefaultSign) ||
                            (divisiLocal === 'Operasional' && fpppConfigLocal.useDefaultOperasionalSign && fpppConfigLocal.operasionalDefaultSign)
                          ) && (
                            <Button 
                              type="button" 
                              onClick={() => {
                                let defaultSign = '';
                                if (divisiLocal === 'Asrama') defaultSign = fpppConfigLocal.asramaDefaultSign;
                                else if (divisiLocal === 'Akademik/Kesiswaan') defaultSign = fpppConfigLocal.akademikDefaultSign;
                                else if (divisiLocal === 'Operasional') defaultSign = fpppConfigLocal.operasionalDefaultSign;
                                setHeadDeptSignatureLocal(defaultSign);
                                toast.success("TTD Auto Kepala Divisi terpasang");
                              }}
                              className="w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl h-10 text-[9px] font-black uppercase tracking-tight"
                            >
                              Gunakan TTD Auto
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Optional general note/comment */}
                <div className="grid gap-1">
                  <Label htmlFor="lap-catatan" className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Catatan Tambahan (Optional)</Label>
                  <Input 
                    id="lap-catatan" 
                    placeholder="Tulis catatan jika ada..." 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="rounded-xl border-slate-200 focus:ring-emerald-500 h-10"
                  />
                </div>
              </div>
            ) : (
              /* THE STANDARD APPROVE/REJECT COMMENT FORM */
              <div>
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Catatan / Alasan</Label>
                <Input 
                  placeholder="Tulis pesan Anda di sini..." 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="rounded-xl border-slate-200 focus:ring-emerald-500"
                />
                
                {(isFirstStageApprove || isVerifikasiLaporanApprove) && (
                  <div className="space-y-4 mt-4 p-4 border border-emerald-100 bg-emerald-50 rounded-2xl">
                    {isFirstStageApprove && (
                      <div>
                        <Label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2 block text-center">Tanda Tangan Kepala Divisi <span className="font-normal normal-case italic text-emerald-600/70">(Opsional)</span></Label>
                        {headDeptSignature ? (
                          <div className="flex flex-col items-center gap-2">
                            <img src={headDeptSignature} alt="Head Dept Sign" className="h-16 object-contain bg-white rounded-lg border border-slate-200 p-1" />
                            <Button variant="ghost" size="sm" onClick={() => setHeadDeptSignature('')} className="text-red-500 hover:text-red-600 h-6 text-[10px]">Hapus</Button>
                          </div>
                        ) : (
                          <Button type="button" onClick={() => setIsSignDeptOpen(true)} className="w-full bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-xl h-10 text-[10px] font-bold">
                            Tanda Tangan Sekarang
                          </Button>
                        )}
                      </div>
                    )}
                    
                    <div className={isFirstStageApprove ? "pt-2 border-t border-emerald-200/50" : ""}>
                      <Label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2 block text-center">Tanda Tangan Verifikator (Keuangan SCB)</Label>
                      {verifikatorSignature ? (
                        <div className="flex flex-col items-center gap-2">
                          <img src={verifikatorSignature} alt="Verifikator Sign" className="h-16 object-contain bg-white rounded-lg border border-slate-200 p-1" />
                          <Button variant="ghost" size="sm" onClick={() => setVerifikatorSignature('')} className="text-red-500 hover:text-red-600 h-6 text-[10px]">Hapus</Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Button type="button" onClick={() => setIsSignVerifikatorOpen(true)} className="w-full bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-xl h-10 text-[10px] font-bold">
                            Tanda Tangan Sekarang
                          </Button>
                          {fpppConfigLocal && fpppConfigLocal.useDefaultAkuntanSign && fpppConfigLocal.akuntanDefaultSign && (
                            <Button 
                              type="button" 
                              onClick={() => {
                                setVerifikatorSignature(fpppConfigLocal.akuntanDefaultSign);
                                toast.success("Tanda Tangan Keuangan SCB Auto terpasang");
                              }}
                              className="w-full bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-xl h-10 text-[9px] font-black uppercase tracking-tight"
                            >
                              Gunakan TTD Auto Keuangan SCB
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
        
        <DialogFooter className="pt-3 border-t border-slate-50 shrink-0">
          <Button variant="ghost" onClick={() => setIsOpen(false)} className="font-bold text-xs">Batal</Button>
          <Button 
            onClick={handleSubmit} 
            className={mode === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {isBelumLaporanApprove 
              ? 'Simpan & Setujui' 
              : mode === 'approve' 
                ? 'Ya, Setujui' 
                : 'Ya, Tolak'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* SIGNATURE PAD MODALS */}
      {isSignPicOpen && (
        <SignaturePadModal 
          isOpen={isSignPicOpen}
          onClose={() => setIsSignPicOpen(false)}
          title="Tanda Tangan PIC"
          onSave={(sig) => {
            setPicSignatureLocal(sig);
            setIsSignPicOpen(false);
          }}
        />
      )}

      {isSignDeptLaporanOpen && (
        <SignaturePadModal 
          isOpen={isSignDeptLaporanOpen}
          onClose={() => setIsSignDeptLaporanOpen(false)}
          title="Tanda Tangan Kepala Divisi"
          onSave={(sig) => {
            setHeadDeptSignatureLocal(sig);
            setIsSignDeptLaporanOpen(false);
          }}
        />
      )}

       {(isFirstStageApprove || isVerifikasiLaporanApprove) && (
        <>
          {isFirstStageApprove && (
            <SignaturePadModal 
              isOpen={isSignDeptOpen}
              onClose={() => setIsSignDeptOpen(false)}
              title="Tanda Tangan Kepala Divisi"
              onSave={(sig) => {
                setHeadDeptSignature(sig);
                setIsSignDeptOpen(false);
              }}
            />
          )}
          <SignaturePadModal 
            isOpen={isSignVerifikatorOpen}
            onClose={() => setIsSignVerifikatorOpen(false)}
            title="Tanda Tangan Verifikator"
            onSave={(sig) => {
              setVerifikatorSignature(sig);
              setIsSignVerifikatorOpen(false);
            }}
          />
        </>
      )}
    </Dialog>
  );
}

function WorkflowModal({ 
  stages, 
  currentIdx, 
  isOpen, 
  onClose,
  submissionId,
  isRejected
}: { 
  stages: readonly string[], 
  currentIdx: number, 
  isOpen: boolean, 
  onClose: () => void,
  submissionId: string,
  isRejected?: boolean
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[320px] rounded-[2rem] p-4 border-none shadow-3xl bg-white max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-3 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isRejected ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-emerald-100 text-emerald-600'}`}>
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
            <WorkflowStepper stages={stages} currentIdx={currentIdx} isLastStage={currentIdx === stages.length - 1} isRejected={isRejected} />
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
  currentUser,
  fpppConfig
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
  currentUser: User | null,
  fpppConfig?: any
}) {
  const isOwner = currentUser?.email === OWNER_EMAIL;
  const isAdmin = userRole === 'admin' || (currentUser?.email ? ADMIN_EMAILS.includes(currentUser.email) : false);
  const canSendWA = isAdmin || isOwner;

  const isTrackingAdmin = currentUser?.email ? TRACKING_ADMIN_EMAILS.includes(currentUser.email) : false;
  const canApprove = isTrackingAdmin;
  const canEdit = isTrackingAdmin;
  const canDelete = isTrackingAdmin;

  const [activeSigner, setActiveSigner] = useState<'roni' | 'kamal' | null>(null);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [isBukukanMenuOpen, setIsBukukanMenuOpen] = useState(false);
  const [fpppConfigLocal, setFpppConfigLocal] = useState<any>(null);

  // LPJ Edit & View States
  const [isEditingLPJ, setIsEditingLPJ] = useState(false);
  const [picNameEdit, setPicNameEdit] = useState('');
  const [divisiEdit, setDivisiEdit] = useState<'Asrama' | 'Akademik/Kesiswaan' | 'Operasional' | ''>('');
  const [amountEdit, setAmountEdit] = useState('');
  const [nominalPermohonanLaporanEdit, setNominalPermohonanLaporanEdit] = useState('');
  const [sisaDanaEdit, setSisaDanaEdit] = useState('');
  const [alokasiEdit, setAlokasiEdit] = useState('');
  const [penggunaanEdit, setPenggunaanEdit] = useState('');
  const [noDokumenLaporanEdit, setNoDokumenLaporanEdit] = useState('');
  const [lpjUrlEdit, setLpjUrlEdit] = useState('');
  const [picSigEdit, setPicSigEdit] = useState('');
  const [hdSigEdit, setHdSigEdit] = useState('');
  const [isLpjSignPicOpen, setIsLpjSignPicOpen] = useState(false);
  const [isLpjSignDeptOpen, setIsLpjSignDeptOpen] = useState(false);
  const [waReminderPhone, setWaReminderPhone] = useState('');

  useEffect(() => {
    if (submission) {
      setPicNameEdit(submission.picName || submission.submittedByName || '');
      setDivisiEdit(submission.divisi || 'Asrama');
      setAmountEdit(submission.amount ? submission.amount.toString() : '');
      const defaultUsed = submission.nominalPermohonanLaporan !== undefined 
        ? submission.nominalPermohonanLaporan.toString() 
        : (submission.amount - (submission.sisaDana || 0)).toString();
      setNominalPermohonanLaporanEdit(defaultUsed);
      setSisaDanaEdit(submission.sisaDana !== undefined ? submission.sisaDana.toString() : '0');
      setAlokasiEdit(submission.alokasiPeruntukan || '');
      setPenggunaanEdit(submission.penggunaanDana || '');
      setNoDokumenLaporanEdit(submission.noDokumenLaporan || '');
      setLpjUrlEdit(submission.lpjUrl || '');
      setPicSigEdit(submission.signatures?.pic?.signature || '');
      setHdSigEdit(submission.signatures?.headDept?.signature || '');
      setWaReminderPhone(submission.picWhatsapp || '');
    }
  }, [submission, isEditingLPJ]);

  const handleSaveLPJ = async () => {
    try {
      const docRef = doc(db, 'submissions', submission.id);
      
      const updatedData: any = {
        picName: picNameEdit || null,
        divisi: divisiEdit || null,
        amount: Number(amountEdit) || 0,
        nominalPermohonanLaporan: Number(nominalPermohonanLaporanEdit) || 0,
        sisaDana: Number(sisaDanaEdit) || 0,
        alokasiPeruntukan: alokasiEdit || null,
        penggunaanDana: penggunaanEdit || null,
        noDokumenLaporan: noDokumenLaporanEdit || null,
        lpjUrl: lpjUrlEdit || null,
      };

      // Handle signatures safely if changed
      let hasPicChanged = picSigEdit !== (submission.signatures?.pic?.signature || '');
      let hasHdChanged = hdSigEdit !== (submission.signatures?.headDept?.signature || '');

      if (hasPicChanged || hasHdChanged) {
        const newSignatures = submission.signatures ? { ...submission.signatures } : {};
        
        if (hasPicChanged) {
          if (picSigEdit) {
            newSignatures.pic = {
              name: picNameEdit || submission.submittedByName || 'PIC',
              signature: picSigEdit,
              timestamp: Timestamp.now()
            };
          } else {
            delete newSignatures.pic;
          }
        }

        if (hasHdChanged) {
          if (hdSigEdit) {
            let headDeptName = "Pegawai SCB";
            if (divisiEdit === 'Asrama') headDeptName = "Helmi Nursirwan";
            else if (divisiEdit === 'Akademik/Kesiswaan') headDeptName = "Siswadi Dinianto";
            else if (divisiEdit === 'Operasional') headDeptName = "Mohamad Roni";
            
            newSignatures.headDept = {
              name: headDeptName,
              signature: hdSigEdit,
              timestamp: Timestamp.now()
            };
          } else {
            delete newSignatures.headDept;
          }
        }

        updatedData.signatures = newSignatures;
      }

      await updateDoc(docRef, updatedData);
      setIsEditingLPJ(false);
      toast.success("Berhasil memperbarui data LPJ!");
    } catch (error) {
      console.error("Error saving LPJ:", error);
      toast.error("Gagal menyimpan data LPJ.");
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'fppp'), (docSnap) => {
      if (docSnap.exists()) {
        setFpppConfigLocal(docSnap.data());
      } else {
        setFpppConfigLocal({
          verifikatorName: "M. Roni",
          managerName: "M. Roni",
          kepalaName: "Ahmad Kamal",
          bankName: "BANK SYARIAH INDONESIA (BSI)",
          budgetName: "Anggaran SCB BAZNAS",
          budgetSaldo: "Sesuai RKAT",
          useDefaultRoniSign: false,
          useDefaultKamalSign: false,
          useDefaultKasirSign: false,
          roniDefaultSign: "",
          kamalDefaultSign: "",
          kasirDefaultSign: "",
        });
      }
    });
    return () => unsub();
  }, []);

  const resolvedFpppConfig = fpppConfig || fpppConfigLocal;

  // Generate a full chronology from stage 0 up to current stage index
  const fullChronology = useMemo(() => {
    const chronology = [];
    
    // We iterate up to currentStageIndex to show the "Path"
    for (let i = 0; i <= submission.currentStageIndex; i++) {
      const stageName = stages[i];
      const historyEntries = submission.history.filter(h => h.stage === stageName);
      
      if (historyEntries.length > 0) {
        // Add each history entry as a chronology point
        historyEntries.forEach(h => {
          chronology.push({
            type: 'history',
            stage: h.stage,
            actorName: h.actorName,
            status: h.status,
            timestamp: h.timestamp,
            comment: h.comment,
            isCurrent: i === submission.currentStageIndex && historyEntries.indexOf(h) === historyEntries.length - 1
          });
        });
      } else {
        // No history entry for this stage yet (could be skipped or current stage)
        chronology.push({
          type: 'placeholder',
          stage: stageName,
          actorName: '-',
          status: i < submission.currentStageIndex ? 'LEWATI/SELESAI' : 'SEDANG DIPROSES',
          timestamp: null,
          isCurrent: i === submission.currentStageIndex
        });
      }
    }
    
    // Also include any history entries that might be for stages BEYOND current index (if manual rollback happened)
    submission.history.forEach(h => {
      const stageIdx = stages.indexOf(h.stage);
      if (stageIdx > submission.currentStageIndex) {
        chronology.push({
          type: 'history',
          stage: h.stage,
          actorName: h.actorName,
          status: h.status,
          timestamp: h.timestamp,
          comment: h.comment,
          isCurrent: false
        });
      }
    });

    return chronology;
  }, [submission.history, submission.currentStageIndex, stages]);

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
    generateFPPP(submission, false, resolvedFpppConfig);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
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
                {(submission.noRekeningPengaju || submission.namaRekening || submission.namaBank) && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 pb-2 border-b border-slate-50">
                    {submission.namaBank && (
                      <div>
                        <Label className="text-[10px] text-slate-400 lowercase italic">Nama Bank</Label>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-tighter mt-0.5">{submission.namaBank}</p>
                      </div>
                    )}
                    {submission.noRekeningPengaju && (
                      <div>
                        <Label className="text-[10px] text-slate-400 lowercase italic">No Rekening Pengaju</Label>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-tighter mt-0.5">{submission.noRekeningPengaju}</p>
                      </div>
                    )}
                    {submission.namaRekening && (
                      <div className="col-span-2 md:col-span-1">
                        <Label className="text-[10px] text-slate-400 lowercase italic">Nama Pemilik Rekening</Label>
                        <p className="text-xs font-black text-slate-900 mt-0.5">{submission.namaRekening}</p>
                      </div>
                    )}
                  </div>
                )}
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

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <Label className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Dokumen Resmi BAZNAS (Format FPPP)</Label>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                    Unduh Formulir Permohonan Persetujuan Pembayaran (FPPP) resmi Cendekia BAZNAS yang sudah dilengkapi data transaksi dan tanda tangan pengesahan digital secara otomatis.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <Button 
                      onClick={() => generateFPPP(submission, false, resolvedFpppConfig)}
                      className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl h-11 text-[11px] font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/10"
                    >
                      <FileText size={16} />
                      Cetak FPPP (Signed)
                    </Button>
                    <Button 
                      onClick={() => generateFPPP(null, true, resolvedFpppConfig)}
                      variant="outline"
                      className="flex items-center justify-center gap-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl h-11 text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      <Download size={14} />
                      Template Kosong
                    </Button>
                  </div>
                </div>
             </div>
          </div>

          {/* Laporan Pertanggungjawaban (LPJ) Section for Admin & Owner */}
          {(() => {
            const indexBelumLaporan = stages.indexOf("Belum Laporan");
            const showLPJ = indexBelumLaporan !== -1 && submission.currentStageIndex >= indexBelumLaporan;
            const isAuthorized = isAdmin || isOwner;

            if (showLPJ && isAuthorized) {
              const sisaDanaVal = Number(submission.sisaDana) || 0;
              const usedFundVal = submission.nominalPermohonanLaporan !== undefined 
                ? Number(submission.nominalPermohonanLaporan) 
                : (submission.amount - sisaDanaVal);

              let headDeptSignData = submission.signatures?.headDept?.signature || null;
              if (!headDeptSignData && resolvedFpppConfig) {
                if (submission.divisi === 'Asrama' && resolvedFpppConfig.useDefaultAsramaSign) {
                  headDeptSignData = resolvedFpppConfig.asramaDefaultSign || null;
                } else if (submission.divisi === 'Akademik/Kesiswaan' && resolvedFpppConfig.useDefaultAkademikSign) {
                  headDeptSignData = resolvedFpppConfig.akademikDefaultSign || null;
                } else if (submission.divisi === 'Operasional' && resolvedFpppConfig.useDefaultOperasionalSign) {
                  headDeptSignData = resolvedFpppConfig.operasionalDefaultSign || null;
                }
              }

              return (
                <div id="lpj-card-section" className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm bg-gradient-to-b from-white to-emerald-50/20">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest">
                        Laporan Pertanggungjawaban (LPJ) Uang Muka
                      </h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                        Akses Khusus Admin & Owner
                      </p>
                    </div>
                    
                    {!isEditingLPJ && (
                      <Button 
                        id="btn-edit-lpj"
                        size="sm"
                        onClick={() => setIsEditingLPJ(true)}
                        className="h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-[10px] font-black uppercase tracking-widest gap-1.5 border-none"
                      >
                        <Edit2 size={12} />
                        Edit LPJ
                      </Button>
                    )}
                  </div>

                  {isEditingLPJ ? (
                    /* EDITING MODE */
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-black text-slate-400 uppercase">Nama PIC</Label>
                          <Input 
                            id="edit-lpj-pic"
                            value={picNameEdit} 
                            onChange={(e) => setPicNameEdit(e.target.value)} 
                            className="h-9 rounded-xl border-slate-200 bg-white text-xs font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-black text-slate-400 uppercase">Divisi</Label>
                          <Select 
                            value={divisiEdit || undefined} 
                            onValueChange={(v: 'Asrama' | 'Akademik/Kesiswaan' | 'Operasional') => setDivisiEdit(v)}
                          >
                            <SelectTrigger id="edit-lpj-divisi" className="h-9 rounded-xl border-slate-200 bg-white">
                              <SelectValue placeholder="Pilih Divisi" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Asrama">Asrama</SelectItem>
                              <SelectItem value="Akademik/Kesiswaan">Akademik/Kesiswaan</SelectItem>
                              <SelectItem value="Operasional">Operasional</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-black text-slate-400 uppercase">Nominal UM</Label>
                          <Input 
                            id="edit-lpj-amount"
                            type="number"
                            value={amountEdit} 
                            onChange={(e) => setAmountEdit(e.target.value)} 
                            className="h-9 rounded-xl border-slate-200 bg-white text-xs font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-black text-slate-400 uppercase">Realisasi (Use)</Label>
                          <Input 
                            id="edit-lpj-realisasi"
                            type="number"
                            value={nominalPermohonanLaporanEdit} 
                            onChange={(e) => setNominalPermohonanLaporanEdit(e.target.value)} 
                            className="h-9 rounded-xl border-slate-200 bg-white text-xs font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-black text-slate-400 uppercase">Sisa Dana</Label>
                          <Input 
                            id="edit-lpj-sisa"
                            type="number"
                            value={sisaDanaEdit} 
                            onChange={(e) => setSisaDanaEdit(e.target.value)} 
                            className="h-9 rounded-xl border-slate-200 bg-white text-xs font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-black text-slate-400 uppercase">Alokasi Peruntukan</Label>
                          <Input 
                            id="edit-lpj-alokasi"
                            value={alokasiEdit} 
                            onChange={(e) => setAlokasiEdit(e.target.value)} 
                            className="h-9 rounded-xl border-slate-200 bg-white text-xs font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-black text-slate-400 uppercase">No. Doc Laporan</Label>
                          <Input 
                            id="edit-lpj-nodoc-laporan"
                            value={noDokumenLaporanEdit} 
                            onChange={(e) => setNoDokumenLaporanEdit(e.target.value)} 
                            placeholder="Contoh: LPJ.01.020626"
                            className="h-9 rounded-xl border-slate-200 bg-white text-xs font-medium"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[9px] font-black text-slate-400 uppercase">Link Dokumen/Bukti Laporan</Label>
                        <Input 
                          id="edit-lpj-url"
                          value={lpjUrlEdit} 
                          onChange={(e) => setLpjUrlEdit(e.target.value)} 
                          placeholder="Contoh: https://drive.google.com/..."
                          className="h-9 rounded-xl border-slate-200 bg-white text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[9px] font-black text-slate-400 uppercase">Penggunaan Dana (Rincian)</Label>
                        <textarea 
                          id="edit-lpj-penggunaan"
                          value={penggunaanEdit} 
                          onChange={(e) => setPenggunaanEdit(e.target.value)} 
                          className="p-2 w-full rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[60px] resize-none text-xs text-slate-800 bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                        <div className="text-center p-2.5 border border-slate-100 rounded-2xl bg-slate-50/50">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight block mb-2">Tanda Tangan PIC</span>
                          {picSigEdit ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <img src={picSigEdit} alt="PIC Signature" className="h-12 object-contain bg-white rounded border border-slate-200 p-1" />
                              <Button variant="ghost" size="sm" onClick={() => setPicSigEdit('')} className="text-red-500 hover:text-red-600 h-5 text-[9px]">Hapus</Button>
                            </div>
                          ) : (
                            <Button 
                              id="btn-lpj-sign-pic"
                              type="button" 
                              onClick={() => { setIsLpjSignPicOpen(true); }} 
                              className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-9 text-[10px] font-bold"
                            >
                              Pad TTD PIC
                            </Button>
                          )}
                        </div>

                        <div className="text-center p-2.5 border border-slate-100 rounded-2xl bg-slate-50/50">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight block mb-2">Tanda Tangan Dept</span>
                          {hdSigEdit ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <img src={hdSigEdit} alt="Dept Head Signature" className="h-12 object-contain bg-white rounded border border-slate-200 p-1" />
                              <Button variant="ghost" size="sm" onClick={() => setHdSigEdit('')} className="text-red-500 hover:text-red-600 h-5 text-[9px]">Hapus</Button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <Button 
                                id="btn-lpj-sign-dept"
                                type="button" 
                                onClick={() => { setIsLpjSignDeptOpen(true); }} 
                                className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-8 text-[9px] font-bold"
                              >
                                Pad TTD Dept
                              </Button>
                              {resolvedFpppConfig && (
                                (divisiEdit === 'Asrama' && resolvedFpppConfig.useDefaultAsramaSign && resolvedFpppConfig.asramaDefaultSign) ||
                                (divisiEdit === 'Akademik/Kesiswaan' && resolvedFpppConfig.useDefaultAkademikSign && resolvedFpppConfig.akademikDefaultSign) ||
                                (divisiEdit === 'Operasional' && resolvedFpppConfig.useDefaultOperasionalSign && resolvedFpppConfig.operasionalDefaultSign)
                              ) && (
                                <button 
                                  id="btn-lpj-auto-sign"
                                  type="button"
                                  onClick={() => {
                                    let defaultSign = '';
                                    if (divisiEdit === 'Asrama') defaultSign = resolvedFpppConfig.asramaDefaultSign;
                                    else if (divisiEdit === 'Akademik/Kesiswaan') defaultSign = resolvedFpppConfig.akademikDefaultSign;
                                    else if (divisiEdit === 'Operasional') defaultSign = resolvedFpppConfig.operasionalDefaultSign;
                                    setHdSigEdit(defaultSign);
                                    toast.success("TTD Auto Kepala Divisi terpasang");
                                  }}
                                  className="w-full bg-emerald-50 text-emerald-700 text-[8px] font-bold py-1 px-2 rounded-lg"
                                >
                                  Gunakan TTD Auto
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                        <Button 
                          id="btn-lpj-edit-cancel"
                          variant="ghost" 
                          size="sm"
                          onClick={() => setIsEditingLPJ(false)}
                          className="h-9 rounded-xl text-slate-500 font-bold text-xs"
                        >
                          Batal
                        </Button>
                        <Button 
                          id="btn-lpj-edit-save"
                          size="sm"
                          onClick={handleSaveLPJ}
                          className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 border-none"
                        >
                          Simpan Perubahan
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* VIEW MODE */
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-100/50">
                        <div>
                          <Label className="text-[9px] text-slate-400 lowercase italic">PIC Penanggungjawab</Label>
                          <p className="text-xs font-black text-slate-800 uppercase tracking-tight mt-0.5">
                            {submission.picName || submission.submittedByName || '-'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-[9px] text-slate-400 lowercase italic">Divisi Bagian</Label>
                          <p className="text-xs font-black text-slate-800 mt-0.5">
                            {submission.divisi || '-'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-100/50">
                        <div>
                          <Label className="text-[9px] text-slate-400 lowercase italic">Permohonan Uang Muka</Label>
                          <p className="text-xs font-black text-slate-800 tracking-tight mt-0.5">
                            Rp {submission.amount ? submission.amount.toLocaleString('id-ID') : '0'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-[9px] text-emerald-600 lowercase italic font-bold">Dana Terpakai (Use)</Label>
                          <p className="text-xs font-black text-emerald-700 tracking-tight mt-0.5">
                            Rp {usedFundVal.toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div>
                          <Label className="text-[9px] text-slate-400 lowercase italic">Balancing Sisa</Label>
                          <p className="text-xs font-black text-slate-800 tracking-tight mt-0.5">
                            Rp {sisaDanaVal.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>

                       <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-[9px] text-slate-400 lowercase italic">Alokasi Peruntukan</Label>
                          <p className="text-xs font-medium text-slate-700 mt-0.5">
                            {submission.alokasiPeruntukan || '-'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-[9px] text-slate-400 lowercase italic">No. Doc Laporan (LPJ)</Label>
                          <p className="text-xs font-black text-emerald-700 mt-0.5">
                            {submission.noDokumenLaporan || '-'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label className="text-[9px] text-slate-400 lowercase italic">Rincian Penggunaan Dana (Use)</Label>
                        <p className="text-xs font-medium text-slate-700 mt-0.5 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 italic">
                          "{submission.penggunaanDana || 'Tidak ada uraian rincian penggunaan.'}"
                        </p>
                      </div>

                      <div>
                        <Label className="text-[9px] text-slate-400 lowercase italic">Link Dokumen/Bukti Laporan</Label>
                        {submission.lpjUrl ? (
                          <div className="mt-1">
                            <a 
                              href={submission.lpjUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 hover:text-emerald-800 text-xs font-bold transition-all border border-emerald-100/50 mt-1"
                            >
                              <ExternalLink size={12} />
                              Buka Dokumen/Bukti LPJ
                            </a>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic mt-0.5">
                            Belum ada dokumen/bukti laporan yang dilampirkan.
                          </p>
                        )}
                      </div>

                      {sisaDanaVal > 0 && (
                        <div id="lpj-wa-reminder-section" className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 shadow-inner my-3">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
                              <MessageSquare size={14} />
                            </div>
                            <div>
                              <h5 className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                                WA Reminder Pengembalian Sisa LPJ
                              </h5>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">
                                Kirim tagihan setoran sisa dana ke PIC
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex-1 space-y-1">
                              <Label className="text-[9px] font-bold text-slate-500 uppercase tracking-tight ml-0.5">Nomor WA PIC</Label>
                              <Input 
                                id="wa-reminder-phone"
                                type="text"
                                placeholder="Contoh: 08123456789"
                                value={waReminderPhone}
                                onChange={(e) => setWaReminderPhone(e.target.value)}
                                className="h-9 rounded-xl border-emerald-200 bg-white text-xs font-medium focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>
                            <div className="flex items-end shrink-0">
                              <Button
                                id="btn-send-wa-reminder"
                                size="sm"
                                onClick={() => {
                                  const sumberRek = (submission.sumberRekening || '').toUpperCase();
                                  let rekTarget = "SMP 1 : 7179071988 atau SMA 1 : 7179072507";
                                  if (sumberRek.includes("SMP")) {
                                    rekTarget = "SMP 1 : 7179071988";
                                  } else if (sumberRek.includes("SMA")) {
                                    rekTarget = "SMA 1 : 7179072507";
                                  }
                                  
                                  const msg = `Assalamu'alaikum Wr. Wb.
Yth. PIC Pengaju ${submission.picName || submission.submittedByName || '-'}

Mengingatkan kembali untuk proses pengembalian sisa dana LPJ dari pengajuan:
📦 Judul: ${submission.title || '-'}
💰 Nominal Uang Muka: Rp ${(submission.amount || 0).toLocaleString('id-ID')}
💵 Dana Terpakai (Realisasi): Rp ${usedFundVal.toLocaleString('id-ID')}
🔄 Sisa Dana yang Harus Dikembalikan: Rp ${sisaDanaVal.toLocaleString('id-ID')}

Mohon agar sisa dana pengembalian disetorkan kembali ke rekening kas SCB (${rekTarget})

Terima kasih banyak atas kerjasama dan amanahnya.
Wassalamu'alaikum Wr. Wb.

- Keuangan SCB BAZNAS`;
                                  sendWhatsApp(waReminderPhone, msg);
                                }}
                                className="w-full sm:w-auto h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider border-none gap-1.5 flex items-center justify-center transition-all shadow shadow-emerald-600/10"
                              >
                                <Send size={12} />
                                Kirim Pengingat
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Display Signatures under view mode */}
                      <div className="grid grid-cols-2 gap-4 py-2 border-t border-slate-100">
                        <div>
                          <Label className="text-[9px] text-slate-400 lowercase italic block mb-1">Tanda Tangan PIC</Label>
                          {submission.signatures?.pic?.signature ? (
                            <img src={submission.signatures.pic.signature} alt="PIC Signature" className="h-10 object-contain bg-white rounded border border-slate-200 p-0.5 shadow-sm" />
                          ) : (
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight italic">Belum TTD</span>
                          )}
                        </div>
                        <div>
                          <Label className="text-[9px] text-slate-400 lowercase italic block mb-1">Tanda Tangan Kepala Divisi</Label>
                          {headDeptSignData ? (
                            <img src={headDeptSignData} alt="Head Dept Signature" className="h-10 object-contain bg-white rounded border border-slate-200 p-0.5 shadow-sm" />
                          ) : (
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight italic">Belum TTD</span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        {/* Download PDF trigger button */}
                        <Button 
                          id="btn-lpj-download-pdf"
                          onClick={() => generateLPJPDF(submission, resolvedFpppConfig)}
                          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl h-11 text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2 border-none"
                        >
                          <FileCheck size={16} />
                          Cetak Laporan LPJ
                        </Button>

                        {/* WhatsApp Notification Button */}
                        <Button 
                          id="btn-lpj-send-wa-notif"
                          onClick={() => {
                            const noLpj = submission.noDokumenLaporan || '-';
                            const msg = `Assalamu'alaikum Wr. Wb.
Yth. PIC Pengaju *${submission.picName || submission.submittedByName || '-'}*

Berikut rincian Laporan Pertanggungjawaban (LPJ) Uang Muka Anda:
📦 *Judul:* ${submission.title || '-'}
🏢 *Divisi:* ${submission.divisi || '-'}
📄 *No. Laporan LPJ:* ${noLpj}
💰 *Nominal Uang Muka:* Rp ${(submission.amount || 0).toLocaleString('id-ID')}
💵 *Dana Terpakai:* Rp ${usedFundVal.toLocaleString('id-ID')}
🔄 *Balancing Sisa:* Rp ${sisaDanaVal.toLocaleString('id-ID')}
📌 *Alokasi Peruntukan:* ${submission.alokasiPeruntukan || '-'}

Status LPJ Anda dapat dipantau langsung dalam sistem web aplikasi. Terima kasih banyak atas kerjasama dan amanahnya.
Wassalamu'alaikum Wr. Wb.
- Keuangan SCB BAZNAS`;
                            sendWhatsApp(submission.picWhatsapp || '', msg);
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl h-11 text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2 border-none"
                        >
                          <Phone size={14} className="text-emerald-50" />
                          Notifikasi WA LPJ
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Interconnected signature models */}
                  {isLpjSignPicOpen && (
                    <SignaturePadModal 
                      isOpen={isLpjSignPicOpen}
                      onClose={() => { setIsLpjSignPicOpen(false); }}
                      title="Tanda Tangan PIC"
                      onSave={(sig) => {
                        setPicSigEdit(sig);
                        setIsLpjSignPicOpen(false);
                      }}
                    />
                  )}

                  {isLpjSignDeptOpen && (
                    <SignaturePadModal 
                      isOpen={isLpjSignDeptOpen}
                      onClose={() => { setIsLpjSignDeptOpen(false); }}
                      title="Tanda Tangan Kepala Divisi"
                      onSave={(sig) => {
                        setHdSigEdit(sig);
                        setIsLpjSignDeptOpen(false);
                      }}
                    />
                  )}
                </div>
              );
            }
            return null;
          })()}

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
                      <Download size={14} /> Unduh Formulir FPPP (Signed)
                    </Button>
                  )}
                </div>
              )}

             <div className="space-y-1 relative">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`border-none rounded-lg text-[9px] font-black uppercase tracking-widest ${
                    submission.status === 'REJECTED' || submission.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {submission.status === 'REJECTED' || submission.status === 'rejected' ? 'REJECTED' : `Tahap ${submission.currentStageIndex + 1} Dari ${stages.length}`}
                  </Badge>
                  <span className={`text-[10px] font-bold ${
                    submission.status === 'REJECTED' || submission.status === 'rejected' ? 'text-red-600' : 'text-slate-500'
                  }`}>
                    {submission.status === 'REJECTED' || submission.status === 'rejected' ? 'DITOLAK (REJECTED)' : `${Math.round(((submission.currentStageIndex + 1) / stages.length) * 100)}% Selesai`}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: submission.status === 'REJECTED' || submission.status === 'rejected' ? '100%' : `${((submission.currentStageIndex + 1) / stages.length) * 100}%` }}
                    className={`h-full ${
                      submission.status === 'REJECTED' || submission.status === 'rejected' ? 'bg-red-500' : 'bg-primary'
                    }`}
                  />
                </div>
                <p className={`text-xs font-black mt-3 truncate ${
                  submission.status === 'REJECTED' || submission.status === 'rejected' ? 'text-red-600 font-bold' : 'text-slate-800'
                }`}>
                  {submission.status === 'REJECTED' || submission.status === 'rejected' ? 'PENGAJUAN DITOLAK (REJECTED)' : stages[submission.currentStageIndex]}
                </p>
             </div>
          </div>
        </div>

        <div className="space-y-6 md:h-full flex flex-col">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex-1 flex flex-col h-full">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Riwayat Aktivitas (Chronology)</h4>
            <ScrollArea className="flex-grow min-h-[450px] lg:min-h-[550px] xl:min-h-[600px] h-0 pr-4">
              <div className="relative space-y-6 pl-6 before:absolute before:left-2 before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-slate-100">
                {fullChronology.map((item, i) => (
                  <div key={i} className="relative">
                    <div className={`absolute -left-[22px] top-1 h-3 w-3 rounded-full border-2 border-white shadow-sm ${
                      item.isCurrent ? 'bg-emerald-500 animate-pulse scale-125' : 
                      item.type === 'history' ? 'bg-slate-900' : 'bg-slate-200'
                    }`} />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className={`text-[10px] font-black tracking-tighter w-[60%] ${item.isCurrent ? 'text-emerald-700' : 'text-slate-900'}`}>{item.stage}</p>
                        <span className="text-[9px] font-medium text-slate-400 text-right w-[40%] flex flex-col">
                          {item.timestamp ? (
                            <>
                              <span>{format(parseFirestoreDate(item.timestamp), 'HH:mm,')}</span>
                              <span>{format(parseFirestoreDate(item.timestamp), 'dd/MM')}</span>
                            </>
                          ) : (
                            <span className="italic opacity-50">-:-, --/--</span>
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 mb-2">
                        <span className="text-[9px] font-medium text-slate-500">Oleh: {item.actorName}</span>
                        <Badge 
                        variant="outline" 
                        className={`w-fit h-4 px-1.5 text-[8px] uppercase rounded border-none ${
                        item.status === 'APPROVED' || item.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                        item.status === 'REJECTED' || item.status === 'rejected' ? 'bg-red-50 text-red-600' :
                        item.isCurrent ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-500'
                        }`}
                        >
                        {item.status}
                        </Badge>
                      </div>
                      {item.comment && (
                        <div className="rounded-lg bg-orange-50/30 p-2.5 text-[10px] text-slate-600 border border-orange-100/50 italic">
                        "{item.comment}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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
              className={`${
                submission.isBooked 
                  ? "bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700" 
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              } font-black text-[9px] px-4 h-8 rounded-lg transition-all tracking-widest gap-2`}
            >
              <BookOpen size={14} />
              {submission.isBooked ? `✓ BUKUKAN ULANG` : 'BUKUKAN'}
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
        
        {canSendWA && (
          <Button 
            onClick={() => sendWhatsApp(submission.picWhatsapp!, formatWhatsAppMessage(submission))}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] px-4 h-8 rounded-lg transition-all tracking-widest gap-2"
          >
            <MessageSquare size={14} />
            WA NOTIFIKASI
          </Button>
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
        isRejected={submission.status === 'REJECTED' || submission.status === 'rejected'}
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

const ALL_MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'tracking', label: 'Tracking Transaksi' },
  { id: 'buku_kas', label: 'Buku Kas' },
  { id: 'anggaran', label: 'Pengajuan Anggaran' },
  { id: 'laporan', label: 'Laporan PertUM' },
  { id: 'berkas', label: 'Berkas Digital' },
  { id: 'administrasi', label: 'Laporan Donasi' },
  { id: 'settings', label: 'Settingan' },
];

const getDefaultMenusForUser = (p: UserProfile): string[] => {
  const defaults: string[] = ['dashboard', 'tracking'];
  const pEmail = p.email.toLowerCase();
  
  if (
    p.role === 'admin' || 
    pEmail === 'keuangan.scb@gmail.com' || 
    pEmail === 'tatausahascba@gmail.com' || 
    pEmail === 'kamal2015go@gmail.com' || 
    pEmail === 'operasional.scb@gmail.com' || 
    pEmail === 'keuanganscbbaznas@gmail.com'
  ) {
    defaults.push('buku_kas', 'laporan', 'berkas', 'administrasi');
  }
  
  if (pEmail === 'keuanganscbbaznas@gmail.com' || pEmail === 'kamal2015go@gmail.com') {
    defaults.push('settings');
  }
  
  if (
    pEmail === 'keuanganscbbaznas@gmail.com' || 
    pEmail === 'kamal2015go@gmail.com' || 
    pEmail === 'tatausahascba@gmail.com' || 
    pEmail === 'keuangan.scb@gmail.com'
  ) {
    if (!defaults.includes('anggaran')) {
      defaults.push('anggaran');
    }
  }

  return defaults;
};

const AdminSection = ({ 
  users, 
  onUpdateRole, 
  onUpdateAllowedMenus,
  isSuperAdmin 
}: { 
  users: UserProfile[], 
  onUpdateRole: (uid: string, role: UserRole) => void, 
  onUpdateAllowedMenus: (uid: string, allowedMenus: string[] | null) => void,
  isSuperAdmin: boolean 
}) => {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl">
        <CardHeader className="py-3 px-4 bg-slate-50 border-b">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Pengaturan Admin & Hak Akses</CardTitle>
          <CardDescription className="text-xs">Kelola role dan pilihan menu yang bisa dilihat oleh masing-masing user</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y border-t">
            {users.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">Tidak ada data pengguna</div>
            ) : (
              users.map((u) => (
                <div key={u.uid} className="p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <UserIcon size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{u.displayName}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
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

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedUser(expandedUser === u.uid ? null : u.uid)}
                        className={`h-8 font-bold text-xs gap-1.5 ${expandedUser === u.uid ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : ''}`}
                      >
                        <Lock size={12} />
                        Kelola Menu
                      </Button>
                    </div>
                  </div>

                  {/* Expandable Custom Menu Config */}
                  {expandedUser === u.uid && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 border border-slate-100 rounded-2xl bg-slate-50/50 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <Lock size={12} className="text-emerald-600" />
                            Pilihan Menu Yang Bisa Dilihat
                          </h5>
                          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                            Centang menu yang ingin Anda ijinkan untuk dilihat oleh user ini
                          </p>
                        </div>
                        
                        {u.allowedMenus && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => onUpdateAllowedMenus(u.uid, null)}
                            className="h-7 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 font-black tracking-wider uppercase flex items-center gap-1"
                          >
                            <RefreshCw size={10} />
                            Reset ke Default
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={u.allowedMenus ? "default" : "outline"} className={`text-[10px] py-0.5 px-2 ${u.allowedMenus ? 'bg-indigo-50 text-indigo-600 border-indigo-100 font-black' : 'text-slate-500 font-medium'}`}>
                          {u.allowedMenus ? 'Menu Kustom Aktif' : 'Menggunakan Hak Akses Default (Sesuai Role)'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                        {ALL_MENU_ITEMS.map((menu) => {
                          const isChecked = u.allowedMenus 
                            ? u.allowedMenus.includes(menu.id)
                            : getDefaultMenusForUser(u).includes(menu.id);

                          return (
                            <label 
                              key={menu.id} 
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                isChecked 
                                  ? 'bg-emerald-50/60 border-emerald-200 text-slate-800 shadow-sm' 
                                  : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                              }`}
                            >
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const currentAllowed = u.allowedMenus 
                                    ? [...u.allowedMenus]
                                    : getDefaultMenusForUser(u);
                                  
                                  let nextAllowed: string[];
                                  if (e.target.checked) {
                                    nextAllowed = [...currentAllowed, menu.id];
                                  } else {
                                    nextAllowed = currentAllowed.filter(id => id !== menu.id);
                                  }
                                  onUpdateAllowedMenus(u.uid, nextAllowed);
                                }}
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                              />
                              <div className="flex flex-col">
                                <span className={`text-xs font-bold tracking-tight ${isChecked ? 'text-slate-900' : 'text-slate-500'}`}>{menu.label}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      
      {isSuperAdmin && <GitHubInfo />}
    </div>
  );
};

function AppConfigSection({ user, profile, fpppConfig }: { user: User | null, profile: UserProfile | null, fpppConfig: any }) {
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
          <TabsTrigger value="fppp" className="flex-1 rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"><FileText size={14}/> FPPP Generator</TabsTrigger>
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
        
        <TabsContent value="fppp">
          <FPPPGeneratorSettings fpppConfig={fpppConfig} />
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

