import type { EntriesPage, Me, TodayView } from "@svity/contracts";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

/** Calls the Svity API with the session cookie. Throws ApiError on non-2xx. */
export async function api<T>(path: string, init?: { method?: "GET" | "POST"; body?: unknown }): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: init?.method ?? "GET",
    credentials: "include",
    headers: init?.body === undefined ? undefined : { "content-type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? "server");
  return data as T;
}

export const getMe = () => api<{ ok: true; me: Me }>("/v1/me").then((r) => r.me);
export const getToday = (locale: string) => api<TodayView>(`/v1/today?locale=${locale}`);
export const getEntries = (locale: string, opts: { before?: string; feeling?: string } = {}) => {
  const q = new URLSearchParams({ locale });
  if (opts.before) q.set("before", opts.before);
  if (opts.feeling) q.set("feeling", opts.feeling);
  return api<EntriesPage>(`/v1/entries?${q}`);
};

/** Resolves when the image is in the browser cache (or after `timeoutMs`), so a flip never shows a blank face. */
export function preload(src: string, timeoutMs = 4000) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    const done = () => resolve();
    img.onload = done;
    img.onerror = done;
    setTimeout(done, timeoutMs);
    img.src = src;
  });
}
