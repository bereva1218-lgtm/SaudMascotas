import { Pet, DailyLog, Alert, User, Reminder } from "./types";

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
    throw new ApiError(res.status, await res.text());
  }
  return res.json();
}

// Error de la API; `message` es el texto que envía el servidor (pensado para mostrarse al usuario).
// `data` es el cuerpo JSON de la respuesta (si lo hay), por ejemplo el registro existente en un 409.
export interface ApiErrorData {
  message?: string;
  log?: DailyLog;
}

export class ApiError extends Error {
  data: ApiErrorData | undefined;

  constructor(public status: number, body: string) {
    let message = `Request failed ${status}: ${body}`;
    let data: ApiErrorData | undefined = undefined;
    try {
      data = JSON.parse(body);
      if (data && typeof data.message === "string") message = data.message;
    } catch {
      // el cuerpo no es JSON; se conserva el texto original
    }
    super(message);
    this.name = "ApiError";
    this.data = data;
  }
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
export const createPet = (pet: Omit<Pet, "id">) =>
  fetchJson<Pet>(`${BASE_URL}/pets`, { method: "POST", body: JSON.stringify(pet), headers: { "Content-Type": "application/json" } });
export const updatePet = (id: string, patch: Partial<Pet>) =>
  fetchJson<Pet>(`${BASE_URL}/pets/${id}`, { method: "PATCH", body: JSON.stringify(patch), headers: { "Content-Type": "application/json" } });
export const requestPetRecommendation = (id: string) =>
  fetchJson<Pet & { advice: string }>(`${BASE_URL}/pets/${id}/recommendation`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
  });
export const deletePet = async (id: string) => {
  const res = await fetch(`${BASE_URL}/pets/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }
};

export const getAlerts = () => fetchJson<Alert[]>(`${BASE_URL}/alerts`);
export const getAlert = (id: string) => fetchJson<Alert>(`${BASE_URL}/alerts/${id}`);
export const markAlertRead = (id: string) =>
  fetchJson<Alert>(`${BASE_URL}/alerts/${id}/read`, { method: "PUT" });

export const getLogs = (petId?: string) => {
  const url = new URL(`${BASE_URL}/logs`);
  if (petId) url.searchParams.set("petId", petId);
  return fetchJson<DailyLog[]>(url.toString());
};
// Datos que envía el formulario; la fecha la asigna el servidor (día actual en America/Bogota).
export type DailyLogInput = Omit<DailyLog, "id" | "date">;

// Registro de hoy de una mascota; `log` es null si todavía no se ha registrado.
export const getTodayLog = (petId: string) => {
  const url = new URL(`${BASE_URL}/logs/today`);
  url.searchParams.set("petId", petId);
  return fetchJson<{ date: string; log: DailyLog | null }>(url.toString());
};
// Si ya existe el registro de hoy lanza ApiError 409 con el existente en `error.data.log`.
export const createLog = (log: DailyLogInput) =>
  fetchJson<DailyLog>(`${BASE_URL}/logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(log),
  });
export const updateLog = (id: string, log: DailyLogInput) =>
  fetchJson<DailyLog>(`${BASE_URL}/logs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(log),
  });

// Evento de ventana para avisar que los recordatorios pudieron cambiar (p. ej., al guardar un registro)
export const REMINDERS_CHANGED_EVENT = "reminders:changed";
export const notifyRemindersChanged = () => window.dispatchEvent(new Event(REMINDERS_CHANGED_EVENT));

export const getReminders = () => fetchJson<Reminder[]>(`${BASE_URL}/reminders`);

export const sendChatMessage = (message: string) =>
  fetchJson<{ response: string }>(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
