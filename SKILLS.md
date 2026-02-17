# Aura Skills — Référence compacte pour Ottho.co

## 1. Copywriting

### Principes
- Clarté > créativité
- Bénéfices > fonctionnalités
- Spécificité > vague ("4h → 15min" pas "gagnez du temps")
- Langage client > jargon interne
- 1 idée par section, flux logique descendant
- Voix active, phrases courtes, pas de buzzwords creux
- Pas de points d'exclamation

### Style
- Simple : "utiliser" pas "exploiter", "aider" pas "faciliter"
- Confiant : supprimer "presque", "très", "vraiment"
- Direct : ne pas enterrer la valeur dans des qualificatifs
- Honnête : jamais de stats inventées

### Structure page
- **Hero** : Headline (proposition de valeur core, spécifique) + Subheadline (1-2 phrases, expand) + CTA primaire
- **Formules headline** : "{Outcome} sans {pain}" / "Le {catégorie} pour {audience}" / "Plus jamais {problème}"
- **Sections** : Social Proof → Problème/Pain → Solution/Bénéfices → How It Works (3-4 étapes) → Objections/FAQ → CTA final
- **CTAs forts** : [Verbe] + [Ce qu'ils obtiennent] — "Commencer mon essai gratuit" pas "S'inscrire"

### Questions rhétoriques
- Engagent le lecteur : "Marre de X ?" / "Et si vous pouviez Y ?"

### Annotations
- Fournir 2-3 options pour headlines/CTAs avec rationale
- Expliquer le choix de chaque section

---

## 2. UI Design System

### Tokens
- **Couleurs** : palette complète depuis couleur brand (déjà fait : #5700FF)
- **Typo** : échelle modulaire (déjà : Plus Jakarta Sans titres, Inter corps)
- **Spacing** : grille 8pt
- **Shadows** : tokens de shadow et animation
- **Breakpoints** : responsive tokens

### Architecture composants
- Système de composants scalable
- Calculs responsive
- Conformité accessibilité
- Documentation handoff dev

---

## 3. Web Interface Guidelines

### Accessibilité
- Boutons icône : `aria-label`
- Formulaires : `<label>` ou `aria-label`
- `<button>` pour actions, `<a>` pour navigation (pas `<div onClick>`)
- Images : `alt` (ou `alt=""` si décoratif)
- Icônes décoratives : `aria-hidden="true"`
- Headings hiérarchiques h1→h6
- Skip link pour contenu principal

### Focus
- `focus-visible:ring-*` sur tout élément interactif
- Jamais `outline-none` sans remplacement focus
- `:focus-visible` > `:focus`

### Animation
- Respecter `prefers-reduced-motion`
- Animer uniquement `transform`/`opacity` (compositor)
- Jamais `transition: all` → lister les propriétés
- Animations interruptibles

### Typographie
- `…` pas `...`
- Guillemets courbes `" "` pas droits
- Espaces insécables : `10&nbsp;MB`, noms de marque
- `font-variant-numeric: tabular-nums` pour colonnes de chiffres
- `text-wrap: balance` sur les headings

### Images
- `width` et `height` explicites (évite CLS)
- Below-fold : `loading="lazy"`
- Above-fold : `fetchpriority="high"`

### Performance
- `<link rel="preconnect">` pour CDN/fonts
- Fonts critiques : `<link rel="preload" as="font">` + `font-display: swap`
- Grandes listes (>50) : virtualiser

### Dark Mode
- `color-scheme: dark` sur `<html>`
- `<meta name="theme-color">` = couleur fond page

### Touch
- `touch-action: manipulation` (supprime délai double-tap)
- `overscroll-behavior: contain` dans modales/drawers

### Safe Areas
- `env(safe-area-inset-*)` pour layouts full-bleed
- Pas de scrollbars non voulues : `overflow-x-hidden`

### Contenu & Copy
- Voix active
- Title Case headings/boutons
- Chiffres en numerals : "8 formations" pas "huit"
- Labels boutons spécifiques : "Réserver un appel" pas "Continuer"
- Messages d'erreur = problème + solution

### Anti-patterns à détecter
- `user-scalable=no` (bloque zoom)
- `transition: all`
- `outline-none` sans `focus-visible`
- `<div>` cliquable au lieu de `<button>`
- Images sans dimensions
- Inputs sans labels
- `autoFocus` sans justification

---

## 4. Three.js Animation

### Principes
- Commencer simple, ajouter complexité progressivement
- Performance d'abord : viser 60fps constant
- Animer `position`/`rotation`/`scale` (pas la géométrie)
- `requestAnimationFrame` pour la boucle de rendu

### Géométrie & Matériel
- Low-poly d'abord, détail par textures/normales
- `BufferGeometry` > `Geometry` (perf)
- Instanced meshes pour objets répétés (>100)
- `MeshStandardMaterial` par défaut, `MeshBasicMaterial` pour perf max

### Caméra & Contrôles
- `PerspectiveCamera` FOV 50-75 pour scènes naturelles
- Frustum culling activé par défaut
- Transitions caméra avec easing (pas de cut brutal)
- OrbitControls avec limites : `minDistance`, `maxDistance`, `enableDamping`

### Éclairage
- 1 lumière directionnelle (soleil) + ambiance = setup minimal
- Shadow maps : `PCFSoftShadowMap`, taille 1024-2048
- Bake les ombres statiques en texture quand possible
- `HDRILoader` pour environnement réaliste

### Post-processing
- `EffectComposer` pour chaîner passes
- Bloom subtil (threshold élevé, intensité faible)
- SSAO pour profondeur
- Vignette légère pour focus

### Performance
- Limiter draw calls (<100 idéal)
- Texture atlas / sprite sheets
- LOD (Level of Detail) pour objets distants
- `renderer.info` pour debug (triangles, draw calls, textures)
- Dispose textures/géométries/matériaux inutilisés (`texture.dispose()`)
- Resize : `renderer.setSize()` + `camera.aspect` + `camera.updateProjectionMatrix()`

### Animation
- GSAP + Three.js = combo recommandé
- Timeline pour séquences complexes
- `ScrollTrigger` pour animations scroll-driven
- Morph targets pour déformation mesh
- Skeleton animation via `AnimationMixer`

### Responsive
- Canvas full-viewport : `width: 100vw; height: 100vh`
- `devicePixelRatio` capped à 2 (perf mobile)
- Fallback 2D/image statique pour appareils bas de gamme
- `prefers-reduced-motion` → réduire/stopper animations

---

## 5. Marketing Psychology & Mental Models

### Biais cognitifs appliqués
- **Ancrage** : montrer le prix barré avant le prix réel
- **Preuve sociale** : compteurs, témoignages, logos ("3000+ apprenants")
- **Rareté** : places limitées, deadline, stock faible
- **Réciprocité** : donner de la valeur gratuite d'abord (blog, outils, newsletter)
- **Effet de dotation** : essai gratuit → l'utilisateur "possède" déjà
- **Aversion à la perte** : "Ne perdez pas vos droits CPF" > "Utilisez vos droits CPF"
- **Cadrage** : "93% de satisfaction" > "7% d'insatisfaction"
- **Biais d'autorité** : certifications, logos partenaires, citations d'experts
- **Paradoxe du choix** : limiter les options (3 plans max, 1 CTA principal)
- **Effet de halo** : design premium = perception de qualité produit

### Modèles de persuasion
- **AIDA** : Attention → Intérêt → Désir → Action (structure de page)
- **PAS** : Problème → Agitation → Solution (copy sections)
- **Jobs-to-be-done** : "Quand je [situation], je veux [motivation], pour que [résultat]"
- **Boucle Hook** : Trigger → Action → Récompense variable → Investissement

### Pricing psychology
- Effet leurre : 3 prix, le moyen semble optimal
- Prix charm : 997€ pas 1000€
- Ancrage haut : montrer d'abord l'option la plus chère
- Framing mensuel : "83€/mois" pas "997€"

### Trust signals
- Nombre d'avis + note moyenne visible dès le hero
- Logos certifications au-dessus de la ligne de flottaison
- Garantie visible : "Satisfait ou remboursé"
- Micro-copy rassurant : "Sans engagement", "Annulation à tout moment"

### CTA optimization
- 1 CTA principal par viewport
- Contraste maximum avec le fond
- Urgency : "Dernières places disponibles"
- Réduire la friction : "En 2 clics", "Sans carte bancaire"
- Après le CTA : micro-copy de réassurance

---

## 6. Interaction Design

### Principes fondamentaux
- **Feedback immédiat** : chaque action → réponse visuelle (<100ms)
- **Affordance** : l'élément suggère son usage (bouton = cliquable)
- **Cohérence** : mêmes patterns partout
- **Réversibilité** : possibilité d'annuler
- **Visibilité de l'état** : l'utilisateur sait toujours où il en est

### Micro-interactions
- Hover : scale(1.02-1.05) + shadow + color shift
- Click : scale(0.97) momentané (press effect)
- Focus : ring visible (2px offset, couleur primaire)
- Loading : skeleton > spinner > texte seul
- Success : check animé + color flash vert
- Error : shake subtil + bordure rouge + message inline

### Transitions
- Durée : 150-300ms pour UI, 300-500ms pour page/modale
- Easing : `ease-out` pour entrées, `ease-in` pour sorties, `ease-in-out` pour transformations
- Propriétés : uniquement `transform` et `opacity` (GPU accelerated)
- Stagger : délai progressif sur listes (50-100ms entre items)

### Navigation patterns
- Scroll position restored on back
- Active state visible dans le nav
- Breadcrumbs pour arborescence >2 niveaux
- Mobile : bottom nav > hamburger pour actions fréquentes

### Formulaires
- Validation inline en temps réel (après blur, pas pendant la saisie)
- Labels toujours visibles (pas de placeholder-only)
- Auto-focus sur le premier champ
- Tab order logique
- Bouton submit disabled si formulaire invalide + explication

### Scroll interactions
- Parallax subtil (0.1-0.3 ratio max)
- Reveal on scroll : fade-up avec `IntersectionObserver`
- Sticky elements : header, sidebar, CTA mobile
- Scroll snap pour carrousels
- Progress indicator pour long-form content

### Responsive interaction
- Touch targets : minimum 44x44px
- Swipe : carrousels, dismiss, navigation
- Long press : actions secondaires
- Pinch-to-zoom : images, cartes
- Haptic feedback (si API disponible)

### États de composants
- Default → Hover → Focus → Active → Disabled → Loading → Error → Success
- Chaque état doit être visuellement distinct
- Disabled : opacity 0.5 + cursor not-allowed
- Loading : indicateur dans le bouton (pas de modale bloquante)
