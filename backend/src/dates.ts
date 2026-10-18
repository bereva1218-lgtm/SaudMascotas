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
