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

  // [img]...[/img] and [img width=700]...[/img], [img width=700px]...[/img]
  html = html.replace(
    /\[img(?:\s+width=["']?(\d+(?:px)?)["']?)?\](.*?)\[\/img\]/gi,
    (_m, width, src) => {
      const w = width ? ` style="max-width:${width.endsWith("px") ? width : width + "px"}"` : "";
      return `<img src="${src}" alt="" loading="lazy"${w} />`;
    }
  );

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

  // Line breaks: collapse multiple newlines into one <br>, then strip <br>
  // adjacent to block-level elements to avoid double spacing
  html = html.replace(/\n{2,}/g, "<br>");
  html = html.replace(/\n/g, "<br>");
  html = html.replace(/(<br>\s*)+/gi, "<br>");
  html = html.replace(/<br>\s*(<\/?(?:h[1-6]|div|blockquote|ul|ol|li|pre|p)[\s>])/gi, "$1");
  html = html.replace(/(<\/(?:h[1-6]|div|blockquote|ul|ol|li|pre|p)>)\s*<br>/gi, "$1");

  return html;
}

// ============================================================
// Résolution des IDs de références Bubble
// ============================================================

const BUBBLE_UID_RE = /^\d{13,}x\d{10,}$/;

function isBubbleUniqueId(value: unknown): value is string {
  return typeof value === "string" && BUBBLE_UID_RE.test(value);
}

interface SwaggerRefInfo {
  fieldName: string;
  refTypeName: string;
  isList: boolean;
}

async function fetchSwaggerRefMap(tableName: string): Promise<SwaggerRefInfo[]> {
  const creds = await getBubbleCredentials();
  const swaggerUrl = `${creds.url}/meta/swagger.json`;

  let spec: any;
  try {
    const res = await fetch(swaggerUrl);
    if (!res.ok) return [];
    spec = await res.json();
  } catch {
    return [];
  }

  // Trouver la définition du type dans le swagger
  const defs = spec.definitions;
  if (!defs) return [];

  // Chercher la définition correspondant au tableName (case-insensitive)
  const defKey = Object.keys(defs).find(
    (k) => k.toLowerCase() === tableName.toLowerCase()
  );
  if (!defKey || !defs[defKey]?.properties) return [];

  const props = defs[defKey].properties;
  const allDefNames = Object.keys(defs);
  const refs: SwaggerRefInfo[] = [];

  // Regex pour détecter "'TypeName' represented by a unique ID" dans la description Bubble
  const descRefRe = /\('([^']+)'\s+represented by a unique ID\)/;

  for (const [fieldName, fd] of Object.entries<any>(props)) {
    if (fd.$ref) {
      // Référence directe : "#/definitions/category"
      const refType = fd.$ref.split("/").pop();
      if (refType) refs.push({ fieldName, refTypeName: refType, isList: false });
    } else if (fd.type === "array" && fd.items?.$ref) {
      // Liste de références : { type: "array", items: { $ref: "..." } }
      const refType = fd.items.$ref.split("/").pop();
      if (refType) refs.push({ fieldName, refTypeName: refType, isList: true });
    } else if (fd.description) {
      // Bubble n'utilise pas toujours $ref — parfois la référence est indiquée
      // dans la description : "('rubriques' represented by a unique ID)"
      const m = fd.description.match(descRefRe);
      if (m) {
        const mentioned = m[1];
        // Vérifier que ce type existe bien dans les definitions du swagger
        const actualDef = allDefNames.find(
          (d) => d.toLowerCase() === mentioned.toLowerCase()
        );
        if (actualDef) {
          const isList = fd.type === "array";
          refs.push({ fieldName, refTypeName: actualDef, isList });
        }
      }
    }
  }

  return refs;
}

const DISPLAY_FIELD_CANDIDATES = [
  "Display",
  "Name",
  "Nom",
  "Title",
  "Titre",
  "Label",
  "Libelle",
  "Text",
  "Texte",
  "text",
];

function pickDisplayValue(record: Record<string, any>): string | undefined {
  // Essayer les champs candidats connus
  for (const field of DISPLAY_FIELD_CANDIDATES) {
    if (typeof record[field] === "string" && record[field].trim()) {
      return record[field].trim();
    }
  }
  // Fallback : premier champ string non-système
  const systemKeys = new Set(["_id", "_type", "Created By", "Created Date", "Modified Date", "Slug"]);
  for (const [key, val] of Object.entries(record)) {
    if (!systemKeys.has(key) && typeof val === "string" && val.trim() && !BUBBLE_UID_RE.test(val)) {
      return val.trim();
    }
  }
  return undefined;
}

async function buildRefLookup(refInfos: SwaggerRefInfo[]): Promise<Map<string, string>> {
  const lookup = new Map<string, string>();
  // Dédupliquer les types référencés
  const uniqueTypes = [...new Set(refInfos.map((r) => r.refTypeName))];

  const fetches = uniqueTypes.map(async (typeName) => {
    try {
      const records = await bubbleFetchAll<Record<string, any>>(typeName);
      for (const rec of records) {
        const id = rec._id;
        if (!id) continue;
        const display = pickDisplayValue(rec);
        if (display) lookup.set(id, display);
      }
    } catch {
      // Erreur silencieuse : les IDs non résolus resteront bruts
    }
  });

  await Promise.all(fetches);
  return lookup;
}

// Cache module-level pour la résolution de références
let _refInfoCache: Map<string, SwaggerRefInfo[]> = new Map();
let _refLookupCache: Map<string, Map<string, string>> = new Map();

async function getRefResolutionData(
  tableName: string
): Promise<{ refInfos: SwaggerRefInfo[]; lookup: Map<string, string> }> {
  if (_refInfoCache.has(tableName) && _refLookupCache.has(tableName)) {
    return {
      refInfos: _refInfoCache.get(tableName)!,
      lookup: _refLookupCache.get(tableName)!,
    };
  }

  const refInfos = await fetchSwaggerRefMap(tableName);
  const lookup = refInfos.length > 0 ? await buildRefLookup(refInfos) : new Map<string, string>();

  _refInfoCache.set(tableName, refInfos);
  _refLookupCache.set(tableName, lookup);
  return { refInfos, lookup };
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

function resolveRef(
  value: unknown,
  lookup: Map<string, string>
): string {
  if (Array.isArray(value)) {
    return value
      .map((v) => (isBubbleUniqueId(v) ? lookup.get(v) ?? v : String(v)))
      .join(", ");
  }
  if (isBubbleUniqueId(value)) {
    return lookup.get(value) ?? value;
  }
  return typeof value === "string" ? value : "";
}

function mapBubbleRecord(
  raw: Record<string, any>,
  mapping: BubbleFieldMapping,
  refInfos: SwaggerRefInfo[] = [],
  lookup: Map<string, string> = new Map()
): BubblePost {
  // Champs qui peuvent contenir des IDs de référence
  const refFieldNames = new Set(refInfos.map((r) => r.fieldName));

  const rawAuthor = mapping.author ? raw[mapping.author] : "";
  const rawCategory = mapping.category ? raw[mapping.category] : "";

  const authorIsRef = mapping.author && refFieldNames.has(mapping.author);
  const categoryIsRef = mapping.category && refFieldNames.has(mapping.category);

  return {
    _id: raw._id || "",
    date: (mapping.date ? raw[mapping.date] : raw["Created Date"]) || raw["Created Date"] || "",
    slug: raw[mapping.slug] || raw.Slug || "",
    title: raw[mapping.title] || "",
    content: bbcodeToHtml(raw[mapping.content] || ""),
    excerpt: raw[mapping.excerpt] || "",
    cover_image: mapping.coverImage ? (raw[mapping.coverImage] || "") : "",
    author: authorIsRef ? resolveRef(rawAuthor, lookup) : (rawAuthor || ""),
    category: categoryIsRef ? resolveRef(rawCategory, lookup) : (rawCategory || ""),
    published: mapping.published ? Boolean(raw[mapping.published]) : true,
  };
}

export async function getAllPosts(): Promise<BubblePost[]> {
  const { table, mapping } = await getContentConfig();
  const { refInfos, lookup } = await getRefResolutionData(table);

  const sortField = mapping.date || "Created_Date";

  const rawResults = await bubbleFetchAll<Record<string, any>>(table, {
    sort_field: sortField,
    descending: true,
  });

  return rawResults.map((raw) => mapBubbleRecord(raw, mapping, refInfos, lookup));
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
  const { refInfos, lookup } = await getRefResolutionData(table);

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

  return rawResults.map((raw) => mapBubbleRecord(raw, mapping, refInfos, lookup));
}

export async function getPostBySlug(
  slug: string
): Promise<BubblePost | undefined> {
  const { table, mapping } = await getContentConfig();
  const { refInfos, lookup } = await getRefResolutionData(table);

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
  return mapBubbleRecord(rawResults[0], mapping, refInfos, lookup);
}

export { bubbleFetch, bubbleFetchAll };
