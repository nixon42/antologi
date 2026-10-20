# Agent Playbook: Standard Operating Recipes

> **Step-by-step recipes for autonomous agents working on this codebase.**  
> Follow these exact patterns to maintain architectural integrity.

---

## Recipe 1: Menambahkan Karya Statis Baru ke `src/content/karya/`

1. Buat berkas baru di `src/content/karya/{slug}.md`.
2. Pastikan frontmatter memenuhi skema di `src/content/config.ts`:
   ```markdown
   ---
   title: "Judul Karya yang Bermakna"
   description: "Deskripsi 1-2 kalimat untuk kartu cuplikan."
   author: "Nama Penulis Santri"
   authorGrade: "Kelas IX-A"
   category: "cerpen" # pilihan: ilmiah | puisi | cerpen | antologi | drama | quotes
   categoryLabel: "Cerpen Santri"
   publishedDate: 2026-10-20
   readingTime: 6
   featured: true
   tags: ["pesantren", "imajinasi", "persahabatan"]
   coverImage: "/images/karya/default-cover.jpg"
   ---

   Isi naskah karya dalam format Markdown di sini...
   ```
3. Jika kategori adalah **Karya Tulis Ilmiah**, sertakan:
   ```yaml
   abstract: "Abstrak bahasa Indonesia..."
   abstractEn: "English abstract..."
   keywords: ["metode", "semiotika", "pendidikan"]
   supervisor: "Nama Guru Pembimbing, M.Pd."
   pdfUrl: "/docs/karya-ilmiah-lengkap.pdf"
   ```
4. Jika kategori adalah **Puisi**, Anda dapat menyertakan tautan audio musikalisasi:
   ```yaml
   audioUrl: "https://vjcllwgikivvvyxrvylx.supabase.co/storage/v1/object/public/karya-media/audio/puisi.mp3"
   ```
5. Jika kategori adalah **Naskah Drama**, sertakan daftar tokoh & babak:
   ```yaml
   characters: ["Fahmi (16 tahun)", "Pak Guru (45 tahun)", "Ibu (40 tahun)"]
   duration: "25 Menit"
   stageSetting: "Ruang kelas sore hari yang temaram"
   ```
6. Jalankan uji kompilasi:
   ```bash
   node node_modules/astro/astro.js build
   ```

---

## Recipe 2: Menambahkan Kategori / Format Sastra Baru

Jika redaksi ingin menambah format baru (misal: `esai` atau `resensi-buku`):

1. **Update Skema Content Collection**:
   Di `src/content/config.ts`, tambahkan enum kategori baru:
   ```ts
   category: z.enum(['ilmiah', 'puisi', 'cerpen', 'antologi', 'drama', 'quotes', 'esai']),
   ```
2. **Update Check Constraint di Database Supabase**:
   Di `supabase-schema.sql`:
   ```sql
   ALTER TABLE public.karya DROP CONSTRAINT IF EXISTS karya_category_check;
   ALTER TABLE public.karya ADD CONSTRAINT karya_category_check 
     CHECK (category IN ('ilmiah', 'puisi', 'cerpen', 'antologi', 'drama', 'quotes', 'esai'));
   ```
3. **Update Pemetaan Label di `src/lib/supabase.ts`**:
   Tambahkan di `categoryLabels`:
   ```ts
   esai: 'Esai & Opini Literasi',
   ```
4. **Update Filter di `src/pages/karya/index.astro`**:
   Tambahkan tombol chip filter di daftar kategori.

---

## Recipe 3: Menghubungkan Subdomain Kustom (e.g. `sastra.namasekolah.sch.id`)

1. **Buat Berkas CNAME**:
   Letakkan berkas `public/CNAME` berisi nama subdomain (tanpa `https://`):
   ```
   sastra.namasekolah.sch.id
   ```
2. **Periksa `BASE_PATH`**:
   Karena custom domain berada di root domain, pastikan `BASE_PATH` disetel ke `/`:
   Di GitHub Repo Secrets/Variables:
   ```bash
   gh secret set BASE_PATH --body "/" --repo nixon42/antologi
   ```
3. **Konfigurasi DNS CNAME Record**:
   - Host/Name: `sastra`
   - Target/Points to: `nixon42.github.io`
   - Proxy: DNS Only (atau Proxied jika menggunakan Cloudflare)
4. Push perubahan:
   ```bash
   git add public/CNAME && git commit -m "chore: pasang CNAME untuk custom subdomain" && git push origin main
   ```

---

## Recipe 4: Menangani Error Tampilan / CSS Hilang

Jika tampilan mendadak tampak tanpa style atau SVG membesar tak terkendali:

1. **Periksa Tailwind Plugin di `astro.config.mjs`**:
   Pastikan import `@tailwindcss/vite` ada di `vite.plugins`:
   ```js
   import tailwindcss from '@tailwindcss/vite';
   // ...
   vite: {
     plugins: [tailwindcss()],
     envPrefix: ['PUBLIC_', 'NEXT_PUBLIC_'],
   }
   ```
2. **Periksa `@import "tailwindcss";` di `src/styles/global.css`**:
   Pastikan baris ini berada tepat di bawah `@import url('https://fonts.googleapis.com/...');`.
3. **Periksa Dimensi SVG**:
   Setiap `<svg>` harus memiliki atribut eksplisit:
   ```html
   <svg width="20" height="20" class="w-5 h-5" ...>
   ```
4. **Verifikasi Ukuran Berkas CSS**:
   Jalankan build dan periksa ukuran CSS di `dist/_astro/`:
   ```bash
   node node_modules/astro/astro.js build && ls -lh dist/_astro/*.css
   ```
   Ukuran CSS normal berkisar antara **40 KB – 50 KB**. Jika hanya 5 KB, berarti Tailwind belum terkompilasi!

---

## Recipe 5: Verifikasi Sebelum Mengakhiri Task

Jalankan rangkaian tes ini sebelum melaporkan task selesai kepada pengguna:

```bash
# 1. Bersihkan dist lama
rm -rf dist/

# 2. Build penuh Astro
node node_modules/astro/astro.js build

# 3. Pastikan 12+ halaman ter-generate
ls -la dist/index.html dist/admin/index.html dist/karya/index.html

# 4. Cek status git
git status

# 5. Commit dan push ke main
git add .
git commit -m "tipe: deskripsi perubahan ringkas"
git push origin main

# 6. Monitor deployment GitHub Actions
gh run list --repo nixon42/antologi --limit 1
```
