// @ts-check
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://example.com", // REMPLACER par le domaine du client
  output: "static",
  adapter: vercel(),
  integrations: [tailwind(), sitemap(), mdx()],
});
