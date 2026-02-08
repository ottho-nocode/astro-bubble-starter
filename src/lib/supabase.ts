import { createClient } from "@supabase/supabase-js";

function getEnv(key: string, fallback: string): string {
  if (typeof process !== "undefined" && process.env?.[key]) return process.env[key]!;
  const vite = (import.meta as any).env?.[key];
  if (vite) return vite;
  return fallback;
}

const supabaseUrl = getEnv("SUPABASE_URL", "");
const supabaseKey = getEnv("SUPABASE_SERVICE_ROLE_KEY", "");

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export interface SiteConfig {
  name: string;
  description: string;
  url: string;
  defaultLanguage: string;
  bubbleAppUrl: string;
  bubbleApiUrl: string;
  bubbleApiToken: string;
  hero: {
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
  };
  features: {
    title: string;
    items: Array<{
      title: string;
      description: string;
      icon: string;
    }>;
  };
  cta: {
    title: string;
    description: string;
    ctaText: string;
    ctaLink: string;
  };
}

export async function getSiteConfig(): Promise<SiteConfig | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("site_config")
    .select("config")
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.config as SiteConfig;
}

export async function updateSiteConfig(
  config: SiteConfig
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Supabase not configured" };

  const { data: existing } = await supabase
    .from("site_config")
    .select("id")
    .limit(1)
    .single();

  if (!existing) {
    return { success: false, error: "No config row found" };
  }

  const { error } = await supabase
    .from("site_config")
    .update({ config })
    .eq("id", existing.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
