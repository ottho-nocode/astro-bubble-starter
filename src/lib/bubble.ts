const BUBBLE_API_URL = import.meta.env.BUBBLE_API_URL;
const BUBBLE_API_TOKEN = import.meta.env.BUBBLE_API_TOKEN;

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

  const url = `${BUBBLE_API_URL}/obj/${typeName}?${params}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${BUBBLE_API_TOKEN}`,
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

    const url = `${BUBBLE_API_URL}/obj/${typeName}?${params}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${BUBBLE_API_TOKEN}`,
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
// ADAPTER ICI : définir les types selon la BDD Bubble du client
// ============================================================

export interface BubblePost {
  _id: string;
  Created_Date: string;
  Modified_Date: string;
  Created_By: string;
  slug: string;
  title: string;
  content: string;       // HTML ou texte riche
  excerpt: string;        // Résumé court
  cover_image: string;    // URL de l'image
  author: string;
  category: string;
  tags: string[];
  published: boolean;
}

export async function getPosts(): Promise<BubblePost[]> {
  return bubbleFetchAll<BubblePost>("post", {
    constraints: [
      { key: "published", constraint_type: "equals", value: true },
    ],
    sort_field: "Created_Date",
    descending: true,
  });
}

export async function getPostBySlug(
  slug: string
): Promise<BubblePost | undefined> {
  const results = await bubbleFetch<BubblePost>("post", {
    constraints: [
      { key: "slug", constraint_type: "equals", value: slug },
      { key: "published", constraint_type: "equals", value: true },
    ],
    limit: 1,
  });
  return results[0];
}

export { bubbleFetch, bubbleFetchAll };
