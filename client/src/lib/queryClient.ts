import { QueryClient, QueryFunction } from "@tanstack/react-query";

// In production (Vercel), this points to the Render backend URL.
// In development, it's empty so requests go to the same origin (vite proxy / local server).
export const API_BASE = import.meta.env.VITE_API_URL ?? "";

// ─── Auth token helpers (localStorage-based, works cross-domain) ───
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem("auth_token");
  } catch {
    return null;
  }
}

export function setAuthToken(token: string) {
  try {
    localStorage.setItem("auth_token", token);
  } catch { /* ignore */ }
}

export function clearAuthToken() {
  try {
    localStorage.removeItem("auth_token");
  } catch { /* ignore */ }
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// Drop-in replacement for fetch() that adds the bearer token automatically.
// Use this for all API calls outside of React Query / apiRequest.
export function authFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers, credentials: "include" });
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers: authHeaders(data ? { "Content-Type": "application/json" } : undefined),
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const res = await fetch(`${API_BASE}${queryKey.join("/")}`, {
        headers: authHeaders(),
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
