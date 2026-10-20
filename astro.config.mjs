// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://yambuu-quran.github.io',
  base: process.env.BASE_PATH || '/',
  output: 'static',
  integrations: [
    mdx(),
    sitemap(),
  ],
  vite: {
    envPrefix: ['PUBLIC_', 'NEXT_PUBLIC_'],
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
