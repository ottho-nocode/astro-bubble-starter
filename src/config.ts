import { getSiteConfig, type SiteConfig } from "./lib/supabase";

// Defaults statiques (utilisés si Supabase n'est pas connecté)
export const siteConfig = {
  name: "Mon site",
  description: "Site vitrine",
  url: "",
  defaultLanguage: "fr",
  bubbleAppUrl: "",
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
  blogConfig: {
    accentColor: "#5700FF",
    cardBorderRadius: "md",
    cardShadow: "sm",
    titleSize: "md",
    template: "grid",
    showSearch: false,
    showCategoryFilter: false,
    heroTitle: "Blog",
    heroSubtitle:
      "Actualités, articles, interviews, tout ce qui touche au No-Code de près ou de loin.",
    heroBackground: "white",
    showExcerpt: true,
    showCategoryBadge: true,
    showDate: true,
    showAuthor: false,
    showCoverImage: true,
    readMoreText: "Lire la suite",
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
