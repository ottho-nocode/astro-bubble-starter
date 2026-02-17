# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Astro v5 site vitrine + blog powered by Bubble.io Data API. The landing page is dynamically built from a `company-vitrine` Bubble table. Site configuration lives in Supabase, editable via a password-protected admin panel. Deployed on Vercel.

## Commands

```bash
npm run dev      # Dev server at localhost:4321
npm run build    # Production build to ./dist/
npm run preview  # Preview production build locally
```

No test framework is configured.

## Architecture

### Data Flow

```
Bubble.io Data API
  ├─ company-vitrine table → getCompanyInfo() → landing page sections
  ├─ articles table → getPosts() → blog pages
  └─ Swagger introspection → reference field resolution

Supabase (site_config table, RLS: service_role only)
  └─ JSON blob: Bubble credentials, field mapping, blog config, site metadata

Admin panel → saves to Supabase → triggers Vercel Deploy Hook → rebuild
```

### Homepage Route (`/`, SSR)

`index.astro` (prerender = false) fetches company from Bubble, calls `setLandingConfigFromCompany()`, then renders 4 sections:

1. **HeroVitrine** — Cover image, logo, company name, slogan
2. **DescriptionSection** — Company description
3. **BlogPreview** — Latest N blog posts (configurable count, grid, card style)
4. **ContactSection** — Email, phone, address cards

`Base.astro` also fetches company info (cache cleared each render) and passes `name`/`logo` props to Header and Footer.

### Landing Config System (`src/lib/landing-config.ts`)

Type-safe configuration merged from hardcoded defaults + Bubble `company-vitrine` fields:

- `setLandingConfigFromCompany(company)` — Maps Bubble fields to `LandingConfig`, stores in module cache
- `getLandingConfig()` — Returns cached config (or defaults)
- `BUBBLE_CONFIG_FIELDS` — Maps config paths (e.g., `"hero.titleFontSize"`) to Bubble field names (e.g., `"hero_title_font_size"`)
- `configToBubbleFields(cfg)` — Extracts only Bubble-backed fields for PATCH requests

`LandingConfig` has nested sections: `global`, `hero`, `description`, `blogPreview`, `contact`, `header`, `footer` — each with visibility toggle, colors, sizing, and styling props.

Components read config via `getLandingConfig()` and apply values as inline styles or class bindings.

### Static vs Server-Side Routes

- `output: "static"` in `astro.config.mjs` — default prerender at build time
- `export const prerender = false` → Vercel serverless function:
  - `/` (homepage), `/admin/*`, `/api/admin/*`, `robots.txt`
- Blog pages (`/blog/[slug]`) are static-generated via `getStaticPaths()`

### Key Modules

- **`src/lib/bubble.ts`** — Bubble.io API client. Exports `getCompanyInfo()`, `getPosts()`, `getPostBySlug()`, `bubblePatch()`, `bubbleFetchAll()`. Handles pagination, BBCode→HTML conversion, and reference field resolution via Swagger introspection. Module-level caches: `_companyInfoCache`, `_refInfoCache`, `_refLookupCache`.
- **`src/lib/landing-config.ts`** — Landing page config merging (see above).
- **`src/lib/supabase.ts`** — Supabase client with `SiteConfig`/`BubbleFieldMapping` types. Client is `null` if env vars missing (graceful degradation).
- **`src/lib/admin-auth.ts`** — HMAC-signed cookie sessions (stateless, no DB). Uses `ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET`.
- **`src/config.ts`** — `loadSiteConfig()` with build-time in-memory cache. Merges Supabase config over static defaults.

### Bubble Reference Field Resolution

Bubble returns reference fields as opaque unique IDs, not display names. Resolution process:

1. Introspect `GET /api/1.1/meta/swagger.json` for field definitions
2. Detect references via `$ref`, `items.$ref`, or description pattern: `"('typeName' represented by a unique ID)"` (regex: `/\('([^']+)'\s+represented by a unique ID\)/`)
3. Fetch referenced table, find display field (`Display`, `Name`, `Nom`, `Title`, etc.)
4. Build ID→displayName lookup map, cached per table

### Admin Panel

Password-protected pages (vanilla JS, custom CSS in `Admin.astro` layout — no Tailwind):

- `/admin` — Dashboard
- `/admin/landing` — Edit landing config (colors, fonts, visibility per section)
- `/admin/blog` — Blog appearance (grid/list, card style, hero)
- `/admin/articles` — Manage posts (edit status, content via `bubblePatch()`)
- `/admin/onboarding` — 3-step setup wizard (Bubble credentials → table selection → field mapping)

API endpoints under `/api/admin/` (all require session cookie):
- `POST login` / `POST logout`, `GET/PUT config`, `POST deploy`, `GET bubble-meta`, `POST bubble-preview`, `POST bubble-update`, `GET/POST landing-config`

Public endpoint: `GET /api/check-update` — returns `Modified Date` for auto-reload polling

### Blog

- `/blog` — Lists published posts from Bubble (SSR)
- `/blog/[slug]` — Individual post (static, `getStaticPaths`)
- Content is BBCode from Bubble, converted to HTML by `bbcodeToHtml()`, styled with `@tailwindcss/typography`

## Environment Variables

See `.env.example`:
- `BUBBLE_API_URL`, `BUBBLE_API_TOKEN` — Bubble Data API (overridable via admin/Supabase)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase access
- `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` — Admin auth
- `VERCEL_DEPLOY_HOOK_URL` — Triggers Vercel rebuild
- `ANTHROPIC_API_KEY` — AI content editing feature
- `SITE_URL`, `SITE_NAME`, `SITE_DESCRIPTION` — Fallback metadata

## Styling

- **Public pages**: Tailwind CSS v3, custom `primary` palette (`#5700FF`), fonts: Plus Jakarta Sans (headings) + Inter (body)
- **Admin pages**: Custom CSS in `Admin.astro` layout (shadcn-inspired tokens, no Tailwind)
- **Blog content**: `@tailwindcss/typography` (`prose` classes)
- **Landing components**: Inline styles from `getLandingConfig()` values (colors, sizes, visibility)

## Caching

Three separate module-level caches:
1. `bubble.ts`: `_companyInfoCache` (company data), `_refInfoCache`/`_refLookupCache` (Swagger reference resolution)
2. `config.ts`: `cachedConfig` (Supabase site_config, loaded once at build)
3. `landing-config.ts`: `_cache` (merged LandingConfig, set per request via `setLandingConfigFromCompany`)

`clearCompanyInfoCache()` is called in `Base.astro` to force fresh fetch on each SSR render.

## Common Pitfalls

- **Module-level cache in SSR**: `_companyInfoCache` persists across dev SSR requests. Always call `clearCompanyInfoCache()` before `getCompanyInfo()` in layouts/pages (already done in `Base.astro`).
- **Bubble font sizes are numbers**: Bubble stores `30`, not `"text-4xl"`. Use `resolveFontSize()` which returns `{ style: "font-size:30px;" }` for numbers and `{ class: "text-4xl" }` for Tailwind classes.
- **async authGuard**: `authGuard()` in API endpoints is async — forgetting `await` returns a Promise (always truthy), silently bypassing auth.
- **iframe srcdoc double-escaping**: Template literals injected via `srcdoc` are parsed twice. Double-escape regex: `\\b`, `\\S`, `\\/`. Build minifiers (esbuild/terser) can collapse `\S` → `S` and `\/` → `/`.
- **Bubble reference fields detection**: Not via `$ref` in Swagger but via description. Use regex `descRefRe = /\('([^']+)'\s+represented by a unique ID\)/`.

## Auto-Reload

`Base.astro` includes a client-side polling script that calls `GET /api/check-update` every 5 seconds. When the `Modified Date` of the `company-vitrine` record changes, the page reloads automatically. This enables near-real-time updates when editing in Bubble or the admin panel.

## Astro v5 Notes

- `output: "hybrid"` removed — use `output: "static"` with per-route `prerender = false`
- `@astrojs/vercel` adapter auto-handles SSR routes as serverless functions
