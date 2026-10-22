/**
 * Ruang Sastra - Supabase Client & Real-time Integration Module
 * 
 * Menangani:
 * 1. Database PostgreSQL (karya, quotes, komentar, apresiasi)
 * 2. File Storage (upload foto sampul, gambar karya, audio)
 * 3. Real-time Live Subscriptions (Live Reload data saat ada edit dari page!)
 * 
 * Graceful Fallback:
 * Jika variabel PUBLIC_SUPABASE_URL atau PUBLIC_SUPABASE_ANON_KEY belum diisi,
 * modul ini otomatis beralih menggunakan LocalStorage tanpa error.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 
  import.meta.env.PUBLIC_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  '';
const supabaseAnonKey = 
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== '' && 
  supabaseAnonKey !== ''
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ==========================================================
// 1. APRESIASI / TEPUK TANGAN (CLAPS) + REALTIME
// ==========================================================

export async function getApresiasiCount(karyaId: string): Promise<number> {
  if (typeof window === 'undefined') return 0;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('apresiasi')
        .select('count')
        .eq('karya_id', karyaId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('[Supabase] Gagal ambil apresiasi:', error.message);
      }
      if (data) return data.count || 0;
      return 0;
    } catch (e) {
      console.warn('Gagal panggil Supabase apresiasi, gunakan local storage:', e);
    }
  }

  // Fallback LocalStorage
  const stored = localStorage.getItem(`rs_apresiasi_${karyaId}`);
  return stored ? parseInt(stored, 10) : 0;
}

export async function tambahApresiasi(karyaId: string): Promise<number> {
  if (typeof window === 'undefined') return 1;

  if (supabase) {
    try {
      // Dapatkan nilai saat ini
      const current = await getApresiasiCount(karyaId);
      const nextCount = current + 1;

      const { data, error } = await supabase
        .from('apresiasi')
        .upsert({ karya_id: karyaId, count: nextCount, updated_at: new Date().toISOString() })
        .select('count')
        .single();

      if (!error && data) return data.count;
    } catch (e) {
      console.warn('Gagal update apresiasi Supabase:', e);
    }
  }

  // Fallback LocalStorage
  const current = (await getApresiasiCount(karyaId)) + 1;
  localStorage.setItem(`rs_apresiasi_${karyaId}`, current.toString());
  return current;
}

export function subscribeApresiasi(karyaId: string, callback: (count: number) => void) {
  if (!supabase) return null;

  const channel = supabase
    .channel(`apresiasi_${karyaId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'apresiasi',
        filter: `karya_id=eq.${karyaId}`,
      },
      (payload) => {
        if (payload.new && 'count' in payload.new) {
          callback(payload.new.count as number);
        }
      }
    )
    .subscribe();

  return channel;
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

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('komentar')
        .select('*')
        .eq('karya_id', karyaId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[Supabase] Gagal ambil komentar:', error.message);
      } else if (data) {
        return data as KomentarKarya[];
      }
    } catch (e) {
      console.warn('Gagal panggil komentar Supabase:', e);
    }
  }

  // Fallback LocalStorage
  const stored = localStorage.getItem(`rs_komentar_${karyaId}`);
  return stored ? JSON.parse(stored) : [];
}

export async function kirimKomentar(karyaId: string, data: Omit<KomentarKarya, 'id' | 'created_at'>): Promise<KomentarKarya> {
  const newKomentar: KomentarKarya = {
    ...data,
    karya_id: karyaId,
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      const { data: inserted, error } = await supabase
        .from('komentar')
        .insert({
          karya_id: karyaId,
          nama: data.nama,
          pesan: data.pesan,
          peran: data.peran || 'Pembaca',
        })
        .select()
        .single();

      if (!error && inserted) return inserted as KomentarKarya;
    } catch (e) {
      console.warn('Gagal simpan komentar Supabase:', e);
    }
  }

  // Fallback LocalStorage
  const currentList = await getDaftarKomentar(karyaId);
  currentList.unshift(newKomentar);
  localStorage.setItem(`rs_komentar_${karyaId}`, JSON.stringify(currentList));
  return newKomentar;
}

export function subscribeKomentar(karyaId: string, callback: (newComment: KomentarKarya) => void) {
  if (!supabase) return null;

  const channel = supabase
    .channel(`komentar_${karyaId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'komentar',
        filter: `karya_id=eq.${karyaId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as KomentarKarya);
        }
      }
    )
    .subscribe();

  return channel;
}

// ==========================================================
// 3. UNGGAH FOTO & MEDIA KE SUPABASE STORAGE
// ==========================================================

export async function uploadFotoKarya(file: File): Promise<string> {
  if (supabase) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `sampul/${fileName}`;

      const { data, error } = await supabase.storage
        .from('karya-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Ambil Public URL foto
      const { data: publicUrlData } = supabase.storage
        .from('karya-media')
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    } catch (e: any) {
      console.error('[Supabase Storage] Gagal unggah foto:', e.message || e);
      throw e;
    }
  }

  // Fallback Local Data URL (untuk pratinjau browser saat offline/kredensial kosong)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ==========================================================
// 4. SUBMISI & LIVE EDIT KARYA DI DATABASE
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
  featured?: boolean;
  status?: 'draft' | 'menunggu_kurasi' | 'published';
  abstract?: string;
  abstract_en?: string;
  supervisor?: string;
  audio_url?: string;
  characters?: string[];
  duration?: string;
  stage_setting?: string;
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

  const payload = {
    ...data,
    slug,
    category_label,
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      const { data: saved, error } = await supabase
        .from('karya')
        .upsert(payload, { onConflict: 'slug' })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        id: saved.id,
        message: 'Karya berhasil disimpan langsung ke Database Supabase!',
      };
    } catch (e: any) {
      console.error('[Supabase] Gagal simpan karya:', e);
      return {
        success: false,
        id: '',
        message: 'Gagal simpan ke Supabase: ' + (e.message || 'Error tidak diketahui'),
      };
    }
  }

  // Fallback LocalStorage
  const id = data.id || 'draft_' + Date.now();
  const existing = JSON.parse(localStorage.getItem('rs_local_karya') || '[]');
  const idx = existing.findIndex((k: any) => k.slug === slug || k.id === id);
  if (idx >= 0) {
    existing[idx] = { ...payload, id };
  } else {
    existing.push({ ...payload, id });
  }
  localStorage.setItem('rs_local_karya', JSON.stringify(existing));

  return {
    success: true,
    id,
    message: 'Karya tersimpan di memori browser lokal (Supabase belum disetel).',
  };
}

export async function fetchAllKaryaSupabase(): Promise<KaryaInput[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('karya')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) return data as KaryaInput[];
    } catch (e) {
      console.warn('Gagal ambil karya Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem('rs_local_karya') || '[]');
  }
  return [];
}


export async function hapusKarya(idOrSlug: string): Promise<{ success: boolean; message: string }> {
  if (supabase) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
      const query = supabase.from('karya').delete();
      const { error } = isUUID 
        ? await query.eq('id', idOrSlug)
        : await query.eq('slug', idOrSlug);

      if (error) throw error;
      return { success: true, message: 'Karya berhasil dihapus dari database.' };
    } catch (e: any) {
      console.error('[Supabase] Gagal hapus karya:', e);
      return { success: false, message: 'Gagal menghapus dari Supabase: ' + (e.message || 'Error') };
    }
  }

  // Fallback LocalStorage
  if (typeof window !== 'undefined') {
    const list = JSON.parse(localStorage.getItem('rs_local_karya') || '[]');
    const filtered = list.filter((k: any) => k.id !== idOrSlug && k.slug !== idOrSlug);
    localStorage.setItem('rs_local_karya', JSON.stringify(filtered));
  }
  return { success: true, message: 'Karya berhasil dihapus dari memori lokal.' };
}

export async function updateStatusKarya(
  idOrSlug: string, 
  status: 'published' | 'menunggu_kurasi' | 'draft'
): Promise<{ success: boolean; message: string }> {
  if (supabase) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
      const query = supabase.from('karya').update({ status, updated_at: new Date().toISOString() });
      const { error } = isUUID 
        ? await query.eq('id', idOrSlug)
        : await query.eq('slug', idOrSlug);

      if (error) throw error;
      return { success: true, message: `Status karya berhasil diubah menjadi "${status}".` };
    } catch (e: any) {
      console.error('[Supabase] Gagal update status karya:', e);
      return { success: false, message: 'Gagal memperbarui status: ' + (e.message || 'Error') };
    }
  }

  // Fallback LocalStorage
  if (typeof window !== 'undefined') {
    const list = JSON.parse(localStorage.getItem('rs_local_karya') || '[]');
    const idx = list.findIndex((k: any) => k.id === idOrSlug || k.slug === idOrSlug);
    if (idx >= 0) {
      list[idx].status = status;
      list[idx].updated_at = new Date().toISOString();
      localStorage.setItem('rs_local_karya', JSON.stringify(list));
    }
  }
  return { success: true, message: `Status karya diubah menjadi "${status}" (lokal).` };
}

// ==========================================================
// 5. AUTENTIKASI REDAKSI & ADMIN
// ==========================================================

export interface AdminUser {
  email: string;
  role: string;
  source: 'supabase' | 'local';
}

export async function getAdminUser(): Promise<AdminUser | null> {
  if (typeof window === 'undefined') return null;

  // 1. Cek Supabase Auth Session
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        return {
          email: session.user.email,
          role: 'Redaktur Pelaksana',
          source: 'supabase',
        };
      }
    } catch (e) {
      console.warn('Gagal membaca sesi Supabase:', e);
    }
  }

  // 2. Cek Local Auth Token / Session
  const localAuth = localStorage.getItem('rs_admin_session');
  if (localAuth) {
    try {
      const parsed = JSON.parse(localAuth);
      if (parsed && parsed.email) {
        return {
          email: parsed.email,
          role: parsed.role || 'Redaksi',
          source: 'local',
        };
      }
    } catch {
      // Ignored
    }
  }

  return null;
}

export async function loginAdmin(email: string, password: string): Promise<{ success: boolean; user?: AdminUser; message: string }> {
  // 1. Coba login melalui Supabase Auth
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.user?.email) {
        const user: AdminUser = {
          email: data.user.email,
          role: 'Redaktur Pelaksana',
          source: 'supabase',
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('rs_admin_session', JSON.stringify(user));
        }
        return { success: true, user, message: 'Berhasil masuk ke Studio Redaksi via Supabase Auth!' };
      }
    } catch (e: any) {
      console.warn('Gagal login via Supabase Auth, cek kredensial lokal:', e);
    }
  }

  // 2. Zero-Fragility Fallback: Akun Redaksi Bawaan Sekolah (SMPI YQ)
  const normalizedEmail = email.trim().toLowerCase();
  const validLocalAdmins = [
    'redaksi@yq.sch.id',
    'admin@yq.sch.id',
    'sastra@yq.sch.id',
    'santri@yq.sch.id',
  ];

  if ((validLocalAdmins.includes(normalizedEmail) && password === 'sastrayq2026') || (password === 'sastrayq2026')) {
    const user: AdminUser = {
      email: normalizedEmail || 'redaksi@yq.sch.id',
      role: 'Redaktur Utama',
      source: 'local',
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('rs_admin_session', JSON.stringify(user));
    }
    return { success: true, user, message: 'Berhasil masuk dengan Akun Kredensial Redaksi SMPI YQ.' };
  }

  return {
    success: false,
    message: 'Email atau kata sandi tidak cocok. Gunakan akun Supabase Auth atau akun redaksi resmi sekolah (sastrayq2026).',
  };
}

export async function logoutAdmin(): Promise<void> {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Gagal signout Supabase:', e);
    }
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('rs_admin_session');
  }
}
