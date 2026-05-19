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
  Sparkles
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
      setUploadProgress(0);
      setCompressionProgress(0);
      
      let fileToUpload = file;

      // Compress if it's an image
      if (mediaType === 'image') {
        const options = {
          maxSizeMB: 0.4, // More aggressive compression
          maxWidthOrHeight: 1200,
          useWebWorker: true,
          onProgress: (p: number) => setCompressionProgress(p)
        };
        try {
          fileToUpload = await imageCompression(file, options);
          console.log(`Image compressed from ${file.size / 1024 / 1024}MB to ${fileToUpload.size / 1024 / 1024}MB`);
        } catch (compressionError) {
          console.warn('Compression failed, uploading original', compressionError);
        }
      }

      const storageRef = ref(storage, `gallery/${Date.now()}_${fileToUpload.name}`);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error) => {
          console.error('Upload failed:', error);
          toast.error(`Gagal mengunggah: ${error.message}`);
          setIsUploading(false);
        }, 
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);

          await addDoc(collection(db, 'dashboard_gallery'), {
            type: mediaType,
            url,
            title,
            description,
            createdAt: serverTimestamp(),
          });

          toast.success('Media berhasil disimpan');
          setShowUploadModal(false);
          resetForm();
          setIsUploading(false);
        }
      );

    } catch (error: any) {
      console.error(error);
      toast.error(`Terjadi kesalahan: ${error.message}`);
      setIsUploading(false);
    }
  };

  const handleDelete = async (item: GalleryItem) => {
    if (!window.confirm('Hapus media ini?')) return;

    try {
      // Delete from storage first (best effort)
      try {
        const desertRef = ref(storage, item.url);
        await deleteObject(desertRef);
      } catch (err) {
        console.warn('Storage delete skipped or failed', err);
      }

      await deleteDoc(doc(db, 'dashboard_gallery', item.id));
      toast.success('Media dihapus');
    } catch (error) {
      console.error(error);
      toast.error('Gagal menghapus media');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFile(null);
    setMediaType('image');
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
                <Card className="group relative overflow-hidden rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-200/40 transition-all duration-500 bg-white">
                  <div className="aspect-[4/5] overflow-hidden bg-slate-900">
                    {item.type === 'image' ? (
                      <img 
                        src={item.url} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="relative w-full h-full">
                        <video 
                          src={item.url} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 group-hover:scale-110 transition-transform">
                            <Play size={24} fill="currentColor" />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-8 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                      <div className="flex items-center gap-2 mb-3">
                         {item.type === 'image' ? <ImageIcon size={14} className="text-emerald-400" /> : <Video size={14} className="text-amber-400" />}
                         <span className="text-[10px] font-black tracking-widest uppercase text-white/60">{item.type}</span>
                      </div>
                      <h4 className="text-xl font-black tracking-tight text-white mb-2 leading-tight">
                        {item.title || 'Tanpa Judul'}
                      </h4>
                      <p className="text-white/60 text-xs font-bold leading-relaxed line-clamp-2">
                        {item.description || 'Kegiatan kolaborasi strategis dalam penguatan ekosistem zakat.'}
                      </p>
                    </div>

                    {isOwner && (
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(item)}
                        className="absolute top-6 right-6 h-10 w-10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/20 hover:bg-red-500 backdrop-blur-md border border-red-500/30"
                      >
                        <Trash2 size={18} />
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
