# Project Roadmap & Backlog (ADD Tracker)

> **Live progress and feature backlog for future developer agents.**  
> Update this document whenever a major capability is introduced or completed.

---

## ✅ Completed Milestones (Fase 1 - Fondasi & Peluncuran)

- [x] **Inisialisasi Proyek Astro 5 & Impeccable Design Standard**
  - Palet warna autentik Warm Paper, Crimson, Antique Gold, Deep Charcoal.
  - Tipografi Fraunces + Source Serif 4 + IBM Plex Mono.
  - Mode pembaca: Kertas (Default), Sepia, Tinta Malam (Dark).
  - Pengatur ukuran teks interaktif (`A-` / `A+`).
  - Modal pencarian instan fuzzy search (`Ctrl+K`).
- [x] **Enam Format Sastra Utama**
  - Karya Tulis Ilmiah (Abstrak dwibahasa, metodologi, unduh PDF).
  - Puisi & Prosa (Pemutar audio musikalisasi dengan scrubber).
  - Cerpen (Estimasi waktu baca dan reading progress bar).
  - Antologi (Indeks bab, volume, dan kurator).
  - Naskah Drama (Daftar tokoh, latar panggung, pementasan video).
  - Quotes Sastra (Kutipan sastra dengan unduh kartu PNG media sosial).
- [x] **Integrasi Supabase & Free File Storage**
  - PostgreSQL database schema (`public.karya`, `public.quotes`, `public.apresiasi`, `public.komentar`).
  - Storage bucket `karya-media` untuk foto dan audio.
  - Row Level Security (RLS) policies dan Realtime WebSocket subscriptions.
  - Client module [`src/lib/supabase.ts`](../src/lib/supabase.ts) dengan fallback zero-fragility ke `localStorage`.
- [x] **Studio Redaksi & Live Editor (`/admin`)**
  - Split-screen live preview dengan render format sastra seketika.
  - Unggah foto langsung dari halaman ke Supabase Storage.
  - Simpan naskah langsung ke Supabase DB atau ekspor `.md`.
- [x] **Pipeline CI/CD GitHub Actions & GitHub Pages**
  - Repositori: [https://github.com/nixon42/antologi](https://github.com/nixon42/antologi)
  - Otomasi build Bun dalam 11 detik dan deploy ke CDN GitHub Pages.
  - GitHub Secrets terdaftar (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`).
  - Integrasi Tailwind CSS v4 Vite plugin.

---

## 🚀 Upcoming Backlog (Fase 2 - Peningkatan Fitur)

### 1. Autentikasi Redaksi & Multi-User Auth (Supabase Auth)
- [ ] Tambahkan login akun guru/pembina untuk mengakses panel `/admin` (misal via Magic Link atau Google OAuth).
- [ ] Pisahkan role: `Editor`, `Kontributor Santri`, dan `Pembaca Umum`.

### 2. Audio Recorder Langsung di Browser
- [ ] Fitur rekam suara santri langsung dari mikrofon browser di halaman `/kirim` atau `/admin` untuk musikalisasi puisi tanpa perlu upload berkas audio eksternal.

### 3. Ekspor PDF & Cetak Buku Antologi Fisik
- [ ] Fitur *"Cetak Buku Antologi"* yang menghasilkan file PDF siap cetak (booklet format) dari kumpulan karya cerpen dan puisi santri semesteran.

### 4. Pemasangan Custom Subdomain Sekolah
- [ ] Masukkan berkas `public/CNAME` dan arahkan DNS saat domain sekolah sudah siap.
