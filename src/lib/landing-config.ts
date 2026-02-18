import type { CompanyInfo } from "./bubble";

// ============================================================
// Landing Config interfaces
// ============================================================

export interface LandingGlobalConfig {
  accentColor: string;
  pageBgColor: string;
  headingFont: string;
  bodyFont: string;
}

export interface LandingHeroConfig {
  visible: boolean;
  minHeight: string;
  overlayOpacity: number;
  overlayColor: string;
  fallbackGradientFrom: string;
  fallbackGradientTo: string;
  showLogo: boolean;
  logoHeight: string;
  logoRadius: string;
  logoBgOpacity: number;
  titleFontSize: string;
  titleColor: string;
  showSlogan: boolean;
  sloganFontSize: string;
  sloganColor: string;
  verticalPadding: string;
}

export interface LandingDescriptionConfig {
  visible: boolean;
  maxWidth: string;
  verticalPadding: string;
  textColor: string;
  fontSize: string;
  textAlign: string;
  bgColor: string;
}

export interface LandingBlogPreviewConfig {
  visible: boolean;
  postCount: number;
  verticalPadding: string;
  bgColor: string;
  cardRadius: string;
  cardShadow: string;
  showCoverImage: boolean;
  showCategory: boolean;
  showDate: boolean;
  showExcerpt: boolean;
  sectionTitle: string;
  sectionSubtitle: string;
  ctaText: string;
  badgeText: string;
}

export interface LandingContactConfig {
  visible: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
  verticalPadding: string;
  bgColor: string;
  cardRadius: string;
  cardBgColor: string;
  headingText: string;
  headingColor: string;
  iconBgColor: string;
  iconColor: string;
  linkColor: string;
}

export interface LandingHeaderConfig {
  visible: boolean;
  scrollBgColor: string;
  nameColor: string;
  linkColor: string;
  linkHoverColor: string;
}

export interface LandingFooterConfig {
  visible: boolean;
  bgColor: string;
  textColor: string;
  linkColor: string;
  copyrightColor: string;
}

export interface LandingConfig {
  global: LandingGlobalConfig;
  hero: LandingHeroConfig;
  description: LandingDescriptionConfig;
  blogPreview: LandingBlogPreviewConfig;
  contact: LandingContactConfig;
  header: LandingHeaderConfig;
  footer: LandingFooterConfig;
}

// ============================================================
// Defaults
// ============================================================

export const DEFAULT_LANDING_CONFIG: LandingConfig = {
  global: {
    accentColor: "#5700FF",
    pageBgColor: "#FAFAF8",
    headingFont: "Plus Jakarta Sans",
    bodyFont: "Inter",
  },
  hero: {
    visible: true,
    minHeight: "70vh",
    overlayOpacity: 50,
    overlayColor: "#000000",
    fallbackGradientFrom: "#5700FF",
    fallbackGradientTo: "#350099",
    showLogo: true,
    logoHeight: "h-20",
    logoRadius: "rounded-2xl",
    logoBgOpacity: 10,
    titleFontSize: "text-4xl",
    titleColor: "#ffffff",
    showSlogan: true,
    sloganFontSize: "text-xl",
    sloganColor: "rgba(255,255,255,0.9)",
    verticalPadding: "py-24",
  },
  description: {
    visible: true,
    maxWidth: "max-w-3xl",
    verticalPadding: "py-20",
    textColor: "#4B5563",
    fontSize: "prose-lg",
    textAlign: "text-left",
    bgColor: "#FAFAF8",
  },
  blogPreview: {
    visible: true,
    postCount: 3,
    verticalPadding: "py-24",
    bgColor: "#F5F3EF",
    cardRadius: "rounded-2xl",
    cardShadow: "none",
    showCoverImage: true,
    showCategory: true,
    showDate: true,
    showExcerpt: true,
    sectionTitle: "Derniers articles",
    sectionSubtitle: "Actualites, articles, interviews, tout ce qui touche au No-Code de pres ou de loin.",
    ctaText: "Voir tous les articles",
    badgeText: "Blog",
  },
  contact: {
    visible: true,
    showEmail: true,
    showPhone: true,
    showAddress: true,
    verticalPadding: "py-20",
    bgColor: "#ffffff",
    cardRadius: "rounded-2xl",
    cardBgColor: "#ffffff",
    headingText: "Contact",
    headingColor: "#111827",
    iconBgColor: "#f3eeff",
    iconColor: "#5700FF",
    linkColor: "#5700FF",
  },
  header: {
    visible: true,
    scrollBgColor: "rgba(250,250,248,0.8)",
    nameColor: "#111827",
    linkColor: "#4B5563",
    linkHoverColor: "#111827",
  },
  footer: {
    visible: true,
    bgColor: "#5700FF",
    textColor: "#ffffff",
    linkColor: "rgba(255,255,255,0.6)",
    copyrightColor: "rgba(255,255,255,0.4)",
  },
};

// ============================================================
// Deep merge helper
// ============================================================

function deepMerge<T extends Record<string, any>>(defaults: T, partial: Partial<T>): T {
  const result = { ...defaults };
  for (const key of Object.keys(partial) as Array<keyof T>) {
    const val = partial[key];
    if (val && typeof val === "object" && !Array.isArray(val) && typeof defaults[key] === "object") {
      result[key] = deepMerge(defaults[key] as any, val as any);
    } else if (val !== undefined) {
      result[key] = val as any;
    }
  }
  return result;
}

// ============================================================
// Config loader (from Bubble company-vitrine fields)
// ============================================================

// ============================================================
// Font size helper (handles Tailwind classes OR pixel numbers)
// ============================================================

export function resolveFontSize(val: string): { class?: string; style?: string } {
  if (val.startsWith("text-") || val.startsWith("prose-")) {
    return { class: val };
  }
  const num = parseFloat(val);
  if (!isNaN(num)) {
    return { style: `font-size:${num}px;` };
  }
  return { class: val };
}

let _cache: LandingConfig | null = null;

/**
 * Populates the landing config cache from CompanyInfo fields.
 * Call this once from index.astro / Base.astro after fetching company info.
 */
export function setLandingConfigFromCompany(company: CompanyInfo): void {
  const partial: Record<string, any> = {};

  // Global
  if (company.page_bg_color) {
    partial.global = { pageBgColor: company.page_bg_color };
  }

  // Hero
  const heroPart: Record<string, any> = {};
  if (company.hero_visible !== undefined) heroPart.visible = company.hero_visible;
  if (company.hero_show_logo !== undefined) heroPart.showLogo = company.hero_show_logo;
  if (company.hero_title_font_size) heroPart.titleFontSize = company.hero_title_font_size;
  if (company.hero_title_color) heroPart.titleColor = company.hero_title_color;
  if (company.hero_show_slogan !== undefined) heroPart.showSlogan = company.hero_show_slogan;
  if (company.hero_slogan_font_size) heroPart.sloganFontSize = company.hero_slogan_font_size;
  if (company.hero_slogan_color) heroPart.sloganColor = company.hero_slogan_color;
  if (Object.keys(heroPart).length > 0) partial.hero = heroPart;

  // Description
  const descPart: Record<string, any> = {};
  if (company.desc_visible !== undefined) descPart.visible = company.desc_visible;
  if (company.desc_text_color) descPart.textColor = company.desc_text_color;
  if (company.desc_font_size) descPart.fontSize = company.desc_font_size;
  if (Object.keys(descPart).length > 0) partial.description = descPart;

  // Contact
  const contactPart: Record<string, any> = {};
  if (company.contact_visible !== undefined) contactPart.visible = company.contact_visible;
  if (company.contact_show_email !== undefined) contactPart.showEmail = company.contact_show_email;
  if (company.contact_show_phone !== undefined) contactPart.showPhone = company.contact_show_phone;
  if (company.contact_show_address !== undefined) contactPart.showAddress = company.contact_show_address;
  if (Object.keys(contactPart).length > 0) partial.contact = contactPart;

  // Footer
  const footerPart: Record<string, any> = {};
  if (company.footer_visible !== undefined) footerPart.visible = company.footer_visible;
  if (company.footer_bg_color) footerPart.bgColor = company.footer_bg_color;
  if (company.footer_text_color) footerPart.textColor = company.footer_text_color;
  if (Object.keys(footerPart).length > 0) partial.footer = footerPart;

  _cache = deepMerge(DEFAULT_LANDING_CONFIG, partial as Partial<LandingConfig>);
}

/**
 * Returns the cached landing config (defaults if setLandingConfigFromCompany
 * was not called yet).
 */
export function getLandingConfig(): LandingConfig {
  if (_cache) return _cache;
  return { ...DEFAULT_LANDING_CONFIG };
}

// ============================================================
// Mapping: LandingConfig → Bubble field names (for PATCH)
// ============================================================

export const BUBBLE_CONFIG_FIELDS: Record<string, string> = {
  "global.pageBgColor": "page_bg_color",
  "hero.visible": "hero_visible",
  "hero.showLogo": "hero_show_logo",
  "hero.titleFontSize": "hero_title_font_size",
  "hero.titleColor": "hero_title_color",
  "hero.showSlogan": "hero_show_slogan",
  "hero.sloganFontSize": "hero_slogan_font_size",
  "hero.sloganColor": "hero_slogan_color",
  "description.visible": "desc_visible",
  "description.textColor": "desc_text_color",
  "description.fontSize": "desc_font_size",
  "contact.visible": "contact_visible",
  "contact.showEmail": "contact_show_email",
  "contact.showPhone": "contact_show_phone",
  "contact.showAddress": "contact_show_address",
  "footer.visible": "footer_visible",
  "footer.bgColor": "footer_bg_color",
  "footer.textColor": "footer_text_color",
};

/**
 * Extracts only the Bubble-backed fields from a full LandingConfig,
 * returning an object suitable for bubblePatch().
 */
export function configToBubbleFields(cfg: LandingConfig): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [path, bubbleKey] of Object.entries(BUBBLE_CONFIG_FIELDS)) {
    const [section, key] = path.split(".");
    const val = (cfg as any)[section]?.[key];
    if (val !== undefined) fields[bubbleKey] = val;
  }
  return fields;
}
