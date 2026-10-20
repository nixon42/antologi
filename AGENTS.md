# AGENTS.md — Agent-Driven Development (ADD) Blueprint & Operating Constitution

> **For AI Agents & LLM Pair-Programmers:**  
> Read this document in full before proposing, writing, or refactoring code in this repository.  
> This file outlines architectural invariants, tech stack constraints, code conventions, and execution playbooks for **Ruang Sastra — SMPI Yambu'ul Qur'an**.

---

## 1. Project Mission & Identity

- **Project Name:** Ruang Sastra — SMPI Yambu'ul Qur'an (`antologi`)
- **Portal URL:** [https://nixon42.github.io/antologi/](https://nixon42.github.io/antologi/)
- **Repository:** [https://github.com/nixon42/antologi](https://github.com/nixon42/antologi)
- **Design Reference:** `https://sites.google.com/view/sastraaabis/sass` (Warm Paper `#efeae0`, Crimson `#7c2d26`, Antique Gold `#a6813c`, Deep Charcoal `#1c2419`, Fraunces & Source Serif 4).
- **Core Purpose:** A literary, artistic, and academic publication hub hosting 6 core formats:
  1. **Karya Tulis Ilmiah** (Santri academic & research papers with structured abstracts & PDF downloads)
  2. **Puisi & Prosa** (Poetry & prose with integrated musicalized audio recitation player)
  3. **Cerpen** (Short stories with reading time estimates and progress bar)
  4. **Antologi** (Multi-contributor literary collections with volume/chapter indices)
  5. **Naskah Drama** (Theatrical scripts with distinct speaker tags, character lists, and italicized stage directions)
  6. **Quotes Sastra** (Literary aphorisms with interactive 1-click clipboard copy and social media PNG card generator)

---

## 2. Architectural Paradigm: "Static-First Hybrid"

This repository is built on a **Static-First Hybrid Architecture**:
```
┌────────────────────────────────────────────────────────────────────────┐
│                        Static Layer (Astro 5)                         │
│  - Pre-rendered static HTML/CSS on GitHub Pages (CDN edge)             │
│  - Markdown content collections in `src/content/karya/`                │
│  - High performance, zero hosting cost, instant TTFB                  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
     ┌───────────────────────────────┐   ┌──────────────────────────────┐
     │   Dynamic Layer (Supabase)    │   │  Zero-Fragility Fallback     │
     │  - PostgreSQL DB (`karya`,    │   │  - Client `localStorage`     │
     │    `quotes`, `komentar`)      │   │  - Works 100% offline        │
     │  - Storage (`karya-media`)    │   │  - Works if keys not set     │
     │  - Realtime WebSockets        │   │  - Zero runtime crashes      │
     └───────────────────────────────┘   └──────────────────────────────┘
```

---

## 3. Technology Stack & Key Tooling

| Component | Technology | Version / Specification | Notes |
| :--- | :--- | :--- | :--- |
| **Framework** | Astro | `^5.4.1` (Static mode) | Output: `dist/` |
| **Package Manager**| Bun | `1.4.x` | Preferred over npm/yarn for speed on btrfs |
| **Styling** | Tailwind CSS v4 | `@tailwindcss/vite@^4.3.3` | Configured via `astro.config.mjs` vite plugins |
| **Design Standard**| `/impeccable` | Canonical 8-section token spec | See [`DESIGN.md`](./DESIGN.md) & [`PRODUCT.md`](./PRODUCT.md) |
| **Database** | Supabase (PostgreSQL) | `@supabase/supabase-js@^2.118.0` | Client wrapper: `src/lib/supabase.ts` |
| **Storage** | Supabase File Storage | Bucket: `karya-media` | Public bucket for cover photos & audio |
| **Realtime** | Supabase Realtime | WebSocket postgres_changes | Used in `ApresiasiButton` & `KomentarSection` |
| **Search** | Fuse.js Client Index | `fuse.js@^7.1.0` | Pre-built `/search-index.json` |
| **Deployment** | GitHub Pages | GitHub Actions Workflow | Config: `.github/workflows/deploy.yml` |

---

## 4. Architectural Invariants (HARD RULES FOR AGENTS)

When modifying this repository, you **MUST NEVER violate** these 6 invariants:

### 🔴 Invariant 1: GitHub Pages & Subdomain Path Resilience
- Always construct internal links using `basePath` or Astro's site base resolution:
  ```ts
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  <a href={`${basePath}/karya`}>...</a>
  ```
- In `astro.config.mjs`, maintain:
  ```js
  base: process.env.BASE_PATH || '/',
  ```
  This ensures the site works identically whether deployed on a subpath (`/antologi/`) or on a custom root subdomain (`sastra.domain.com`).

### 🔴 Invariant 2: Zero Fragility (Fallback Mandatory)
- **Every dynamic Supabase interaction must degrade gracefully to `localStorage`**.
- If `PUBLIC_SUPABASE_URL` or `PUBLIC_SUPABASE_ANON_KEY` is missing or network fails:
  - Reading works must fall back to local content collections or `localStorage`.
  - Apresiasi (claps) must count locally in `localStorage`.
  - Comments must append to `localStorage`.
  - Photo upload in Studio Redaksi must return a base64 `FileReader` preview.
  - **Never throw unhandled errors that break UI rendering.**

### 🔴 Invariant 3: SVG Size & Layout Containment
- **Every `<svg>` element MUST have explicit `width` and `height` attributes** in addition to Tailwind classes:
  ```html
  <!-- CORRECT -->
  <svg class="w-5 h-5" width="20" height="20" viewBox="0 0 24 24">...</svg>
  
  <!-- INCORRECT - WILL CAUSE LAYOUT BLOWOUT -->
  <svg class="w-5 h-5" viewBox="0 0 24 24">...</svg>
  ```
- `src/styles/global.css` contains defensive resets (`svg { max-width: 100%; display: inline-block; }`). Do not remove them.

### 🔴 Invariant 4: Strict Impeccable Aesthetic Adherence
- **Never introduce generic blue SaaS styles, purple gradients, or round bubbly buttons.**
- Always use the semantic CSS tokens declared in [`DESIGN.md`](./DESIGN.md):
  - `--paper`: `#efeae0` (Light), `#e8dec8` (Sepia), `#151a14` (Dark)
  - `--crimson`: `#7c2d26` (Primary accent)
  - `--gold`: `#a6813c` (Editorial numbering & fleuron accents)
  - `--ink`: `#1c2419` (High contrast text)
  - Typographic pairing: `Fraunces` (Headings) + `Source Serif 4` (Body) + `IBM Plex Mono` (Metadata)

### 🔴 Invariant 5: Idempotent Database Migrations
- All SQL additions in [`supabase-schema.sql`](./supabase-schema.sql) must be strictly idempotent using `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, and conditional `DO $$ ... $$` blocks for publications.
- Never write destructive `DROP TABLE` statements.

### 🔴 Invariant 6: Environment & Secret Hygiene
- Client environment variables must support both prefixes:
  - `PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_URL`
  - `PUBLIC_SUPABASE_ANON_KEY` & `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **Never commit `.env` to Git.** `.gitignore` must continue to ignore `.env*` except `.env.example`.
- Secrets for CI/CD must be set via `gh secret set` or GitHub repository settings.

---

## 5. Repository Directory Blueprint

```
.
├── .agent/                    # Agent-Driven Development blueprints
│   ├── ARCHITECTURE.md        # System architecture & Mermaid flowcharts
│   ├── PLAYBOOK.md            # Standard recipes for common agent tasks
│   └── ROADMAP.md             # Backlog, completed features & future milestones
├── .github/workflows/
│   └── deploy.yml             # Automated Bun build & GitHub Pages deployment
├── .impeccable/               # Impeccable design system artifacts & reviews
├── public/                    # Static assets (images, favicon, CNAME)
├── src/
│   ├── components/            # Reusable Astro UI islands
│   │   ├── ApresiasiButton.astro  # Realtime claps with websocket sync
│   │   ├── AudioPlayer.astro      # Poetry recitation audio scrubber
│   │   ├── KomentarSection.astro  # Realtime comments stream
│   │   └── QuoteCard.astro        # Card with confetti & PNG image generator
│   ├── content/
│   │   ├── config.ts          # Astro Content Collection schemas
│   │   └── karya/             # Static Markdown files for initial archive
│   ├── layouts/
│   │   └── Layout.astro       # Master Masthead, Monogram, Theme & Search Modal
│   ├── lib/
│   │   └── supabase.ts        # Unified Supabase DB, Storage & Realtime client
│   ├── pages/
│   │   ├── admin/index.astro  # Studio Redaksi Live Editor & Photo Uploader
│   │   ├── karya/             # Pojok Baca filterable index & [...slug] reader
│   │   ├── index.astro        # Home portal with featured works & stage
│   │   ├── kirim.astro        # Student manuscript & cover photo submission form
│   │   ├── panggung.astro     # Drama theatrical video & script archive
│   │   ├── quotes.astro       # Literary quotes archive & interactive maker
│   │   ├── tentang.astro      # Editorial colophon & school pedagogy
│   │   └── search-index.json.ts # Static search index generator
│   └── styles/
│       └── global.css         # Tailwind v4 import, tokens, Fleuron, scalloped
├── astro.config.mjs           # Astro config + @tailwindcss/vite + sitemap + mdx
├── DESIGN.md                  # Canonical 8-section design token specification
├── PRODUCT.md                 # Impeccable Product Record & design requirements
├── supabase-schema.sql        # Complete PostgreSQL schema, RLS, Storage & Realtime
└── package.json               # Dependencies and scripts
```

---

## 6. Commands Palette for Agents

When operating in this codebase, use these commands:

```bash
# 1. Install dependencies
bun install

# 2. Start local development server (port 4321)
bun run dev

# 3. Type check Astro components
node node_modules/astro/astro.js check

# 4. Build static distribution
node node_modules/astro/astro.js build

# 5. Preview production build locally
bun run preview

# 6. Verify Git status
git status

# 7. Check GitHub Actions deployment runs
gh run list --repo nixon42/antologi
```

---

## 7. Handover Checklist for Future Agents

Before marking any agent task as complete, verify:
- [ ] `node node_modules/astro/astro.js build` completes cleanly with **0 errors**.
- [ ] No SVG icons render without `width` and `height`.
- [ ] Responsive design verified (Desktop 1280px, Tablet 768px, Mobile 375px).
- [ ] Supabase fallback verified (code does not crash when offline or without `.env`).
- [ ] Changes committed with conventional commit messages (`feat:`, `fix:`, `docs:`, `style:`).
- [ ] Pushed to `main` and verified GitHub Actions deployment passes with `✓`.
