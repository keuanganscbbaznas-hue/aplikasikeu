import React, { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { 
  Plus, 
  Video, 
  Image as ImageIcon, 
  Trash2, 
  Upload, 
  X,
  Play,
  Presentation,
  Users2,
  Sparkles,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from './ui/dialog';
import { toast } from 'sonner';

interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  title?: string;
  description?: string;
  createdAt: any;
}

export const LearningSection = ({ isOwner }: { isOwner: boolean }) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('Learning With MONETA SCB');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [optimizeImage, setOptimizeImage] = useState(true);

  // Edit details state
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<GalleryItem | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'dashboard_gallery'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GalleryItem[];
      setItems(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpload = async () => {
    if (!file) {
      toast.error('Pilih file terlebih dahulu');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);
      setCompressionProgress(0);
      
      let fileToUpload = file;
      let url = '';

      if (mediaType === 'image') {
        toast.info('Menyiapkan gambar berkualitas tinggi...', { duration: 2000 });
        const maxCompressedSize = optimizeImage ? 0.18 : 0.40;
        const options = {
          maxSizeMB: maxCompressedSize, 
          maxWidthOrHeight: optimizeImage ? 1280 : 1600, 
          useWebWorker: false, // prevent sandbox iframe worker freezes
          initialQuality: 0.85,
          onProgress: (p: number) => setCompressionProgress(p)
        };
        
        try {
          fileToUpload = await imageCompression(file, options);
          setCompressionProgress(100);
        } catch (compressionError) {
          console.warn('Compression failed, using original file', compressionError);
        }

        setUploadProgress(50);

        // Convert compressed file directly to Base64 and upload to reliable local server endpoint
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(fileToUpload);
        });

        setUploadProgress(60);
        toast.info('Mengunggah gambar ke server...', { duration: 1500 });

        const uploadRes = await fetch('/api/gallery/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filename: fileToUpload.name,
            base64Data,
            mimeType: fileToUpload.type
          })
        });

        if (!uploadRes.ok) {
          throw new Error('Gagal mengunggah gambar ke backend server.');
        }

        const uploadData = await uploadRes.json();
        if (!uploadData.success || !uploadData.url) {
          throw new Error(uploadData.error || 'Gagal menyimpan gambar di server.');
        }

        url = uploadData.url;
        setUploadProgress(85);

      } else {
        // Video upload fallback via storage bucket
        setUploadProgress(20);
        try {
          toast.info('Mengunggah video ke Firebase Storage...', { duration: 2500 });
          const storageRef = ref(storage, `gallery/${Date.now()}_${fileToUpload.name}`);
          const uploadResult = await uploadBytes(storageRef, fileToUpload);
          setUploadProgress(80);
          url = await getDownloadURL(uploadResult.ref);
        } catch (videoError: any) {
          console.error('Video upload failed:', videoError);
          throw new Error('Gagal mengunggah video: Penyimpanan Firebase Storage tidak tersedia.');
        }
      }

      setUploadProgress(90);

      const galleryData = {
        type: mediaType,
        url,
        title: title || 'Belajar Membuat Aplikasi Sendiri Bersama Kepala Sekolah dan Tendik SCB',
        description: description || 'Dokumentasi kegiatan pengembangan aplikasi MONETA SCB.',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'dashboard_gallery'), galleryData);
      setUploadProgress(100);

      toast.success('Media berhasil disimpan!');
      setShowUploadModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Upload process failed:', error);
      toast.error(`Gagal Menyimpan: ${error.message || 'Terjadi kesalahan pada Firebase'}`);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
      setCompressionProgress(0);
    }
  };

  const handleStartEdit = (item: GalleryItem) => {
    setEditingItem(item);
    setEditTitle(item.title || '');
    setEditDescription(item.description || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      setIsSavingEdit(true);
      const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
      
      await updateDoc(doc(db, 'dashboard_gallery', editingItem.id), {
        title: editTitle || 'Belajar Membuat Aplikasi Sendiri Bersama Kepala Sekolah dan Tendik SCB',
        description: editDescription || 'Dokumentasi kegiatan pengembangan aplikasi MONETA SCB.',
        createdAt: serverTimestamp(), // Re-apply serverTimestamp to satisfy isValidGallery rule check
      });

      toast.success('Keterangan media berhasil diperbarui');
      setShowEditModal(false);
      setEditingItem(null);
    } catch (error: any) {
      console.error('Failed to update media details:', error);
      toast.error(`Gagal menyimpan: ${error.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: GalleryItem) => {
    if (!window.confirm('Hapus media ini?')) return;

    try {
      // Delete from storage first if it is an actual hosted storage url
      if (item.url && (item.url.startsWith('http') || item.url.startsWith('gs:'))) {
        try {
          const desertRef = ref(storage, item.url);
          await deleteObject(desertRef);
        } catch (err) {
          console.warn('Storage delete skipped or failed', err);
        }
      }

      await deleteDoc(doc(db, 'dashboard_gallery', item.id));
      toast.success('Media dihapus');
    } catch (error) {
      console.error(error);
      toast.error('Gagal menghapus media');
    }
  };

  const resetForm = () => {
    setTitle('Learning With MONETA SCB');
    setDescription('');
    setFile(null);
    setMediaType('image');
    setOptimizeImage(true);
  };

  return (
    <div className="space-y-8 pt-8 border-t border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
            <Presentation size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">
                Learning & Collaborating
              </h2>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 font-black text-[10px] tracking-widest uppercase px-2 py-0">Premium Feature</Badge>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1.5 flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-500" />
              GALERI DOKUMENTASI KEGIATAN DAN KOLABORASI STRATEGIS MONETA
            </p>
          </div>
        </div>

        {isOwner && (
          <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
            <DialogTrigger render={
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-6 h-12 font-bold shadow-lg shadow-indigo-200 transition-all border border-indigo-500/20">
                <Plus size={18} className="mr-2" />
                Tambah Media
              </Button>
            } />
            <DialogContent className="max-w-md rounded-[2rem] border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">UNGGAH MEDIA</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label>Judul</Label>
                  <Input 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="Judul kegiatan..."
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deskripsi</Label>
                  <Input 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Deskripsi singkat..."
                    className="rounded-xl"
                  />
                </div>
                <div className="flex gap-4">
                  <Button 
                    variant={mediaType === 'image' ? 'default' : 'outline'}
                    onClick={() => setMediaType('image')}
                    className="flex-1 rounded-xl"
                  >
                    <ImageIcon size={18} className="mr-2" />
                    Gambar
                  </Button>
                  <Button 
                    variant={mediaType === 'video' ? 'default' : 'outline'}
                    onClick={() => setMediaType('video')}
                    className="flex-1 rounded-xl"
                  >
                    <Video size={18} className="mr-2" />
                    Video
                  </Button>
                </div>
                {mediaType === 'image' && (
                  <div className="flex items-center gap-3 p-3 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl">
                    <input 
                      type="checkbox" 
                      id="optimize-toggle" 
                      checked={optimizeImage} 
                      onChange={(e) => setOptimizeImage(e.target.checked)}
                      className="h-4.5 w-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                    />
                    <label htmlFor="optimize-toggle" className="text-[11px] font-black tracking-wide text-indigo-950 cursor-pointer select-none leading-tight uppercase">
                      Kompresi Gambar Otomatis (Ubah resolusi agar upload instan)
                    </label>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>File</Label>
                  <div 
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <input 
                      id="file-upload" 
                      type="file" 
                      className="hidden" 
                      accept={mediaType === 'image' ? 'image/*' : 'video/*'}
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    {file ? (
                      <div className="flex items-center justify-center gap-2 text-indigo-600 font-bold">
                        <Upload size={20} />
                        <span className="truncate max-w-[200px]">{file.name}</span>
                      </div>
                    ) : (
                      <div className="text-slate-400">
                        <Upload size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-bold uppercase tracking-widest">Klik untuk pilih file</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <Button 
                    onClick={handleUpload} 
                    disabled={isUploading || !file} 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-xl"
                  >
                    {isUploading ? 'Sedang Diproses...' : 'Unggah Sekarang'}
                  </Button>

                  {isUploading && (
                    <div className="space-y-3">
                      {compressionProgress > 0 && compressionProgress < 100 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                            <span>Mengompresi Gambar...</span>
                            <span>{Math.round(compressionProgress)}%</span>
                          </div>
                          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-amber-400" 
                              initial={{ width: 0 }}
                              animate={{ width: `${compressionProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-black uppercase text-indigo-400">
                          <span>Mengunggah ke Server...</span>
                          <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-indigo-600" 
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-64 rounded-3xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-slate-50 border border-slate-100 rounded-[3rem] p-16 text-center">
          <div className="h-16 w-16 bg-white rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-4 shadow-sm">
            <Users2 size={32} />
          </div>
          <h3 className="text-lg font-black tracking-tight text-slate-900 uppercase">Belum ada dokumentasi</h3>
          <p className="text-slate-400 text-sm mt-1">Nantikan pembaruan kegiatan dan kolaborasi kami selanjutnya.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                <Card className="group relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-200/30 transition-all duration-500 flex flex-col h-full">
                  {/* Media container on TOP - landscape 16:10 aspect ratio */}
                  <div 
                    className="relative aspect-[16/10] overflow-hidden bg-slate-950 cursor-pointer"
                    onClick={() => setSelectedPreviewItem(item)}
                  >
                    {item.type === 'image' ? (
                      <div className="relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center">
                        {/* Blurred backdrop layers to guarantee beautiful backgrounds without black letterboxes */}
                        <img 
                          src={item.url} 
                          alt="" 
                          className="absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-110 pointer-events-none"
                          referrerPolicy="no-referrer"
                        />
                        {/* Sharp contain layer on top showing the true, uncut original file contents */}
                        <img 
                          src={item.url} 
                          alt={item.title} 
                          className="relative z-10 max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-[1.02]"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center">
                        <video 
                          src={item.url} 
                          className="relative z-10 max-w-full max-h-full object-contain opacity-95"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/25 transition-colors z-20">
                          <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 group-hover:scale-110 transition-transform shadow-lg">
                            <Play size={22} fill="currentColor" className="ml-1" />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Media Type Floating Badge */}
                    <div className="absolute top-4 left-4 bg-slate-900/60 backdrop-blur-md rounded-xl px-3 py-1.5 flex items-center gap-1.5 border border-white/10 shadow-sm z-10">
                       {item.type === 'image' ? <ImageIcon size={12} className="text-emerald-400" /> : <Video size={12} className="text-amber-400" />}
                       <span className="text-[9px] font-black tracking-widest uppercase text-white">{item.type}</span>
                    </div>

                    {/* Owner Edit / Delete Float actions on hover */}
                    {isOwner && (
                      <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(item);
                          }}
                          className="h-9 w-9 rounded-xl bg-white/90 hover:bg-white text-slate-800 border border-slate-200 shadow-sm transition-all flex items-center justify-center cursor-pointer"
                          title="Edit Keterangan"
                        >
                          <Edit2 size={13} />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item);
                          }}
                          className="h-9 w-9 rounded-xl bg-red-500 hover:bg-red-600 text-white border border-red-600/20 shadow-sm transition-all flex items-center justify-center cursor-pointer"
                          title="Hapus Media"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    )}

                    {/* Quick Lightbox View Overlay */}
                    <div className="absolute inset-0 bg-indigo-950/10 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center z-0">
                      <span className="bg-slate-900/80 backdrop-blur-md text-white border border-white/10 font-bold text-xs uppercase px-4 py-2 rounded-2xl shadow-lg flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                        Klik Untuk Lihat Detail
                      </span>
                    </div>
                  </div>

                  {/* Complete Description panel BELOW - White background with excellent typography and contrast */}
                  <div className="p-6 flex flex-col flex-1 justify-between bg-white">
                    <div className="space-y-2">
                      <h4 className="text-base font-black tracking-tight text-slate-900 leading-snug line-clamp-2 uppercase">
                        {item.title || 'Belajar Membuat Aplikasi Sendiri Bersama Kepala Sekolah dan Tendik SCB'}
                      </h4>
                      <p className="text-slate-500 text-xs font-bold leading-relaxed line-clamp-3">
                        {item.description || 'Workshop intensif pengembangan aplikasi MONETA SCB.'}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100/80 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>SCB ACADEMY DOCS</span>
                      <button 
                        type="button"
                        onClick={() => setSelectedPreviewItem(item)}
                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest cursor-pointer flex items-center gap-1.5"
                      >
                        Lihat Penuh →
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Fullscreen Lightbox Preview Modal */}
      <Dialog open={!!selectedPreviewItem} onOpenChange={(open) => !open && setSelectedPreviewItem(null)}>
        <DialogContent className="max-w-4xl w-[95vw] rounded-[2rem] border-none shadow-2xl bg-slate-950 text-white p-3 overflow-hidden flex flex-col justify-center">
          {selectedPreviewItem && (
            <div className="relative w-full flex flex-col bg-slate-950 rounded-[1.8rem] overflow-hidden">
              <div className="flex-1 flex items-center justify-center p-4 md:p-8 bg-slate-900/40 min-h-[40vh] max-h-[60vh]">
                {selectedPreviewItem.type === 'image' ? (
                  <img 
                    src={selectedPreviewItem.url} 
                    alt={selectedPreviewItem.title} 
                    className="max-h-[50vh] max-w-full object-contain rounded-2xl shadow-xl border border-white/5"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <video 
                    src={selectedPreviewItem.url} 
                    controls 
                    autoPlay
                    className="max-h-[50vh] max-w-full object-contain rounded-2xl shadow-xl"
                  />
                )}
              </div>
              
              {/* Image Description under Lightbox */}
              <div className="p-6 md:p-8 bg-slate-900 border-t border-white/5 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-black tracking-widest uppercase bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-md border border-indigo-500/10">
                    {selectedPreviewItem.type}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 tracking-wider">
                    DOKUMENTASI KEGIATAN SCB
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-black tracking-tight text-white uppercase leading-snug">
                  {selectedPreviewItem.title || 'Belajar Membuat Aplikasi Sendiri Bersama Kepala Sekolah dan Tendik SCB'}
                </h3>
                <p className="text-slate-300 text-xs md:text-sm leading-relaxed mt-2.5 font-bold">
                  {selectedPreviewItem.description || 'Workshop intensif pengembangan aplikasi MONETA SCB.'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Media Details Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md rounded-[2rem] border-none shadow-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2 uppercase">
              <Edit2 size={20} className="text-indigo-600" />
              EDIT KETERANGAN MEDIA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Judul Media</Label>
              <Input 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)} 
                placeholder="Judul media baru..."
                className="rounded-xl border-slate-200 focus-visible:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Deskripsi Media</Label>
              <Input 
                value={editDescription} 
                onChange={(e) => setEditDescription(e.target.value)} 
                placeholder="Deskripsi media baru..."
                className="rounded-xl border-slate-200 focus-visible:ring-indigo-500"
              />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button 
                type="button"
                variant="outline"
                className="rounded-xl border-slate-200 font-bold px-4"
                disabled={isSavingEdit}
                onClick={() => setShowEditModal(false)}
              >
                Batal
              </Button>
              <Button 
                type="button"
                onClick={handleSaveEdit} 
                className="bg-indigo-600 hover:bg-indigo-700 font-bold text-white rounded-xl px-5"
                disabled={isSavingEdit}
              >
                {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
