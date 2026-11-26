import * as React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  limit,
  runTransaction,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, auth } from '../firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType, isQuotaExceededError } from '../lib/firebaseUtils';
import { pushWhatsAppMessage, buildLiveChatReplyWaMessage } from '../lib/whatsappPush';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  MessageSquare,
  X,
  Send,
  ArrowLeft,
  Bell,
  BellOff,
  Search,
  UserPlus,
  Headphones,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface SupportChatThread {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhotoURL?: string;
  lastMessage: string;
  lastSenderRole: 'user' | 'admin';
  lastMessageAt: any;
  unreadByAdmin: number;
  unreadByUser: number;
  createdAt?: any;
  updatedAt: any;
}

interface SupportChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderRole: 'user' | 'admin';
  text: string;
  createdAt: any;
}

interface FloatingLiveChatProps {
  user: User | any;
  profile: UserProfile | null;
  isAdmin: boolean;
  allUsers: UserProfile[];
  shiftUp?: boolean;
}

const toMillis = (ts: any): number => {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts instanceof Timestamp) return ts.toMillis();
  if (ts.seconds !== undefined) return ts.seconds * 1000;
  const parsed = new Date(ts).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatChatTime = (ts: any): string => {
  const ms = toMillis(ts);
  if (!ms) return 'Baru saja';
  try {
    return format(new Date(ms), 'HH:mm', { locale: idLocale });
  } catch {
    return '';
  }
};

const formatRelativeTime = (ts: any): string => {
  const ms = toMillis(ts);
  if (!ms) return 'Baru saja';
  try {
    return formatDistanceToNow(new Date(ms), { addSuffix: true, locale: idLocale });
  } catch {
    return '';
  }
};

const playNotificationTone = () => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(784, now);
    osc1.frequency.setValueAtTime(1046.5, now + 0.09);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 400);
  } catch {
    // Ignore autoplay restriction errors
  }
};

const sanitizeString = (val: unknown, maxLen: number, fallback = ''): string => {
  const str = typeof val === 'string' ? val.trim() : fallback;
  return str.slice(0, maxLen);
};

export function FloatingLiveChat({
  user,
  profile,
  isAdmin,
  allUsers,
  shiftUp = false,
}: FloatingLiveChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('moneta_chat_sound_enabled');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [threads, setThreads] = useState<SupportChatThread[]>([]);
  const [userThread, setUserThread] = useState<SupportChatThread | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatPicker, setShowNewChatPicker] = useState(false);
  const [pendingUserTarget, setPendingUserTarget] = useState<UserProfile | null>(null);

  const isOpenRef = useRef(isOpen);
  const activeChatIdRef = useRef(activeChatId);
  const soundEnabledRef = useRef(soundEnabled);
  const hasSeededThreadsRef = useRef(false);
  const seenThreadSignatureRef = useRef<Map<string, string>>(new Map());
  const hasSeededUserThreadRef = useRef(false);
  const seenUserSignatureRef = useRef<string>('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    try {
      localStorage.setItem('moneta_chat_sound_enabled', String(soundEnabled));
    } catch {
      // ignore storage errors
    }
  }, [soundEnabled]);

  const currentUid = user?.uid || '';
  const hasFirebaseAuth = Boolean(auth.currentUser && auth.currentUser.uid === currentUid);

  // Listen to chat thread(s) for unread badge & incoming message notifications
  useEffect(() => {
    if (!currentUid || !hasFirebaseAuth) {
      setThreads([]);
      setUserThread(null);
      return;
    }

    hasSeededThreadsRef.current = false;
    seenThreadSignatureRef.current = new Map();
    hasSeededUserThreadRef.current = false;
    seenUserSignatureRef.current = '';

    if (isAdmin) {
      const q = query(
        collection(db, 'support_chats'),
        orderBy('lastMessageAt', 'desc'),
        limit(50)
      );

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const list: SupportChatThread[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<SupportChatThread, 'id'>),
          }));

          if (!hasSeededThreadsRef.current) {
            list.forEach((t) => {
              seenThreadSignatureRef.current.set(
                t.id,
                `${toMillis(t.lastMessageAt)}|${t.lastSenderRole}|${t.lastMessage}`
              );
            });
            hasSeededThreadsRef.current = true;
          } else {
            list.forEach((t) => {
              const sig = `${toMillis(t.lastMessageAt)}|${t.lastSenderRole}|${t.lastMessage}`;
              const prevSig = seenThreadSignatureRef.current.get(t.id);
              seenThreadSignatureRef.current.set(t.id, sig);

              const isViewingThis =
                isOpenRef.current && activeChatIdRef.current === t.id;

              if (
                prevSig !== sig &&
                t.lastSenderRole === 'user' &&
                (t.unreadByAdmin || 0) > 0 &&
                !isViewingThis
              ) {
                if (soundEnabledRef.current) {
                  playNotificationTone();
                }
                toast.info(`Pesan baru dari ${t.userName || t.userEmail}`, {
                  description: t.lastMessage,
                  duration: 6000,
                  action: {
                    label: 'Buka Chat',
                    onClick: () => {
                      setActiveChatId(t.id);
                      setShowNewChatPicker(false);
                      setPendingUserTarget(null);
                      setIsOpen(true);
                    },
                  },
                });
              }
            });
          }

          setThreads(list);
        },
        (error) => {
          if (isQuotaExceededError(error)) return;
          try {
            handleFirestoreError(error, OperationType.LIST, 'support_chats');
          } catch {
            // handled via logger
          }
        }
      );

      return () => unsub();
    } else {
      const threadRef = doc(db, 'support_chats', currentUid);
      const unsub = onSnapshot(
        threadRef,
        (docSnap) => {
          if (!docSnap.exists()) {
            setUserThread(null);
            hasSeededUserThreadRef.current = true;
            return;
          }

          const t: SupportChatThread = {
            id: docSnap.id,
            ...(docSnap.data() as Omit<SupportChatThread, 'id'>),
          };

          const sig = `${toMillis(t.lastMessageAt)}|${t.lastSenderRole}|${t.lastMessage}`;
          if (!hasSeededUserThreadRef.current) {
            seenUserSignatureRef.current = sig;
            hasSeededUserThreadRef.current = true;
          } else if (
            seenUserSignatureRef.current !== sig &&
            t.lastSenderRole === 'admin' &&
            (t.unreadByUser || 0) > 0 &&
            !isOpenRef.current
          ) {
            seenUserSignatureRef.current = sig;
            if (soundEnabledRef.current) {
              playNotificationTone();
            }
            toast.info('Balasan baru dari Admin Keuangan SCB', {
              description: t.lastMessage,
              duration: 6000,
              action: {
                label: 'Lihat',
                onClick: () => setIsOpen(true),
              },
            });
          } else {
            seenUserSignatureRef.current = sig;
          }

          setUserThread(t);
        },
        (error) => {
          if (isQuotaExceededError(error)) return;
          try {
            handleFirestoreError(error, OperationType.GET, `support_chats/${currentUid}`);
          } catch {
            // handled via logger
          }
        }
      );

      return () => unsub();
    }
  }, [currentUid, isAdmin, hasFirebaseAuth]);

  // Determine the currently viewed thread ID
  const viewedChatId = isAdmin ? activeChatId : currentUid;

  // Listen to messages in the active conversation when chat panel is open
  useEffect(() => {
    if (!isOpen || !viewedChatId || !hasFirebaseAuth) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'support_chats', viewedChatId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const msgs: SupportChatMessage[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SupportChatMessage, 'id'>),
        }));
        setMessages(msgs);
      },
      (error) => {
        if (isQuotaExceededError(error)) return;
        try {
          handleFirestoreError(
            error,
            OperationType.LIST,
            `support_chats/${viewedChatId}/messages`
          );
        } catch {
          // handled via logger
        }
      }
    );

    return () => unsub();
  }, [isOpen, viewedChatId, hasFirebaseAuth]);

  // Auto-mark unread messages as read when opening or viewing a thread
  useEffect(() => {
    if (!isOpen || !viewedChatId || !hasFirebaseAuth) return;

    if (isAdmin) {
      const target = threads.find((t) => t.id === viewedChatId);
      if (target && (target.unreadByAdmin || 0) > 0) {
        updateDoc(doc(db, 'support_chats', viewedChatId), {
          unreadByAdmin: 0,
          updatedAt: serverTimestamp(),
        }).catch((err) => {
          console.warn('Mark chat read (admin) notice:', err);
        });
      }
    } else if (userThread && (userThread.unreadByUser || 0) > 0) {
      updateDoc(doc(db, 'support_chats', currentUid), {
        unreadByUser: 0,
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        console.warn('Mark chat read (user) notice:', err);
      });
    }
  }, [isOpen, viewedChatId, isAdmin, threads, userThread, currentUid, hasFirebaseAuth]);

  // Auto-scroll to bottom when messages change or chat opens
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
    return () => clearTimeout(timer);
  }, [messages, isOpen, viewedChatId]);

  const totalUnread = useMemo(() => {
    if (isAdmin) {
      return threads.reduce((acc, t) => acc + (t.unreadByAdmin || 0), 0);
    }
    return userThread?.unreadByUser || 0;
  }, [isAdmin, threads, userThread]);

  const activeThreadMeta = useMemo(() => {
    if (!isAdmin) return userThread;
    return threads.find((t) => t.id === activeChatId) || null;
  }, [isAdmin, userThread, threads, activeChatId]);

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        (t.userName || '').toLowerCase().includes(q) ||
        (t.userEmail || '').toLowerCase().includes(q) ||
        (t.lastMessage || '').toLowerCase().includes(q)
    );
  }, [threads, searchQuery]);

  const startableUsers = useMemo(() => {
    const existingIds = new Set(threads.map((t) => t.id));
    const q = searchQuery.trim().toLowerCase();
    return allUsers.filter((u) => {
      if (!u.uid || u.uid === currentUid) return false;
      if (existingIds.has(u.uid)) return false;
      if (!q) return true;
      return (
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    });
  }, [allUsers, threads, currentUid, searchQuery]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = draft.trim();
    if (!cleanText || isSending || !currentUid) return;

    if (!hasFirebaseAuth) {
      toast.error('Sesi Google Auth diperlukan untuk mengirim pesan live chat.');
      return;
    }

    const targetChatId = isAdmin ? activeChatId : currentUid;
    if (!targetChatId) return;

    const textPayload = cleanText.slice(0, 2000);
    const previewText = cleanText.slice(0, 250);
    const senderName = sanitizeString(
      profile?.displayName || user?.displayName || profile?.email || user?.email,
      120,
      'Pengguna'
    );
    const senderEmail = sanitizeString(profile?.email || user?.email, 160, '');
    const senderRole: 'user' | 'admin' = isAdmin ? 'admin' : 'user';

    // Target user metadata for thread doc
    const targetUserName = isAdmin
      ? sanitizeString(
          activeThreadMeta?.userName || pendingUserTarget?.displayName || pendingUserTarget?.email,
          120,
          'Pengguna'
        )
      : senderName;
    const targetUserEmail = isAdmin
      ? sanitizeString(
          activeThreadMeta?.userEmail || pendingUserTarget?.email,
          160,
          ''
        )
      : senderEmail;
    const targetUserPhoto = isAdmin
      ? sanitizeString(
          activeThreadMeta?.userPhotoURL || pendingUserTarget?.photoURL || '',
          512,
          ''
        )
      : sanitizeString(profile?.photoURL || user?.photoURL || '', 512, '');

    setIsSending(true);
    setDraft('');

    try {
      const chatRef = doc(db, 'support_chats', targetChatId);
      const msgRef = doc(collection(db, 'support_chats', targetChatId, 'messages'));

      await runTransaction(db, async (tx) => {
        const chatSnap = await tx.get(chatRef);
        const nowTs = serverTimestamp();

        if (!chatSnap.exists()) {
          const newChatPayload: Record<string, any> = {
            userId: targetChatId,
            userName: targetUserName,
            userEmail: targetUserEmail,
            lastMessage: previewText,
            lastSenderRole: senderRole,
            lastMessageAt: nowTs,
            unreadByAdmin: senderRole === 'user' ? 1 : 0,
            unreadByUser: senderRole === 'admin' ? 1 : 0,
            createdAt: nowTs,
            updatedAt: nowTs,
          };
          if (targetUserPhoto) {
            newChatPayload.userPhotoURL = targetUserPhoto;
          }
          tx.set(chatRef, newChatPayload);
        } else {
          const existingData = chatSnap.data();
          const updatePayload: Record<string, any> = {
            userName: targetUserName || existingData.userName || 'Pengguna',
            userEmail: targetUserEmail || existingData.userEmail || '',
            lastMessage: previewText,
            lastSenderRole: senderRole,
            lastMessageAt: nowTs,
            unreadByAdmin:
              senderRole === 'user'
                ? (Number(existingData.unreadByAdmin) || 0) + 1
                : 0,
            unreadByUser:
              senderRole === 'admin'
                ? (Number(existingData.unreadByUser) || 0) + 1
                : 0,
            updatedAt: nowTs,
          };
          if (targetUserPhoto) {
            updatePayload.userPhotoURL = targetUserPhoto;
          }
          tx.update(chatRef, updatePayload);
        }

        tx.set(msgRef, {
          senderId: currentUid,
          senderName,
          senderEmail,
          senderRole,
          text: textPayload,
          createdAt: nowTs,
        });
      });

      if (isAdmin) {
        const targetUser = allUsers.find((u) => u.uid === targetChatId);
        const recipientPhone = targetUser?.whatsapp;
        if (recipientPhone) {
          void pushWhatsAppMessage({
            target: recipientPhone,
            message: buildLiveChatReplyWaMessage({
              recipientName: targetUserName,
              senderName,
              messageText: textPayload,
            }),
            silent: true,
          });
        }
      }
    } catch (error) {
      setDraft(cleanText);
      toast.error('Gagal mengirim pesan. Coba lagi.');
      try {
        handleFirestoreError(error, OperationType.WRITE, `support_chats/${targetChatId}`);
      } catch {
        // handled via logger
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenChat = () => {
    setIsOpen((prev) => !prev);
  };

  if (!user) return null;

  const bottomPositionClass = shiftUp ? 'bottom-24 sm:bottom-5' : 'bottom-5';

  return (
    <div className={`fixed ${bottomPositionClass} right-5 z-50 flex flex-col items-end gap-3`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-[calc(100vw-2.5rem)] sm:w-[390px] h-[500px] max-h-[78vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-emerald-800 text-white px-4 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {isAdmin && activeChatId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChatId(null);
                      setPendingUserTarget(null);
                    }}
                    className="p-1.5 -ml-1 rounded-xl hover:bg-emerald-700/80 transition-colors"
                    title="Kembali ke daftar chat"
                  >
                    <ArrowLeft size={18} />
                  </button>
                ) : (
                  <div className="w-9 h-9 rounded-2xl bg-emerald-600/80 border border-emerald-400/30 flex items-center justify-center shrink-0">
                    <Headphones size={18} className="text-emerald-100" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold leading-tight truncate">
                    {isAdmin
                      ? activeChatId
                        ? activeThreadMeta?.userName ||
                          pendingUserTarget?.displayName ||
                          'Percakapan User'
                        : 'Live Chat Masuk (Admin)'
                      : 'Live Chat Admin SCB'}
                  </h3>
                  <p className="text-[11px] text-emerald-200 truncate">
                    {isAdmin
                      ? activeChatId
                        ? activeThreadMeta?.userEmail || pendingUserTarget?.email || ''
                        : `${threads.length} percakapan aktif`
                      : 'Terhubung langsung ke Admin Keuangan'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setSoundEnabled((v) => !v)}
                  className="p-1.5 rounded-xl hover:bg-emerald-700/80 text-emerald-100 transition-colors"
                  title={soundEnabled ? 'Matikan suara notifikasi' : 'Aktifkan suara notifikasi'}
                >
                  {soundEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-emerald-700/80 text-emerald-100 transition-colors"
                  title="Tutup chat"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {!hasFirebaseAuth ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50">
                <MessageSquare size={36} className="text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-700 mb-1">
                  Autentikasi Google Diperlukan
                </p>
                <p className="text-xs text-slate-500 max-w-xs">
                  Silakan masuk menggunakan tombol Google agar pesan live chat tersinkronisasi secara real-time.
                </p>
              </div>
            ) : isAdmin && !activeChatId ? (
              /* Admin Thread List View */
              <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
                <div className="p-3 bg-white border-b border-slate-100 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama atau email user..."
                      className="h-9 pl-8 text-xs rounded-xl bg-slate-50 border-slate-200"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={showNewChatPicker ? 'default' : 'outline'}
                    onClick={() => setShowNewChatPicker((v) => !v)}
                    className={`h-9 px-2.5 rounded-xl text-xs font-semibold ${
                      showNewChatPicker
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        : ''
                    }`}
                    title="Mulai chat dengan user"
                  >
                    <UserPlus size={14} className="mr-1" />
                    Baru
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {showNewChatPicker && (
                    <div className="bg-emerald-50/60 p-2.5 border-b border-emerald-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 px-1 mb-1.5">
                        Mulai Percakapan Baru
                      </p>
                      {startableUsers.length === 0 ? (
                        <p className="text-xs text-slate-500 px-1 py-2">
                          Semua user sudah memiliki percakapan atau tidak ditemukan.
                        </p>
                      ) : (
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {startableUsers.map((u) => (
                            <button
                              key={u.uid}
                              type="button"
                              onClick={() => {
                                setPendingUserTarget(u);
                                setActiveChatId(u.uid);
                                setShowNewChatPicker(false);
                              }}
                              className="w-full text-left px-2.5 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-100 flex items-center justify-between transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">
                                  {u.displayName || u.email}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {u.email}
                                </p>
                              </div>
                              <Badge
                                variant="secondary"
                                className="text-[10px] capitalize ml-2 shrink-0"
                              >
                                {u.role}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {filteredThreads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-3">
                        <MessageSquare size={22} className="text-slate-300" />
                      </div>
                      <p className="text-xs font-bold text-slate-600">
                        Belum ada pesan masuk
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Pesan dari user akan tampil otomatis di sini beserta notifikasi.
                      </p>
                    </div>
                  ) : (
                    filteredThreads.map((thread) => (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => {
                          setPendingUserTarget(null);
                          setActiveChatId(thread.id);
                        }}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-white ${
                          thread.unreadByAdmin > 0 ? 'bg-emerald-50/70' : 'bg-white/60'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                          {(thread.userName || thread.userEmail || 'U').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {thread.userName || thread.userEmail}
                            </p>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {formatRelativeTime(thread.lastMessageAt)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className="text-[11px] text-slate-500 truncate">
                              {thread.lastSenderRole === 'admin' ? 'Anda: ' : ''}
                              {thread.lastMessage}
                            </p>
                            {thread.unreadByAdmin > 0 && (
                              <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                {thread.unreadByAdmin}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Conversation Messages View (User or Admin inside thread) */
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/80">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center mb-3">
                        <MessageSquare size={22} />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        {isAdmin
                          ? 'Mulai percakapan dengan user ini'
                          : 'Halo! Ada yang bisa Admin bantu?'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-[240px]">
                        Kirim pesan di bawah ini. Admin akan langsung mendapat notifikasi dan membalas di sini.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = isAdmin
                        ? msg.senderRole === 'admin'
                        : msg.senderRole === 'user';

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            isMine ? 'items-end' : 'items-start'
                          }`}
                        >
                          <span className="text-[10px] text-slate-400 font-medium mb-1 px-1">
                            {isMine
                              ? 'Anda'
                              : msg.senderRole === 'admin'
                              ? `Admin (${msg.senderName})`
                              : msg.senderName}
                          </span>
                          <div
                            className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm whitespace-pre-wrap break-words ${
                              isMine
                                ? 'bg-emerald-700 text-white rounded-br-md'
                                : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-md'
                            }`}
                          >
                            {msg.text}
                          </div>
                          <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-400">
                            <span>{formatChatTime(msg.createdAt)}</span>
                            {isMine && <CheckCheck size={12} className="text-emerald-600" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Composer */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0"
                >
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={
                      isAdmin ? 'Tulis balasan ke user...' : 'Tulis pesan ke Admin...'
                    }
                    maxLength={2000}
                    disabled={isSending}
                    className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs"
                  />
                  <Button
                    type="submit"
                    disabled={!draft.trim() || isSending}
                    className="h-10 w-10 p-0 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shrink-0"
                    title="Kirim pesan"
                  >
                    {isSending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </Button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Launcher Button */}
      <button
        type="button"
        onClick={handleOpenChat}
        className="group relative flex items-center gap-2.5 h-13 px-4 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white shadow-xl shadow-emerald-950/20 border border-emerald-500/40 transition-all hover:scale-[1.03] active:scale-95 cursor-pointer"
        aria-label="Buka Live Chat"
      >
        <div className="relative flex items-center justify-center">
          {isOpen ? <X size={20} /> : <MessageSquare size={20} />}
          {!isOpen && totalUnread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>
          )}
        </div>
        <span className="text-xs font-bold tracking-wide hidden sm:inline">
          {isAdmin ? 'Live Chat' : 'Chat Admin'}
        </span>
        {totalUnread > 0 && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-extrabold flex items-center justify-center shadow-sm">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>
    </div>
  );
}
