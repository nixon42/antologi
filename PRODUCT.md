# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro (Static Site Generator) + Markdown/MDX Collections + Supabase (PostgreSQL Database & S3 File Storage) + Custom literary CSS design tokens + Client Islands for interactive reader features. Hosted on GitHub Pages via GitHub Actions.

## Users

Siswa, guru, orang tua, alumni, dan pembina literasi SMPI Yambu'ul Qur'an, serta masyarakat luas penikmat karya sastra dan karya tulis ilmiah remaja.

## Product Purpose

Portal publikasi digital mandiri dan ruang apresiasi literasi resmi SMPI Yambu'ul Qur'an untuk mewadahi, mengarsipkan, dan memamerkan 6 jenis karya: Karya Tulis Ilmiah, Puisi & Prosa, Cerpen, Antologi, Naskah Drama, dan Quotes/Kutipan Sastra. Situs dirancang agar dapat dihosting secara gratis, reliabel, dan tanpa server database berat di GitHub Pages.

## Positioning

Bukan sekadar blog generik, Ruang Sastra adalah media penerbitan literatur sekolah bergaya kurasi editorial buku fisik (antologi klasik / jurnal sastra). Menghadirkan tipografi membaca yang syahdu (Source Serif 4, Fraunces, IBM Plex Mono), tata letak khusus untuk format sastra (seperti format naskah lakon drama, bait puisi dengan pemutar audio musikalisasi, sitasi karya ilmiah, dan kartu kutipan sastra), dengan kecepatan muat instan tanpa ketergantungan biaya langganan cloud.

## Operating Context

- **Pembaca**: Mengakses melalui peramban mobile (smartphone siswa/orang tua) dan desktop. Menikmati bacaan santai maupun riset akademik santri/siswa dengan fitur personalisasi baca (ukuran teks, tema kertas/malam/sepia, font serif/sans).
- **Penulis/Kontributor**: Siswa dan guru mempublikasikan karya baik secara langsung melalui repositori Git (format Markdown ber-frontmatter standar) maupun form submisi web interaktif yang terhubung ke Firebase/penyimpanan lokal.
- **Penyebaran**: Di-build secara statis dan otomatis dideploy ke GitHub Pages (`https://<username>.github.io/<repo>/` atau custom domain) menggunakan GitHub Actions.

## Capabilities and Constraints

- **6 Ragam Karya Sastra & Literasi**:
  1. *Karya Tulis Ilmiah*: Abstrak, kata kunci, struktur bab ilmiah, catatan kaki/sitasi, referensi daftar pustaka.
  2. *Puisi & Prosa*: Tata letak bait (*stanza*), spasi puitik, atribusi penyair, pemutar audio musikalisasi puisi.
  3. *Cerpen*: Narasi panjang dengan estimasi waktu baca, penanda progres membaca (*reading progress indicator*), pemisah adegan estetis (*ornamental scene dividers*).
  4. *Antologi*: Kumpulan karya tematik lintas penulis/siswa, daftar bab/kontributor, navigasi jilid/edisi.
  5. *Naskah Drama*: Tipografi naskah teater baku: nama tokoh kapital menjorok, petunjuk lakuan panggung (*stage directions*) dalam tanda kurung miring, babak (*act*) dan adegan (*scene*).
  6. *Quotes / Kutipan Sastra*: Mutiara kata dengan penyusun, sumber karya, tombol salin teks, serta generator kartu kutipan visual yang siap diunduh/dibagikan ke media sosial.
- **Basis Data & Media**:
  - *Arsitektur Inti (Git-backed)*: File Markdown/MDX di `src/content/`. 100% aman, gratis, terindeks git, performa instan tanpa database delay.
  - *Database & Storage Online (Supabase)*: Modul `src/lib/supabase.ts` terintegrasi penuh dengan PostgreSQL Database dan File Storage gratis Supabase untuk live editing dari web, upload foto instan, tepuk tangan/claps real-time, dan komentar pembaca.
  - *Penyimpanan Foto/Media*: Upload langsung dari halaman web ke Supabase Storage bucket `karya-media`, plus dukungan aset lokal gambar Astro WebP/AVIF modern.
- **Fitur Navigasi & Pencarian**:
  - Pencarian cepat di sisi klien (*instant search*) berdasarkan judul, pengarang, dan kategori/tag.
  - Filter kategori dan tag literatur.
  - Panggung karya (dokumentasi video pementasan drama & musikalisasi puisi).

## Brand Commitments

- **Identitas**: Ruang Sastra — SMPI Yambu'ul Qur'an.
- **Monogram**: Lingkaran badge `YQ`.
- **Warna & Palet**: Ditentukan mengacu pada referensi `https://sites.google.com/view/sastraaabis/sass`:
  - Kertas Utama: `--paper` (`#efeae0`)
  - Kertas Kartu: `--paper-card` (`#f6f2e8`)
  - Kertas Dalam: `--paper-deep` (`#e5ddc9`)
  - Tinta Gelap: `--ink` (`#1c2419`)
  - Tinta Lembut: `--ink-soft` (`#4c5445`)
  - Tinta Pudar: `--ink-faint` (`#7c8271`)
  - Aksen Merah Bata: `--crimson` (`#7c2d26`)
  - Aksen Emas Antik: `--gold` (`#a6813c`)
  - Aksen Hijau Daun / Sage: `--sage` (`#6c7d5f`)
- **Tipografi**:
  - Judul / Display: Fraunces (serif dengan kepribadian tinggi dan variasi italic yang anggun).
  - Teks Utama / Body: Source Serif 4 (sangat nyaman untuk teks sastra panjang dan makalah).
  - Metadata / Monospace: IBM Plex Mono (untuk takarir, nomor bab, label kategori).
- **Sentuhan Ornamen**: Fleuron sastra (`❧`), garis halus pemisah, border panggung bergelombang (*scalloped frame*).

## Evidence on Hand

- Referensi desain langsung dari live prototype Google Sites `https://sites.google.com/view/sastraaabis/sass` (telah diekstrak struktur HTML & token CSS resminya).
- Tangkapan layar antarmuka pengguna `media_1792472704468.png` yang menunjukkan hero masthead, monogram YQ, dan teks pembuka sastra.

## Product Principles

1. **Kehormatan Teks (Text Supremacy)**: Format tata letak dirancang melayani pembacaan teks sastra dan ilmiah secara nyaman tanpa distraksi visual berlebihan.
2. **Kemandirian & Ketahanan (Zero Fragility)**: Blog tidak boleh mati hanya karena kuota database habis. Situs tetap berfungsi 100% secara statis melalui Git Markdown, dengan Firebase sebagai suplemen dinamis.
3. **Format yang Otentik**: Naskah drama harus terlihat seperti naskah teater sungguhan; puisi harus menjaga jeda baris bait; karya ilmiah harus memiliki abstraksi dan catatan kaki yang rapi.
4. **Sentuhan Fisik di Ranah Digital**: Nuansa kertas hangat (*warm paper*), tinta alami (*organic ink*), dan fleuron sastra membangkitkan keintiman buku cetak.
