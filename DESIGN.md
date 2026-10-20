---
name: Ruang Sastra
description: Sistem desain editorial literatur dan arsip karya sastra SMPI Yambu'ul Qur'an
colors:
  paper: "#efeae0"
  paper-deep: "#e5ddc9"
  paper-card: "#f6f2e8"
  ink: "#1c2419"
  ink-soft: "#4c5445"
  ink-faint: "#7c8271"
  crimson: "#7c2d26"
  crimson-soft: "#a15347"
  gold: "#a6813c"
  sage: "#6c7d5f"
  white: "#ffffff"
  rule: "rgba(28, 36, 25, 0.16)"
  rule-strong: "rgba(28, 36, 25, 0.32)"
typography:
  display:
    fontFamily: "'Fraunces', Georgia, serif"
    fontSize: "clamp(2rem, 4vw, 3.2rem)"
    fontWeight: 600
    lineHeight: 1.15
  headline:
    fontFamily: "'Fraunces', Georgia, serif"
    fontSize: "clamp(1.4rem, 2.8vw, 1.85rem)"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "'Source Serif 4', Georgia, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.68
  sans:
    fontFamily: "'Inter', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  subtext:
    fontFamily: "'Source Serif 4', Georgia, serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace"
    fontSize: "0.85rem"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
  label-sm:
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace"
    fontSize: "0.68rem"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  sm: "2px"
  md: "4px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
components:
  button-primary:
    backgroundColor: "transparent"
    textColor: "{colors.crimson}"
    rounded: "{rounded.sm}"
    padding: "12px 26px"
  button-primary-hover:
    backgroundColor: "{colors.crimson}"
    textColor: "{colors.paper}"
---

## Overview

Ruang Sastra mengusung estetika antologi sastra fisik dan jurnal literatur klasik: kertas bertekstur hangat (*warm paper*), tinta gelap organik (*botanical charcoal ink*), aksen merah terakota (*crimson*) serta sentuhan emas antik (*antique gold*) dan sage hijau tumbuhan. Tampilan mengutamakan kenyamanan membaca durasi panjang (*long-form reading*), keindahan ritme tipografi puisi, tata letak teks lakon drama, dan kejelasan struktur makalah ilmiah.

## Colors

- **Kertas Utama (`--paper`: `#efeae0`)**: Warna latar belakang menyeluruh, meniru kertas buku bookpaper/parchment yang lembut di mata.
- **Kertas Dalam (`--paper-deep`: `#e5ddc9`)**: Digunakan untuk kontras kontainer, bingkai panggung teater, dan panel sekunder.
- **Kertas Kartu (`--paper-card`: `#f6f2e8`)**: Latar untuk kartu kutipan sastra, modal, atau blok sorotan.
- **Tinta Utama (`--ink`: `#1c2419`)**: Tinta hitam berona hijau hutan pekat untuk judul dan teks primer, menghasilkan kontras rasio > 10:1 terhadap latar kertas.
- **Tinta Lembut (`--ink-soft`: `#4c5445`)**: Untuk deskripsi pengantar, teks kutipan, dan paragraf sekunder (kontras > 5:1).
- **Tinta Pudar (`--ink-faint`: `#7c8271`)**: Untuk nomor indeks, takarir, dan metadata waktu (kontras > 3.5:1).
- **Merah Bata / Crimson (`--crimson`: `#7c2d26`)**: Aksen vokal untuk tautan aktif, monogram, tombol aksi, dan tag puisi.
- **Emas Antik (`--gold`: `#a6813c`)**: Untuk ornamen fleuron (`❧`), nomor karya kurasi, dan tag esai.
- **Sage Hijau (`--sage`: `#6c7d5f`)**: Penanda kategori cerpen dan badge antologi.
- **Putih Bersih (`--white`: `#ffffff`)**: Untuk teks seleksi kontras tinggi dan elemen kartu putih.
- **Garis Pembatas (`--rule`: `rgba(28, 36, 25, 0.16)`) & (`--rule-strong`: `rgba(28, 36, 25, 0.32)`)**: Pembatas tipis 1px penata ritme bacaan seperti garis halaman buku cetak.

## Typography

- **Display & Headings**: `Fraunces` (Google Fonts variable serif dengan optical size 9–144 dan variasi italic yang anggun, sesuai referensi resmi). Digunakan pada nama masthead, judul karya utama, dan kutipan heroik. Menggunakan `text-wrap: balance`.
- **Teks Tubuh (Body)**: `Source Serif 4` (Google Fonts variable serif dengan optical size 8–60). Ditetapkan pada ukuran 17px (`1.0625rem`) dengan line-height unitless `1.68` dan lebar kolom terukur `65ch–75ch`. Menggunakan `text-wrap: pretty` untuk mencegah orphan kata tunggal di akhir baris.
- **Metadata & Teknis**: `IBM Plex Mono` untuk tanggal, nama kelas siswa, nomor bab, label kategori, dan takarir ilmiah.
- **Aksesibilitas / Alternatif**: `Inter` (sans-serif) untuk opsi pembaca yang memilih font tanpa kait.

## Layout

- **Lebar Kolom**:
  - Kolom Utama / Container: `max-width: 960px` dengan bantalan sisi `padding: 0 clamp(16px, 4vw, 32px)`.
  - Kolom Baca Panjang (*Reading Well*): `max-width: 70ch` di tengah halaman untuk kenyamanan fokus mata.
- **Grid Karya & Panggung**:
  - Feed Karya Pilihan: Grid 2 kolom asimetris (nomor urut editorial lebar 44px–56px + isi entri).
  - Panggung Video/Audio: Grid 2 kolom responsif (beralih menjadi 1 kolom di layar `<= 640px`).
- **Ritme Spasi Vertikal**:
  - Section vertikal diberi padding 56px–80px dengan pemisah batas garis 1px `var(--rule-strong)`.
  - Spasi di atas judul selalu lebih besar (margin-top 1.8em) daripada spasi di bawah judul (margin-bottom 0.6em).

## Elevation & Depth

- **Tonal Layering**: Menggunakan perbedaan nada kertas (`--paper` vs `--paper-card` vs `--paper-deep`) sebagai pembeda kedalaman, menolak bayangan neobrutalist keras maupun drop-shadow melayang tanpa arah.
- **Bayangan Halus Organik**: Apabila kartu memerlukan elevasi (misal kartu kutipan yang dihover): `box-shadow: 0 4px 16px -2px rgba(28, 36, 25, 0.08)`.

## Shapes

- **Batas Sudut (Radius)**:
  - Tombol dan bingkai utama: radius tajam klasik 2px (`rounded-sm`), mencerminkan presisi tepi potongan buku fisik.
  - Tag dan Chip Kategori: kapsul penuh (`rounded-full` 9999px) dengan garis tepi tipis 1px.
  - Monogram Logo: Lingkaran sempurna (`rounded-full` dengan border 1.5px crimson).
- **Ornamen Arsitektur**:
  - Scalloped decorative border pada bingkai panggung (`stage-frame` dengan motif setengah lingkaran renda merah klasik).

## Components

1. **Masthead / Bilah Navigasi**:
   - Monogram YQ berbentuk lingkaran di kiri berdampingan dengan tipografi Fraunces "Ruang *Sastra*" dan sub-label mono SMPI Yambu'ul Qur'an.
   - Menu navigasi horizontal dengan garis animasi bawah (*underline expand transition*) saat hover.
   - Tombol toggle mode baca (Kertas / Sepia / Tinta Malam) dan pengatur ukuran teks (A- / A+).
2. **Entri Puisi & Prosa**:
   - Layout bait berirama dengan spasi puitik terjaga (`white-space: pre-wrap; font-style: italic`).
   - Widget pemutar musikalisasi puisi audio dengan kontrol putar/jeda estetis.
3. **Format Naskah Drama**:
   - Nama tokoh dalam huruf kapital menjorok, petunjuk lakuan panggung (*stage directions*) dalam tanda kurung miring, babak dan adegan berpola teatrikal.
4. **Format Karya Ilmiah**:
   - Kotak abstrak dwibahasa, kata kunci, catatan kaki/sitasi dengan tautan internal, serta daftar pustaka terformat rapi.
5. **Kartu Kutipan (Quotes)**:
   - Kutipan besar Fraunces Italic dengan tanda petik tipografi elegan, tombol salin teks instan, dan tombol ekspor/unduh kartu grafis.
6. **Form Submisi Karya (Firebase Ready)**:
   - Formulir kirim karya siswa untuk kurasi redaksi, dengan validasi input, pemilihan kategori, dan unggah foto/lampiran.

## Do's and Don'ts

- **DO**:
  - Pertahankan kontras teks terhadap latar belakang minimal 4.5:1 untuk teks normal dan 3:1 untuk teks besar.
  - Berikan styling khusus pada `::selection` (latar `--crimson-soft` dengan teks putih) dan custom scrollbar.
  - Gunakan `text-wrap: balance` pada judul dan `text-wrap: pretty` pada paragraf narasi.
  - Pastikan naskah drama mempertahankan tata letak dialog teater yang otentik.
- **DON'T**:
  - Jangan gunakan font sans-serif generik sistem sebagai heading display utama.
  - Jangan gunakan gradien warna teks (*gradient text*).
  - Jangan gunakan shadow tebal tanpa blur (*hard offset shadows*).
  - Jangan gunakan emoji dekoratif sebagai ganti sistem ikon SVG yang bersih.
  - Jangan biarkan lebar baris teks bacaan melebihi 75 karakter (*measure limit*).
