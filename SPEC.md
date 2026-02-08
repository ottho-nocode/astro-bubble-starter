# Specifications Fonctionnelles — Astro Bubble Starter

## 1. Vue d'ensemble

**Objectif** : Generer un site statique marketing + blog a partir de donnees stockees dans Bubble.io, configurable via un panneau d'administration protege par mot de passe. La configuration est persistee dans Supabase et chaque sauvegarde declenche un rebuild automatique sur Vercel.

**Stack technique** :
- Framework : Astro v5
- Hebergement : Vercel (pages statiques + serverless functions)
- Base de donnees config : Supabase (table `site_config`, colonne JSONB)
- Source de contenu : Bubble.io Data API
- Styles public : Tailwind CSS v3
- Styles admin : CSS custom (design shadcn-inspired)
- Authentification admin : HMAC-signed cookies (sans librairie JWT)

---

## 2. Architecture

### 2.1 Flux de donnees

```
Supabase (site_config)
    |
    v
[Build Astro] ---> Vercel (static pages)
    |
    +---> src/config.ts : loadSiteConfig() --> hero, features, CTA, meta
    +---> src/lib/bubble.ts : getPosts() --> articles du blog
              |
              v
        Bubble.io Data API
        (table dynamique + mapping dynamique)
```

### 2.2 Flux admin

```
Admin (navigateur)
    |
    +---> POST /api/admin/login       --> cookie session
    +---> GET  /api/admin/config      --> lecture SiteConfig
    +---> GET  /api/admin/bubble-meta  --> introspection tables Bubble
    +---> POST /api/admin/bubble-preview --> apercu donnees
    +---> POST /api/admin/deploy       --> sauvegarde config + rebuild Vercel
    +---> POST /api/admin/logout       --> suppression cookie
```

### 2.3 Types de routes

| Type | Rendu | Exemples |
|------|-------|----------|
| Statique (build-time) | `prerender = true` (defaut) | `/`, `/blog`, `/blog/[slug]` |
| Serverless (runtime) | `prerender = false` | `/admin/*`, `/api/admin/*`, `/robots.txt` |

---

## 3. Modele de donnees

### 3.1 SiteConfig (Supabase)

Stockee dans la table `site_config` (colonne `config` de type JSONB, une seule ligne).

```typescript
interface SiteConfig {
  // -- General --
  name: string;                    // Nom du site
  description: string;             // Description SEO
  url: string;                     // URL publique du site
  defaultLanguage: string;         // Langue (ex: "fr")

  // -- Bubble credentials --
  bubbleAppUrl: string;            // URL de l'app Bubble (ex: "https://app.bubbleapps.io")
  bubbleApiUrl: string;            // URL API Bubble (ex: "https://app.bubbleapps.io/api/1.1")
  bubbleApiToken: string;          // Token API Bubble (Bearer)

  // -- Content mapping (optionnel) --
  bubbleContentTable?: string;     // Nom de la table Bubble pour les articles
  bubbleFieldMapping?: BubbleFieldMapping; // Mapping champs Bubble -> champs blog

  // -- Sections page d'accueil --
  hero: {
    title: string;                 // Titre principal
    subtitle: string;              // Sous-titre
    ctaText: string;               // Texte du bouton CTA
    ctaLink: string;               // Lien du bouton CTA
  };
  features: {
    title: string;                 // Titre de la section
    items: Array<{
      title: string;               // Titre de la fonctionnalite
      description: string;         // Description
      icon: string;                // Icone (texte libre, affiche dans un badge)
    }>;
  };
  cta: {
    title: string;                 // Titre de la section CTA
    description: string;           // Description
    ctaText: string;               // Texte du bouton
    ctaLink: string;               // Lien du bouton
  };
}
```

### 3.2 BubbleFieldMapping

Definit la correspondance entre les champs d'une table Bubble et les champs normalises du blog.

```typescript
interface BubbleFieldMapping {
  title: string;         // Champ Bubble pour le titre de l'article
  content: string;       // Champ Bubble pour le contenu HTML
  excerpt: string;       // Champ Bubble pour l'extrait/resume
  coverImage: string;    // Champ Bubble pour l'image de couverture
  slug: string;          // Champ Bubble pour le slug URL
  author: string;        // Champ Bubble pour l'auteur
  category: string;      // Champ Bubble pour la categorie
  date: string;          // Champ Bubble pour la date de publication
  published?: string;    // Champ Bubble pour le statut publie (optionnel)
}
```

### 3.3 BubblePost (modele normalise)

Resultat du mapping applique a un enregistrement Bubble brut.

```typescript
interface BubblePost {
  _id: string;           // ID interne Bubble
  date: string;          // Date de publication (ISO string)
  slug: string;          // Slug URL unique
  title: string;         // Titre
  content: string;       // Contenu HTML
  excerpt: string;       // Extrait/resume
  cover_image: string;   // URL de l'image de couverture
  author: string;        // Nom de l'auteur
  category: string;      // Categorie
  published: boolean;    // Statut de publication
}
```

**Regles de mapping** (fonction `mapBubbleRecord`) :
- `date` : utilise `raw[mapping.date]`, fallback sur `raw["Created Date"]`
- `slug` : utilise `raw[mapping.slug]`, fallback sur `raw.Slug`
- `published` : si `mapping.published` est defini, utilise `Boolean(raw[mapping.published])` ; sinon `true` par defaut
- `cover_image`, `author`, `category` : vides si le champ de mapping est vide
- Les champs manquants retournent une chaine vide

---

## 4. Pages publiques

### 4.1 Page d'accueil (`/`)

**Fichier** : `src/pages/index.astro`
**Rendu** : Statique (build-time)

**Comportement** :
1. Charge la config via `loadSiteConfig()`
2. Fetch les 3 derniers articles publies via `getPosts()`
3. Affiche les sections dans l'ordre : Hero, Features, Derniers articles, CTA

**Sections** :

| Section | Composant | Source des donnees |
|---------|-----------|-------------------|
| Hero | `Hero.astro` | `config.hero` |
| Features | `Features.astro` | `config.features` |
| Derniers articles | `BlogCard.astro` x3 | `getPosts().slice(0, 3)` |
| CTA | `CTA.astro` | `config.cta` |

**Degradation gracieuse** : si l'API Bubble echoue, la section "Derniers articles" est masquee (pas d'erreur visible).

### 4.2 Liste du blog (`/blog`)

**Fichier** : `src/pages/blog/index.astro`
**Rendu** : Statique (build-time)

**Comportement** :
1. Fetch tous les articles publies via `getPosts()`
2. Affiche en grille responsive (1/2/3 colonnes)
3. Si aucun article : message "Aucun article pour le moment"

**Composant BlogCard** :
- Props : `title`, `excerpt`, `slug`, `coverImage?`, `date`, `category?`
- Date formatee en francais ("1 janvier 2025")
- Image en lazy loading
- Lien vers `/blog/{slug}`

### 4.3 Article individuel (`/blog/[slug]`)

**Fichier** : `src/pages/blog/[slug].astro`
**Rendu** : Statique (build-time, via `getStaticPaths`)

**Comportement** :
1. `getStaticPaths()` fetch tous les articles et genere un path par slug
2. Les articles sans slug sont filtres (`.filter((post) => post.slug)`)
3. Le contenu HTML Bubble est rendu via `<Fragment set:html={post.content} />`
4. Si l'article n'existe pas : redirection vers `/blog`

**Layout Post** :
- Props : `title`, `description`, `coverImage?`, `date`, `author?`, `category?`
- Date formatee en francais
- Contenu style via `@tailwindcss/typography` (classe `prose`)
- Meta OpenGraph inclus (`type: "article"`, `publishedDate`)

---

## 5. Panneau d'administration

### 5.1 Authentification

**Mecanisme** : Cookie HMAC-signed, sans base de donnees de sessions.

**Flux** :
1. L'utilisateur saisit le mot de passe sur `/admin/login`
2. `POST /api/admin/login` verifie le mot de passe contre `ADMIN_PASSWORD` (env var)
3. Si correct : creation d'un token `admin:{timestamp_expiration}:{signature_hmac}`
4. Le token est stocke dans un cookie `admin_session` (HttpOnly, SameSite=Lax, 24h)
5. Chaque requete admin verifie le cookie via `verifySession()` (signature + expiration)

**Variables d'environnement** :
- `ADMIN_PASSWORD` : mot de passe admin (defaut: "admin")
- `ADMIN_SESSION_SECRET` : cle secrete pour HMAC-SHA256 (defaut: "change-me-in-production")

**Pages protegees** : toutes les pages `/admin/*` et endpoints `/api/admin/*` (sauf `/api/admin/login`)

### 5.2 Page Login (`/admin/login`)

**Fichier** : `src/pages/admin/login.astro`
**Rendu** : Serverless

**Interface** :
- Logo + titre "Administration"
- Champ mot de passe (autofocus)
- Bouton "Se connecter"
- Message d'erreur en cas d'echec
- Lien "Retour au site"

**Comportement** :
- Si deja connecte : redirection vers `/admin`
- Pendant la soumission : spinner + bouton desactive
- En cas d'erreur : alert rouge avec le message

### 5.3 Dashboard Configuration (`/admin`)

**Fichier** : `src/pages/admin/index.astro`
**Rendu** : Serverless

**Header** :
- Titre "Admin"
- Liens : "Contenu" (vers `/admin/content`), "Voir le site" (nouvel onglet), "Quitter" (logout)

**Formulaire** (4 cartes) :

#### Carte "General"
| Champ | ID | Type | Correspond a |
|-------|-----|------|-------------|
| Nom du site | `cfg-name` | text | `config.name` |
| URL du site | `cfg-url` | url | `config.url` |
| Description SEO | `cfg-description` | textarea | `config.description` |
| URL app Bubble | `cfg-bubbleAppUrl` | url | `config.bubbleAppUrl` |
| URL API Bubble | `cfg-bubbleApiUrl` | url | `config.bubbleApiUrl` |
| Token API Bubble | `cfg-bubbleApiToken` | password | `config.bubbleApiToken` |

#### Carte "Section Hero"
| Champ | ID | Type | Correspond a |
|-------|-----|------|-------------|
| Titre | `cfg-hero-title` | text | `config.hero.title` |
| Sous-titre | `cfg-hero-subtitle` | textarea | `config.hero.subtitle` |
| Texte du bouton | `cfg-hero-ctaText` | text | `config.hero.ctaText` |
| Lien du bouton | `cfg-hero-ctaLink` | text | `config.hero.ctaLink` |

#### Carte "Fonctionnalites"
| Champ | Type | Correspond a |
|-------|------|-------------|
| Titre de la section | text | `config.features.title` |
| Liste de fonctionnalites | dynamique | `config.features.items[]` |

Chaque fonctionnalite :
- Champ "Icone" (texte court)
- Champ "Titre"
- Champ "Description" (textarea)
- Bouton "Supprimer" (rouge)
- Bouton global "Ajouter une fonctionnalite"

#### Carte "Section CTA"
| Champ | ID | Type | Correspond a |
|-------|-----|------|-------------|
| Titre | `cfg-cta-title` | text | `config.cta.title` |
| Description | `cfg-cta-description` | textarea | `config.cta.description` |
| Texte du bouton | `cfg-cta-ctaText` | text | `config.cta.ctaText` |
| Lien du bouton | `cfg-cta-ctaLink` | text | `config.cta.ctaLink` |

**Barre de sauvegarde** (sticky, bas de page) :
- Status : "Pret a publier" / "Sauvegarde en cours..." / "Publie avec succes" / "Erreur..."
- Bouton "Enregistrer & Publier"

**Logique de sauvegarde** (`gatherConfig`) :
- **IMPORTANT** : merge avec `currentConfig` via spread (`{...currentConfig, ...formFields}`)
- Preserve les champs non edites sur cette page : `bubbleContentTable`, `bubbleFieldMapping`
- Envoie via `POST /api/admin/deploy`

### 5.4 Page Contenu (`/admin/content`)

**Fichier** : `src/pages/admin/content.astro`
**Rendu** : Serverless

**Header** :
- Titre "Contenu"
- Liens : "Configuration" (retour `/admin`), "Voir le site" (nouvel onglet)

**Wizard en 3 etapes** (stepper visuel) :

#### Etape 1 — Selection de la table

**Interface** :
- Bouton "Charger les tables depuis Bubble" → appel `GET /api/admin/bubble-meta`
- Liste des tables en radio buttons
- Chaque table affiche : nom, nombre de champs, badges des 3 premiers types
- Pre-selection si `bubbleContentTable` deja configure
- Bouton "Suivant"

**Comportement** :
- Le bouton de chargement disparait apres succes
- Si aucune table : message "Aucune table trouvee"
- Validation : une table doit etre selectionnee

#### Etape 2 — Mapping des champs

**Champs a mapper** (9 champs blog) :

| Champ blog | Label | Obligatoire | Types preferes | Mots-cles auto-detection |
|------------|-------|-------------|----------------|-------------------------|
| `title` | Titre | Oui | text | title, titre, name, nom |
| `slug` | Slug | Oui | text | slug, Slug, url, permalink |
| `content` | Contenu | Oui | text | content, contenu, body, corps, texte, html, article |
| `excerpt` | Extrait | Non | text | excerpt, extrait, summary, resume, description, intro, headline |
| `coverImage` | Image | Non | image | cover, couv, image, photo, thumbnail, vignette, banner, illustration |
| `author` | Auteur | Non | text, ref | author, auteur, writer, redacteur |
| `category` | Categorie | Non | text, ref, option_set | category, categorie, rubrique, tag, type |
| `date` | Date | Non | date | date, published_at, created, Created Date, publication |
| `published` | Publie | Non | boolean | published, publie, active, visible, live, online |

**Auto-detection** (fonction `autoDetect`) :
1. Match exact par nom (insensible a la casse)
2. Match partiel par nom (insensible a la casse)
3. Match par type (pour image, date, boolean uniquement)
4. Si un mapping existant correspond a la meme table, il est prioritaire

**Interface** :
- Chaque champ = ligne avec label + `<select>` rempli des champs de la table
- Option "-- Non mappe --" en premier
- Chaque option affiche le nom du champ et son type entre parentheses
- Boutons "Retour" et "Apercu"

**Validation** : `title`, `slug`, `content` obligatoires

#### Etape 3 — Apercu

**Interface** :
- Appel `POST /api/admin/bubble-preview` avec `{ tableName, limit: 5 }`
- Tableau a 5 colonnes : Titre, Slug, Extrait, Date, Image
- L'extrait est tronque a 80 caracteres, les balises HTML supprimees
- La date est formatee en francais (toLocaleDateString)
- L'image est affichee en miniature (40x40px, arrondie)
- Boutons "Retour" et "Enregistrer & Publier"

**Sauvegarde** :
1. Charge la config existante via `GET /api/admin/config`
2. Merge les nouveaux champs : `{ ...configData.config, bubbleContentTable, bubbleFieldMapping }`
3. Envoie via `POST /api/admin/deploy`

---

## 6. Endpoints API

Tous sous `/api/admin/`, toutes les routes SSR (`prerender = false`).

### 6.1 POST `/api/admin/login`

**Auth** : Aucune (endpoint public)
**Body** : `{ password: string }`
**Reponse succes** (200) : `{ success: true }` + header `Set-Cookie`
**Reponse erreur** (401) : `{ error: "Mot de passe incorrect" }`

### 6.2 POST `/api/admin/logout`

**Auth** : Aucune
**Reponse** (200) : `{ success: true }` + header `Set-Cookie` (supprime le cookie)

### 6.3 GET `/api/admin/config`

**Auth** : Cookie session requis
**Reponse** (200) : `{ config: SiteConfig | null }`
**Reponse** (401) : `{ error: "Non autorise" }`

### 6.4 PUT `/api/admin/config`

**Auth** : Cookie session requis
**Body** : `{ config: SiteConfig }`
**Reponse succes** (200) : `{ success: true }`
**Reponse erreur** (500) : `{ error: string }`

### 6.5 POST `/api/admin/deploy`

**Auth** : Cookie session requis
**Body** : `{ config: SiteConfig }`

**Comportement** :
1. Sauvegarde la config dans Supabase via `updateSiteConfig()`
2. Declenche un rebuild Vercel via `VERCEL_DEPLOY_HOOK_URL` (POST)

**Reponses** :
- (200) `{ success: true, deployed: true, message: "Config sauvegardee et rebuild declenche !" }`
- (200) `{ success: true, deployed: false, message: "Config sauvegardee. Deploy hook non configure." }`
- (200) `{ success: true, deployed: false, message: "Config sauvegardee. Erreur deploy: {status}" }`
- (500) `{ error: "Erreur sauvegarde: {detail}" }`

### 6.6 GET `/api/admin/bubble-meta`

**Auth** : Cookie session requis

**Comportement** :
1. Lit `bubbleApiUrl` depuis SiteConfig (Supabase)
2. Appelle `{bubbleApiUrl}/meta/swagger.json` (endpoint public Bubble, **sans** Bearer token)
3. Parse le Swagger/OpenAPI :
   - Extrait les types accessibles depuis `swagger.paths` (uniquement ceux avec un GET sur `/obj/{typeName}`)
   - Pour chaque type accessible, lit `swagger.definitions[typeName].properties`
4. Determine le type de chaque champ :
   - `string` → `text` (sauf si mot-cle image dans le nom)
   - `format: date-time` ou `format: date` → `date`
   - `boolean` → `boolean`
   - `number` ou `integer` → `number`
   - `array` → `list` (ou `list_option_set`)
   - `option set` → `option_set`
   - `$ref: GeographicAddress` → `address`
   - Autre `$ref` → `ref`
5. Detection des champs image par mots-cles dans le nom : `image, photo, picture, avatar, cover, couv, thumbnail, logo, vignette, banner, banniere, banniere, panorama, illustration, img, pic`
6. Ajoute les champs systeme Bubble s'ils ne sont pas deja presents : `_id`, `Created_Date`, `Modified_Date`, `Created_By`, `Slug`

**Reponse** (200) :
```json
{
  "types": [
    {
      "name": "post",
      "fields": [
        { "name": "title", "type": "text" },
        { "name": "cover_image", "type": "image" },
        { "name": "Created_Date", "type": "date" }
      ]
    }
  ]
}
```

**Erreurs** :
- (400) `{ error: "URL API Bubble non configuree..." }`
- (502) `{ error: "Erreur Bubble API ({status}): {body}" }`

### 6.7 POST `/api/admin/bubble-preview`

**Auth** : Cookie session requis
**Body** : `{ tableName: string, limit?: number }`

**Comportement** :
1. Lit `bubbleApiUrl` et `bubbleApiToken` depuis SiteConfig
2. Fetch `{bubbleApiUrl}/obj/{tableName}?limit={limit}` avec Bearer token
3. Retourne les resultats bruts

**Reponse** (200) : `{ results: Record<string, any>[] }`

---

## 7. Modules metier

### 7.1 `src/lib/supabase.ts`

**Client** : `createClient()` avec `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Si les env vars sont absentes, le client est `null` (degradation gracieuse).

**Fonctions** :
- `getSiteConfig()` : lit la premiere ligne de `site_config`, retourne `config` (JSONB) ou `null`
- `updateSiteConfig(config)` : met a jour la colonne `config` de la ligne existante

### 7.2 `src/lib/bubble.ts`

**Credentials** : Supabase (prioritaire) > env vars > vide

**Fonctions publiques** :
- `getPosts()` : fetch tous les articles publies, tries par date decroissante
  - Filtre : `published = true` (si le champ mapping est defini)
  - Tri : champ `mapping.date` ou `"Created_Date"` en fallback
  - Pagination automatique (lots de 100, via `bubbleFetchAll`)
- `getPostBySlug(slug)` : fetch un article par son slug
  - Contraintes : slug exact + published = true
  - Retourne `undefined` si non trouve
- `bubbleFetch<T>(typeName, options)` : appel unitaire a l'API Bubble
- `bubbleFetchAll<T>(typeName, options)` : appel pagine (gere `remaining`)

**Configuration dynamique** :
- `getContentConfig()` : retourne `{ table, mapping }` depuis SiteConfig ou defaults
- Defaults : table `"post"`, mapping standard (slug = `"Slug"`, date = `"Created Date"`)
- Cache en memoire (1 seul chargement par process)

### 7.3 `src/config.ts`

**Fonction** : `loadSiteConfig()` — retourne SiteConfig depuis Supabase, fallback sur les defaults statiques.
**Cache** : en memoire, 1 seul chargement par build.
**Defaults** : tous les champs remplis avec des valeurs placeholder en francais.

### 7.4 `src/lib/admin-auth.ts`

**Fonctions** :
- `checkPassword(password)` : comparaison directe avec `ADMIN_PASSWORD`
- `createSession()` : genere token `admin:{expires}:{hmac_sha256}`
- `verifySession(cookie)` : verifie signature + expiration
- `getSessionCookie(token)` : genere le header Set-Cookie
- `clearSessionCookie()` : genere le header Set-Cookie d'expiration
- `getSessionFromRequest(request)` : extrait le cookie de la requete

---

## 8. Composants

### 8.1 Layout `Base.astro`

Layout global des pages publiques. Inclut :
- Head : charset, viewport, favicon, Google Fonts, meta SEO, OpenGraph
- Header/Navigation
- Footer
- Slot pour le contenu

### 8.2 Layout `Admin.astro`

Layout des pages admin. Inclut :
- Meta `robots: noindex, nofollow`
- CSS global admin (cartes, formulaires, boutons, alerts, stepper, etc.)
- Pas de header/footer — chaque page admin gere son propre header

### 8.3 Layout `Post.astro`

Layout d'un article de blog. Props : `title`, `description`, `coverImage?`, `date`, `author?`, `category?`.
- Header : categorie (badge), date, auteur
- Image de couverture (pleine largeur)
- Contenu via `<slot />` (style `prose` Tailwind Typography)

### 8.4 Composant `Hero.astro`

Section hero de la page d'accueil.
- Props optionnelles (fallback sur `loadSiteConfig()`)
- Gradient `primary-50` → blanc
- 2 boutons : CTA principal + "Lire le blog"

### 8.5 Composant `Features.astro`

Section fonctionnalites de la page d'accueil.
- Props optionnelles (fallback sur `loadSiteConfig()`)
- Grille responsive 1/3 colonnes
- Chaque carte : icone dans badge colore + titre + description

### 8.6 Composant `CTA.astro`

Section appel a l'action en bas de la page d'accueil.
- Props optionnelles (fallback sur `loadSiteConfig()`)
- Titre + description + bouton

### 8.7 Composant `BlogCard.astro`

Carte d'article dans les listes.
- Props : `title`, `excerpt`, `slug`, `coverImage?`, `date`, `category?`
- Image (lazy loading, 192px de haut)
- Badge categorie + date formatee
- Lien "Lire la suite"

---

## 9. Variables d'environnement

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `SUPABASE_URL` | Oui | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Oui | Cle service_role Supabase |
| `ADMIN_PASSWORD` | Oui | Mot de passe admin |
| `ADMIN_SESSION_SECRET` | Oui | Secret HMAC pour les sessions |
| `VERCEL_DEPLOY_HOOK_URL` | Non | URL du deploy hook Vercel |
| `BUBBLE_API_URL` | Non | URL API Bubble (fallback si Supabase non configure) |
| `BUBBLE_API_TOKEN` | Non | Token API Bubble (fallback si Supabase non configure) |
| `SITE_URL` | Non | URL du site (fallback) |
| `SITE_NAME` | Non | Nom du site (fallback) |
| `SITE_DESCRIPTION` | Non | Description du site (fallback) |

---

## 10. Regles de gestion

### 10.1 Priorite des sources de configuration

```
Supabase (site_config.config)  >  Variables d'environnement  >  Defaults statiques
```

### 10.2 Preservation de la configuration

- Le dashboard (`/admin`) edite les champs generaux, hero, features, CTA et credentials Bubble
- La page contenu (`/admin/content`) edite `bubbleContentTable` et `bubbleFieldMapping`
- **Regle critique** : chaque page merge ses modifications avec la config existante complete (`{...currentConfig, ...changes}`) pour ne jamais ecraser les champs geres par l'autre page

### 10.3 Articles sans slug

- Les articles Bubble sans slug sont exclus de `getStaticPaths()` (pas de page generee)
- Cela evite les erreurs de build Astro ("Missing parameter: slug")

### 10.4 Champ `published`

- Si `bubbleFieldMapping.published` est defini : filtre `equals true` applique aux requetes Bubble
- Si non defini : tous les articles sont consideres comme publies

### 10.5 Endpoint Swagger vs Data API

- L'endpoint `/meta/swagger.json` est **public** (pas de Bearer token requis)
- L'endpoint `/obj/{type}` est **prive** (Bearer token requis)
- Un token invalide envoye sur le swagger provoque un 401 — c'est pourquoi on ne l'envoie pas

### 10.6 Types de champs Bubble

Le swagger Bubble declare les images comme `type: "string"`. La detection se fait par analyse du nom du champ via des mots-cles (voir section 6.6).

Types supportes dans l'interface de mapping :
| Type interne | Label affiche | Couleur badge |
|-------------|---------------|---------------|
| `text` | Texte | Bleu |
| `image` | Image | Rose |
| `date` | Date | Vert |
| `boolean` | Oui/Non | Ambre |
| `number` | Nombre | Violet |
| `list` | Liste | Bleu clair |
| `option_set` | Option Set | Fuchsia |
| `ref` | Ref | Orange |
| `address` | Adresse | Emeraude |
| Autre | Nom brut | Gris |

---

## 11. Arborescence des fichiers

```
src/
  components/
    BlogCard.astro          # Carte d'article
    CTA.astro               # Section CTA
    Features.astro          # Section fonctionnalites
    Hero.astro              # Section hero
  layouts/
    Admin.astro             # Layout admin (CSS global)
    Base.astro              # Layout public (SEO, nav, footer)
    Post.astro              # Layout article de blog
  lib/
    admin-auth.ts           # Auth HMAC (login, sessions, cookies)
    bubble.ts               # Client API Bubble + mapping dynamique
    supabase.ts             # Client Supabase + types SiteConfig
  pages/
    index.astro             # Page d'accueil
    robots.txt.ts           # Robots.txt dynamique
    blog/
      index.astro           # Liste des articles
      [slug].astro          # Article individuel
    admin/
      login.astro           # Page de connexion
      index.astro           # Dashboard configuration
      content.astro         # Wizard mapping contenu
    api/admin/
      login.ts              # POST login
      logout.ts             # POST logout
      config.ts             # GET/PUT config
      deploy.ts             # POST deploy (save + rebuild)
      bubble-meta.ts        # GET introspection Bubble
      bubble-preview.ts     # POST preview donnees Bubble
  config.ts                 # Chargement config (Supabase > defaults)
```
