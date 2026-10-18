// La app se usa en Colombia: horas y fechas se muestran en esta zona horaria,
// sin depender de la configuración del navegador. Misma regla que backend/src/dates.ts.
export const APP_TIME_ZONE = "America/Bogota";
export const APP_LOCALE = "es-CO";

const partsInAppTimeZone = (instant: Date) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);

const part = (parts: Intl.DateTimeFormatPart[], type: string) => parts.find((p) => p.type === type)!.value;

// Hora (0-23) en Colombia.
export const hourInAppTimeZone = (now: Date = new Date()) => Number(part(partsInAppTimeZone(now), "hour"));

// Fecha "YYYY-MM-DD" en Colombia.
export const todayInAppTimeZone = (now: Date = new Date()) => {
  const parts = partsInAppTimeZone(now);
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
};

// Saludo según la hora en Colombia: mañana 5–11, tarde 12–18, noche 19–4.
export function greetingFor(now: Date = new Date()) {
  const hour = hourInAppTimeZone(now);
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

// Fecha y hora legibles en Colombia, p. ej. "18 oct 2026, 3:47 p. m.".
export const formatDateTime = (value: string | Date) =>
  new Date(value).toLocaleString(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

// Hora legible en Colombia, p. ej. "3:47 p. m.".
export const formatTime = (value: string | Date) =>
  new Date(value).toLocaleTimeString(APP_LOCALE, { timeZone: APP_TIME_ZONE, hour: "numeric", minute: "2-digit" });

// Días entre dos fechas "YYYY-MM-DD" (to - from).
export const daysBetweenDates = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

// "2026-10-18" → "18 oct 2026"
export const formatDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString(APP_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  });
