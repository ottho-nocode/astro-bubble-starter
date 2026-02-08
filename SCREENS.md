# Ecrans & User Flows — Astro Bubble Starter

Document de reference pour la creation de maquettes. Chaque ecran est decrit avec sa structure visuelle, ses elements interactifs et les transitions vers les autres ecrans.

---

## Sommaire

1. [Carte des ecrans](#1-carte-des-ecrans)
2. [User Flows](#2-user-flows)
3. [Ecrans publics](#3-ecrans-publics)
4. [Ecrans admin](#4-ecrans-admin)
5. [Etats et micro-interactions](#5-etats-et-micro-interactions)
6. [Design tokens](#6-design-tokens)

---

## 1. Carte des ecrans

```
PAGES PUBLIQUES                         PAGES ADMIN
===============                         ===========

  [Accueil]                            [Login Admin]
     |                                      |
     +---> [Blog Liste]                [Dashboard Config] <---> [Contenu (Wizard)]
              |                             |
              +---> [Article]          [API endpoints]
                                       (pas d'UI propre)
```

### Navigation globale

```
Header public :  Logo(←Accueil)   Accueil   Blog   [Acceder a l'app]
Footer public :  (c) NomDuSite    Blog    Application
Admin :          Pas de nav globale, chaque page a son propre header
```

---

## 2. User Flows

### Flow A — Visiteur consulte le site

```
Visiteur arrive
    |
    v
[Accueil] ─── clique "Lire le blog" ou nav "Blog" ───> [Blog Liste]
    |                                                        |
    | clique CTA                                    clique sur un article
    v                                                        |
[App Bubble]                                                 v
                                                       [Article]
                                                            |
                                                   clique "Retour au blog"
                                                            |
                                                            v
                                                       [Blog Liste]
```

### Flow B — Admin configure le site

```
Admin accede a /admin
    |
    v
[Login Admin]
    |
    | saisit mot de passe + "Se connecter"
    v
[Dashboard Config]
    |
    +--- modifie les champs (nom, hero, features, CTA, credentials Bubble)
    |    clique "Enregistrer & Publier"
    |         |
    |         v
    |    Sauvegarde Supabase + rebuild Vercel
    |    Message succes/erreur
    |
    +--- clique "Contenu" (header)
    |         |
    |         v
    |    [Contenu — Etape 1: Table]
    |         |
    |         | clique "Charger les tables"
    |         | selectionne une table
    |         | clique "Suivant"
    |         v
    |    [Contenu — Etape 2: Mapping]
    |         |
    |         | associe les champs
    |         | clique "Apercu"
    |         v
    |    [Contenu — Etape 3: Apercu]
    |         |
    |         | verifie les donnees
    |         | clique "Enregistrer & Publier"
    |         v
    |    Sauvegarde + rebuild
    |
    +--- clique "Voir le site" → nouvel onglet → [Accueil]
    |
    +--- clique "Quitter"
              |
              v
         [Login Admin]
```

### Flow C — Admin configure le mapping contenu (detail)

```
[Contenu — Etape 1]
    |
    | clique "Charger les tables depuis Bubble"
    |     |
    |     +--- ERREUR: "URL API non configuree" → message rouge, reste sur l'etape
    |     +--- ERREUR: reseau → message rouge, bouton reactif
    |     +--- SUCCES: liste des tables s'affiche
    |
    | selectionne une table (radio button)
    | clique "Suivant"
    v
[Contenu — Etape 2]
    |
    | les selects sont pre-remplis par auto-detection
    | l'admin ajuste les mappings manuellement si besoin
    |
    | clique "Apercu"
    |     |
    |     +--- ERREUR: champ obligatoire manquant → message rouge, reste sur l'etape
    |     +--- SUCCES: passe a l'etape 3
    v
[Contenu — Etape 3]
    |
    | tableau avec 5 articles de preview
    |     |
    |     +--- 0 articles → message "Aucun enregistrement"
    |     +--- ERREUR API → message d'erreur dans la zone preview
    |
    | clique "Enregistrer & Publier"
    |     |
    |     +--- SUCCES: message vert
    |     +--- ERREUR: message rouge
    |
    | clique "Retour" → revient a l'etape 2
```

---

## 3. Ecrans publics

### 3.1 Accueil (`/`)

```
+============================================================+
| HEADER                                                      |
| [Logo/NomDuSite]          Accueil   Blog   [Acceder a l'app]|
+============================================================+
|                                                              |
|  ┌────────────────────────────────────────────────────────┐  |
|  │                SECTION HERO                             │  |
|  │           fond gradient bleu clair → blanc              │  |
|  │                                                         │  |
|  │              {Titre principal}                           │  |
|  │        texte 4xl-6xl, bold, gris fonce                  │  |
|  │                                                         │  |
|  │              {Sous-titre}                               │  |
|  │         texte lg-xl, gris moyen, max 2xl               │  |
|  │                                                         │  |
|  │        [Commencer]    [Lire le blog]                    │  |
|  │        btn bleu        btn blanc borde                  │  |
|  └────────────────────────────────────────────────────────┘  |
|                                                              |
|  ┌────────────────────────────────────────────────────────┐  |
|  │              SECTION FEATURES                           │  |
|  │               fond blanc                                │  |
|  │                                                         │  |
|  │            {Titre de section}                           │  |
|  │             texte 3xl, centre                           │  |
|  │                                                         │  |
|  │   ┌──────────┐   ┌──────────┐   ┌──────────┐          │  |
|  │   │ [icone]  │   │ [icone]  │   │ [icone]  │          │  |
|  │   │  Titre   │   │  Titre   │   │  Titre   │          │  |
|  │   │  Desc.   │   │  Desc.   │   │  Desc.   │          │  |
|  │   └──────────┘   └──────────┘   └──────────┘          │  |
|  │   carte blanche    carte blanche    carte blanche      │  |
|  │   bord gris clair  hover: shadow    arrondi xl         │  |
|  └────────────────────────────────────────────────────────┘  |
|                                                              |
|  ┌────────────────────────────────────────────────────────┐  |
|  │          SECTION DERNIERS ARTICLES                      │  |
|  │               fond gris clair                           │  |
|  │    (visible uniquement si des articles existent)        │  |
|  │                                                         │  |
|  │            "Derniers articles"                           │  |
|  │             texte 3xl, centre                           │  |
|  │                                                         │  |
|  │   ┌──────────┐   ┌──────────┐   ┌──────────┐          │  |
|  │   │ [image]  │   │ [image]  │   │ [image]  │          │  |
|  │   │ categorie│   │ categorie│   │ categorie│          │  |
|  │   │ + date   │   │ + date   │   │ + date   │          │  |
|  │   │ Titre    │   │ Titre    │   │ Titre    │          │  |
|  │   │ Extrait  │   │ Extrait  │   │ Extrait  │          │  |
|  │   │ Lire →   │   │ Lire →   │   │ Lire →   │          │  |
|  │   └──────────┘   └──────────┘   └──────────┘          │  |
|  │                                                         │  |
|  │          "Voir tous les articles →"                     │  |
|  │           lien bleu, centre                             │  |
|  └────────────────────────────────────────────────────────┘  |
|                                                              |
|  ┌────────────────────────────────────────────────────────┐  |
|  │                  SECTION CTA                            │  |
|  │        carte arrondie, fond bleu primary                │  |
|  │                                                         │  |
|  │              {Titre CTA}                                │  |
|  │            texte 3xl, blanc                             │  |
|  │                                                         │  |
|  │              {Description}                              │  |
|  │            texte lg, bleu clair                         │  |
|  │                                                         │  |
|  │          [Bouton CTA blanc]                             │  |
|  └────────────────────────────────────────────────────────┘  |
|                                                              |
+============================================================+
| FOOTER                                                      |
| (c) 2025 NomDuSite                    Blog   Application   |
+============================================================+
```

**Elements interactifs** :
- Logo → lien vers `/`
- Nav "Accueil" → `/`
- Nav "Blog" → `/blog`
- Bouton "Acceder a l'app" → `config.bubbleAppUrl` (nouvel onglet)
- Bouton hero "Commencer" → `config.hero.ctaLink`
- Bouton hero "Lire le blog" → `/blog`
- Cartes articles → `/blog/{slug}`
- "Voir tous les articles" → `/blog`
- Bouton CTA → `config.cta.ctaLink`

---

### 3.2 Blog Liste (`/blog`)

```
+============================================================+
| HEADER (identique a l'accueil)                              |
+============================================================+
|                                                              |
|  "Blog"                                                     |
|  texte 4xl, bold                                            |
|                                                              |
|  "Decouvrez nos derniers articles et actualites."            |
|  texte lg, gris                                             |
|                                                              |
|  ┌──────────┐   ┌──────────┐   ┌──────────┐                |
|  │ [image]  │   │ [image]  │   │ [image]  │                |
|  │ cat+date │   │ cat+date │   │ cat+date │                |
|  │ Titre    │   │ Titre    │   │ Titre    │                |
|  │ Extrait  │   │ Extrait  │   │ Extrait  │                |
|  │ Lire →   │   │ Lire →   │   │ Lire →   │                |
|  └──────────┘   └──────────┘   └──────────┘                |
|  ┌──────────┐   ┌──────────┐   ┌──────────┐                |
|  │   ...    │   │   ...    │   │   ...    │                |
|  └──────────┘   └──────────┘   └──────────┘                |
|                                                              |
|  (si aucun article :)                                       |
|  "Aucun article pour le moment. Configurez votre API        |
|   Bubble pour commencer."                                   |
|  texte gris, centre, padding important                      |
|                                                              |
+============================================================+
| FOOTER                                                      |
+============================================================+
```

**Grille responsive** :
- Mobile : 1 colonne
- Tablette : 2 colonnes
- Desktop : 3 colonnes

**BlogCard (detail)** :

```
┌─────────────────────────┐
│ [Image couverture]      │ 192px de haut, object-cover
│ (optionnelle)           │ hover: opacity 90%
├─────────────────────────┤
│ padding 24px            │
│                         │
│ [Categorie] 1 jan 2025  │ badge bleu clair + texte gris
│                         │
│ Titre de l'article      │ texte lg, bold
│ (lien, hover bleu)      │
│                         │
│ Extrait sur 3 lignes    │ texte sm, gris, line-clamp-3
│ maximum...              │
│                         │
│ Lire la suite →         │ texte sm, bleu primary
└─────────────────────────┘
  carte blanche, bord gris, arrondi xl
  hover: shadow-md
```

---

### 3.3 Article (`/blog/[slug]`)

```
+============================================================+
| HEADER                                                      |
+============================================================+
|                                                              |
|  max-width 768px, centre                                    |
|                                                              |
|  [Categorie]   1 janvier 2025   par {Auteur}               |
|  badge bleu    texte sm gris    texte sm gris               |
|                                                              |
|  {Titre de l'article}                                       |
|  texte 3xl-4xl, bold                                        |
|                                                              |
|  {Description/extrait}                                      |
|  texte lg, gris                                             |
|                                                              |
|  ┌──────────────────────────────────────────┐               |
|  │        [Image de couverture]             │               |
|  │        pleine largeur, arrondi xl        │               |
|  └──────────────────────────────────────────┘               |
|                                                              |
|  ┌──────────────────────────────────────────┐               |
|  │           CONTENU HTML                   │               |
|  │       style "prose" (Tailwind Typography)│               |
|  │                                          │               |
|  │  Paragraphes, titres h2/h3,             │               |
|  │  listes, images inline,                  │               |
|  │  liens, blockquotes, code...            │               |
|  └──────────────────────────────────────────┘               |
|                                                              |
+============================================================+
| FOOTER                                                      |
+============================================================+
```

---

## 4. Ecrans admin

### 4.1 Login (`/admin/login`)

```
+============================================================+
| fond gris clair (slate-50), plein ecran centre              |
|                                                              |
|              ┌─────┐                                        |
|              │ ▲▲▲ │  logo 40x40, noir, arrondi             |
|              └─────┘                                        |
|           "Administration"                                   |
|        texte xl, bold, noir                                  |
|   "Connectez-vous pour acceder au panneau"                  |
|        texte sm, gris clair                                  |
|                                                              |
|   ┌──────────────────────────────────┐                      |
|   │  CARTE blanche, arrondi, shadow  │                      |
|   │                                  │                      |
|   │  [ERREUR]  (masque par defaut)   │  alert rouge         |
|   │                                  │                      |
|   │  Mot de passe                    │                      |
|   │  ┌──────────────────────────┐    │                      |
|   │  │ ●●●●●●●●                │    │  input password      |
|   │  └──────────────────────────┘    │  autofocus           |
|   │                                  │                      |
|   │  ┌──────────────────────────┐    │                      |
|   │  │  → Se connecter          │    │  btn noir, 100%      |
|   │  └──────────────────────────┘    │                      |
|   └──────────────────────────────────┘                      |
|                                                              |
|           "Retour au site"                                  |
|         texte xs, lien gris                                  |
+============================================================+
```

**Etats du bouton** :
- Normal : icone fleche + "Se connecter"
- Loading : spinner blanc + "Connexion..."
- Erreur : retour a l'etat normal, alert rouge visible

---

### 4.2 Dashboard Configuration (`/admin`)

```
+============================================================+
| HEADER ADMIN  (sticky top, fond blanc, bord bas)            |
|                                                              |
| Admin                     [Contenu] [Voir le site] [Quitter]|
| "Configuration du site"   btn ghost  btn ghost    btn outline|
+============================================================+
|                                                              |
| max-width 1024px, centre                                    |
|                                                              |
| "Configuration du site"     titre 1.5rem, bold              |
| "Modifiez les textes..."    sous-titre sm, gris             |
|                                                              |
| [STATUS MESSAGE]  (masque par defaut, alert verte ou rouge) |
|                                                              |
| ┌──────────────────────────────────────────────────────┐    |
| │ CARTE "General"                                       │    |
| │ "Nom, description et URLs du site"                    │    |
| │                                                       │    |
| │ ┌─────────────────┐  ┌─────────────────┐             │    |
| │ │ Nom du site     │  │ URL du site     │  2 colonnes │    |
| │ └─────────────────┘  └─────────────────┘             │    |
| │ ┌──────────────────────────────────────┐              │    |
| │ │ Description (SEO)                    │  textarea    │    |
| │ └──────────────────────────────────────┘              │    |
| │ ┌─────────────────┐  ┌─────────────────┐             │    |
| │ │ URL app Bubble  │  │ URL API Bubble  │             │    |
| │ └─────────────────┘  └─────────────────┘             │    |
| │ ┌──────────────────────────────────────┐              │    |
| │ │ Token API Bubble                     │  type=password│   |
| │ └──────────────────────────────────────┘              │    |
| └──────────────────────────────────────────────────────┘    |
|                                                              |
| ┌──────────────────────────────────────────────────────┐    |
| │ CARTE "Section Hero"                                  │    |
| │ "Titre principal et appel a l'action"                 │    |
| │                                                       │    |
| │ ┌──────────────────────────────────────┐              │    |
| │ │ Titre                                │              │    |
| │ └──────────────────────────────────────┘              │    |
| │ ┌──────────────────────────────────────┐              │    |
| │ │ Sous-titre                           │  textarea    │    |
| │ └──────────────────────────────────────┘              │    |
| │ ┌─────────────────┐  ┌─────────────────┐             │    |
| │ │ Texte du bouton │  │ Lien du bouton  │             │    |
| │ └─────────────────┘  └─────────────────┘             │    |
| └──────────────────────────────────────────────────────┘    |
|                                                              |
| ┌──────────────────────────────────────────────────────┐    |
| │ CARTE "Fonctionnalites"                               │    |
| │ "Points forts affiches sur la page d'accueil"         │    |
| │                                                       │    |
| │ ┌──────────────────────────────────────┐              │    |
| │ │ Titre de la section                  │              │    |
| │ └──────────────────────────────────────┘              │    |
| │                                                       │    |
| │ ┌────────────────────────────────────────────┐        │    |
| │ │ Fonctionnalite 1            [Supprimer] X  │        │    |
| │ │ ┌──────┐  ┌──────────────────────────┐     │        │    |
| │ │ │Icone │  │ Titre                    │     │        │    |
| │ │ └──────┘  └──────────────────────────┘     │        │    |
| │ │ ┌──────────────────────────────────────┐   │        │    |
| │ │ │ Description                          │   │        │    |
| │ │ └──────────────────────────────────────┘   │        │    |
| │ └────────────────────────────────────────────┘        │    |
| │                                                       │    |
| │ ┌────────────────────────────────────────────┐        │    |
| │ │ Fonctionnalite 2            [Supprimer] X  │        │    |
| │ │ (meme structure)                            │        │    |
| │ └────────────────────────────────────────────┘        │    |
| │                                                       │    |
| │ ┌────────────────────────────────────────────┐        │    |
| │ │ + Ajouter une fonctionnalite               │        │    |
| │ └────────────────────────────────────────────┘        │    |
| │   btn secondaire (gris), largeur 100%                 │    |
| └──────────────────────────────────────────────────────┘    |
|                                                              |
| ┌──────────────────────────────────────────────────────┐    |
| │ CARTE "Section CTA"                                   │    |
| │ "Appel a l'action en bas de page"                     │    |
| │                                                       │    |
| │ ┌──────────────────────────────────────┐              │    |
| │ │ Titre                                │              │    |
| │ └──────────────────────────────────────┘              │    |
| │ ┌──────────────────────────────────────┐              │    |
| │ │ Description                          │  textarea    │    |
| │ └──────────────────────────────────────┘              │    |
| │ ┌─────────────────┐  ┌─────────────────┐             │    |
| │ │ Texte du bouton │  │ Lien du bouton  │             │    |
| │ └─────────────────┘  └─────────────────┘             │    |
| └──────────────────────────────────────────────────────┘    |
|                                                              |
| (padding bottom 8rem pour la save bar)                      |
|                                                              |
+============================================================+
| BARRE DE SAUVEGARDE (sticky bottom, fond blanc, bord haut)  |
|                                                              |
| "Pret a publier"                [Enregistrer & Publier] →   |
|  status sm gris                  btn noir primary            |
+============================================================+
```

**Loading initial** :
- Overlay plein ecran avec 3 points animes (bounce)
- Disparait apres chargement de la config depuis l'API

---

### 4.3 Contenu — Etape 1 : Selection de la table (`/admin/content`)

```
+============================================================+
| HEADER ADMIN                                                |
|                                                              |
| Contenu                    [← Configuration] [Voir le site] |
| "Connexion des donnees..."  btn ghost          btn ghost     |
+============================================================+
|                                                              |
| "Mapping du contenu Bubble"    titre 1.5rem                 |
| "Connectez une table..."       sous-titre sm                |
|                                                              |
| [STATUS MESSAGE]                                            |
|                                                              |
|          ┌───┐            ┌───┐            ┌───┐            |
|          │ 1 │────────────│ 2 │────────────│ 3 │            |
|          └───┘            └───┘            └───┘            |
|          Table           Mapping          Apercu            |
|         (actif)         (inactif)        (inactif)          |
|       cercle noir      cercle gris      cercle gris         |
|                                                              |
| ┌──────────────────────────────────────────────────────┐    |
| │ CARTE "Selection de la table"                         │    |
| │ "Choisissez la table Bubble contenant vos articles"   │    |
| │                                                       │    |
| │ ┌────────────────────────────────────────────┐        │    |
| │ │  ↻ Charger les tables depuis Bubble        │        │    |
| │ └────────────────────────────────────────────┘        │    |
| │   btn noir primary, largeur 100%                      │    |
| │                                                       │    |
| │ (apres chargement, le bouton disparait et affiche :)  │    |
| │                                                       │    |
| │ ┌────────────────────────────────────────────┐        │    |
| │ │ (o) post         12 champs  [Texte][Date] │        │    |
| │ └────────────────────────────────────────────┘        │    |
| │ ┌────────────────────────────────────────────┐        │    |
| │ │ ( ) article      8 champs   [Texte][Image]│        │    |
| │ └────────────────────────────────────────────┘        │    |
| │ ┌────────────────────────────────────────────┐        │    |
| │ │ ( ) page         6 champs   [Texte]       │        │    |
| │ └────────────────────────────────────────────┘        │    |
| │                                                       │    |
| │ radio buttons, une ligne par table                    │    |
| │ hover: bord gris fonce, fond gris clair               │    |
| │ selected: bord noir, fond gris tres clair             │    |
| │ chaque ligne montre les badges des 3 premiers types   │    |
| │                                                       │    |
| │                              [Suivant →]              │    |
| │                              btn noir primary         │    |
| └──────────────────────────────────────────────────────┘    |
+============================================================+
```

**Detail d'une ligne table** :

```
┌──────────────────────────────────────────────────────────┐
│ (o)   post              12 champs    [Texte] [Date] [Img]│
│ radio  nom bold 0.875rem  meta gris   badges colores     │
│                           0.75rem                        │
│ hover: bord #94a3b8, fond #fafafa                        │
│ selected: bord #171717, fond #f8fafc                     │
└──────────────────────────────────────────────────────────┘
```

---

### 4.4 Contenu — Etape 2 : Mapping des champs

```
+============================================================+
| HEADER ADMIN (identique)                                    |
+============================================================+
|                                                              |
|          ┌───┐            ┌───┐            ┌───┐            |
|          │ ✓ │────────────│ 2 │────────────│ 3 │            |
|          └───┘            └───┘            └───┘            |
|          Table           Mapping          Apercu            |
|         (fait)          (actif)         (inactif)           |
|       cercle vert     cercle noir      cercle gris          |
|                                                              |
| ┌──────────────────────────────────────────────────────┐    |
| │ CARTE "Mapping des champs"                            │    |
| │ "Associez les champs de votre table aux champs du blog"│   |
| │                                                       │    |
| │  Titre *           ┌─────────────────────────┐        │    |
| │  Titre de l'article│ title (Texte)        ▼  │        │    |
| │                     └─────────────────────────┘        │    |
| │                                                       │    |
| │  Slug *            ┌─────────────────────────┐        │    |
| │  URL de l'article  │ Slug (Texte)         ▼  │        │    |
| │                     └─────────────────────────┘        │    |
| │                                                       │    |
| │  Contenu *         ┌─────────────────────────┐        │    |
| │  Corps (HTML)      │ content (Texte)      ▼  │        │    |
| │                     └─────────────────────────┘        │    |
| │                                                       │    |
| │  Extrait           ┌─────────────────────────┐        │    |
| │  Resume court      │ excerpt (Texte)      ▼  │        │    |
| │                     └─────────────────────────┘        │    |
| │                                                       │    |
| │  Image             ┌─────────────────────────┐        │    |
| │  Image couverture  │ cover_image (Image)  ▼  │        │    |
| │                     └─────────────────────────┘        │    |
| │                                                       │    |
| │  Auteur            ┌─────────────────────────┐        │    |
| │  Nom de l'auteur   │ author (Texte)       ▼  │        │    |
| │                     └─────────────────────────┘        │    |
| │                                                       │    |
| │  Categorie         ┌─────────────────────────┐        │    |
| │  Categorie article │ category (Texte)     ▼  │        │    |
| │                     └─────────────────────────┘        │    |
| │                                                       │    |
| │  Date              ┌─────────────────────────┐        │    |
| │  Date publication  │ Created Date (Date)  ▼  │        │    |
| │                     └─────────────────────────┘        │    |
| │                                                       │    |
| │  Publie            ┌─────────────────────────┐        │    |
| │  Oui/non (optionnel)│ -- Non mappe --     ▼  │        │    |
| │                     └─────────────────────────┘        │    |
| │                                                       │    |
| │ [← Retour]                         [Apercu →]        │    |
| │ btn outline                         btn primary       │    |
| └──────────────────────────────────────────────────────┘    |
+============================================================+
```

**Detail d'une ligne de mapping** :

```
┌──────────────────────────────────────────────────────────────┐
│ [140px]              [1fr select]                    [auto]  │
│                                                              │
│ Titre *              ┌──────────────────────────┐            │
│ Titre de l'article   │ -- Non mappe --        ▼ │            │
│                      │ title (Texte)            │            │
│ label bold 0.875rem  │ content (Texte)          │            │
│ * rouge si requis    │ cover_image (Image)      │            │
│ hint gris 0.6875rem  │ Created Date (Date)      │            │
│                      │ published (Oui/Non)      │            │
│                      └──────────────────────────┘            │
│                                                              │
│ separateur horizontal gris tres clair                        │
└──────────────────────────────────────────────────────────────┘
```

**Champs obligatoires** (etoile rouge) : Titre, Slug, Contenu

---

### 4.5 Contenu — Etape 3 : Apercu

```
+============================================================+
| HEADER ADMIN (identique)                                    |
+============================================================+
|                                                              |
|          ┌───┐            ┌───┐            ┌───┐            |
|          │ ✓ │────────────│ ✓ │────────────│ 3 │            |
|          └───┘            └───┘            └───┘            |
|          Table           Mapping          Apercu            |
|         (fait)          (fait)           (actif)            |
|       cercle vert     cercle vert      cercle noir          |
|                                                              |
| ┌──────────────────────────────────────────────────────┐    |
| │ CARTE "Apercu des articles"                           │    |
| │ "Verifiez que le mapping produit le resultat attendu" │    |
| │                                                       │    |
| │ ┌──────────────────────────────────────────────────┐  │    |
| │ │ TITRE    SLUG        EXTRAIT       DATE    IMAGE │  │    |
| │ │──────────────────────────────────────────────────│  │    |
| │ │ Mon art  mon-art     Resume du...  01/01   [img] │  │    |
| │ │ Second   second-p    Autre resu... 15/01   [img] │  │    |
| │ │ Troisi   troisi-a    Encore un ... 20/01   --    │  │    |
| │ │ Quatre   quatre      Description   28/01   [img] │  │    |
| │ │ Cinq     cinq-art    Dernier re... 02/02   --    │  │    |
| │ └──────────────────────────────────────────────────┘  │    |
| │                                                       │    |
| │ th: uppercase, gris, petit, bord bas epais            │    |
| │ td: texte sm, max-width 200px, ellipsis               │    |
| │ images: 40x40px, arrondi, bord gris                   │    |
| │ valeurs vides: "--" gris clair                         │    |
| │ hover ligne: fond gris tres clair                     │    |
| │                                                       │    |
| │ (si 0 resultats :)                                    │    |
| │ "Aucun enregistrement trouve dans cette table."       │    |
| │  texte gris, centre, padding 2rem                     │    |
| │                                                       │    |
| │ [← Retour]                 [→ Enregistrer & Publier]  │    |
| │ btn outline                 btn primary                │    |
| └──────────────────────────────────────────────────────┘    |
+============================================================+
```

---

## 5. Etats et micro-interactions

### 5.1 Boutons

| Variante | Fond | Texte | Hover | Usage |
|----------|------|-------|-------|-------|
| Primary | `#171717` | blanc | opacite 90% | Actions principales |
| Outline | blanc + bord gris | noir | fond `#f5f5f5` | Actions secondaires |
| Ghost | transparent | gris | fond `#f5f5f5` + texte noir | Navigation |
| Destructive | `#ef4444` | blanc | opacite 90% | Suppression |
| Secondary | `#f5f5f5` | noir | fond `#e5e5e5` | Ajouter |

Taille standard : hauteur 36px (`2.25rem`), padding `0.5rem 1rem`, texte `0.875rem`

### 5.2 Etats de chargement

**Bouton loading** :
- Texte remplace par spinner (cercle 14px, bordure blanche, rotation 0.6s)
- Bouton desactive (`pointer-events: none, opacity: 0.5`)
- Texte contextuel : "Chargement...", "Connexion...", "Publication..."

**Overlay plein ecran** (dashboard uniquement) :
- Fond `#f8fafc` plein ecran
- 3 points noirs (6px) avec animation bounce decale (0s, 0.2s, 0.4s)
- Transition opacity 0.3s pour disparaitre

### 5.3 Messages d'alerte

```
┌──────────────────────────────────────────┐
│ ✓ Configuration sauvegardee !            │  SUCCES
│   fond vert clair, bord vert, texte vert │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ✕ Le champ "Titre" est obligatoire.     │  ERREUR
│   fond rouge clair, bord rouge, texte rouge│
└──────────────────────────────────────────┘
```

- Animation : slide down 0.2s (opacity 0→1, translateY -4px→0)
- Disparition automatique apres 5 secondes

### 5.4 Stepper

3 etapes avec lignes de connexion :

```
  [1]───────[2]───────[3]
 Table    Mapping    Apercu
```

| Etat | Cercle | Label |
|------|--------|-------|
| Inactif | bord gris, texte gris | gris |
| Actif | fond noir, texte blanc | noir |
| Fait | fond vert, texte blanc (checkmark implicite) | vert |

Lignes : 3rem de large, 2px de haut, gris

### 5.5 Inputs / Selects

- Hauteur : 36px (`2.25rem`)
- Bord : 1px `#e2e8f0`
- Arrondi : `0.375rem`
- Focus : bord `#0f172a` + shadow `0 0 0 3px rgba(15,23,42,0.08)`
- Placeholder : `#94a3b8`
- Textarea : hauteur auto, min 5rem, resize vertical

### 5.6 Cartes (admin)

- Fond blanc
- Bord : 1px `#e2e8f0`
- Arrondi : `0.75rem`
- Shadow : `0 1px 2px rgba(0,0,0,0.05)`
- Header : padding `1.5rem 1.5rem 0`, titre sm bold, sous-titre xs gris
- Body : padding `1.5rem`

---

## 6. Design tokens

### 6.1 Pages publiques (Tailwind)

| Token | Valeur | Usage |
|-------|--------|-------|
| `primary-50` | bleu tres clair | fond hero gradient |
| `primary-100` | bleu clair | fond badge feature |
| `primary-600` | bleu moyen | boutons CTA, liens |
| `primary-700` | bleu fonce | hover boutons, texte badge |
| `gray-50` | `#f9fafb` | fond sections alternees |
| `gray-100` | `#f3f4f6` | bords cartes |
| `gray-400` | `#9ca3af` | dates, meta |
| `gray-600` | `#4b5563` | texte secondaire |
| `gray-900` | `#111827` | titres |

### 6.2 Pages admin (CSS custom)

| Token | Valeur | Usage |
|-------|--------|-------|
| Fond page | `#f8fafc` | body background |
| Fond carte | `#ffffff` | cartes |
| Bord | `#e2e8f0` | bordures, separateurs |
| Texte principal | `#0f172a` | titres, labels |
| Texte secondaire | `#64748b` | sous-titres |
| Texte tertiaire | `#94a3b8` | hints, placeholders |
| Noir bouton | `#171717` | bouton primary |
| Vert succes | `#22c55e` | stepper fait, alert succes |
| Rouge erreur | `#ef4444` | alert erreur, btn destructive |

### 6.3 Typographie

| Element | Taille | Poids | Famille |
|---------|--------|-------|---------|
| Titre page (admin) | `1.5rem` | 700 | Inter |
| Sous-titre (admin) | `0.875rem` | 400 | Inter |
| Label formulaire | `0.875rem` | 500 | Inter |
| Input/Select | `0.875rem` | 400 | Inter |
| Hint | `0.6875rem` | 400 | Inter |
| Badge type | `0.6875rem` | 500 | Inter |
| Bouton | `0.875rem` | 500 | Inter |
| Alert | `0.8125rem` | 500 | Inter |

### 6.4 Responsive

| Breakpoint | Comportement |
|------------|-------------|
| Mobile (< 640px) | Formulaires 1 colonne, padding reduit, blog 1 colonne |
| Tablette (640-1024px) | Blog 2 colonnes |
| Desktop (> 1024px) | Formulaires 2 colonnes, blog 3 colonnes, max-width 1024px (admin) / 1152px (public) |

---

## 7. Badges de types Bubble (reference couleurs)

Utilises dans l'ecran de mapping (etape 2) et la selection de table (etape 1).

```
[Texte]      fond #dbeafe, texte #1e40af    (bleu)
[Image]      fond #fce7f3, texte #9d174d    (rose)
[Date]       fond #d1fae5, texte #065f46    (vert)
[Oui/Non]    fond #fef3c7, texte #92400e    (ambre)
[Nombre]     fond #ede9fe, texte #5b21b6    (violet)
[Liste]      fond #e0f2fe, texte #0369a1    (bleu ciel)
[Option Set] fond #fdf4ff, texte #86198f    (fuchsia)
[Ref]        fond #fff7ed, texte #c2410c    (orange)
[Adresse]    fond #ecfdf5, texte #047857    (emeraude)
[Autre]      fond #f1f5f9, texte #475569    (gris)
```
