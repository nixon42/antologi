import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Koleksi Karya Tulis & Literatur (Ilmiah, Puisi & Prosa, Cerpen, Antologi, Naskah Drama)
const karyaCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/karya' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string(),
    authorGrade: z.string().optional(), // e.g. "Kelas XI-A"
    category: z.enum(['ilmiah', 'puisi', 'cerpen', 'antologi', 'drama']),
    categoryLabel: z.string(), // e.g. "Karya Tulis Ilmiah", "Puisi & Prosa"
    tags: z.array(z.string()).default([]),
    publishDate: z.coerce.date(),
    featured: z.boolean().default(false),
    coverImage: z.string().optional(),
    readingTime: z.number().optional(), // In minutes

    // Khusus Karya Tulis Ilmiah
    abstract: z.string().optional(),
    abstractEn: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    supervisor: z.string().optional(),
    pdfUrl: z.string().optional(),

    // Khusus Puisi & Prosa
    audioUrl: z.string().optional(),
    verseForm: z.string().optional(), // Soneta, Puisi Bebas, Prosa Liris

    // Khusus Antologi
    volume: z.string().optional(),
    contributors: z.array(z.string()).optional(),
    curator: z.string().optional(),

    // Khusus Naskah Drama
    characters: z.array(z.string()).optional(),
    duration: z.string().optional(),
    stageSetting: z.string().optional(),
  }),
});

// Koleksi Quotes / Mutiara Kata Sastra
const quotesCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/quotes' }),
  schema: z.object({
    quote: z.string(),
    author: z.string(),
    authorTitle: z.string().optional(), // e.g. "Siswa SMPI YQ / Penulis Cerpen"
    source: z.string().optional(), // e.g. "Karya 'Lentera di Ujung Senja'"
    category: z.string().default('Inspirasi Sastra'),
    publishDate: z.coerce.date().optional(),
  }),
});

export const collections = {
  karya: karyaCollection,
  quotes: quotesCollection,
};
