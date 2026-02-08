# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Astro v5 starter that generates a static marketing site + blog from a Bubble.io app's Data API. Site configuration is stored in Supabase and editable via a built-in admin panel. Deployed on Vercel.

## Commands

```bash
npm run dev      # Dev server at localhost:4321
npm run build    # Production build to ./dist/
npm run preview  # Preview production build locally
```

No test framework is configured.

## Architecture

### Data Flow

1. **Supabase** stores the full site configuration (JSON blob in `site_config` table)
2. At build time, `src/config.ts` loads config from Supabase (falls back to hardcoded defaults)
3. **Bubble.io Data API** provides blog content — posts are fetched at build time via `src/lib/bubble.ts`
4. The admin panel saves config to Supabase, then triggers a **Vercel Deploy Hook** to rebuild the static site

### Static vs Server-Side Routes

- `output: "static"` in `astro.config.mjs` — most pages are prerendered at build time
- Routes with `export const prerender = false` run as Vercel serverless functions:
  - All `/admin/*` pages (login, dashboard, content mapping)
  - All `/api/admin/*` endpoints
  - `robots.txt` (dynamic, reads config)

### Key Modules

- **`src/lib/supabase.ts`** — Supabase client, `SiteConfig` / `BubbleFieldMapping` types, CRUD for `site_config` table. Client is `null` if env vars are missing (graceful degradation).
- **`src/lib/bubble.ts`** — Bubble.io Data API client. Credentials come from Supabase config first, then env vars. Handles pagination (`bubbleFetchAll`), field mapping from raw Bubble records to normalized `BubblePost`.
- **`src/lib/admin-auth.ts`** — HMAC-signed cookie sessions (no DB, no JWT library). Password from `ADMIN_PASSWORD` env var.
- **`src/config.ts`** — `loadSiteConfig()` with in-memory cache. Merges Supabase config over static defaults.

### Admin Panel

Two admin pages behind password auth:
- `/admin` — Edit site config (name, description, hero, features, CTA, Bubble credentials)
- `/admin/content` — 3-step wizard to map Bubble table fields to blog post fields (uses Bubble's Swagger endpoint for introspection)

Both use vanilla JS (no framework) in `<script>` tags and the `Admin.astro` layout (custom CSS, no Tailwind).

### API Endpoints

All under `/api/admin/`, all require session cookie:
- `POST login` / `POST logout` — session management
- `GET config` / `PUT config` — read/write Supabase site_config
- `POST deploy` — save config + trigger Vercel rebuild
- `GET bubble-meta` — introspect Bubble tables via Swagger
- `POST bubble-preview` — fetch sample records from a Bubble table

### Blog

- `/blog` — lists all published posts from Bubble
- `/blog/[slug]` — individual post (uses `getStaticPaths`, so pages are generated at build time)
- Blog content is HTML from Bubble, rendered with `set:html` and styled via `@tailwindcss/typography`

## Environment Variables

See `.env.example`. Key variables:
- `BUBBLE_API_URL`, `BUBBLE_API_TOKEN` — Bubble Data API (overridden by Supabase config if present)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase access
- `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` — Admin panel auth
- `VERCEL_DEPLOY_HOOK_URL` — Triggers Vercel rebuild from admin
- `SITE_URL`, `SITE_NAME`, `SITE_DESCRIPTION` — Fallback site metadata

## Styling

- Public pages use **Tailwind CSS v3** with a custom `primary` color scale (sky blue)
- Admin pages use **custom CSS** in the `Admin.astro` layout (shadcn-inspired design tokens)
- Blog post content uses `@tailwindcss/typography` (`prose` classes)

## Astro v5 Notes

- `output: "hybrid"` was removed in Astro v5. Use `output: "static"` — it supports per-route `prerender = false` natively.
- The `@astrojs/vercel` adapter handles SSR routes as serverless functions automatically.
