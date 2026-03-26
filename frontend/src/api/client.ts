import type {
  EstimateRequest,
  EstimateResponse,
  FeedRequest,
  FeedResponse,
  GeoData,
  TaskSuggestionsResponse,
  RoleSuggestionsResponse,
  CitySuggestionsResponse,
} from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const DEBUG = import.meta.env.VITE_DEBUG === "1";

function dbg(label: string, data?: unknown) {
  if (DEBUG) console.debug(`[API] ${label}`, data ?? "");
}

// ── Control-char sanitizer (client-side guard for free-text inputs) ──

export function sanitizeText(value: string): string {
  return value.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 200);
}

// ── HTTP helpers ──

async function get<T>(path: string): Promise<T> {
  dbg(`GET ${path}`);
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  const data = await res.json();
  dbg(`GET ${path} →`, data);
  return data;
}

async function post<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal
): Promise<T> {
  dbg(`POST ${path} ←`, body);
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API request failed");
  }
  const data = await res.json();
  dbg(`POST ${path} →`, data);
  return data;
}

// ── Health check ──

export async function fetchHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Geo + Suggestion API calls ──

export async function fetchGeo(): Promise<GeoData> {
  return get<GeoData>("/api/geo");
}

export async function fetchRoleSuggestions(
  city: string,
  region: string
): Promise<string[]> {
  const data = await post<RoleSuggestionsResponse>("/api/role-suggestions", {
    city,
    region,
  });
  return data.roles;
}

export async function fetchCitySuggestions(
  city: string,
  region: string
): Promise<string[]> {
  const data = await post<CitySuggestionsResponse>("/api/city-suggestions", {
    city,
    region,
  });
  return data.cities;
}

export async function fetchTaskSuggestions(
  role: string,
  companySize: string,
  signal?: AbortSignal
): Promise<string[]> {
  const data = await post<TaskSuggestionsResponse>(
    "/api/task-suggestions",
    { role, company_size: companySize },
    signal
  );
  return data.tasks;
}

// ── Existing API calls ──

export async function fetchEstimate(
  req: EstimateRequest
): Promise<EstimateResponse> {
  return post<EstimateResponse>("/api/estimate", req);
}

export async function fetchFeed(req: FeedRequest): Promise<FeedResponse> {
  return post<FeedResponse>("/api/feed", req);
}
