# Architecture & Data Flow Blueprint

> **System Architecture Document for Ruang Sastra (`antologi`)**  
> Visual reference and subsystem documentation for engineers and autonomous agents.

---

## 1. High-Level Architecture Overview

Ruang Sastra employs a **Static-First Hybrid Jamstack** model:

```mermaid
flowchart TD
    subgraph Client ["Browser Client (Reader / Admin)"]
        UI["Astro Static HTML/CSS"]
        Island1["ApresiasiButton (Realtime Claps)"]
        Island2["KomentarSection (Live Discussion)"]
        Island3["QuoteCard (Confetti & PNG Maker)"]
        AdminStudio["Studio Redaksi (/admin)"]
        OfflineStorage["LocalStorage Fallback Cache"]
    end

    subgraph Hosting ["GitHub Infrastructure"]
        GHRepo["GitHub Repo (nixon42/antologi)"]
        GHActions["GitHub Actions CI/CD"]
        GHPages["GitHub Pages CDN Edge"]
    end

    subgraph SupabaseCloud ["Supabase Backend (Managed Postgres & S3)"]
        PostgresDB[("PostgreSQL DB (karya, quotes, apresiasi, komentar)")]
        StorageBucket["Supabase Storage (karya-media)"]
        RealtimeWS["Supabase Realtime (WebSocket Gateway)"]
    end

    %% Build & Deployment Flow
    GHRepo -->|Git Push| GHActions
    GHActions -->|Bun Build & Export| GHPages
    GHPages -->|Serve Static HTML| UI

    %% Real-time Interaction
    Island1 <-->|WebSocket Sync| RealtimeWS
    Island2 <-->|WebSocket Sync| RealtimeWS
    RealtimeWS <--> PostgresDB

    %% Data Mutation
    AdminStudio -->|Save Karya| PostgresDB
    AdminStudio -->|Upload Sampul/Audio| StorageBucket
    AdminStudio -.->|Offline Mode| OfflineStorage

    %% Fallback Linkage
    UI -.->|Network Outage / No Keys| OfflineStorage
```

---

## 2. Subsystems Description

### 2.1 The Static Layer (SSG)
- **Role:** Guarantees sub-second Time-to-First-Byte (TTFB), 100/100 Lighthouse performance, and zero hosting costs.
- **Content Storage:** Initial archived works live in `src/content/karya/*.md`.
- **Pre-rendering:** Astro compiles all routes (`/`, `/karya`, `/karya/[...slug]`, `/panggung`, `/quotes`, `/tentang`, `/kirim`, `/admin`) into pure HTML + CSS + optimized JS bundles at build time.
- **Search Endpoint:** `src/pages/search-index.json.ts` pre-indexes all titles, excerpts, authors, and categories for instant client-side fuzzy searching with Fuse.js (`Ctrl+K`).

### 2.2 The Dynamic Companion Layer (Supabase)
- **Role:** Handles live social interactions, administrative publishing, and media uploads without requiring a custom server or Docker container.
- **Unified Wrapper:** `src/lib/supabase.ts` encapsulates all Supabase SDK calls and detects environment readiness.
- **Data Entities:**
  1. `public.karya`: Core literary submissions and published articles.
  2. `public.quotes`: Literary aphorisms for cards.
  3. `public.apresiasi`: Upvote/clap counter per work with high concurrency upserts.
  4. `public.komentar`: Moderated and public reader commentary thread.
  5. `storage.buckets/karya-media`: Public image and audio assets.

### 2.3 The Zero-Fragility Fallback Subsystem
- **Design Philosophy:** A literary portal should **never show a blank screen or fatal crash** because a 3rd party API is unconfigured or blocked by adblockers.
- **Mechanics:**
  ```mermaid
  sequenceDiagram
      autonumber
      participant Component as UI Component
      participant Client as Supabase Client
      participant Local as LocalStorage
      
      Component->>Client: Request Data (e.g. getApresiasiCount)
      alt Supabase Configured & Online
          Client-->>Component: Returns PostgreSQL DB count
      else Keys Missing OR Network Offline
          Client-->>Local: Fallback query rs_apresiasi_*
          Local-->>Component: Returns cached local count
      end
  ```

---

## 3. Data Flow: Publishing via Studio Redaksi (`/admin`)

```mermaid
sequenceDiagram
    actor Redaksi as Guru / Santri Redaktur
    participant Editor as Studio Redaksi (/admin)
    participant Preview as Split-Screen Live Preview
    participant Storage as Supabase Storage (karya-media)
    participant DB as PostgreSQL (public.karya)
    participant Git as Local File (.md)

    Redaksi->>Editor: Mengetik Naskah Sastra
    Editor->>Preview: Real-time Markdown & Token Rendering
    
    opt Upload Foto Sampul / Ilustrasi
        Redaksi->>Editor: Pilih File Foto
        Editor->>Storage: uploadFotoKarya(file)
        Storage-->>Editor: Public CDN URL
        Editor->>Editor: Sisipkan ![foto](url) ke naskah
    end

    alt Publikasi ke Supabase Database
        Redaksi->>Editor: Klik 'Publikasikan ke Supabase'
        Editor->>DB: simpanKarya(payload)
        DB-->>Editor: Success (UUID)
    else Unduh Arsip Git
        Redaksi->>Editor: Klik 'Unduh Markdown'
        Editor-->>Redaksi: File .md diunduh untuk disimpan di src/content/karya/
    end
```

---

## 4. Security & Access Boundaries

| Surface | Protocol / Port | Auth Method | RLS / Firewall Policy |
| :--- | :--- | :--- | :--- |
| **Public Site** | HTTPS (443) | Anonymous | Cloudflare + GitHub Pages CDN |
| **Supabase REST** | HTTPS (443) | `apikey` (Publishable Key) | RLS: SELECT allowed on `status='published'`, INSERT allowed for submissions |
| **Supabase Realtime** | WSS (443) | `apikey` | Filtered by `karya_id=eq.{id}` |
| **Storage Uploads** | HTTPS (443) | `apikey` | Bucket `karya-media` public read, insert enabled |
| **CI/CD Pipeline** | GitHub Actions | Repository Secrets | Read-only repo access, write to GitHub Pages environment |
