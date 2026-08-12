export type Role = "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS";
export type User = { id: string; name: string; email: string; role: Role };

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function getToken() {
  return localStorage.getItem("erp_token");
}

export function setSession(token: string, user: User) {
  localStorage.setItem("erp_token", token);
  localStorage.setItem("erp_user", JSON.stringify(user));
}

export function getUser(): User | null {
  const raw = localStorage.getItem("erp_user");
  return raw ? (JSON.parse(raw) as User) : null;
}

export function clearSession() {
  localStorage.removeItem("erp_token");
  localStorage.removeItem("erp_user");
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data as T;
}

export const demoLogins = [
  ["Admin", "admin@mini-erp.test"],
  ["Sales", "sales@mini-erp.test"],
  ["Warehouse", "warehouse@mini-erp.test"],
  ["Accounts", "accounts@mini-erp.test"]
] as const;
