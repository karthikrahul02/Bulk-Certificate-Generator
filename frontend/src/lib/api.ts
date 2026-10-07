const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:4000" : "/api");

export function certificateUrl(path: string) {
  return `${API_URL}${path}`;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data as T;
}
