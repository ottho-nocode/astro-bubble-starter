import { getSiteConfig, type SiteConfig } from "./lib/supabase";

// Defaults statiques (utilisés si Supabase n'est pas connecté)
export const siteConfig = {
  name: import.meta.env.SITE_NAME || "Mon Site",
  description:
    import.meta.env.SITE_DESCRIPTION || "Description du site pour le SEO",
  url: import.meta.env.SITE_URL || "https://example.com",
  defaultLanguage: "fr",
  bubbleAppUrl: "https://VOTRE-APP.bubbleapps.io",
  bubbleApiUrl: "",
  bubbleApiToken: "",
  bubbleContentTable: "post",
  bubbleFieldMapping: {
    title: "title",
    content: "content",
    excerpt: "excerpt",
    coverImage: "cover_image",
    slug: "Slug",
    author: "author",
    category: "category",
    date: "Created Date",
    published: "published",
  },
  blogTemplate: "grid",
  hero: {
    title: "Votre titre principal ici",
    subtitle:
      "Une description convaincante de votre produit ou service qui donne envie d'en savoir plus.",
    ctaText: "Commencer",
    ctaLink: "#",
  },
  features: {
    title: "Pourquoi nous choisir",
    items: [
      {
        title: "Fonctionnalité 1",
        description:
          "Description courte de cette fonctionnalité et de sa valeur ajoutée.",
        icon: "1",
      },
      {
        title: "Fonctionnalité 2",
        description:
          "Description courte de cette fonctionnalité et de sa valeur ajoutée.",
        icon: "2",
      },
      {
        title: "Fonctionnalité 3",
        description:
          "Description courte de cette fonctionnalité et de sa valeur ajoutée.",
        icon: "3",
      },
    ],
  },
  cta: {
    title: "Prêt à commencer ?",
    description:
      "Rejoignez-nous et découvrez comment notre solution peut vous aider.",
    ctaText: "Essayer gratuitement",
    ctaLink: "#",
  },
} satisfies SiteConfig;

// Cache en mémoire par build
let cachedConfig: SiteConfig | null = null;

export async function loadSiteConfig(): Promise<SiteConfig> {
  if (cachedConfig) return cachedConfig;

  try {
    const dbConfig = await getSiteConfig();
    if (dbConfig) {
      cachedConfig = dbConfig;
      return dbConfig;
    }
  } catch {
    // Fallback silencieux sur les defaults
  }

  return siteConfig;
}
