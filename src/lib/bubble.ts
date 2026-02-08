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
// Type article normalisé (après mapping)
// ============================================================

export interface BubblePost {
  _id: string;
  Created_Date: string;
  Modified_Date: string;
  Created_By: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  cover_image: string;
  author: string;
  category: string;
  tags: string[];
  published: boolean;
}

// Mapping par défaut (backward compatible)
const DEFAULT_TABLE = "post";
const DEFAULT_MAPPING: BubbleFieldMapping = {
  title: "title",
  content: "content",
  excerpt: "excerpt",
  coverImage: "cover_image",
  slug: "slug",
  author: "author",
  category: "category",
  date: "Created_Date",
  published: "published",
};

// Cache de la config contenu
let _contentTable: string | undefined;
let _fieldMapping: BubbleFieldMapping | undefined;

async function getContentConfig(): Promise<{ table: string; mapping: BubbleFieldMapping }> {
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
    Created_Date: raw.Created_Date || "",
    Modified_Date: raw.Modified_Date || "",
    Created_By: raw.Created_By || "",
    slug: raw[mapping.slug] || raw.Slug || "",
    title: raw[mapping.title] || "",
    content: raw[mapping.content] || "",
    excerpt: raw[mapping.excerpt] || "",
    cover_image: raw[mapping.coverImage] || "",
    author: raw[mapping.author] || "",
    category: raw[mapping.category] || "",
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    published: mapping.published ? Boolean(raw[mapping.published]) : true,
  };
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
