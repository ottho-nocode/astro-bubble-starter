import { getSiteConfig, type BubbleFieldMapping } from "./supabase";

// Credentials dynamiques : Supabase > env vars > fallback
let _bubbleApiUrl: string | undefined;
let _bubbleApiToken: string | undefined;

async function getBubbleCredentials() {
  if (_bubbleApiUrl && _bubbleApiToken) return { url: _bubbleApiUrl, token: _bubbleApiToken };

  try {
    const config = await getSiteConfig();
    if (config?.bubbleApiUrl && config?.bubbleApiToken) {
      _bubbleApiUrl = config.bubbleApiUrl;
      _bubbleApiToken = config.bubbleApiToken;
      return { url: _bubbleApiUrl, token: _bubbleApiToken };
    }
  } catch {
    // Fallback sur env vars
  }

  _bubbleApiUrl = import.meta.env.BUBBLE_API_URL || "";
  _bubbleApiToken = import.meta.env.BUBBLE_API_TOKEN || "";
  return { url: _bubbleApiUrl, token: _bubbleApiToken };
}


interface BubbleResponse<T> {
  response: {
    cursor: number;
    results: T[];
    remaining: number;
    count: number;
  };
}

interface FetchOptions {
  constraints?: Array<{
    key: string;
    constraint_type: string;
    value: string | number | boolean;
  }>;
  limit?: number;
  cursor?: number;
  sort_field?: string;
  descending?: boolean;
}

async function bubbleFetch<T>(
  typeName: string,
  options: FetchOptions = {}
): Promise<T[]> {
  const creds = await getBubbleCredentials();
  const params = new URLSearchParams();

  if (options.constraints) {
    params.set("constraints", JSON.stringify(options.constraints));
  }
  if (options.limit) {
    params.set("limit", String(options.limit));
  }
  if (options.cursor) {
    params.set("cursor", String(options.cursor));
  }
  if (options.sort_field) {
    params.set("sort_field", options.sort_field);
    params.set("descending", String(options.descending ?? true));
  }

  const url = `${creds.url}/obj/${typeName}?${params}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${creds.token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Bubble API error: ${res.status} ${res.statusText}`);
  }

  const data: BubbleResponse<T> = await res.json();
  return data.response.results;
}

async function bubbleFetchAll<T>(
  typeName: string,
  options: FetchOptions = {}
): Promise<T[]> {
  const creds = await getBubbleCredentials();
  const limit = options.limit ?? 100;
  let cursor = 0;
  let all: T[] = [];
  let remaining = 1;

  while (remaining > 0) {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("cursor", String(cursor));

    if (options.constraints) {
      params.set("constraints", JSON.stringify(options.constraints));
    }
    if (options.sort_field) {
      params.set("sort_field", options.sort_field);
      params.set("descending", String(options.descending ?? true));
    }

    const url = `${creds.url}/obj/${typeName}?${params}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${creds.token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Bubble API error: ${res.status} ${res.statusText}`);
    }

    const data: BubbleResponse<T> = await res.json();
    all = all.concat(data.response.results);
    remaining = data.response.remaining;
    cursor += limit;
  }

  return all;
}

// ============================================================
// BBCode → HTML conversion
// ============================================================

function bbcodeToHtml(bbcode: string): string {
  if (!bbcode) return "";

  let html = bbcode;

  // Strip [font=...] tags — typography is handled by CSS
  html = html.replace(/\[font=["']?.*?["']?\]/gi, "");
  html = html.replace(/\[\/font\]/gi, "");

  // Simple tags
  const simpleTags: [string, string, string][] = [
    ["b", "<strong>", "</strong>"],
    ["i", "<em>", "</em>"],
    ["u", "<u>", "</u>"],
    ["s", "<s>", "</s>"],
    ["quote", "<blockquote>", "</blockquote>"],
    ["code", "<pre><code>", "</code></pre>"],
    ["h1", "<h1>", "</h1>"],
    ["h2", "<h2>", "</h2>"],
    ["h3", "<h3>", "</h3>"],
    ["h4", "<h4>", "</h4>"],
    ["center", '<div style="text-align:center">', "</div>"],
  ];

  for (const [tag, open, close] of simpleTags) {
    const re = new RegExp(`\\[${tag}\\](.*?)\\[/${tag}\\]`, "gis");
    html = html.replace(re, `${open}$1${close}`);
  }

  // [url=...]...[/url] (supports quoted and unquoted values)
  html = html.replace(
    /\[url=["']?(.*?)["']?\](.*?)\[\/url\]/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>'
  );
  // [url]...[/url]
  html = html.replace(
    /\[url\](.*?)\[\/url\]/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // [img]...[/img]
  html = html.replace(/\[img\](.*?)\[\/img\]/gi, '<img src="$1" alt="" loading="lazy" />');

  // [color=...]...[/color] (supports rgb(), hex, named colors, quoted values)
  html = html.replace(
    /\[color=["']?(.*?)["']?\](.*?)\[\/color\]/gis,
    '<span style="color:$1">$2</span>'
  );

  // [size=...]...[/size]
  html = html.replace(
    /\[size=["']?(.*?)["']?\](.*?)\[\/size\]/gis,
    '<span style="font-size:$1">$2</span>'
  );

  // [align=...]...[/align]
  html = html.replace(
    /\[align=["']?(.*?)["']?\](.*?)\[\/align\]/gis,
    '<div style="text-align:$1">$2</div>'
  );

  // Lists: [list] with [*] items
  html = html.replace(/\[list=1\](.*?)\[\/list\]/gis, (_match, inner) => {
    const items = inner.split(/\[\*\]/).filter((s: string) => s.trim());
    return "<ol>" + items.map((item: string) => `<li>${item.trim()}</li>`).join("") + "</ol>";
  });
  html = html.replace(/\[list\](.*?)\[\/list\]/gis, (_match, inner) => {
    const items = inner.split(/\[\*\]/).filter((s: string) => s.trim());
    return "<ul>" + items.map((item: string) => `<li>${item.trim()}</li>`).join("") + "</ul>";
  });

  // Clean up any remaining unknown BBCode tags
  html = html.replace(/\[\/?[a-z]+(?:=[^\]]*)?\]/gi, "");

  // Line breaks: convert newlines to <br>
  html = html.replace(/\n/g, "<br>");

  return html;
}

// ============================================================
// Type article normalisé (après mapping)
// ============================================================

export interface BubblePost {
  _id: string;
  date: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  cover_image: string;
  author: string;
  category: string;
  published: boolean;
}

// Mapping par défaut (backward compatible)
const DEFAULT_TABLE = "post";
const DEFAULT_MAPPING: BubbleFieldMapping = {
  title: "title",
  content: "content",
  excerpt: "excerpt",
  coverImage: "cover_image",
  slug: "Slug",
  author: "author",
  category: "category",
  date: "Created Date",
  published: "published",
};

// Cache de la config contenu
let _contentTable: string | undefined;
let _fieldMapping: BubbleFieldMapping | undefined;

export async function getContentConfig(): Promise<{ table: string; mapping: BubbleFieldMapping }> {
  if (_contentTable && _fieldMapping) return { table: _contentTable, mapping: _fieldMapping };

  try {
    const config = await getSiteConfig();
    if (config?.bubbleContentTable && config?.bubbleFieldMapping) {
      _contentTable = config.bubbleContentTable;
      _fieldMapping = config.bubbleFieldMapping;
      return { table: _contentTable, mapping: _fieldMapping };
    }
  } catch {
    // Fallback sur defaults
  }

  _contentTable = DEFAULT_TABLE;
  _fieldMapping = DEFAULT_MAPPING;
  return { table: _contentTable, mapping: _fieldMapping };
}

function mapBubbleRecord(raw: Record<string, any>, mapping: BubbleFieldMapping): BubblePost {
  return {
    _id: raw._id || "",
    date: (mapping.date ? raw[mapping.date] : raw["Created Date"]) || raw["Created Date"] || "",
    slug: raw[mapping.slug] || raw.Slug || "",
    title: raw[mapping.title] || "",
    content: bbcodeToHtml(raw[mapping.content] || ""),
    excerpt: raw[mapping.excerpt] || "",
    cover_image: mapping.coverImage ? (raw[mapping.coverImage] || "") : "",
    author: mapping.author ? (raw[mapping.author] || "") : "",
    category: mapping.category ? (raw[mapping.category] || "") : "",
    published: mapping.published ? Boolean(raw[mapping.published]) : true,
  };
}

export async function getAllPosts(): Promise<BubblePost[]> {
  const { table, mapping } = await getContentConfig();

  const sortField = mapping.date || "Created_Date";

  const rawResults = await bubbleFetchAll<Record<string, any>>(table, {
    sort_field: sortField,
    descending: true,
  });

  return rawResults.map((raw) => mapBubbleRecord(raw, mapping));
}

export async function bubblePatch(
  typeName: string,
  recordId: string,
  data: Record<string, any>
): Promise<void> {
  const creds = await getBubbleCredentials();
  const url = `${creds.url}/obj/${typeName}/${recordId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${creds.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Bubble PATCH error: ${res.status} ${res.statusText}`);
  }
}

export async function getPosts(): Promise<BubblePost[]> {
  const { table, mapping } = await getContentConfig();

  const constraints: FetchOptions["constraints"] = [];
  if (mapping.published) {
    constraints.push({ key: mapping.published, constraint_type: "equals", value: true });
  }

  const sortField = mapping.date || "Created_Date";

  const rawResults = await bubbleFetchAll<Record<string, any>>(table, {
    constraints: constraints.length > 0 ? constraints : undefined,
    sort_field: sortField,
    descending: true,
  });

  return rawResults.map((raw) => mapBubbleRecord(raw, mapping));
}

export async function getPostBySlug(
  slug: string
): Promise<BubblePost | undefined> {
  const { table, mapping } = await getContentConfig();

  const constraints: FetchOptions["constraints"] = [
    { key: mapping.slug, constraint_type: "equals", value: slug },
  ];
  if (mapping.published) {
    constraints.push({ key: mapping.published, constraint_type: "equals", value: true });
  }

  const rawResults = await bubbleFetch<Record<string, any>>(table, {
    constraints,
    limit: 1,
  });

  if (!rawResults[0]) return undefined;
  return mapBubbleRecord(rawResults[0], mapping);
}

export { bubbleFetch, bubbleFetchAll };
