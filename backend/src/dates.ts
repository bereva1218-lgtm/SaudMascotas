// La app se usa en Colombia: "hoy" se calcula en esta zona horaria, no en UTC.
export const APP_TIME_ZONE = "America/Bogota";

// Fecha "YYYY-MM-DD" de un instante en la zona horaria indicada.
export function dateInTimeZone(instant: Date, timeZone: string = APP_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export const todayInAppTimeZone = (now: Date = new Date()) => dateInTimeZone(now);

// Hora (0-23) de un instante en la zona horaria de la app.
export const hourInAppTimeZone = (instant: Date = new Date()) =>
  Number(
    new Intl.DateTimeFormat("en-US", { timeZone: APP_TIME_ZONE, hour: "2-digit", hourCycle: "h23" }).format(instant)
  );

// Colombia no tiene horario de verano: siempre UTC-5.
export const APP_UTC_OFFSET = "-05:00";

// Fecha "YYYY-MM-DD" + hora "HH:MM" en Colombia → instante ISO (UTC).
export const appLocalToISO = (date: string, time: string) => new Date(`${date}T${time}:00${APP_UTC_OFFSET}`).toISOString();

// Último instante (23:59:59.999 en Colombia) de una fecha "YYYY-MM-DD".
export const endOfAppDay = (date: string) => new Date(`${date}T23:59:59.999${APP_UTC_OFFSET}`);

// Hora "HH:MM" en Colombia de un instante.
export const timeInAppTimeZone = (instant: Date) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);

// Días entre dos fechas "YYYY-MM-DD" (to - from).
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

export const isValidDateString = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
