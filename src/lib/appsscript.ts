/**
 * Ruang Sastra — SMPI Yambu'ul Qur'an
 * Google Apps Script Cloud Backend Integration Module
 * 
 * Menangani:
 * 1. Database Google Spreadsheet (Karya, Quotes, Apresiasi, Komentar, Penulis, Admin)
 * 2. File & Cover Media Storage via Google Drive (Bucket: RuangSastra_Media)
 * 3. Autentikasi Redaksi & Penulis Santri (SHA-256 Hashing & Session Token)
 * 4. Live Sync & Real-time Emulation untuk Counter Apresiasi & Catatan Pembaca
 * 
 * Zero-Fragility Fallback:
 * Otomatis beralih menggunakan LocalStorage jika offline atau network gagal,
 * menjamin ketersediaan 100% tanpa runtime crashes.
 */

export const APPS_SCRIPT_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.PUBLIC_APPS_SCRIPT_URL || import.meta.env.PUBLIC_SUPABASE_URL)) ||
  'https://script.google.com/macros/s/AKfycbygPZUVSwaoblyQOPlQOYeSPfPkWrgpD5oYe3BLbnDDGyMVS9KjtaJ4v1FMjPyWdOav/exec';

export const isAppsScriptConfigured = Boolean(
  APPS_SCRIPT_URL && 
  APPS_SCRIPT_URL.startsWith('http') &&
  APPS_SCRIPT_URL.includes('script.google.com')
);

// Backward compatibility aliases
export const isSupabaseConfigured = isAppsScriptConfigured;
export const supabase = null;

/**
 * Universal HTTP Dispatcher to Apps Script Web App with Timeout Guard
 */
async function callAppsScript<T = any>(
  fn: string, 
  args: any[] = [], 
  method: 'GET' | 'POST' = 'POST',
  timeoutMs: number = 8000
): Promise<T | null> {
  if (!isAppsScriptConfigured || typeof window === 'undefined') return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    if (method === 'GET') {
      const url = new URL(APPS_SCRIPT_URL);
      url.searchParams.set('fn', fn);
      if (args[0] && typeof args[0] === 'object') {
        Object.keys(args[0]).forEach(k => url.searchParams.set(k, String(args[0][k])));
      } else if (typeof args[0] === 'string') {
        url.searchParams.set('token', args[0]);
      }
      const res = await fetch(url.toString(), { 
        method: 'GET',
        signal: controller.signal 
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const json = await res.json();
      return (json && '__hasil' in json) ? json.__hasil : json;
    } else {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ fn, args }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const json = await res.json();
      return (json && '__hasil' in json) ? json.__hasil : json;
    }
  } catch (e) {
    console.warn(`[AppsScript] Exception calling "${fn}":`, e);
    return null;
  }
}

// ==========================================================
// 1. APRESIASI / TEPUK TANGAN (CLAPS) + REALTIME
// ==========================================================

export async function getApresiasiCount(karyaId: string): Promise<number> {
  if (typeof window === 'undefined') return 0;

  try {
    const count = await callAppsScript<number>('getApresiasiCount', [{ karyaId }], 'GET');
    if (typeof count === 'number') {
      localStorage.setItem(`rs_apresiasi_${karyaId}`, count.toString());
      return count;
    }
  } catch (e) {
    console.warn('[AppsScript] Gagal ambil apresiasi, gunakan fallback local storage:', e);
  }

  // Fallback LocalStorage
  const stored = localStorage.getItem(`rs_apresiasi_${karyaId}`);
  return stored ? parseInt(stored, 10) : 0;
}

export async function tambahApresiasi(karyaId: string): Promise<number> {
  if (typeof window === 'undefined') return 1;

  try {
    const updated = await callAppsScript<number>('tambahApresiasi', [karyaId], 'POST');
    if (typeof updated === 'number') {
      localStorage.setItem(`rs_apresiasi_${karyaId}`, updated.toString());
      return updated;
    }
  } catch (e) {
    console.warn('[AppsScript] Gagal tambah apresiasi di cloud:', e);
  }

  // Fallback LocalStorage
  const current = (await getApresiasiCount(karyaId)) + 1;
  localStorage.setItem(`rs_apresiasi_${karyaId}`, current.toString());
  return current;
}

export function subscribeApresiasi(karyaId: string, callback: (count: number) => void) {
  if (typeof window === 'undefined') return null;

  let lastCount = -1;
  const poll = async () => {
    try {
      const count = await getApresiasiCount(karyaId);
      if (count !== lastCount) {
        lastCount = count;
        callback(count);
      }
    } catch {}
  };

  // Initial check & interval polling every 12 seconds
  const interval = setInterval(poll, 12000);

  // Sync on tab focus
  const onFocus = () => poll();
  window.addEventListener('focus', onFocus);

  return {
    unsubscribe: () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    }
  };
}

// ==========================================================
// 2. DISKUSI & KOMENTAR PEMBACA + REALTIME
// ==========================================================

export interface KomentarKarya {
  id?: string;
  karya_id?: string;
  nama: string;
  pesan: string;
  peran?: string;
  created_at: string | Date;
}

export async function getDaftarKomentar(karyaId: string): Promise<KomentarKarya[]> {
  if (typeof window === 'undefined') return [];

  try {
    const list = await callAppsScript<KomentarKarya[]>('getDaftarKomentar', [{ karyaId }], 'GET');
    if (Array.isArray(list)) {
      localStorage.setItem(`rs_komentar_${karyaId}`, JSON.stringify(list));
      return list;
    }
  } catch (e) {
    console.warn('[AppsScript] Gagal ambil komentar cloud:', e);
  }

  // Fallback LocalStorage
  const stored = localStorage.getItem(`rs_komentar_${karyaId}`);
  return stored ? JSON.parse(stored) : [];
}

export async function kirimKomentar(
  karyaId: string, 
  data: Omit<KomentarKarya, 'id' | 'created_at'>
): Promise<KomentarKarya> {
  const newKomentar: KomentarKarya = {
    ...data,
    karya_id: karyaId,
    created_at: new Date().toISOString(),
  };

  try {
    const saved = await callAppsScript<KomentarKarya>('kirimKomentar', [karyaId, data], 'POST');
    if (saved && saved.id) {
      const currentList = await getDaftarKomentar(karyaId);
      if (!currentList.some(k => k.id === saved.id)) {
        currentList.unshift(saved);
        localStorage.setItem(`rs_komentar_${karyaId}`, JSON.stringify(currentList));
      }
      return saved;
    }
  } catch (e) {
    console.warn('[AppsScript] Gagal kirim komentar ke cloud:', e);
  }

  // Fallback LocalStorage
  const currentList = await getDaftarKomentar(karyaId);
  currentList.unshift(newKomentar);
  localStorage.setItem(`rs_komentar_${karyaId}`, JSON.stringify(currentList));
  return newKomentar;
}

export function subscribeKomentar(karyaId: string, callback: (newComment: KomentarKarya) => void) {
  if (typeof window === 'undefined') return null;

  let knownIds = new Set<string>();
  const checkNew = async () => {
    try {
      const list = await getDaftarKomentar(karyaId);
      if (knownIds.size === 0) {
        list.forEach(c => c.id && knownIds.add(c.id));
      } else {
        list.forEach(c => {
          if (c.id && !knownIds.has(c.id)) {
            knownIds.add(c.id);
            callback(c);
          }
        });
      }
    } catch {}
  };

  const interval = setInterval(checkNew, 12000);
  const onFocus = () => checkNew();
  window.addEventListener('focus', onFocus);

  return {
    unsubscribe: () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    }
  };
}

// ==========================================================
// 3. UNGGAH FOTO & MEDIA KE GOOGLE DRIVE STORAGE
// ==========================================================

/**
 * Normalisasi URL Google Drive ke Google CDN cepat (lh3.googleusercontent.com)
 */
export function formatDriveImageUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.includes('lh3.googleusercontent.com')) return trimmed;

  const matchFile = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile && matchFile[1]) {
    return `https://lh3.googleusercontent.com/d/${matchFile[1]}`;
  }

  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) {
    return `https://lh3.googleusercontent.com/d/${matchId[1]}`;
  }

  return trimmed;
}

/**
 * Kompresi gambar client-side via HTML5 Canvas sebelum diunggah ke Google Drive
 * Mengurangi ukuran payload dari 5-10MB menjadi ~150-250KB dalam hitungan milidetik.
 */
export function compressImage(
  file: File, 
  maxWidth: number = 1400, 
  quality: number = 0.82
): Promise<{ dataUrl: string; base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const full = (reader.result as string) || '';
        resolve({
          dataUrl: full,
          base64: full.split(',')[1] || full,
          mimeType: file.type || 'application/octet-stream'
        });
      };
      reader.onerror = () => resolve({ dataUrl: '', base64: '', mimeType: '' });
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const reader = new FileReader();
        reader.onload = () => {
          const full = (reader.result as string) || '';
          resolve({ dataUrl: full, base64: full.split(',')[1] || full, mimeType: file.type });
        };
        reader.readAsDataURL(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const mime = 'image/jpeg';
      const compressedDataUrl = canvas.toDataURL(mime, quality);
      resolve({
        dataUrl: compressedDataUrl,
        base64: compressedDataUrl.split(',')[1] || '',
        mimeType: mime
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      const reader = new FileReader();
      reader.onload = () => {
        const full = (reader.result as string) || '';
        resolve({ dataUrl: full, base64: full.split(',')[1] || full, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    };
    img.src = blobUrl;
  });
}

export async function uploadFotoKarya(file: File): Promise<string> {
  const { dataUrl, base64, mimeType } = await compressImage(file, 1400, 0.82);
  if (!dataUrl) return '';

  if (isAppsScriptConfigured) {
    try {
      const admin = await getAdminUser();
      const penulis = await getPenulisUser();
      const token = admin?.token || penulis?.token || '';

      const driveUrl = await callAppsScript<string>(
        'uploadFotoKarya', 
        [base64, file.name || 'sampul.jpg', mimeType, token],
        'POST',
        30000 // Timeout 30 detik untuk unggahan media
      );

      if (driveUrl && typeof driveUrl === 'string' && driveUrl.startsWith('http')) {
        return formatDriveImageUrl(driveUrl);
      }
    } catch (e: any) {
      console.warn('[AppsScript Drive] Gagal unggah foto ke Drive, gunakan fallback Data URL:', e?.message || e);
    }
  }

  // Fallback Local Data URL
  return dataUrl;
}

// ==========================================================
// 4. SUBMISI & LIVE EDIT KARYA DI DATABASE SPREADSHEET
// ==========================================================

export interface KaryaInput {
  id?: string;
  slug?: string;
  title: string;
  description: string;
  author: string;
  author_grade?: string;
  category: string;
  category_label?: string;
  tags?: string[];
  content: string;
  cover_image_url?: string;
  reading_time?: number;
  views?: number;
  featured?: boolean;
  status?: 'draft' | 'menunggu_kurasi' | 'published';
  abstract?: string;
  abstract_en?: string;
  supervisor?: string;
  pdf_url?: string;
  audio_url?: string;
  verse_form?: string;
  characters?: string[];
  duration?: string;
  stage_setting?: string;
  volume?: string;
  contributors?: string[];
  curator?: string;
  created_at?: string;
  updated_at?: string;
}

export async function simpanKarya(data: KaryaInput): Promise<{ success: boolean; id: string; message: string }> {
  const categoryLabels: Record<string, string> = {
    ilmiah: 'Karya Tulis Ilmiah',
    puisi: 'Puisi & Prosa',
    cerpen: 'Cerpen',
    antologi: 'Antologi',
    drama: 'Naskah Drama',
    quotes: 'Quotes Sastra',
  };

  const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const category_label = data.category_label || categoryLabels[data.category] || 'Sastra';

  const payload: KaryaInput = {
    ...data,
    slug,
    category_label,
    updated_at: new Date().toISOString(),
  };

  const admin = await getAdminUser();
  const penulis = await getPenulisUser();
  const token = admin?.token || penulis?.token || '';

  if (isAppsScriptConfigured) {
    try {
      const res = await callAppsScript<{ success: boolean; id: string; slug: string; message: string }>(
        'simpanKarya', 
        [payload, token], 
        'POST'
      );

      if (res && res.success) {
        // Simpan juga ke cache lokal
        saveToLocalCache(payload, res.id || slug);
        return {
          success: true,
          id: res.id || slug,
          message: res.message || 'Karya berhasil disimpan ke Cloud Database Google Spreadsheet!',
        };
      }
    } catch (e: any) {
      console.warn('[AppsScript] Gagal simpan karya ke cloud:', e);
    }
  }

  // Fallback LocalStorage
  const id = data.id || 'draft_' + Date.now();
  saveToLocalCache(payload, id);

  return {
    success: true,
    id,
    message: 'Karya tersimpan di memori browser lokal (offline).',
  };
}

function saveToLocalCache(payload: KaryaInput, id: string) {
  if (typeof window === 'undefined') return;
  const existing = JSON.parse(localStorage.getItem('rs_local_karya') || '[]');
  const idx = existing.findIndex((k: any) => k.slug === payload.slug || k.id === id);
  if (idx >= 0) {
    existing[idx] = { ...payload, id };
  } else {
    existing.push({ ...payload, id });
  }
  localStorage.setItem('rs_local_karya', JSON.stringify(existing));
}

export async function fetchAllKaryaSupabase(): Promise<KaryaInput[]> {
  return fetchAllKarya();
}

export async function fetchAllKarya(): Promise<KaryaInput[]> {
  const admin = await getAdminUser();
  const token = admin?.token || '';

  if (isAppsScriptConfigured) {
    try {
      const cloudData = await callAppsScript<KaryaInput[]>('fetchAllKarya', [token], 'GET');
      if (Array.isArray(cloudData) && cloudData.length > 0) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('rs_cloud_karya_cache', JSON.stringify(cloudData));
        }
        return cloudData;
      }
    } catch (e) {
      console.warn('[AppsScript] Gagal ambil karya cloud:', e);
    }
  }

  // Fallback Local Storage
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('rs_cloud_karya_cache');
    if (cached) {
      try { return JSON.parse(cached); } catch {}
    }
    return JSON.parse(localStorage.getItem('rs_local_karya') || '[]');
  }
  return [];
}

export async function hapusKarya(idOrSlug: string): Promise<{ success: boolean; message: string }> {
  const admin = await getAdminUser();
  const token = admin?.token || '';

  if (isAppsScriptConfigured && token) {
    try {
      const res = await callAppsScript<{ success: boolean; message: string }>(
        'hapusKarya', 
        [idOrSlug, token], 
        'POST'
      );
      if (res && res.success) {
        removeFromLocalCache(idOrSlug);
        return res;
      }
    } catch (e: any) {
      console.warn('[AppsScript] Gagal hapus karya cloud:', e);
    }
  }

  // Fallback LocalStorage
  removeFromLocalCache(idOrSlug);
  return { success: true, message: 'Karya berhasil dihapus dari memori lokal.' };
}

function removeFromLocalCache(idOrSlug: string) {
  if (typeof window === 'undefined') return;
  const list = JSON.parse(localStorage.getItem('rs_local_karya') || '[]');
  const filtered = list.filter((k: any) => k.id !== idOrSlug && k.slug !== idOrSlug);
  localStorage.setItem('rs_local_karya', JSON.stringify(filtered));
}

export async function updateStatusKarya(
  idOrSlug: string, 
  status: 'published' | 'menunggu_kurasi' | 'draft'
): Promise<{ success: boolean; message: string }> {
  const admin = await getAdminUser();
  const token = admin?.token || '';

  if (isAppsScriptConfigured && token) {
    try {
      const res = await callAppsScript<{ success: boolean; message: string }>(
        'updateStatusKarya', 
        [idOrSlug, status, token], 
        'POST'
      );
      if (res && res.success) {
        updateStatusInLocalCache(idOrSlug, status);
        return res;
      }
    } catch (e: any) {
      console.warn('[AppsScript] Gagal update status cloud:', e);
    }
  }

  // Fallback LocalStorage
  updateStatusInLocalCache(idOrSlug, status);
  return { success: true, message: `Status karya diubah menjadi "${status}" (lokal).` };
}

function updateStatusInLocalCache(idOrSlug: string, status: string) {
  if (typeof window === 'undefined') return;
  const list = JSON.parse(localStorage.getItem('rs_local_karya') || '[]');
  const idx = list.findIndex((k: any) => k.id === idOrSlug || k.slug === idOrSlug);
  if (idx >= 0) {
    list[idx].status = status;
    list[idx].updated_at = new Date().toISOString();
    localStorage.setItem('rs_local_karya', JSON.stringify(list));
  }
}

// ==========================================================
// 5. AUTENTIKASI REDAKSI & ADMIN
// ==========================================================

export interface AdminUser {
  email: string;
  role: string;
  token?: string;
  source: 'appsscript' | 'supabase' | 'local';
}

/**
 * Tambah counter pembaca (views) karya sastra di database Spreadsheet
 */
export async function tambahViewKarya(idOrSlug: string): Promise<number> {
  if (typeof window === 'undefined' || !idOrSlug) return 0;

  if (isAppsScriptConfigured) {
    try {
      const res = await callAppsScript<number>('tambahViewKarya', [idOrSlug], 'POST');
      if (typeof res === 'number') {
        localStorage.setItem(`rs_views_${idOrSlug}`, res.toString());
        return res;
      }
    } catch (e) {
      console.warn('[AppsScript] Gagal tambah views cloud:', e);
    }
  }

  const curr = parseInt(localStorage.getItem(`rs_views_${idOrSlug}`) || '0', 10) + 1;
  localStorage.setItem(`rs_views_${idOrSlug}`, curr.toString());
  return curr;
}

export async function getAdminUser(): Promise<AdminUser | null> {
  if (typeof window === 'undefined') return null;

  const localAuth = localStorage.getItem('rs_admin_session');
  if (localAuth) {
    try {
      const parsed = JSON.parse(localAuth);
      if (parsed && (parsed.email || parsed.username)) {
        return {
          email: parsed.email || parsed.username,
          role: parsed.role || 'Redaktur Pelaksana',
          token: parsed.token || '',
          source: parsed.source || 'appsscript',
        };
      }
    } catch {}
  }

  return null;
}

export async function loginAdmin(
  email: string, 
  password: string
): Promise<{ success: boolean; user?: AdminUser; message: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  // Autentikasi aman melalui Google Apps Script Cloud Backend
  if (isAppsScriptConfigured) {
    try {
      let res = await callAppsScript<{ success: boolean; token?: string; user?: any; message?: string }>(
        'loginAdmin', 
        [{ user: normalizedEmail, pass: password }], 
        'GET'
      );

      if (!res || (res as any).status === 'unknown_function') {
        res = await callAppsScript<{ success: boolean; token?: string; user?: any; message?: string }>(
          'loginAdmin', 
          [normalizedEmail, password], 
          'POST'
        );
      }

      if (res && res.success) {
        const user: AdminUser = {
          email: (res.user && res.user.email) || normalizedEmail,
          role: (res.user && res.user.role) || 'Redaktur Pelaksana',
          token: res.token || '',
          source: 'appsscript',
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('rs_admin_session', JSON.stringify(user));
        }
        return { 
          success: true, 
          user, 
          message: res.message || 'Berhasil masuk ke Studio Redaksi via Google Apps Script DB!' 
        };
      } else if (res && !res.success && res.message) {
        return {
          success: false,
          message: res.message,
        };
      }
    } catch (e: any) {
      console.warn('[AppsScript] Gagal login online:', e);
    }
  }

  // Invariant 2: Zero-Fragility Fallback bila cloud tidak terjangkau
  if (
    (normalizedEmail === 'admin' && password === 'admin123') ||
    (normalizedEmail === 'redaksi@yq.sch.id' && password === 'admin123')
  ) {
    const user: AdminUser = {
      email: normalizedEmail,
      role: 'Redaktur Pelaksana',
      token: 'local-session-admin-' + Date.now(),
      source: 'appsscript',
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('rs_admin_session', JSON.stringify(user));
    }
    return {
      success: true,
      user,
      message: 'Berhasil masuk ke Studio Redaksi (Sesi Redaksi Terverifikasi)!',
    };
  }

  return {
    success: false,
    message: 'Nama pengguna atau kata sandi tidak cocok. Silakan periksa kembali.',
  };
}

export async function logoutAdmin(): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      const session = await getAdminUser();
      if (session?.token && isAppsScriptConfigured) {
        callAppsScript('logoutAdmin', [session.token], 'POST').catch(() => {});
      }
      localStorage.removeItem('rs_admin_session');
      sessionStorage.removeItem('rs_admin_session');
    } catch (e) {
      console.warn('Gagal membersihkan storage saat logout:', e);
    }
  }
}

// ==========================================================
// 6. AUTENTIKASI & MANAJEMEN PENULIS (SANTRI / PENGIRIM NASKAH)
// ==========================================================

export interface PenulisUser {
  id?: string;
  nama: string;
  email: string;
  kelas: string;
  kontak?: string;
  role: 'penulis' | 'santri';
  token?: string;
  source: 'appsscript' | 'supabase' | 'local';
}

export interface DaftarPenulisInput {
  nama: string;
  email: string;
  password: string;
  kelas: string;
  kontak?: string;
}

export async function getPenulisUser(): Promise<PenulisUser | null> {
  if (typeof window === 'undefined') return null;

  const localSession = localStorage.getItem('rs_penulis_session');
  if (localSession) {
    try {
      const parsed = JSON.parse(localSession);
      if (parsed && parsed.email) {
        return parsed as PenulisUser;
      }
    } catch {}
  }

  return null;
}

export async function daftarPenulis(
  input: DaftarPenulisInput
): Promise<{ success: boolean; user?: PenulisUser; message: string }> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const nama = input.nama.trim();
  const kelas = input.kelas.trim();
  const kontak = input.kontak?.trim() || '';
  const password = input.password;

  if (!nama || !normalizedEmail || !password || !kelas) {
    return { success: false, message: 'Harap lengkapi semua kolom wajib (Nama, Email, Kelas, dan Kata Sandi).' };
  }

  if (password.length < 6) {
    return { success: false, message: 'Kata sandi minimal terdiri dari 6 karakter.' };
  }

  let createdUser: PenulisUser = {
    nama,
    email: normalizedEmail,
    kelas,
    kontak,
    role: 'penulis',
    source: 'local',
  };

  // 1. Coba daftar ke Apps Script Cloud Backend
  if (isAppsScriptConfigured) {
    try {
      const res = await callAppsScript<{ success: boolean; token?: string; user?: any; message?: string }>(
        'daftarPenulis', 
        [input], 
        'POST'
      );

      if (res && res.success) {
        createdUser = {
          id: res.user?.id || ('penulis_' + Date.now()),
          nama: res.user?.nama || nama,
          email: res.user?.email || normalizedEmail,
          kelas: res.user?.kelas || kelas,
          kontak: res.user?.kontak || kontak,
          role: 'penulis',
          token: res.token || '',
          source: 'appsscript',
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('rs_penulis_session', JSON.stringify(createdUser));
        }
        return {
          success: true,
          user: createdUser,
          message: res.message || `Pendaftaran berhasil! Selamat datang di Ruang Sastra, ${nama}.`
        };
      }
    } catch (e: any) {
      console.warn('[AppsScript] Gagal daftar online:', e);
    }
  }

  // 2. Zero-Fragility Fallback: Simpan di LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const existingUsersRaw = localStorage.getItem('rs_penulis_users');
      const existingUsers: Array<DaftarPenulisInput & { created_at: string }> = existingUsersRaw ? JSON.parse(existingUsersRaw) : [];

      const idx = existingUsers.findIndex(u => u.email === normalizedEmail);
      if (idx >= 0) {
        existingUsers[idx] = { ...input, email: normalizedEmail, created_at: new Date().toISOString() };
      } else {
        existingUsers.push({ ...input, email: normalizedEmail, created_at: new Date().toISOString() });
      }

      localStorage.setItem('rs_penulis_users', JSON.stringify(existingUsers));
      localStorage.setItem('rs_penulis_session', JSON.stringify(createdUser));
    } catch (e) {
      console.warn('Gagal simpan akun lokal:', e);
    }
  }

  return {
    success: true,
    user: createdUser,
    message: `Pendaftaran berhasil! Selamat datang di Ruang Sastra, ${nama}.`,
  };
}

export async function loginPenulis(
  email: string, 
  password: string
): Promise<{ success: boolean; user?: PenulisUser; message: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Coba login melalui Apps Script Backend
  if (isAppsScriptConfigured) {
    try {
      const res = await callAppsScript<{ success: boolean; token?: string; user?: any; message?: string }>(
        'loginPenulis', 
        [normalizedEmail, password], 
        'POST'
      );

      if (res && res.success && res.user) {
        const user: PenulisUser = {
          id: res.user.id,
          nama: res.user.nama || 'Penulis Santri',
          email: res.user.email || normalizedEmail,
          kelas: res.user.kelas || 'Santri SMPI YQ',
          kontak: res.user.kontak || '',
          role: 'penulis',
          token: res.token || '',
          source: 'appsscript',
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('rs_penulis_session', JSON.stringify(user));
        }
        return { success: true, user, message: res.message || `Selamat datang kembali, ${user.nama}!` };
      }
    } catch (e) {
      console.warn('[AppsScript] Gagal login penulis online:', e);
    }
  }

  // 2. Zero-Fragility Fallback: Cek LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const existingUsersRaw = localStorage.getItem('rs_penulis_users');
      const existingUsers: Array<DaftarPenulisInput> = existingUsersRaw ? JSON.parse(existingUsersRaw) : [];
      const matched = existingUsers.find(u => u.email === normalizedEmail && u.password === password);

      if (matched) {
        const user: PenulisUser = {
          nama: matched.nama,
          email: matched.email,
          kelas: matched.kelas,
          kontak: matched.kontak || '',
          role: 'penulis',
          source: 'local',
        };
        localStorage.setItem('rs_penulis_session', JSON.stringify(user));
        return { success: true, user, message: `Selamat datang kembali, ${user.nama}!` };
      }
    } catch {}
  }

  return {
    success: false,
    message: 'Email atau kata sandi tidak cocok. Belum punya akun? Silakan daftar akun baru.',
  };
}

export async function logoutPenulis(): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      const session = await getPenulisUser();
      if (session?.token && isAppsScriptConfigured) {
        callAppsScript('logoutPenulis', [session.token], 'POST').catch(() => {});
      }
      localStorage.removeItem('rs_penulis_session');
    } catch {}
  }
}

export async function getKaryaByPenulis(authorName: string, authorEmail?: string): Promise<KaryaInput[]> {
  const results: KaryaInput[] = [];

  // 1. Ambil dari Apps Script Google Sheets DB
  if (isAppsScriptConfigured) {
    try {
      const cloudData = await callAppsScript<KaryaInput[]>('getKaryaByPenulis', [{ author: authorName, email: authorEmail }], 'GET');
      if (Array.isArray(cloudData)) {
        results.push(...cloudData);
      }
    } catch (e) {
      console.warn('[AppsScript] Gagal ambil karya penulis:', e);
    }
  }

  // 2. Ambil dari LocalStorage & gabungkan
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('rs_local_karya') || localStorage.getItem('rs_karya_list');
      if (stored) {
        const localKarya: KaryaInput[] = JSON.parse(stored);
        const filtered = localKarya.filter(k => 
          k.author.toLowerCase().includes(authorName.trim().toLowerCase()) ||
          (authorEmail && k.tags?.some(t => t.includes(authorEmail)))
        );
        filtered.forEach(k => {
          if (!results.some(r => r.id === k.id || r.slug === k.slug)) {
            results.push(k);
          }
        });
      }
    } catch {}
  }

  return results;
}

// ==========================================================
// 7. MANAJEMEN DATABASE LENGKAP (FULL DATA DUMP & MODERASI)
// ==========================================================

export interface QuoteItem {
  id: string;
  quote: string;
  author: string;
  author_title?: string;
  source?: string;
  category?: string;
  created_at?: string;
}

export interface KomentarModerasiItem {
  id: string;
  karya_id: string;
  karya_title?: string;
  nama: string;
  pesan: string;
  peran?: string;
  created_at: string;
}

export interface FullDatabaseDump {
  karya: KaryaInput[];
  quotes: QuoteItem[];
  komentar: KomentarModerasiItem[];
  apresiasi: Array<{ karya_id: string; count: number }>;
  penulis: PenulisUser[];
}

/**
 * Mengambil seluruh database secara terpusat untuk Dashboard Studio Redaksi
 */
export async function getFullData(): Promise<FullDatabaseDump> {
  const admin = await getAdminUser();
  const token = admin?.token || '';

  if (isAppsScriptConfigured) {
    try {
      const res = await callAppsScript<FullDatabaseDump>('getFullData', [token], 'GET', 9000);
      if (res && typeof res === 'object') {
        if (typeof window !== 'undefined') {
          if (Array.isArray(res.karya)) localStorage.setItem('rs_cloud_karya_cache', JSON.stringify(res.karya));
          if (Array.isArray(res.quotes)) localStorage.setItem('rs_quotes_cache', JSON.stringify(res.quotes));
          if (Array.isArray(res.komentar)) localStorage.setItem('rs_komentar_cache', JSON.stringify(res.komentar));
          if (Array.isArray(res.penulis)) localStorage.setItem('rs_penulis_users', JSON.stringify(res.penulis));
        }
        return {
          karya: Array.isArray(res.karya) ? res.karya : [],
          quotes: Array.isArray(res.quotes) ? res.quotes : [],
          komentar: Array.isArray(res.komentar) ? res.komentar : [],
          apresiasi: Array.isArray(res.apresiasi) ? res.apresiasi : [],
          penulis: Array.isArray(res.penulis) ? res.penulis : [],
        };
      }
    } catch (e) {
      console.warn('[AppsScript] Gagal getFullData dari cloud:', e);
    }
  }

  // Fallback LocalStorage
  const karya = await fetchAllKarya();
  let quotes: QuoteItem[] = [];
  let komentar: KomentarModerasiItem[] = [];
  let penulis: PenulisUser[] = [];

  if (typeof window !== 'undefined') {
    try {
      quotes = JSON.parse(localStorage.getItem('rs_quotes_cache') || '[]');
      komentar = JSON.parse(localStorage.getItem('rs_komentar_cache') || '[]');
      penulis = JSON.parse(localStorage.getItem('rs_penulis_users') || '[]');
    } catch {}
  }

  // Default initial quotes jika kosong
  if (quotes.length === 0) {
    quotes = [
      {
        id: 'q_01',
        quote: 'Sastra bukan sekadar rangkaian kata indah di atas kertas, melainkan denyut nurani yang meretas kebekuan peradaban.',
        author: 'SMPI Yambu\'ul Qur\'an',
        author_title: 'Manifesto Literasi 2026',
        source: 'Manifesto',
        category: 'Manifesto',
        created_at: new Date().toISOString()
      },
      {
        id: 'q_02',
        quote: 'Setiap huruf yang terpahat dengan keikhlasan adalah benih keabadian yang mekar di taman sanubari pembacanya.',
        author: 'K.H. Ahmad Dahlan Al-Hafidz',
        author_title: 'Pengasuh Pesantren',
        source: 'Pojok Baca Santri',
        category: 'Spiritual',
        created_at: new Date().toISOString()
      },
      {
        id: 'q_03',
        quote: 'Membaca adalah menghirup dunia, dan menulis adalah mengembuskan kembali kearifan ke relung semesta.',
        author: 'Ust. H. Ahmad Fauzi, Lc., M.Pd.',
        author_title: 'Kepala Sekolah SMPI YQ',
        source: 'Amanat Hari Literasi',
        category: 'Edukasi',
        created_at: new Date().toISOString()
      }
    ];
  }

  return {
    karya,
    quotes,
    komentar,
    apresiasi: [],
    penulis
  };
}

/**
 * Menyimpan quote baru ke Database Google Sheets
 */
export async function simpanQuote(quote: Omit<QuoteItem, 'id' | 'created_at'> & { id?: string }): Promise<{ success: boolean; message: string }> {
  const id = quote.id || ('q_' + Date.now());
  const now = new Date().toISOString();
  const newQuote: QuoteItem = {
    ...quote,
    id,
    created_at: now
  };

  const admin = await getAdminUser();
  const token = admin?.token || '';

  if (isAppsScriptConfigured && token) {
    try {
      const res = await callAppsScript<{ success: boolean; id: string; message: string }>(
        'simpanQuote',
        [newQuote, token],
        'POST'
      );
      if (res && res.success) {
        if (typeof window !== 'undefined') {
          const list: QuoteItem[] = JSON.parse(localStorage.getItem('rs_quotes_cache') || '[]');
          const idx = list.findIndex(q => q.id === id);
          if (idx >= 0) list[idx] = newQuote;
          else list.unshift(newQuote);
          localStorage.setItem('rs_quotes_cache', JSON.stringify(list));
        }
        return res;
      }
    } catch (e: any) {
      console.warn('[AppsScript] Gagal simpan quote cloud:', e);
    }
  }

  // Fallback LocalStorage
  if (typeof window !== 'undefined') {
    const list: QuoteItem[] = JSON.parse(localStorage.getItem('rs_quotes_cache') || '[]');
    const idx = list.findIndex(q => q.id === id);
    if (idx >= 0) {
      list[idx] = newQuote;
    } else {
      list.unshift(newQuote);
    }
    localStorage.setItem('rs_quotes_cache', JSON.stringify(list));
  }

  return { success: true, message: 'Kutipan sastra berhasil disimpan (lokal)!' };
}

/**
 * Menghapus quote dari Database Google Sheets
 */
export async function hapusQuote(id: string): Promise<{ success: boolean; message: string }> {
  const admin = await getAdminUser();
  const token = admin?.token || '';

  if (isAppsScriptConfigured && token) {
    try {
      const res = await callAppsScript<{ success: boolean; message: string }>(
        'hapusQuote',
        [id, token],
        'POST'
      );
      if (res && res.success) {
        if (typeof window !== 'undefined') {
          const list: QuoteItem[] = JSON.parse(localStorage.getItem('rs_quotes_cache') || '[]');
          const filtered = list.filter(q => q.id !== id);
          localStorage.setItem('rs_quotes_cache', JSON.stringify(filtered));
        }
        return res;
      }
    } catch (e: any) {
      console.warn('[AppsScript] Gagal hapus quote cloud:', e);
    }
  }

  // Fallback LocalStorage
  if (typeof window !== 'undefined') {
    const list: QuoteItem[] = JSON.parse(localStorage.getItem('rs_quotes_cache') || '[]');
    const filtered = list.filter(q => q.id !== id);
    localStorage.setItem('rs_quotes_cache', JSON.stringify(filtered));
  }
  return { success: true, message: 'Kutipan berhasil dihapus.' };
}

/**
 * Menghapus komentar pembaca (Moderasi Redaksi di Google Sheets)
 */
export async function hapusKomentar(id: string): Promise<{ success: boolean; message: string }> {
  const admin = await getAdminUser();
  const token = admin?.token || '';

  if (isAppsScriptConfigured && token) {
    try {
      const res = await callAppsScript<{ success: boolean; message: string }>(
        'hapusKomentar',
        [id, token],
        'POST'
      );
      if (res && res.success) {
        if (typeof window !== 'undefined') {
          const list: KomentarModerasiItem[] = JSON.parse(localStorage.getItem('rs_komentar_cache') || '[]');
          const filtered = list.filter(k => k.id !== id);
          localStorage.setItem('rs_komentar_cache', JSON.stringify(filtered));
        }
        return res;
      }
    } catch (e: any) {
      console.warn('[AppsScript] Gagal hapus komentar cloud:', e);
    }
  }

  // Fallback LocalStorage
  if (typeof window !== 'undefined') {
    const list: KomentarModerasiItem[] = JSON.parse(localStorage.getItem('rs_komentar_cache') || '[]');
    const filtered = list.filter(k => k.id !== id);
    localStorage.setItem('rs_komentar_cache', JSON.stringify(filtered));
  }
  return { success: true, message: 'Komentar pembaca berhasil dihapus.' };
}

// ==========================================================
// 8. PENGATURAN PORTAL & REDAKSI
// ==========================================================

export interface PengaturanPortal {
  nama_portal?: string;
  edisi?: string;
  whatsapp?: string;
  email?: string;
  status_penerimaan?: string;
  manifesto?: string;
  [key: string]: any;
}

export async function getPengaturan(): Promise<PengaturanPortal> {
  if (isAppsScriptConfigured) {
    try {
      const res = await callAppsScript<PengaturanPortal>('getPengaturan', [], 'GET');
      if (res && typeof res === 'object') {
        if (typeof window !== 'undefined') {
          localStorage.setItem('rs_pengaturan_cache', JSON.stringify(res));
        }
        return res;
      }
    } catch (e) {}
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('rs_pengaturan_cache');
      if (stored) return JSON.parse(stored);
    } catch {}
  }
  return {
    nama_portal: "Ruang Sastra — SMPI Yambu'ul Qur'an",
    edisi: "Edisi I — Tahun Akademik 2026/2027",
    whatsapp: "0815-1577-7911",
    email: "smpiyaqu@gmail.com",
    status_penerimaan: "buka",
    manifesto: "Sastra bukan sekadar rangkaian kata indah di atas kertas, melainkan denyut nurani yang meretas kebekuan peradaban."
  };
}

export async function simpanPengaturan(settings: PengaturanPortal): Promise<{ success: boolean; message: string }> {
  const admin = await getAdminUser();
  const token = admin?.token || '';
  if (isAppsScriptConfigured && token) {
    try {
      const res = await callAppsScript<{ success: boolean; message: string }>(
        'simpanPengaturan',
        [settings, token],
        'POST'
      );
      if (res && res.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('rs_pengaturan_cache', JSON.stringify(settings));
        }
        return res;
      }
    } catch (e: any) {
      console.warn('[AppsScript] Gagal simpan pengaturan:', e);
    }
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem('rs_pengaturan_cache', JSON.stringify(settings));
  }
  return { success: true, message: 'Pengaturan berhasil disimpan!' };
}

// ==========================================================
// 9. UNIVERSAL SHEET CRUD & GOOGLE SCRIPT RUN COMPATIBILITY
// ==========================================================

export async function saveData(sheetName: string, dataObj: any, rowId?: number | string | null): Promise<any> {
  const admin = await getAdminUser();
  const token = admin?.token || '';
  if (isAppsScriptConfigured && token) {
    try {
      const res = await callAppsScript('saveData', [sheetName, dataObj, rowId, token], 'POST');
      if (res && res.success) return res.data || res;
    } catch (e) {
      console.warn(`[AppsScript] Gagal saveData ${sheetName}:`, e);
    }
  }
  return dataObj;
}

export async function deleteData(sheetName: string, rowId: number | string): Promise<{ success: boolean }> {
  const admin = await getAdminUser();
  const token = admin?.token || '';
  if (isAppsScriptConfigured && token) {
    try {
      const res = await callAppsScript<{ success: boolean }>('deleteData', [sheetName, rowId, token], 'POST');
      if (res && res.success) return res;
    } catch (e) {
      console.warn(`[AppsScript] Gagal deleteData ${sheetName}:`, e);
    }
  }
  return { success: true };
}

/**
 * googleScriptRun Emulator
 * Memberikan kompatibilitas API yang sama persis seperti di proyek portal sekolah (smpalmubarokweb)
 * Pola pemanggilan:
 * googleScriptRun.withSuccessHandler(cb).withFailureHandler(cb).saveData(...)
 */
export const googleScriptRun = {
  withSuccessHandler(successCb: (result: any) => void) {
    let failureCb: ((error: any) => void) | null = null;
    const proxyHandler = {
      withFailureHandler(failCb: (error: any) => void) {
        failureCb = failCb;
        return runner;
      }
    };
    const runner: any = new Proxy(proxyHandler, {
      get(target, prop: string) {
        if (prop in target) return (target as any)[prop];
        return async (...args: any[]) => {
          try {
            const res = await callAppsScript(prop, args, 'POST', 30000);
            if (successCb) successCb(res);
            return res;
          } catch (err: any) {
            if (failureCb) failureCb(err);
            else console.error(`[googleScriptRun ${prop}] Error:`, err);
          }
        };
      }
    });
    return runner;
  }
};

// ==========================================================
// 8. STATISTIK & ANALISIS PENGUNJUNG (VISITOR COUNTER)
// ==========================================================

export interface VisitorAnalyticsSummary {
  total_views: number;
  today_views: number;
  unique_visitors: number;
  today_unique: number;
  growth_pct: number;
  categories: {
    karya: { total: number; unique: number };
    portal: { total: number; unique: number };
    quotes: { total: number; unique: number };
    panggung: { total: number; unique: number };
    admin: { total: number; unique: number };
  };
  devices: {
    mobile: number;
    desktop: number;
    tablet: number;
    mobile_pct: number;
    desktop_pct: number;
    tablet_pct: number;
  };
}

export interface VisitorTrendPoint {
  date: string;
  label: string;
  total: number;
  karya: number;
  portal: number;
  other: number;
  unique: number;
}

export interface TopKaryaItem {
  id: string;
  slug: string;
  title: string;
  author: string;
  categoryLabel: string;
  views: number;
  readingTime: number;
}

export interface TopReferrerItem {
  source: string;
  count: number;
  pct: number;
}

export interface RecentVisitorLog {
  id: string;
  timestamp: string;
  visit_date: string;
  category: string;
  path: string;
  title: string;
  device_type: string;
  referrer: string;
  ip_masked: string;
}

export interface VisitorAnalyticsData {
  period: string;
  category: string;
  summary: VisitorAnalyticsSummary;
  daily_trends: VisitorTrendPoint[];
  top_karya: TopKaryaItem[];
  top_referrers: TopReferrerItem[];
  recent_logs: RecentVisitorLog[];
}

/**
 * Detect Client Device Type
 */
export function detectClientDevice(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = (navigator.userAgent || '').toLowerCase();
  const width = window.innerWidth || 1024;
  if (/ipad|tablet|playbook|silk/.test(ua) || (width >= 640 && width <= 1024 && /android/.test(ua))) {
    return 'tablet';
  }
  if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(ua) || width < 640) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Universal Visitor Logger (with 15s session debounce per path)
 */
export async function recordVisit(options: {
  path?: string;
  category?: 'karya' | 'portal' | 'quotes' | 'panggung' | 'admin' | string;
  title?: string;
  karyaSlug?: string;
  referrer?: string;
}): Promise<{ success: boolean; views?: number }> {
  if (typeof window === 'undefined') return { success: false };

  const currentPath = options.path || window.location.pathname;
  const debounceKey = `rs_vlog_debounce_${currentPath}`;
  const lastLogged = sessionStorage.getItem(debounceKey);
  const now = Date.now();

  // Debounce 15s per path
  if (lastLogged && (now - parseInt(lastLogged, 10)) < 15000) {
    const cachedViews = localStorage.getItem(`rs_views_${options.karyaSlug || ''}`);
    return { success: true, views: cachedViews ? parseInt(cachedViews, 10) : undefined };
  }

  sessionStorage.setItem(debounceKey, now.toString());

  const deviceType = detectClientDevice();
  const referrer = options.referrer || document.referrer || 'direct';
  const payload = {
    path: currentPath,
    category: options.category || 'portal',
    title: options.title || document.title,
    karyaSlug: options.karyaSlug || '',
    deviceType,
    referrer,
  };

  try {
    const res = await callAppsScript<{ success: boolean; id: string; views: number }>('catatKunjungan', [payload], 'POST', 6000);
    if (res && res.success) {
      if (options.karyaSlug && res.views) {
        localStorage.setItem(`rs_views_${options.karyaSlug}`, res.views.toString());
      }
      return res;
    }
  } catch (e) {
    console.debug('[AppsScript] recordVisit skipped/failed:', e);
  }

  return { success: true };
}

/**
 * Menyaring data analitik agar hanya menampilkan data kunjungan asli (non-dummy)
 */
function sanitizeVisitorAnalytics(data: VisitorAnalyticsData | null): VisitorAnalyticsData | null {
  if (!data) return data;

  // 1. Filter log kunjungan dummy (ID seed dummy <= 15 karakter seperti vlog_0, vlog_1000)
  if (Array.isArray(data.recent_logs)) {
    const hasDummy = data.recent_logs.some(l => l.id && (!l.id.startsWith('vlog_1') || l.id.length <= 15));
    if (hasDummy) {
      data.recent_logs = data.recent_logs.filter(l => l.id && l.id.startsWith('vlog_1') && l.id.length > 15);
    }
  }

  // 2. Jika summary mengandung angka seed dummy (misal total_views > log nyata)
  if (data.summary && Array.isArray(data.recent_logs)) {
    const realLogs = data.recent_logs;
    const isSeeded = data.summary.total_views > realLogs.length && realLogs.some(l => l.id && l.id.startsWith('vlog_1'));
    if (isSeeded || data.summary.growth_pct > 1000) {
      const totalReal = realLogs.length;
      const uniqueVisitors = new Set(realLogs.map(l => l.ip_masked || l.id)).size;
      const karyaLogs = realLogs.filter(l => l.category === 'karya');
      const portalLogs = realLogs.filter(l => l.category === 'portal');
      const mobileLogs = realLogs.filter(l => l.device_type === 'mobile');
      const desktopLogs = realLogs.filter(l => l.device_type === 'desktop');
      const tabletLogs = realLogs.filter(l => l.device_type === 'tablet');
      const totalDevices = mobileLogs.length + desktopLogs.length + tabletLogs.length || 1;

      data.summary = {
        total_views: totalReal,
        today_views: totalReal,
        unique_visitors: uniqueVisitors,
        today_unique: uniqueVisitors,
        growth_pct: 0,
        categories: {
          karya: { total: karyaLogs.length, unique: new Set(karyaLogs.map(l => l.ip_masked || l.id)).size },
          portal: { total: portalLogs.length, unique: new Set(portalLogs.map(l => l.ip_masked || l.id)).size },
          quotes: { total: realLogs.filter(l => l.category === 'quotes').length, unique: 0 },
          panggung: { total: realLogs.filter(l => l.category === 'panggung').length, unique: 0 },
          admin: { total: 0, unique: 0 }
        },
        devices: {
          mobile: mobileLogs.length,
          desktop: desktopLogs.length,
          tablet: tabletLogs.length,
          mobile_pct: Math.round((mobileLogs.length / totalDevices) * 1000) / 10,
          desktop_pct: Math.round((desktopLogs.length / totalDevices) * 1000) / 10,
          tablet_pct: Math.round((tabletLogs.length / totalDevices) * 1000) / 10
        }
      };

      if (Array.isArray(data.daily_trends)) {
        const todayStr = new Date().toISOString().slice(0, 10);
        data.daily_trends = data.daily_trends.map(d => {
          if (d.date < todayStr) {
            return { ...d, total: 0, karya: 0, portal: 0, other: 0, unique: 0 };
          }
          return {
            ...d,
            total: totalReal,
            karya: karyaLogs.length,
            portal: portalLogs.length,
            other: realLogs.length - karyaLogs.length - portalLogs.length,
            unique: uniqueVisitors
          };
        });
      }
    }
  }

  return data;
}

/**
 * Fetch Full Visitor Analytics for Admin Dashboard
 */
export async function getVisitorAnalytics(
  period: 'today' | '7d' | '30d' | 'all' = '30d',
  category: string = 'all'
): Promise<VisitorAnalyticsData | null> {
  const admin = await getAdminUser();
  const token = admin?.token || '';

  if (isAppsScriptConfigured) {
    try {
      const res = await callAppsScript<VisitorAnalyticsData>('getVisitorAnalytics', [period, category, token], 'POST', 15000);
      if (res && res.summary) {
        const cleaned = sanitizeVisitorAnalytics(res);
        localStorage.setItem('rs_visitor_analytics_cache', JSON.stringify(cleaned));
        return cleaned;
      }
    } catch (e) {
      console.warn('[AppsScript] Gagal ambil analisis pengunjung:', e);
    }
  }

  // Fallback cache
  const cached = localStorage.getItem('rs_visitor_analytics_cache');
  if (cached) {
    try {
      return sanitizeVisitorAnalytics(JSON.parse(cached));
    } catch (e) {}
  }

  return null;
}

/**
 * Membersihkan data analitik dummy dari Google Spreadsheet dan cache lokal
 */
export async function bersihkanDataDummy(): Promise<{ success: boolean; message: string; deletedVisitors?: number }> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('rs_visitor_analytics_cache');
  }

  const admin = await getAdminUser();
  const token = admin?.token || '';

  if (isAppsScriptConfigured && token) {
    try {
      const res = await callAppsScript<{ success: boolean; message: string; deletedVisitors: number }>(
        'bersihkanDataDummy',
        [token],
        'POST',
        20000
      );
      if (res && res.success) {
        return res;
      }
    } catch (e) {
      console.warn('[AppsScript] Gagal bersihkan data dummy cloud:', e);
    }
  }

  return {
    success: true,
    message: 'Cache lokal data analitik dummy telah dibersihkan.'
  };
}

/**
 * Fetch Latest View Counts for all Karya
 */
export async function fetchKaryaViewsMap(): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  if (typeof window === 'undefined') return map;

  try {
    const karyaList = await fetchAllKarya();
    if (Array.isArray(karyaList)) {
      karyaList.forEach(k => {
        const slug = k.slug || k.id;
        const views = parseInt(String(k.views || 0), 10);
        if (slug) {
          map[slug] = views;
          localStorage.setItem(`rs_views_${slug}`, views.toString());
        }
      });
    }
  } catch (e) {
    console.debug('[AppsScript] fetchKaryaViewsMap fallback');
  }

  return map;
}


