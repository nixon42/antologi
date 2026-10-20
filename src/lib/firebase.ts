/**
 * Ruang Sastra - Firebase Integration & Dynamic Companion Layer
 * 
 * Modul ini menangani sinkronisasi fitur dinamis:
 * - Apresiasi / Tepuk Tangan pembaca (Claps)
 * - Komentar & diskusi karya sastra
 * - Form submisi karya siswa langsung dari web
 * - Unggah foto sampul ke Firebase Storage
 * 
 * JIKA kredensial Firebase tidak diisi di .env:
 * Modul ini otomatis beralih ke LocalStorage fallback tanpa error sama sekali.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  addDoc, 
  query, 
  orderBy, 
  getDocs,
  serverTimestamp,
  type Firestore
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.apiKey !== ''
);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (typeof window !== 'undefined' && isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (err) {
    console.warn('[Ruang Sastra] Gagal inisialisasi Firebase, beralih ke LocalStorage fallback:', err);
  }
}

// ----------------------------------------------------
// 1. FITUR APRESIASI / TEPUK TANGAN (CLAPS)
// ----------------------------------------------------

export async function getApresiasiCount(karyaId: string): Promise<number> {
  if (typeof window === 'undefined') return 0;

  if (db) {
    try {
      const docRef = doc(db, 'apresiasi', karyaId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return snapshot.data().count || 0;
      }
      return 0;
    } catch (e) {
      console.warn('Gagal memuat apresiasi Firebase, gunakan local storage', e);
    }
  }

  // Fallback LocalStorage
  const stored = localStorage.getItem(`rs_apresiasi_${karyaId}`);
  return stored ? parseInt(stored, 10) : 0;
}

export async function tambahApresiasi(karyaId: string): Promise<number> {
  if (typeof window === 'undefined') return 1;

  if (db) {
    try {
      const docRef = doc(db, 'apresiasi', karyaId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        await setDoc(docRef, { count: 1, updatedAt: serverTimestamp() });
        return 1;
      } else {
        await updateDoc(docRef, {
          count: increment(1),
          updatedAt: serverTimestamp()
        });
        const updated = await getDoc(docRef);
        return updated.data()?.count || 1;
      }
    } catch (e) {
      console.warn('Gagal tambah apresiasi Firebase, gunakan local storage', e);
    }
  }

  // Fallback LocalStorage
  const current = (await getApresiasiCount(karyaId)) + 1;
  localStorage.setItem(`rs_apresiasi_${karyaId}`, current.toString());
  return current;
}

// ----------------------------------------------------
// 2. FITUR KOMENTAR PEMBACA
// ----------------------------------------------------

export interface KomentarKarya {
  id?: string;
  nama: string;
  pesan: string;
  peran?: string; // Siswa, Guru, Alumni, dsb.
  createdAt: string | Date;
}

export async function getDaftarKomentar(karyaId: string): Promise<KomentarKarya[]> {
  if (typeof window === 'undefined') return [];

  if (db) {
    try {
      const q = query(
        collection(db, 'karya', karyaId, 'komentar'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({
        id: d.id,
        nama: d.data().nama,
        pesan: d.data().pesan,
        peran: d.data().peran || 'Pembaca',
        createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(),
      }));
    } catch (e) {
      console.warn('Gagal ambil komentar Firebase:', e);
    }
  }

  // Fallback LocalStorage
  const stored = localStorage.getItem(`rs_komentar_${karyaId}`);
  return stored ? JSON.parse(stored) : [];
}

export async function kirimKomentar(karyaId: string, data: Omit<KomentarKarya, 'id' | 'createdAt'>): Promise<KomentarKarya> {
  const newKomentar: KomentarKarya = {
    ...data,
    createdAt: new Date(),
  };

  if (db) {
    try {
      const colRef = collection(db, 'karya', karyaId, 'komentar');
      const docRef = await addDoc(colRef, {
        ...data,
        createdAt: serverTimestamp(),
      });
      newKomentar.id = docRef.id;
      return newKomentar;
    } catch (e) {
      console.warn('Gagal kirim komentar ke Firebase, simpan di local storage:', e);
    }
  }

  // Fallback LocalStorage
  const currentList = await getDaftarKomentar(karyaId);
  currentList.unshift(newKomentar);
  localStorage.setItem(`rs_komentar_${karyaId}`, JSON.stringify(currentList));
  return newKomentar;
}

// ----------------------------------------------------
// 3. FITUR SUBMISI KARYA SISWA KE REDAKSI
// ----------------------------------------------------

export interface SubmisiKaryaInput {
  judul: string;
  penulis: string;
  kelas: string;
  kategori: string;
  abstrakAtauPengantar: string;
  isiKarya: string;
  kontakPenulis?: string;
  fotoSampulUrl?: string;
}

export async function submitKaryaSiswa(data: SubmisiKaryaInput): Promise<{ success: boolean; id: string; message: string }> {
  if (db) {
    try {
      const docRef = await addDoc(collection(db, 'submisi_karya'), {
        ...data,
        status: 'menunggu_kurasi',
        submittedAt: serverTimestamp(),
      });
      return {
        success: true,
        id: docRef.id,
        message: 'Karya Anda berhasil dikirim ke Redaksi Ruang Sastra untuk dikurasi.'
      };
    } catch (e: any) {
      console.error('Error kirim ke Firestore:', e);
      return {
        success: false,
        id: '',
        message: 'Gagal mengirim karya ke Firebase: ' + (e.message || 'Error tidak diketahui')
      };
    }
  }

  // Fallback LocalStorage jika Firebase belum dikonfigurasi
  const id = 'draft_' + Date.now();
  const existingSubmisi = JSON.parse(localStorage.getItem('rs_submisi_drafts') || '[]');
  existingSubmisi.push({ ...data, id, submittedAt: new Date().toISOString(), status: 'tersimpan_lokal' });
  localStorage.setItem('rs_submisi_drafts', JSON.stringify(existingSubmisi));

  return {
    success: true,
    id,
    message: 'Karya berhasil disimpan di peramban lokal (Firebase belum dikonfigurasi). Silakan salin naskah untuk dikirim ke pembina sastra!'
  };
}

// ----------------------------------------------------
// 4. UNGGAH FOTO SAMPUL (FIREBASE STORAGE)
// ----------------------------------------------------

export async function uploadFotoKarya(file: File): Promise<string> {
  if (storage) {
    try {
      const fileName = `karya_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, `sampul_karya/${fileName}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      return downloadUrl;
    } catch (e) {
      console.error('Gagal upload ke Firebase Storage:', e);
      throw e;
    }
  }

  // Fallback to Data URL for local preview
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
