import fs from "node:fs";
import path from "node:path";
import { parse, type HTMLElement } from "node-html-parser";
import type { SiteConfig } from "./supabase";

export interface TemplateParts {
  navHtml: string;
  footerHtml: string;
  headAssets: string;
  headScripts: string;
  bodyFontFamily: string;
  accentColor: string | null;
}

// In-memory cache per templateId
const cache = new Map<string, TemplateParts | null>();

/**
 * Given a SiteConfig, read the selected template HTML, apply overrides,
 * and extract nav, footer, head assets, scripts, font-family, and accent color.
 * Returns null if no template is selected or template is "custom".
 */
export async function getTemplateParts(
  config: SiteConfig
): Promise<TemplateParts | null> {
  const templateId = (config as any).landingTemplate as string | undefined;
  if (!templateId || templateId === "custom") return null;

  if (cache.has(templateId)) return cache.get(templateId)!;

  const templatePath = path.join(
    process.cwd(),
    "public",
    "templates",
    `${templateId}.html`
  );

  let html: string;
  try {
    html = fs.readFileSync(templatePath, "utf-8");
  } catch {
    cache.set(templateId, null);
    return null;
  }

  const allOverrides = (config as any).templateOverrides || {};
  const overrides = allOverrides[templateId] || {
    texts: {},
    images: {},
    hrefs: {},
    hiddenSections: [],
  };

  const root = parse(html, { comment: false });

  // ── Step 1: Scan DOM — same algorithm as IFRAME_SCAN_SCRIPT ──
  scanAndAssignIds(root);

  // ── Step 2: Apply overrides on the full DOM ──
  applyOverrides(root, overrides);

  // ── Step 3: Extract parts ──
  const result: TemplateParts = {
    navHtml: extractNav(root),
    footerHtml: extractFooter(root),
    headAssets: extractHeadAssets(root),
    headScripts: extractHeadScripts(root),
    bodyFontFamily: extractBodyFontFamily(root),
    accentColor: extractAccentColor(root),
  };

  cache.set(templateId, result);
  return result;
}

// ── Scanning ──

const TEXT_TAGS = "H1,H2,H3,H4,H5,H6,P,A,BUTTON,SPAN,LI";
const TEXT_TAG_SET = new Set(TEXT_TAGS.split(","));
const HEADING_RE = /^H[1-6]$/;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "LINK", "META"]);

function hasHeadingAncestor(el: HTMLElement): boolean {
  let current = el.parentNode as HTMLElement | null;
  while (current) {
    if (HEADING_RE.test(current.rawTagName?.toUpperCase() || "")) return true;
    current = current.parentNode as HTMLElement | null;
  }
  return false;
}

function scanAndAssignIds(root: HTMLElement): void {
  const body = root.querySelector("body") || root;

  // Find section-level elements
  const sectionEls = body.querySelectorAll("section, header, footer, nav");
  const elements: HTMLElement[] =
    sectionEls.length > 0
      ? (sectionEls as unknown as HTMLElement[])
      : (body.childNodes.filter(
          (n) =>
            (n as HTMLElement).rawTagName &&
            !SKIP_TAGS.has(
              ((n as HTMLElement).rawTagName || "").toUpperCase()
            ) &&
            !["BR", "HR"].includes(
              ((n as HTMLElement).rawTagName || "").toUpperCase()
            )
        ) as HTMLElement[]);

  let idx = 0;
  for (const sec of elements) {
    const tag = (sec.rawTagName || "").toUpperCase();
    if (SKIP_TAGS.has(tag)) continue;

    const sectionId = `section-${idx}`;
    sec.setAttribute("data-section-id", sectionId);

    // Scan text elements
    let textIdx = 0;
    const textEls = sec.querySelectorAll(TEXT_TAGS.toLowerCase());
    for (const el of textEls) {
      const text = (el.textContent || "").trim();
      if (text.length < 2) continue;

      const elTag = (el.rawTagName || "").toUpperCase();
      const isHeading = HEADING_RE.test(elTag);

      // Skip non-headings that are children of headings
      if (!isHeading && hasHeadingAncestor(el as HTMLElement)) continue;

      // Skip non-headings that have children with substantial text
      if (!isHeading) {
        const children = el.querySelectorAll(TEXT_TAGS.toLowerCase());
        let skip = false;
        for (const c of children) {
          if ((c.textContent || "").trim().length > 2) {
            skip = true;
            break;
          }
        }
        if (skip) continue;
      }

      (el as HTMLElement).setAttribute(
        "data-edit-id",
        `${sectionId}-text-${textIdx}`
      );
      textIdx++;
    }

    // Scan images
    const imgs = sec.querySelectorAll("img");
    imgs.forEach((img, m) => {
      (img as HTMLElement).setAttribute(
        "data-edit-id",
        `${sectionId}-img-${m}`
      );
    });

    idx++;
  }
}

// ── Apply overrides ──

function applyOverrides(
  root: HTMLElement,
  overrides: {
    texts?: Record<string, string>;
    images?: Record<string, string>;
    hrefs?: Record<string, string>;
    hiddenSections?: string[];
  }
): void {
  // Text overrides
  if (overrides.texts) {
    for (const [key, value] of Object.entries(overrides.texts)) {
      const el = root.querySelector(`[data-edit-id="${key}"]`);
      if (el) el.set_content(escapeHtml(value));
    }
  }

  // Image overrides
  if (overrides.images) {
    for (const [key, value] of Object.entries(overrides.images)) {
      const el = root.querySelector(`[data-edit-id="${key}"]`);
      if (el) el.setAttribute("src", value);
    }
  }

  // Href overrides
  if (overrides.hrefs) {
    for (const [key, value] of Object.entries(overrides.hrefs)) {
      const el = root.querySelector(`[data-edit-id="${key}"]`);
      if (el) el.setAttribute("href", value);
    }
  }

  // Hidden sections
  if (overrides.hiddenSections) {
    for (const sectionId of overrides.hiddenSections) {
      const el = root.querySelector(`[data-section-id="${sectionId}"]`);
      if (el) el.setAttribute("style", "display:none");
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Extraction helpers ──

function stripNavClasses(cls: string): string {
  return cls
    .replace(/\b-?translate-x-1\/2\b/g, "")
    .replace(/\bleft-1\/2\b/g, "")
    .replace(/\btop-\S+\b/g, "")
    .replace(/\bmax-w-\S+\b/g, "")
    .replace(/\bp[xlr]-\S+\b/g, "")
    .replace(/\brounded-\S+\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const NAV_FIXED_STYLE = "position:fixed;top:0;left:0;width:100%;z-index:50;border-radius:0;padding-left:0;padding-right:0;max-width:none;";
const NAV_INNER_STYLE = "border-radius:0;max-width:none;";

function forceFixedFullWidth(el: HTMLElement): void {
  const cleaned = stripNavClasses(el.getAttribute("class") || "");
  const fixedClasses = ["fixed", "top-0", "left-0", "w-full", "z-50"];
  const parts = cleaned.split(" ");
  for (const fc of fixedClasses) {
    if (!parts.includes(fc)) parts.push(fc);
  }
  el.setAttribute("class", parts.join(" "));
  // Inline style as fallback to guarantee fixed full-width
  const existing = el.getAttribute("style") || "";
  el.setAttribute("style", NAV_FIXED_STYLE + existing);

  // Also flatten the first child div (inner container): remove rounding, margin, max-width
  const firstChild = el.childNodes.find(
    (n) => (n as HTMLElement).rawTagName?.toUpperCase() === "DIV"
  ) as HTMLElement | undefined;
  if (firstChild) {
    const childCls = (firstChild.getAttribute("class") || "")
      .replace(/\brounded-\S+\b/g, "")
      .replace(/\bmax-w-\S+\b/g, "")
      .replace(/\bm[xlr]-\S+\b/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    firstChild.setAttribute("class", childCls);
    const childStyle = firstChild.getAttribute("style") || "";
    firstChild.setAttribute("style", NAV_INNER_STYLE + childStyle);
  }
}

function extractNav(root: HTMLElement): string {
  const nav = root.querySelector("nav");
  if (!nav) return "";

  // If nav's parent is a direct child of body (wrapper div), extract the wrapper
  const parent = nav.parentNode as HTMLElement | null;
  const body = root.querySelector("body");
  if (
    parent &&
    body &&
    parent !== body &&
    parent.parentNode === body &&
    parent.rawTagName?.toUpperCase() === "DIV"
  ) {
    forceFixedFullWidth(parent);
    // Also flatten the nav itself inside the wrapper
    const navCls = stripNavClasses(nav.getAttribute("class") || "");
    nav.setAttribute("class", navCls + " w-full");
    return parent.outerHTML;
  }

  forceFixedFullWidth(nav);
  return nav.outerHTML;
}

function extractFooter(root: HTMLElement): string {
  const footers = root.querySelectorAll("footer");
  if (footers.length === 0) return "";
  // Last footer in the document
  return (footers[footers.length - 1] as HTMLElement).outerHTML;
}

function extractHeadAssets(root: HTMLElement): string {
  const head = root.querySelector("head");
  if (!head) return "";

  let assets = "";

  // Google Fonts links
  const links = head.querySelectorAll("link");
  for (const link of links) {
    const href = link.getAttribute("href") || "";
    const rel = link.getAttribute("rel") || "";
    if (
      href.includes("fonts.googleapis.com") ||
      href.includes("fonts.gstatic.com") ||
      rel === "preconnect"
    ) {
      assets += (link as HTMLElement).outerHTML + "\n";
    }
  }

  // <style> elements from head
  const styles = head.querySelectorAll("style");
  for (const style of styles) {
    assets += (style as HTMLElement).outerHTML + "\n";
  }

  return assets;
}

function extractHeadScripts(root: HTMLElement): string {
  const head = root.querySelector("head");
  if (!head) return "";

  let scripts = "";
  const scriptEls = head.querySelectorAll("script");
  for (const script of scriptEls) {
    const src = script.getAttribute("src") || "";
    if (
      src.includes("cdn.tailwindcss.com") ||
      src.includes("lucide") ||
      src.includes("iconify")
    ) {
      scripts += (script as HTMLElement).outerHTML + "\n";
    }
  }

  return scripts;
}

function extractBodyFontFamily(root: HTMLElement): string {
  const head = root.querySelector("head");
  if (!head) return "'Inter', sans-serif";

  const styles = head.querySelectorAll("style");
  for (const style of styles) {
    const css = style.textContent || "";
    // Match body { font-family: ... }
    const match = css.match(
      /body\s*\{[^}]*font-family:\s*([^;}]+)/
    );
    if (match) return match[1].trim();
  }

  return "'Inter', sans-serif";
}

function extractAccentColor(root: HTMLElement): string | null {
  // Scan nav buttons for bg-[#hex] or from-[#hex] patterns
  const nav = root.querySelector("nav");
  if (!nav) return null;

  const buttons = nav.querySelectorAll("button, a");
  for (const btn of buttons) {
    const cls = btn.getAttribute("class") || "";
    const style = btn.getAttribute("style") || "";

    // Check class for bg-[#hex] or from-[#hex]
    const classMatch = cls.match(
      /(?:bg-\[|from-\[)(#[0-9A-Fa-f]{3,8})\]/
    );
    if (classMatch) return classMatch[1];

    // Check bg-gradient-to-r from-[#hex]
    const gradientMatch = cls.match(/from-\[(#[0-9A-Fa-f]{3,8})\]/);
    if (gradientMatch) return gradientMatch[1];

    // Check inline style for background gradient colors
    const styleMatch = style.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)/
    );
    if (styleMatch) {
      const r = parseInt(styleMatch[1]);
      const g = parseInt(styleMatch[2]);
      const b = parseInt(styleMatch[3]);
      // Only use saturated colors (skip near-black/white/gray)
      if (
        Math.max(r, g, b) - Math.min(r, g, b) > 40 &&
        r + g + b > 60 &&
        r + g + b < 700
      ) {
        return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
      }
    }
  }

  return null;
}
