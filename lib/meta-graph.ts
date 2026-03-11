type GraphError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

export type GraphPaging = {
  next?: string;
};

export type GraphListResponse<T> = {
  data: T[];
  paging?: GraphPaging;
  error?: GraphError;
};

function getAccessToken(): string {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Missing META_ACCESS_TOKEN env var");
  }
  return token;
}

function withAccessToken(params?: Record<string, string | number | boolean | undefined>): URLSearchParams {
  const search = new URLSearchParams();
  search.set("access_token", getAccessToken());
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue;
      search.set(k, String(v));
    }
  }
  return search;
}

export async function graphGet<T>(
  graphPath: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: { apiVersion?: string }
): Promise<T> {
  const apiVersion = options?.apiVersion ?? "v20.0";
  const url = new URL(`https://graph.facebook.com/${apiVersion}/${graphPath.replace(/^\//, "")}`);
  url.search = withAccessToken(params).toString();

  const res = await fetch(url.toString(), { method: "GET" });
  const json = (await res.json()) as { error?: GraphError };
  if (!res.ok) {
    const message = json?.error?.message ?? `Meta Graph request failed (${res.status})`;
    throw new Error(message);
  }
  if (json?.error?.message) {
    throw new Error(json.error.message);
  }
  return json as T;
}

export async function graphGetAllPages<T>(
  graphPath: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: { apiVersion?: string; maxPages?: number; maxItems?: number }
): Promise<T[]> {
  const apiVersion = options?.apiVersion ?? "v20.0";
  const maxPages = options?.maxPages ?? 50;
  const maxItems = options?.maxItems ?? Number.POSITIVE_INFINITY;

  let page = 0;
  let url: string | null = null;
  const out: T[] = [];

  while (page < maxPages && out.length < maxItems) {
    page += 1;

    const data: GraphListResponse<T> = url
      ? await (async () => {
          const res = await fetch(url);
          const json = (await res.json()) as GraphListResponse<T>;
          if (!res.ok) {
            const message = json?.error?.message ?? `Meta Graph request failed (${res.status})`;
            throw new Error(message);
          }
          if (json?.error?.message) throw new Error(json.error.message);
          return json;
        })()
      : await graphGet<GraphListResponse<T>>(graphPath, params, { apiVersion });

    if (Array.isArray(data.data)) {
      for (const item of data.data) {
        out.push(item);
        if (out.length >= maxItems) break;
      }
    }

    url = data.paging?.next ?? null;
    if (!url) break;
  }

  return out;
}

