import { Pet, DailyLog, Alert, User } from "./types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function authHeaders(): Record<string, string> {
  try {
    const stored = localStorage.getItem("auth");
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    if (!parsed || !parsed.token) return {};
    return { Authorization: `Bearer ${parsed.token}` };
  } catch (e) {
    console.warn("Failed to parse auth from localStorage", e);
    return {};
  }
}

async function fetchJson<T>(input: RequestInfo, init: RequestInit = {}): Promise<T> {
  init.headers = {
    ...((init.headers as Record<string, string>) || {}),
    ...authHeaders(),
  };

  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed ${res.status}: ${text}`);
  }
  return res.json();
}

export const login = (email: string, password: string) =>
  fetchJson<{ token: string; user: User }>(`${BASE_URL}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
    headers: { "Content-Type": "application/json" },
  });
export const register = (data: { email: string; password: string; name: string; role?: string }) =>
  fetchJson<{ token: string; user: User }>(`${BASE_URL}/auth/register`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });

export const getPets = () => fetchJson<Pet[]>(`${BASE_URL}/pets`);
export const getPet = (id: string) => fetchJson<Pet>(`${BASE_URL}/pets/${id}`);
export const createPet = (pet: Pet) =>
  fetchJson<Pet>(`${BASE_URL}/pets`, { method: "POST", body: JSON.stringify(pet), headers: { "Content-Type": "application/json" } });
export const updatePet = (id: string, patch: Partial<Pet>) =>
  fetchJson<Pet>(`${BASE_URL}/pets/${id}`, { method: "PATCH", body: JSON.stringify(patch), headers: { "Content-Type": "application/json" } });

export const getAlerts = () => fetchJson<Alert[]>(`${BASE_URL}/alerts`);
export const getAlert = (id: string) => fetchJson<Alert>(`${BASE_URL}/alerts/${id}`);
export const markAlertRead = (id: string) =>
  fetchJson<Alert>(`${BASE_URL}/alerts/${id}/read`, { method: "PUT" });

export const getLogs = (petId?: string) => {
  const url = new URL(`${BASE_URL}/logs`);
  if (petId) url.searchParams.set("petId", petId);
  return fetchJson<DailyLog[]>(url.toString());
};
export const createLog = (log: DailyLog) =>
  fetchJson<DailyLog>(`${BASE_URL}/logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(log),
  });
