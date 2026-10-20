# CLAUDE.md — Quick Operational Guide for AI Assistants

This repository is **Ruang Sastra — SMPI Yambu'ul Qur'an**, an Astro 5 literary blog deployed on GitHub Pages with Supabase.

## Essential Commands

```bash
bun install                              # Install dependencies
bun run dev                              # Dev server on port 4321
node node_modules/astro/astro.js build   # Full static build
node node_modules/astro/astro.js check   # Type check Astro files
gh run list --repo nixon42/antologi      # Check GitHub Actions deployment
```

## Architectural Guidelines & Hard Invariants

1. **GitHub Pages Paths:** Never hardcode `/karya` or `/admin` in `<a href="...">` without prepending `${basePath}`. Use `const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')`.
2. **SVG Containment:** Always include explicit `width="..."` and `height="..."` attributes on `<svg>` tags (e.g. `width="20" height="20"`). Missing SVG dimensions break layout before CSS finishes rendering.
3. **Tailwind CSS v4:** Configured via `@tailwindcss/vite` in `astro.config.mjs` and `@import "tailwindcss";` in `src/styles/global.css`. Do not add `@astrojs/tailwind` (which conflicts with v4).
4. **Zero-Fragility Supabase:** All calls in `src/lib/supabase.ts` must maintain a `localStorage` fallback. Never crash the UI when offline or if Supabase keys are absent.
5. **Aesthetics:** Adhere to `DESIGN.md`. Typography is `Fraunces` (Headings) + `Source Serif 4` (Body) + `IBM Plex Mono` (Metadata). Colors: Paper `#efeae0`, Crimson `#7c2d26`, Gold `#a6813c`.
6. **Git & Secrets:** Never commit `.env`. CI/CD variables are set in GitHub Actions Secrets (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`).
