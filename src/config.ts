export const siteConfig = {
  name: import.meta.env.SITE_NAME || "Mon Site",
  description:
    import.meta.env.SITE_DESCRIPTION || "Description du site pour le SEO",
  url: import.meta.env.SITE_URL || "https://example.com",
  defaultLanguage: "fr",
  // Lien vers l'app Bubble (pour les CTA "Accéder à l'app")
  bubbleAppUrl: "https://VOTRE-APP.bubbleapps.io",
};
