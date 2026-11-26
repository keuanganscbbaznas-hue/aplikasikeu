
import * as React from 'react';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderOpen, ExternalLink, Download, Plus, Upload, FileDown, Edit, Trash2, Search, X, FileText, RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { utils, writeFile, read } from 'xlsx';
import {
  db,
  connectGoogleDrive,
  clearDriveAccessToken,
  subscribeDriveAccessToken,
} from '@/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { Submission } from '@/types';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const YEARS = ['2024', '2025', '2026'];

const parseDocDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Timestamp) return val.toDate();
  if (val?.seconds) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const extractDriveFolderId = (url: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  const foldersMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (foldersMatch?.[1]) return foldersMatch[1];
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch?.[1]) return idParamMatch[1];
  return null;
};

const escapeDriveQuery = (value: string): string => {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
};

const isSafeHttpUrl = (url?: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const getDriveMimeBadge = (mimeType?: string): { label: string; className: string } => {
  if (!mimeType) return { label: 'File', className: 'bg-slate-100 text-slate-600' };
  if (mimeType === 'application/vnd.google-apps.folder') return { label: 'Folder', className: 'bg-amber-50 text-amber-700' };
  if (mimeType === 'application/pdf') return { label: 'PDF', className: 'bg-rose-50 text-rose-700' };
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return { label: 'Sheets', className: 'bg-emerald-50 text-emerald-700' };
  if (mimeType.includes('document') || mimeType.includes('word')) return { label: 'Docs', className: 'bg-blue-50 text-blue-700' };
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return { label: 'Slides', className: 'bg-orange-50 text-orange-700' };
  if (mimeType.startsWith('image/')) return { label: 'Gambar', className: 'bg-purple-50 text-purple-700' };
  return { label: 'File', className: 'bg-slate-100 text-slate-600' };
};

const formatFileSize = (sizeStr?: string): string => {
  const bytes = Number(sizeStr);
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface DriveSearchFile {
  id: string;
  name: string;
  mimeType?: string;
  webViewLink?: string;
  modifiedTime?: string;
  size?: string;
  parents?: string[];
  sourceFolderLabel: string;
}

interface SubfolderEntry {
  id: string;
  path: string;
}

export const BerkasDigitalManager = ({ submissions = [] }: { submissions?: Submission[] }) => {
  const [links, setLinks] = useState<any[]>([]);
  const [tahun, setTahun] = useState('2026');
  const [bulan, setBulan] = useState('Januari');
  const [namaDokumen, setNamaDokumen] = useState('');
  const [link, setLink] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTahun, setFilterTahun] = useState('Semua');
  const [filterBulan, setFilterBulan] = useState('Semua');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editTahun, setEditTahun] = useState('');
  const [editBulan, setEditBulan] = useState('');
  const [editNamaDokumen, setEditNamaDokumen] = useState('');
  const [editLink, setEditLink] = useState('');

  // Google Drive OAuth & Folder Search state (token held strictly in memory via firebase.ts)
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [isSearchingDrive, setIsSearchingDrive] = useState(false);
  const [driveResults, setDriveResults] = useState<DriveSearchFile[]>([]);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [searchedFolderCount, setSearchedFolderCount] = useState(0);
  const [hasSearchedDrive, setHasSearchedDrive] = useState(false);
  const subfolderCacheRef = useRef<Map<string, SubfolderEntry[]>>(new Map());
  const activeSearchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const unsubToken = subscribeDriveAccessToken((token) => {
      setDriveToken(token);
    });
    return () => unsubToken();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'berkas_digital'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(doc => data.push({id: doc.id, ...doc.data()}));
      setLinks(data);
    }, (error) => {
      console.warn("Berkas digital snapshot notice:", error);
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'berkas_digital'), {
      tahun,
      bulan,
      namaDokumen: namaDokumen.trim(),
      link,
      createdAt: serverTimestamp()
    });
    setNamaDokumen('');
    setLink('');
  };

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setEditTahun(item.tahun);
    setEditBulan(item.bulan);
    setEditNamaDokumen(item.namaDokumen || '');
    setEditLink(item.link);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    const itemRef = doc(db, 'berkas_digital', editingItem.id);
    await updateDoc(itemRef, {
      tahun: editTahun,
      bulan: editBulan,
      namaDokumen: editNamaDokumen.trim(),
      link: editLink
    });
    subfolderCacheRef.current.clear();
    setIsEditDialogOpen(false);
    setEditingItem(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus folder ini?')) {
      await deleteDoc(doc(db, 'berkas_digital', id));
      subfolderCacheRef.current.clear();
    }
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();

  // Links matching Year/Month period filters (used as scope for Google Drive folder search)
  const periodFilteredLinks = useMemo(() => {
    return links
      .filter(item => {
        const matchesYear = filterTahun === 'Semua' || item.tahun === filterTahun;
        const matchesMonth = filterBulan === 'Semua' || item.bulan === filterBulan;
        return matchesYear && matchesMonth;
      })
      .sort((a, b) => {
        if (a.tahun !== b.tahun) {
          return parseInt(b.tahun) - parseInt(a.tahun);
        }
        return MONTHS.indexOf(b.bulan) - MONTHS.indexOf(a.bulan);
      });
  }, [links, filterTahun, filterBulan]);

  const filteredLinks = useMemo(() => {
    return periodFilteredLinks.filter(item => {
      if (!normalizedSearch) return true;

      const docName = (item.namaDokumen || '').toLowerCase();
      const periodLabel = `${item.tahun || ''} - ${item.bulan || ''}`.toLowerCase();
      const driveUrl = (item.link || '').toLowerCase();
      return (
        docName.includes(normalizedSearch) ||
        periodLabel.includes(normalizedSearch) ||
        (item.bulan || '').toLowerCase().includes(normalizedSearch) ||
        (item.tahun || '').toLowerCase().includes(normalizedSearch) ||
        driveUrl.includes(normalizedSearch)
      );
    });
  }, [periodFilteredLinks, normalizedSearch]);

  const filteredSubmissionDocs = useMemo(() => {
    return submissions.filter(sub => {
      if (!sub.evidenceUrl && !sub.lpjUrl) return false;
      const d = parseDocDate(sub.createdAt);
      const subYear = d ? String(d.getFullYear()) : '';
      const subMonth = d ? MONTHS[d.getMonth()] : '';

      const matchesYear = filterTahun === 'Semua' || subYear === filterTahun;
      const matchesMonth = filterBulan === 'Semua' || subMonth === filterBulan;
      if (!matchesYear || !matchesMonth) return false;

      if (!normalizedSearch) return true;

      const title = (sub.title || '').toLowerCase();
      const noDoc = (sub.noDokumen || '').toLowerCase();
      const noLpj = (sub.noDokumenLaporan || '').toLowerCase();
      const pic = (sub.picName || sub.submittedByName || '').toLowerCase();
      return (
        title.includes(normalizedSearch) ||
        noDoc.includes(normalizedSearch) ||
        noLpj.includes(normalizedSearch) ||
        pic.includes(normalizedSearch)
      );
    });
  }, [submissions, filterTahun, filterBulan, normalizedSearch]);

  const discoverSubfolders = useCallback(async (
    rootId: string,
    rootLabel: string,
    token: string,
    signal: AbortSignal
  ): Promise<SubfolderEntry[]> => {
    const cached = subfolderCacheRef.current.get(rootId);
    if (cached) return cached;

    const visited = new Set<string>([rootId]);
    const collected: SubfolderEntry[] = [{ id: rootId, path: rootLabel }];
    let currentLevel: SubfolderEntry[] = [{ id: rootId, path: rootLabel }];

    // BFS up to depth 3 so files nested in subfolders are also searchable
    for (let depth = 0; depth < 3 && currentLevel.length > 0 && collected.length < 60; depth++) {
      const nextLevel: SubfolderEntry[] = [];
      const parentPathById = new Map(currentLevel.map(entry => [entry.id, entry.path]));

      for (let i = 0; i < currentLevel.length; i += 10) {
        const chunk = currentLevel.slice(i, i + 10);
        const parentsExpr = chunk
          .map(entry => `'${escapeDriveQuery(entry.id)}' in parents`)
          .join(' or ');
        const q = `mimeType = 'application/vnd.google-apps.folder' and trashed = false and (${parentsExpr})`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent('files(id,name,parents)')}&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            const errBody = await res.json().catch(() => ({}));
            const errMsg = errBody?.error?.message || '';
            const err: any = new Error(errMsg || `HTTP ${res.status}`);
            err.status = res.status;
            throw err;
          }
          continue;
        }

        const data = await res.json();
        const folders = Array.isArray(data.files) ? data.files : [];
        for (const f of folders) {
          if (!f.id || visited.has(f.id)) continue;
          visited.add(f.id);
          const parentId = Array.isArray(f.parents) ? f.parents.find((p: string) => parentPathById.has(p)) : undefined;
          const parentPath = (parentId && parentPathById.get(parentId)) || rootLabel;
          const entry: SubfolderEntry = { id: f.id, path: `${parentPath} / ${f.name}` };
          collected.push(entry);
          nextLevel.push(entry);
          if (collected.length >= 60) break;
        }
      }

      currentLevel = nextLevel;
    }

    subfolderCacheRef.current.set(rootId, collected);
    return collected;
  }, []);

  const searchDriveFolders = useCallback(async (queryText: string, tokenOverride?: string | null) => {
    const trimmed = queryText.trim();
    const activeToken = tokenOverride ?? driveToken;

    if (!trimmed) {
      setDriveResults([]);
      setDriveError(null);
      setHasSearchedDrive(false);
      setSearchedFolderCount(0);
      return;
    }

    if (!activeToken) {
      setDriveResults([]);
      setHasSearchedDrive(false);
      return;
    }

    if (activeSearchAbortRef.current) {
      activeSearchAbortRef.current.abort();
    }
    const controller = new AbortController();
    activeSearchAbortRef.current = controller;

    setIsSearchingDrive(true);
    setDriveError(null);

    try {
      const rootFolders: Array<{ id: string; label: string }> = [];
      const seenRoots = new Set<string>();
      for (const item of periodFilteredLinks) {
        const folderId = extractDriveFolderId(item.link || '');
        if (folderId && !seenRoots.has(folderId)) {
          seenRoots.add(folderId);
          const label = item.namaDokumen
            ? `${item.namaDokumen} (${item.tahun} - ${item.bulan})`
            : `${item.tahun} - ${item.bulan}`;
          rootFolders.push({ id: folderId, label });
        }
      }

      if (rootFolders.length === 0) {
        setDriveResults([]);
        setSearchedFolderCount(0);
        setHasSearchedDrive(true);
        return;
      }

      const folderLabelMap = new Map<string, string>();
      const allFolderEntries: SubfolderEntry[] = [];

      for (const root of rootFolders) {
        const entries = await discoverSubfolders(root.id, root.label, activeToken, controller.signal);
        for (const entry of entries) {
          if (!folderLabelMap.has(entry.id)) {
            folderLabelMap.set(entry.id, entry.path);
            allFolderEntries.push(entry);
          }
        }
      }

      setSearchedFolderCount(allFolderEntries.length);

      const words = trimmed.split(/\s+/).filter(Boolean);
      const nameExpr = words
        .map(w => `name contains '${escapeDriveQuery(w)}'`)
        .join(' and ');

      const fileMap = new Map<string, DriveSearchFile>();

      for (let i = 0; i < allFolderEntries.length; i += 15) {
        const chunk = allFolderEntries.slice(i, i + 15);
        const parentsExpr = chunk
          .map(entry => `'${escapeDriveQuery(entry.id)}' in parents`)
          .join(' or ');
        const q = `trashed = false and (${nameExpr}) and (${parentsExpr})`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent('files(id,name,mimeType,webViewLink,modifiedTime,size,parents)')}&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true&orderBy=modifiedTime desc`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${activeToken}` },
          signal: controller.signal,
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            const errBody = await res.json().catch(() => ({}));
            const errMsg = errBody?.error?.message || '';
            const err: any = new Error(errMsg || `HTTP ${res.status}`);
            err.status = res.status;
            throw err;
          }
          continue;
        }

        const data = await res.json();
        const files = Array.isArray(data.files) ? data.files : [];
        for (const f of files) {
          if (!f.id || fileMap.has(f.id)) continue;
          const parentId = Array.isArray(f.parents)
            ? f.parents.find((p: string) => folderLabelMap.has(p))
            : undefined;
          fileMap.set(f.id, {
            id: f.id,
            name: f.name || 'Tanpa Nama',
            mimeType: f.mimeType,
            webViewLink: isSafeHttpUrl(f.webViewLink)
              ? f.webViewLink
              : `https://drive.google.com/file/d/${encodeURIComponent(f.id)}/view`,
            modifiedTime: f.modifiedTime,
            size: f.size,
            parents: f.parents,
            sourceFolderLabel: (parentId && folderLabelMap.get(parentId)) || 'Folder Berkas Digital',
          });
        }
      }

      const sorted = Array.from(fileMap.values()).sort((a, b) => {
        const ta = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
        const tb = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
        return tb - ta;
      });

      setDriveResults(sorted);
      setHasSearchedDrive(true);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.warn('Google Drive folder search error:', err);
      if (err?.status === 401 || err?.status === 403) {
        clearDriveAccessToken();
        setDriveError('Izin atau sesi Google Drive Anda belum aktif/berakhir. Klik "Hubungkan Google Drive" untuk mencari langsung di dalam folder.');
      } else {
        setDriveError('Gagal mencari dokumen di folder Google Drive. Silakan coba lagi.');
      }
      setDriveResults([]);
      setHasSearchedDrive(true);
    } finally {
      if (activeSearchAbortRef.current === controller) {
        setIsSearchingDrive(false);
      }
    }
  }, [driveToken, periodFilteredLinks, discoverSubfolders]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setDriveResults([]);
      setHasSearchedDrive(false);
      setDriveError(null);
      return;
    }
    if (!driveToken) return;

    const timer = setTimeout(() => {
      searchDriveFolders(searchQuery, driveToken);
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery, driveToken, filterTahun, filterBulan, searchDriveFolders]);

  const handleConnectDrive = async () => {
    setIsConnectingDrive(true);
    setDriveError(null);
    try {
      const token = await connectGoogleDrive();
      if (token && searchQuery.trim()) {
        await searchDriveFolders(searchQuery, token);
      }
    } catch (err: any) {
      console.warn('Connect Google Drive error:', err);
      setDriveError('Koneksi Google Drive dibatalkan atau pop-up diblokir browser.');
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleExport = (type: 'xlsx' | 'csv') => {
    const data = filteredLinks.map(item => ({
      Tahun: item.tahun,
      Bulan: item.bulan,
      'Nama Dokumen': item.namaDokumen || `${item.tahun} - ${item.bulan}`,
      Link: item.link
    }));
    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Berkas");
    writeFile(workbook, `Berkas_Digital.${type}`, { bookType: type });
  };

  const handleDownloadTemplate = () => {
    const data = [{ Tahun: '', Bulan: '', 'Nama Dokumen': '', Link: '' }];
    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Template");
    writeFile(workbook, `Template_Berkas_Digital.xlsx`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data: any[] = utils.sheet_to_json(ws);

      for (const item of data) {
        if (item.Tahun && item.Bulan && item.Link) {
          const importedDocName = item['Nama Dokumen'] || item.NamaDokumen || item.namaDokumen || '';
          await addDoc(collection(db, 'berkas_digital'), {
            tahun: String(item.Tahun),
            bulan: item.Bulan,
            namaDokumen: String(importedDocName).trim(),
            link: item.Link,
            createdAt: serverTimestamp()
          });
        }
      }
      subfolderCacheRef.current.clear();
    };
    reader.readAsBinaryString(file);
  };

  const driveFolderLinkCount = useMemo(() => {
    return periodFilteredLinks.filter(item => !!extractDriveFolderId(item.link || '')).length;
  }, [periodFilteredLinks]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle>Pengaturan Berkas Digital</CardTitle>
            {driveToken ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  <CheckCircle2 size={13} />
                  Google Drive Terhubung
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    subfolderCacheRef.current.clear();
                    if (searchQuery.trim()) {
                      searchDriveFolders(searchQuery, driveToken);
                    }
                  }}
                  className="h-7 px-2 text-xs text-slate-500 hover:text-emerald-700"
                  title="Muat ulang daftar subfolder Google Drive"
                >
                  <RefreshCw size={13} className="mr-1" />
                  Refresh Folder
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectDrive}
                disabled={isConnectingDrive}
                className="inline-flex items-center gap-2.5 px-4 h-9 rounded-full bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-xs text-slate-700 font-medium text-xs transition-all cursor-pointer disabled:opacity-60"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0" style={{ display: 'block' }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
                <span>{isConnectingDrive ? 'Menghubungkan...' : 'Hubungkan Google Drive'}</span>
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row flex-wrap gap-3">
            <Select value={tahun} onValueChange={setTahun}>
              <SelectTrigger className="w-full sm:w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={bulan} onValueChange={setBulan}>
              <SelectTrigger className="w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              placeholder="Nama Dokumen / Folder (opsional)"
              value={namaDokumen}
              onChange={e => setNamaDokumen(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <Input
              placeholder="Link Google Drive"
              value={link}
              onChange={e => setLink(e.target.value)}
              required
              className="flex-1 min-w-[220px]"
            />
            <Button type="submit"><Plus size={16} className="mr-2" /> Tambah</Button>
          </form>

          <div className="flex flex-wrap gap-3 items-center pt-4 border-t">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Cari dokumen berdasarkan nama dokumen (termasuk isi folder Drive)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && driveToken && searchQuery.trim()) {
                    e.preventDefault();
                    searchDriveFolders(searchQuery, driveToken);
                  }
                }}
                className="pl-9 pr-8"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {driveToken && searchQuery.trim() && (
              <Button
                type="button"
                onClick={() => searchDriveFolders(searchQuery, driveToken)}
                disabled={isSearchingDrive}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSearchingDrive ? <Loader2 size={15} className="mr-2 animate-spin" /> : <Search size={15} className="mr-2" />}
                Cari di Drive
              </Button>
            )}
            <Select value={filterTahun} onValueChange={setFilterTahun}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Tahun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Tahun</SelectItem>
                {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterBulan} onValueChange={setFilterBulan}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Bulan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Bulan</SelectItem>
                {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => handleExport('xlsx')}><FileDown size={16} className="mr-2" /> Export Excel</Button>
            <Button variant="outline" onClick={() => handleExport('csv')}><FileDown size={16} className="mr-2" /> Export CSV</Button>
            <Button variant="outline" onClick={handleDownloadTemplate}><Download size={16} className="mr-2" /> Download Template</Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload size={16} className="mr-2" /> Import</Button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .csv" onChange={handleImport} />
          </div>

          {!driveToken && driveFolderLinkCount > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200/80 px-4 py-3">
              <p className="text-xs font-medium text-slate-600">
                Hubungkan akun Google Anda untuk mencari file secara langsung di dalam {driveFolderLinkCount} folder Google Drive yang tertaut.
              </p>
              <button
                type="button"
                onClick={handleConnectDrive}
                disabled={isConnectingDrive}
                className="inline-flex items-center gap-2 px-3.5 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shrink-0 transition-all cursor-pointer"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-3.5 h-3.5 shrink-0" style={{ display: 'block' }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
                <span>{isConnectingDrive ? 'Menghubungkan...' : 'Masuk dengan Google'}</span>
              </button>
            </div>
          )}

          {driveError && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs font-medium text-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{driveError}</span>
              </div>
              {!driveToken && (
                <Button type="button" size="sm" variant="outline" onClick={handleConnectDrive} className="h-7 text-xs bg-white">
                  Hubungkan Ulang
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {normalizedSearch && driveToken && (
        <Card className="border-emerald-200/80 shadow-sm bg-emerald-50/20">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-black tracking-tight flex items-center gap-2 text-slate-900">
                {isSearchingDrive ? (
                  <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
                ) : (
                  <FolderOpen className="h-4 w-4 text-emerald-600" />
                )}
                Hasil Pencarian di Folder Google Drive
              </CardTitle>
              {searchedFolderCount > 0 && !isSearchingDrive && (
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Memeriksa {searchedFolderCount} folder & subfolder dari link Berkas Digital yang tertaut
                </p>
              )}
            </div>
            <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-200 text-xs font-bold">
              {isSearchingDrive ? 'Mencari...' : `${driveResults.length} File Ditemukan`}
            </Badge>
          </CardHeader>
          <CardContent>
            {isSearchingDrive ? (
              <div className="py-8 flex items-center justify-center gap-2 text-sm text-slate-500 font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                Mencari "{searchQuery}" di dalam folder Google Drive...
              </div>
            ) : hasSearchedDrive && driveResults.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 font-medium">
                Tidak ditemukan file bernama "{searchQuery}" di dalam folder Google Drive yang tertaut.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-100 px-4">
                {driveResults.map((file) => {
                  const mimeBadge = getDriveMimeBadge(file.mimeType);
                  const sizeLabel = formatFileSize(file.size);
                  const modifiedDate = file.modifiedTime
                    ? new Date(file.modifiedTime).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '';
                  return (
                    <div key={file.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 ${mimeBadge.className}`}>
                            {mimeBadge.label}
                          </span>
                          <p className="text-sm font-bold text-slate-800 truncate" title={file.name}>
                            {file.name}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                          <span className="text-emerald-700 font-semibold">{file.sourceFolderLabel}</span>
                          {modifiedDate && <span>· Diubah {modifiedDate}</span>}
                          {sizeLabel && <span>· {sizeLabel}</span>}
                        </div>
                      </div>
                      {file.webViewLink && isSafeHttpUrl(file.webViewLink) && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shrink-0 w-max"
                        >
                          Buka di Drive <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {filteredLinks.length === 0 ? (
        <Card className="border-dashed border-slate-200 bg-slate-50/50">
          <CardContent className="py-10 text-center text-slate-500 text-sm font-medium">
            {normalizedSearch
              ? `Tidak ada nama folder berkas digital yang cocok dengan "${searchQuery}".`
              : 'Belum ada data folder berkas digital pada filter ini.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLinks.map((item) => (
            <Card key={item.id} className="shadow-sm border-slate-100 hover:shadow-md transition-shadow relative group">
              <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0 gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-lg font-black tracking-tight truncate" title={item.namaDokumen || `${item.tahun} - ${item.bulan}`}>
                    {item.namaDokumen ? item.namaDokumen : `${item.tahun} - ${item.bulan}`}
                  </CardTitle>
                  {item.namaDokumen && (
                    <p className="text-xs font-bold text-slate-400 mt-0.5">
                      {item.tahun} - {item.bulan}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() => handleEditClick(item)}
                  >
                    <Edit size={14} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                  <FolderOpen className="h-5 w-5 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <a 
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-700 mt-2"
                >
                  Buka Folder Drive <ExternalLink size={14} />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {submissions.length > 0 && (
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-black tracking-tight flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              Arsip Dokumen Pengajuan & LPJ
            </CardTitle>
            <Badge variant="outline" className="text-xs font-bold">
              {filteredSubmissionDocs.length} Dokumen
            </Badge>
          </CardHeader>
          <CardContent>
            {filteredSubmissionDocs.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400 font-medium">
                {normalizedSearch
                  ? `Tidak ada dokumen pengajuan/LPJ dengan nama "${searchQuery}".`
                  : 'Tidak ada dokumen lampiran atau LPJ pada filter periode ini.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredSubmissionDocs.slice(0, 50).map((sub) => {
                  const d = parseDocDate(sub.createdAt);
                  const dateLabel = d ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : '-';
                  return (
                    <div key={sub.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{sub.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-medium">
                          <span>{dateLabel}</span>
                          {sub.noDokumen && (
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                              No: {sub.noDokumen}
                            </span>
                          )}
                          {sub.noDokumenLaporan && (
                            <span className="font-mono bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-700">
                              LPJ: {sub.noDokumenLaporan}
                            </span>
                          )}
                          {(sub.picName || sub.submittedByName) && (
                            <span>PIC: {sub.picName || sub.submittedByName}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {sub.evidenceUrl && (
                          <a
                            href={sub.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold transition-colors"
                          >
                            Lampiran <ExternalLink size={12} />
                          </a>
                        )}
                        {sub.lpjUrl && (
                          <a
                            href={sub.lpjUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors"
                          >
                            Dokumen LPJ <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-3xl border-none p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">Edit Folder Digital</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Tahun</label>
                <Select value={editTahun} onValueChange={setEditTahun}>
                  <SelectTrigger className="bg-slate-50 border-none rounded-xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Bulan</label>
                <Select value={editBulan} onValueChange={setEditBulan}>
                  <SelectTrigger className="bg-slate-50 border-none rounded-xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Nama Dokumen / Folder</label>
              <Input 
                placeholder="Nama Dokumen / Folder"
                className="bg-slate-50 border-none rounded-xl font-medium"
                value={editNamaDokumen} 
                onChange={e => setEditNamaDokumen(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Link Google Drive</label>
              <Input 
                className="bg-slate-50 border-none rounded-xl font-medium"
                value={editLink} 
                onChange={e => setEditLink(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl font-black uppercase text-[10px] tracking-widest">Batal</Button>
            <Button onClick={handleUpdate} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


