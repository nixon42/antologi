-- ==========================================================
-- RUANG SASTRA — SMPI YAMBU'UL QUR'AN
-- Skema Database & Storage Supabase Lengkap (Idempotent / Aman Dijalankan Berulang Kali)
-- ==========================================================
-- INSTRUKSI:
-- 1. Buka Supabase Dashboard project Anda (https://supabase.com/dashboard)
-- 2. Pilih menu "SQL Editor" di bilah sisi kiri
-- 3. Klik "New query"
-- 4. Tempel seluruh isi skrip ini lalu klik "Run" (atau Ctrl+Enter)
-- ==========================================================

-- 1. TABEL KARYA LITERATUR (Ilmiah, Puisi, Cerpen, Antologi, Drama, Quotes)
CREATE TABLE IF NOT EXISTS public.karya (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  author TEXT NOT NULL,
  author_grade TEXT,
  category TEXT NOT NULL CHECK (category IN ('ilmiah', 'puisi', 'cerpen', 'antologi', 'drama', 'quotes')),
  category_label TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  content TEXT NOT NULL,
  cover_image_url TEXT,
  reading_time INTEGER DEFAULT 5,
  featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'menunggu_kurasi', 'published')),
  
  -- Spesifik Karya Tulis Ilmiah
  abstract TEXT,
  abstract_en TEXT,
  keywords TEXT[],
  supervisor TEXT,
  pdf_url TEXT,

  -- Spesifik Puisi & Musikalisasi
  audio_url TEXT,
  verse_form TEXT,

  -- Spesifik Naskah Drama
  characters TEXT[],
  duration TEXT,
  stage_setting TEXT,

  -- Spesifik Antologi
  volume TEXT,
  contributors TEXT[],
  curator TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index untuk performa pencarian cepat
CREATE INDEX IF NOT EXISTS idx_karya_category ON public.karya(category);
CREATE INDEX IF NOT EXISTS idx_karya_status ON public.karya(status);
CREATE INDEX IF NOT EXISTS idx_karya_slug ON public.karya(slug);

-- 2. TABEL QUOTES & MUTIARA KATA SASTRA
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote TEXT NOT NULL,
  author TEXT NOT NULL,
  author_title TEXT,
  source TEXT,
  category TEXT DEFAULT 'Inspirasi Sastra',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABEL APRESIASI / TEPUK TANGAN (CLAPS) REAL-TIME
CREATE TABLE IF NOT EXISTS public.apresiasi (
  karya_id TEXT PRIMARY KEY,
  count BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABEL DISKUSI & KOMENTAR PEMBACA
CREATE TABLE IF NOT EXISTS public.komentar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  karya_id TEXT NOT NULL,
  nama TEXT NOT NULL,
  pesan TEXT NOT NULL,
  peran TEXT DEFAULT 'Pembaca',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_komentar_karya_id ON public.komentar(karya_id);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

-- Aktifkan RLS
ALTER TABLE public.karya ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apresiasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.komentar ENABLE ROW LEVEL SECURITY;

-- 1. Policies Karya
DROP POLICY IF EXISTS "Public Read Published Karya" ON public.karya;
CREATE POLICY "Public Read Published Karya" ON public.karya
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Karya" ON public.karya;
CREATE POLICY "Public Insert Karya" ON public.karya
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update Karya" ON public.karya;
CREATE POLICY "Public Update Karya" ON public.karya
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Delete Karya" ON public.karya;
CREATE POLICY "Public Delete Karya" ON public.karya
  FOR DELETE USING (true);

-- 2. Policies Quotes
DROP POLICY IF EXISTS "Public Read Quotes" ON public.quotes;
CREATE POLICY "Public Read Quotes" ON public.quotes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Quotes" ON public.quotes;
CREATE POLICY "Public Insert Quotes" ON public.quotes
  FOR INSERT WITH CHECK (true);

-- 3. Policies Apresiasi (Claps)
DROP POLICY IF EXISTS "Public Select Apresiasi" ON public.apresiasi;
CREATE POLICY "Public Select Apresiasi" ON public.apresiasi
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Apresiasi" ON public.apresiasi;
CREATE POLICY "Public Insert Apresiasi" ON public.apresiasi
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update Apresiasi" ON public.apresiasi;
CREATE POLICY "Public Update Apresiasi" ON public.apresiasi
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Delete Karya" ON public.karya;
CREATE POLICY "Public Delete Karya" ON public.karya
  FOR DELETE USING (true);

-- 4. Policies Komentar
DROP POLICY IF EXISTS "Public Read Komentar" ON public.komentar;
CREATE POLICY "Public Read Komentar" ON public.komentar
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Komentar" ON public.komentar;
CREATE POLICY "Public Insert Komentar" ON public.komentar
  FOR INSERT WITH CHECK (true);

-- ==========================================================
-- STORAGE BUCKET: karya-media
-- ==========================================================

-- Buat bucket penyimpanan foto/audio publik jika belum ada
INSERT INTO storage.buckets (id, name, public) 
VALUES ('karya-media', 'karya-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Kebijakan akses storage publik
DROP POLICY IF EXISTS "Public Access Storage" ON storage.objects;
CREATE POLICY "Public Access Storage" ON storage.objects
  FOR SELECT USING (bucket_id = 'karya-media');

DROP POLICY IF EXISTS "Public Upload Storage" ON storage.objects;
CREATE POLICY "Public Upload Storage" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'karya-media');

-- ==========================================================
-- REALTIME SUBSCRIPTIONS
-- ==========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'apresiasi'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.apresiasi;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'komentar'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.komentar;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'karya'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.karya;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'quotes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
  END IF;
END $$;
