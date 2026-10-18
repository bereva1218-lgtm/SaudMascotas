// Sección "Vacunas y medicamentos": validación, calendario de dosis y recordatorios.
// Funciones puras (sin base de datos) para poder probarlas.
import {
  appLocalToISO,
  dateInTimeZone,
  daysBetween,
  endOfAppDay,
  isValidDateString,
  timeInAppTimeZone,
  todayInAppTimeZone,
} from "./dates";
import { formatDay } from "./alertRules";

// Umbrales ajustables
export const HEALTH_CONFIG = {
  // la próxima dosis se recuerda si toca dentro de estas horas
  DOSE_UPCOMING_HOURS: 24,
  // una dosis no marcada como administrada se recuerda como atrasada durante estas horas
  DOSE_OVERDUE_HOURS: 24,
  // máximo de dosis atrasadas que se muestran por medicamento (las más recientes)
  MAX_OVERDUE_REMINDERS: 3,
  // el próximo refuerzo de una vacuna se recuerda desde estos días antes
  VACCINE_UPCOMING_DAYS: 14,
  // y mientras no lleve vencido más de estos días
  VACCINE_OVERDUE_DAYS: 90,
  MAX_FREQUENCY_HOURS: 24 * 30,
  MAX_TREATMENT_DAYS: 366,
} as const;

const TEXT_MAX = 100;
const NOTES_MAX = 500;
const HOUR_MS = 3_600_000;

const optionalText = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

// ---------- Vacunas ----------

export interface VaccineInput {
  name: string;
  appliedDate: string;
  nextDoseDate: string | null;
  clinic: string | null;
  notes: string | null;
}

export function parseVaccineInput(body: any, now: Date = new Date()): { input?: VaccineInput; error?: string } {
  const name = optionalText(body?.name);
  if (!name) return { error: "El nombre de la vacuna es obligatorio" };
  if (name.length > TEXT_MAX) return { error: `El nombre admite máximo ${TEXT_MAX} caracteres` };

  const appliedDate = body?.appliedDate;
  if (!isValidDateString(appliedDate)) return { error: "La fecha de aplicación no es válida" };
  if (appliedDate > todayInAppTimeZone(now)) return { error: "La fecha de aplicación no puede ser futura" };

  let nextDoseDate: string | null = null;
  if (body?.nextDoseDate) {
    if (!isValidDateString(body.nextDoseDate)) return { error: "La fecha del próximo refuerzo no es válida" };
    if (body.nextDoseDate <= appliedDate) {
      return { error: "La fecha del próximo refuerzo debe ser posterior a la de aplicación" };
    }
    nextDoseDate = body.nextDoseDate;
  }

  const clinic = optionalText(body?.clinic);
  if (clinic && clinic.length > TEXT_MAX) return { error: `Veterinario o clínica admite máximo ${TEXT_MAX} caracteres` };
  const notes = optionalText(body?.notes);
  if (notes && notes.length > NOTES_MAX) return { error: `Las notas admiten máximo ${NOTES_MAX} caracteres` };

  return { input: { name, appliedDate, nextDoseDate, clinic, notes } };
}

const normalizeName = (name: string) => name.trim().toLowerCase();

// Solo la aplicación más reciente de cada vacuna cuenta para los recordatorios:
// al registrar el refuerzo, el recordatorio de la dosis anterior deja de aparecer.
export function latestVaccinePerName<T extends { id: number; name: string; appliedDate: string }>(vaccines: T[]): T[] {
  const latest = new Map<string, T>();
  for (const v of vaccines) {
    const key = normalizeName(v.name);
    const current = latest.get(key);
    if (!current || v.appliedDate > current.appliedDate || (v.appliedDate === current.appliedDate && v.id > current.id)) {
      latest.set(key, v);
    }
  }
  return [...latest.values()];
}

// ---------- Medicamentos ----------

export interface MedicationInput {
  name: string;
  dose: string;
  frequencyHours: number;
  startAt: string;
  endDate: string;
  notes: string | null;
}

// Acepta fecha de fin (`endDate`) o duración en días (`durationDays`, cuenta el día de inicio).
export function parseMedicationInput(body: any): { input?: MedicationInput; error?: string } {
  const name = optionalText(body?.name);
  if (!name) return { error: "El nombre del medicamento es obligatorio" };
  if (name.length > TEXT_MAX) return { error: `El nombre admite máximo ${TEXT_MAX} caracteres` };

  const dose = optionalText(body?.dose);
  if (!dose) return { error: "La dosis es obligatoria (por ejemplo: 1 tableta, 5 ml)" };
  if (dose.length > 60) return { error: "La dosis admite máximo 60 caracteres" };

  const frequencyHours = Number(body?.frequencyHours);
  if (!Number.isInteger(frequencyHours) || frequencyHours < 1 || frequencyHours > HEALTH_CONFIG.MAX_FREQUENCY_HOURS) {
    return { error: "La frecuencia debe ser un número entero de horas (por ejemplo, cada 8 o 24 horas)" };
  }

  const startDate = body?.startDate;
  if (!isValidDateString(startDate)) return { error: "La fecha de inicio no es válida" };
  const startTime = typeof body?.startTime === "string" && body.startTime ? body.startTime : "08:00";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) return { error: "La hora de la primera dosis no es válida" };

  let endDate: string;
  if (body?.endDate) {
    if (!isValidDateString(body.endDate)) return { error: "La fecha de fin no es válida" };
    endDate = body.endDate;
  } else if (body?.durationDays !== undefined && body?.durationDays !== "") {
    const days = Number(body.durationDays);
    if (!Number.isInteger(days) || days < 1) return { error: "La duración debe ser de al menos 1 día" };
    endDate = new Date(Date.parse(`${startDate}T00:00:00Z`) + (days - 1) * 86_400_000).toISOString().slice(0, 10);
  } else {
    return { error: "Indica la fecha de fin o la duración del tratamiento" };
  }
  if (endDate < startDate) return { error: "La fecha de fin no puede ser anterior a la de inicio" };
  if (daysBetween(startDate, endDate) + 1 > HEALTH_CONFIG.MAX_TREATMENT_DAYS) {
    return { error: `El tratamiento puede durar máximo ${HEALTH_CONFIG.MAX_TREATMENT_DAYS} días` };
  }

  const notes = optionalText(body?.notes);
  if (notes && notes.length > NOTES_MAX) return { error: `Las notas admiten máximo ${NOTES_MAX} caracteres` };

  return { input: { name, dose, frequencyHours, startAt: appLocalToISO(startDate, startTime), endDate, notes } };
}

type Schedulable = { startAt: string; frequencyHours: number; endDate: string };

// Horas programadas (ISO) de las dosis entre `from` y `to`, sin pasar del último día del tratamiento.
export function doseSchedule(med: Schedulable, from: Date, to: Date): string[] {
  const start = Date.parse(med.startAt);
  const step = med.frequencyHours * HOUR_MS;
  const last = Math.min(to.getTime(), endOfAppDay(med.endDate).getTime());
  const out: string[] = [];
  let k = Math.max(0, Math.ceil((from.getTime() - start) / step));
  for (let t = start + k * step; t <= last; t = start + ++k * step) out.push(new Date(t).toISOString());
  return out;
}

// ¿`scheduledAt` es una dosis real del calendario del tratamiento?
export function isScheduledDose(med: Schedulable, scheduledAt: string): boolean {
  const t = Date.parse(scheduledAt);
  if (Number.isNaN(t)) return false;
  const offset = t - Date.parse(med.startAt);
  return offset >= 0 && offset % (med.frequencyHours * HOUR_MS) === 0 && t <= endOfAppDay(med.endDate).getTime();
}

export type MedicationStatus = "programado" | "activo" | "finalizado";

export function medicationStatus(med: Schedulable, now: Date = new Date()): MedicationStatus {
  if (now.getTime() > endOfAppDay(med.endDate).getTime()) return "finalizado";
  if (now.getTime() < Date.parse(med.startAt)) return "programado";
  return "activo";
}

// Resumen para mostrar: próxima dosis y dosis atrasadas sin marcar
export function medicationSummary(med: Schedulable, administered: string[], now: Date = new Date(), config = HEALTH_CONFIG) {
  const done = new Set(administered);
  const overdue = doseSchedule(med, new Date(now.getTime() - config.DOSE_OVERDUE_HOURS * HOUR_MS), now).filter(
    (t) => !done.has(t)
  );
  const upcoming = doseSchedule(med, new Date(now.getTime() + 1), new Date(now.getTime() + 400 * 24 * HOUR_MS));
  const nextDoseAt = upcoming.find((t) => !done.has(t)) ?? null;
  return { status: medicationStatus(med, now), nextDoseAt, overdueDoses: overdue };
}

// ---------- Recordatorios ----------

export interface HealthReminder {
  id: string;
  type: "medication_dose" | "vaccine_due";
  petId: string;
  petName: string;
  title: string;
  message: string;
  dueDate: string;
  priority: "normal" | "high";
  medicationId?: string;
  scheduledAt?: string;
  vaccineId?: string;
}

// "3:00 p. m."
const formatTime12 = (instant: Date) => {
  const [h, m] = timeInAppTimeZone(instant).split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
};

const dayLabel = (instant: Date, now: Date) => {
  const diff = daysBetween(todayInAppTimeZone(now), dateInTimeZone(instant));
  if (diff === 0) return "hoy";
  if (diff === 1) return "mañana";
  if (diff === -1) return "ayer";
  return `el ${formatDay(dateInTimeZone(instant))}`;
};

export function buildMedicationReminders(
  pet: { id: number; name: string },
  medications: (Schedulable & { id: number; name: string; dose: string; administered: string[] })[],
  now: Date = new Date(),
  config = HEALTH_CONFIG
): HealthReminder[] {
  const reminders: HealthReminder[] = [];
  for (const med of medications) {
    if (medicationStatus(med, now) === "finalizado") continue;
    const { overdueDoses } = medicationSummary(med, med.administered, now, config);
    const done = new Set(med.administered);

    for (const scheduledAt of overdueDoses.slice(-config.MAX_OVERDUE_REMINDERS)) {
      const at = new Date(scheduledAt);
      reminders.push({
        id: `medication_dose:${med.id}:${scheduledAt}`,
        type: "medication_dose",
        petId: String(pet.id),
        petName: pet.name,
        title: `Dosis de ${med.name} para ${pet.name}`,
        message: `Tocaba ${dayLabel(at, now)} a las ${formatTime12(at)} (${med.dose}) y aún no está marcada como administrada.`,
        dueDate: dateInTimeZone(at),
        priority: "high",
        medicationId: String(med.id),
        scheduledAt,
      });
    }

    const next = doseSchedule(med, new Date(now.getTime() + 1), new Date(now.getTime() + config.DOSE_UPCOMING_HOURS * HOUR_MS)).find(
      (t) => !done.has(t)
    );
    if (next) {
      const at = new Date(next);
      reminders.push({
        id: `medication_dose:${med.id}:${next}`,
        type: "medication_dose",
        petId: String(pet.id),
        petName: pet.name,
        title: `Próxima dosis de ${med.name} para ${pet.name}`,
        message: `Toca ${dayLabel(at, now)} a las ${formatTime12(at)}: ${med.dose}.`,
        dueDate: dateInTimeZone(at),
        priority: "normal",
        medicationId: String(med.id),
        scheduledAt: next,
      });
    }
  }
  return reminders;
}

export function buildVaccineReminders(
  pet: { id: number; name: string },
  vaccines: { id: number; name: string; appliedDate: string; nextDoseDate: string | null }[],
  now: Date = new Date(),
  config = HEALTH_CONFIG
): HealthReminder[] {
  const today = todayInAppTimeZone(now);
  const reminders: HealthReminder[] = [];
  for (const v of latestVaccinePerName(vaccines)) {
    if (!v.nextDoseDate) continue;
    const days = daysBetween(today, v.nextDoseDate);
    if (days > config.VACCINE_UPCOMING_DAYS || days < -config.VACCINE_OVERDUE_DAYS) continue;

    let message: string;
    if (days < 0) message = `El refuerzo está vencido desde el ${formatDay(v.nextDoseDate)}. Agenda la cita con el veterinario.`;
    else if (days === 0) message = "El refuerzo es hoy.";
    else if (days === 1) message = "El refuerzo es mañana.";
    else message = `El refuerzo es en ${days} días (${formatDay(v.nextDoseDate)}).`;

    reminders.push({
      id: `vaccine_due:${v.id}:${v.nextDoseDate}`,
      type: "vaccine_due",
      petId: String(pet.id),
      petName: pet.name,
      title: `Vacuna ${v.name} de ${pet.name}`,
      message,
      dueDate: v.nextDoseDate,
      priority: days <= 1 ? "high" : "normal",
      vaccineId: String(v.id),
    });
  }
  return reminders;
}

// Contexto para las recomendaciones de las alertas
export function healthContextForAlerts(
  medications: (Schedulable & { name: string })[],
  vaccines: { name: string; appliedDate: string }[],
  recentVaccineDays: number,
  now: Date = new Date()
) {
  const today = todayInAppTimeZone(now);
  return {
    activeMedications: medications.filter((m) => medicationStatus(m, now) === "activo").map((m) => ({ name: m.name })),
    recentVaccines: vaccines
      .filter((v) => {
        const days = daysBetween(v.appliedDate, today);
        return days >= 0 && days <= recentVaccineDays;
      })
      .map((v) => ({ name: v.name, appliedDate: v.appliedDate })),
  };
}
