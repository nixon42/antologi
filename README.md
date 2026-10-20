# Ruang Sastra — SMPI Yambu'ul Qur'an

> **Portal Literasi & Apresiasi Karya — SMPI Yambu'ul Qur'an**  
> Sebuah wadah publikasi mandiri untuk karya tulis ilmiah, puisi & prosa, cerpen, antologi, naskah drama, dan quotes/mutiara kata santri & siswa yang dirancang untuk dihosting secara gratis dan berkecepatan tinggi di **GitHub Pages**.

---

## 📖 Gambaran Proyek

Ruang Sastra mengusung filosofi antologi sastra cetak klasik: tekstur kertas hangat (*warm paper*), tinta gelap botani (*organic ink*), aksen merah terakota (*crimson*), serta emas antik (*antique gold*). Portal ini dirancang dengan standar kualitas visual **/impeccable** dan praktik web modern untuk menghadirkan pengalaman membaca yang menenangkan, berwibawa, dan bebas gangguan.

### Color Scheme & Desain Visual
Sistem warna mengacu pada referensi desain [Ruang Sastra](https://sites.google.com/view/sastraaabis/sass):
- **Kertas Utama (`--paper`)**: `#efeae0` — Latar belakang lembut yang nyaman di mata untuk bacaan panjang.
- **Kertas Kartu (`--paper-card`)**: `#f6f2e8` — Kontras lembut untuk kartu kutipan, panel, dan formulir.
- **Kertas Dalam (`--paper-deep`)**: `#e5ddc9` — Latar bingkai panggung dan badge.
- **Tinta Organik (`--ink`)**: `#1c2419` — Teks judul dan narasi dengan kontras rasio > 10:1.
- **Tinta Lembut (`--ink-soft`)**: `#4c5445` — Teks deskripsi dan kutipan sekunder.
- **Merah Terakota (`--crimson`)**: `#7c2d26` — Aksen monogram, tombol vokal, dan kategori puisi.
- **Emas Antik (`--gold`)**: `#a6813c` — Fleuron sastra (`❧`) dan indeks editorial.
- **Sage Hijau (`--sage`)**: `#6c7d5f` — Penanda kategori cerpen.

---

## 📚 6 Ragam Karya yang Didukung

1. **Karya Tulis Ilmiah**:
   - Struktur karya ilmiah lengkap dengan kotak abstrak (Indonesia & Inggris).
   - Kata kunci (*keywords*), nama pembimbing, catatan kaki, serta tautan unduh naskah PDF.
2. **Puisi & Prosa**:
   - Format bait (*stanza*) yang menjaga spasi puitik dan jeda kontemplatif.
   - Pemutar audio terintegrasi untuk lantunan **Musikalisasi Puisi**.
3. **Cerpen (Cerita Pendek)**:
   - Pengalaman membaca narasi imersif dengan estimasi waktu baca (*reading time*) dan pembatas adegan fleuron (`❧`).
4. **Antologi Bersama**:
   - Kompilasi karya tematik lintas penulis, lengkap dengan daftar kontributor dan navigasi jilid/edisi.
5. **Naskah Drama**:
   - Format lakon teater standar: nama tokoh kapital menjorok, petunjuk lakuan panggung (*stage directions*) dalam tanda kurung miring, babak (*act*), dan adegan (*scene*).
6. **Quotes & Mutiara Kata Sastra**:
   - Kartu kutipan tipografi klasik dengan tombol **Salin Teks** (dengan efek selebrasi) serta tombol **Unduh Kartu Gambar (PNG)** beresolusi tinggi untuk dibagikan ke media sosial.

---

## 🗄️ Arsitektur Database & Penyimpanan Media

Situs ini menerapkan prinsip **Zero Fragility (Ketahanan Tanpa Ketergantungan)**:

### 1. Pilihan Utama: Git-backed Content Collections (Rekomendasi)
- Seluruh karya terbit disimpan dalam format **Markdown / MDX** di folder `src/content/karya/` dan `src/content/quotes/`.
- **Kelebihan**:
  - 100% gratis selamanya, tanpa risiko limit kuota database atau biaya langganan bulanan.
  - Setiap tulisan memiliki riwayat revisi dan terlindungi dalam riwayat komit Git.
  - Di-build menjadi HTML statis super cepat yang siap dihosting di **GitHub Pages** (skor performa 100/100).
- **Penyimpanan Foto**:
  - Simpan gambar sampul di `src/assets/images/` atau `public/images/`.
  - Astro secara otomatis mengompresi dan mengonversi gambar ke format modern **WebP/AVIF** saat build.

### 2. Pilihan Pendamping Dinamis: Supabase Integration (Database & File Storage Gratis)
- Disediakan modul siap pakai `src/lib/supabase.ts` untuk fitur interaktif real-time:
  - **Studio Redaksi & Live Editor (`/admin`)**: Halaman khusus menulis, mengedit naskah dengan **Live Preview** seketika saat mengetik, dan unggah foto langsung dari browser!
  - **Supabase Storage**: Mengunggah foto sampul langsung dari browser ke bucket publik `karya-media`.
  - **Apresiasi / Tepuk Tangan Pembaca (Claps 👏)**: Menghitung dukungan pembaca secara real-time dengan sinkronisasi otomatis (*live reload/subscription*).
  - **Ruang Diskusi & Catatan Pembaca**: Kolom komentar langsung di bawah karya dengan *realtime listener*.
  - **Formulir Submisi Karya Siswa (`/kirim`)**: Siswa dapat mengirimkan naskah baru secara online.
  - **Skema SQL Siap Pakai**: File `supabase-schema.sql` siap dijalankan di Supabase SQL Editor dalam 1 klik.
- **Graceful Fallback**: Jika kredensial Supabase belum diisi di `.env`, seluruh fitur di atas otomatis beralih menggunakan **LocalStorage**, sehingga blog tetap berjalan 100% tanpa error!

---

## 🚀 Panduan Memulai di Mesin Lokal

### Prasyarat
- [Bun](https://bun.sh/) (direkomendasikan) atau Node.js v18+

### Instalasi & Menjalankan Dev Server
```bash
# Clone repositori
git clone <url-repo-anda>
cd blog

# Install dependensi
bun install   # atau: npm install

# Jalankan server lokal
bun run dev   # atau: npm run dev
```
Buka peramban di `http://localhost:4321`.

---

## 🌐 Panduan Hosting di GitHub Pages

Repositori ini telah dilengkapi workflow otomatis **GitHub Actions** di `.github/workflows/deploy.yml`.

### Langkah-langkah Pengaktifan:
1. Dorong (*push*) repositori ini ke akun GitHub Anda:
   ```bash
   git remote add origin https://github.com/<username>/<nama-repo>.git
   git branch -M main
   git push -u origin main
   ```
2. Buka repositori di GitHub > Masuk ke tab **Settings** > **Pages**.
3. Pada bagian **Build and deployment** > **Source**, pilih **GitHub Actions**.
4. Selesai! Setiap kali Anda melakukan push ke branch `main`, GitHub Actions akan otomatis mem-build dan mempublikasikan situs ke `https://<username>.github.io/<nama-repo>/`.

*(Catatan: Jika Anda menggunakan custom domain atau nama repo tertentu, sesuaikan variabel `site` dan `base` di file `astro.config.mjs`)*.

---

## ✍️ Cara Menambah Karya Baru

### Lewat Git (Markdown):
Cukup buat file `.md` baru di dalam folder `src/content/karya/` dengan frontmatter:

```markdown
---
title: "Judul Karya Anda"
description: "Sinopsis atau petikan 1-2 kalimat"
author: "Nama Siswa"
authorGrade: "Kelas XI-B"
category: "puisi" # pilihan: ilmiah | puisi | cerpen | antologi | drama
categoryLabel: "Puisi & Prosa"
tags: ["Puisi", "Sastra Santri"]
publishDate: 2026-10-20
featured: true # true jika ingin masuk ke Karya Pilihan Beranda
readingTime: 3
---

Tuliskan naskah karya Anda di sini...
```

### Lewat Web:
Kunjungi halaman `/kirim`, isi formulir naskah secara langsung dari HP atau laptop, lalu klik **Kirim Naskah ke Redaksi**.

---

## 📜 Lisensi & Hak Cipta
Hak cipta seluruh naskah tulisan, puisi, dan karya pementasan tetap menjadi milik masing-masing santri dan penulis SMPI Yambu'ul Qur'an.
Sistem web dirilis di bawah lisensi MIT.
