import type { AnalyzeResponse, Meta } from "./types";

// Same-origin by default (Vercel, or the Vite dev proxy). Set VITE_API_URL to
// point the UI at a separately hosted backend.
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch {
    throw new ApiError("Could not reach the server. Check your connection.", 0);
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      if (res.status === 413) detail = "Upload is too large. Try fewer or smaller pages.";
      if (res.status === 504) detail = "The analysis took too long. Try fewer pages.";
    }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

export function fetchMeta(): Promise<Meta> {
  return request<Meta>("/api/meta");
}

export function analyzeDocument(
  pages: Blob[],
  opts: { targetLanguage: string; profile?: string; sample?: string; consent?: boolean; signal?: AbortSignal },
): Promise<AnalyzeResponse> {
  const form = new FormData();
  pages.forEach((blob, i) => form.append("files", blob, `page-${i + 1}.jpg`));
  form.append("target_language", opts.targetLanguage);
  if (opts.profile) form.append("profile", opts.profile);
  if (opts.sample) form.append("sample", opts.sample); // demo mode only
  if (opts.consent) form.append("consent", "true"); // explicit consent (health data, Art. 9 GDPR)
  return request<AnalyzeResponse>("/api/analyze", {
    method: "POST",
    body: form,
    signal: opts.signal,
  });
}
