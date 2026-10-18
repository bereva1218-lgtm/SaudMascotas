// Recordatorios para el dueño. Hoy se muestran dentro de la app (GET /reminders); la
// construcción es independiente del canal para que en el futuro un envío programado
// (correo o SMS) reutilice exactamente los mismos recordatorios.
import { PrismaClient } from "@prisma/client";
import defaultPrisma from "./prisma";
import { hourInAppTimeZone, todayInAppTimeZone } from "./dates";
import { formatDay } from "./alertRules";
import { buildMedicationReminders, buildVaccineReminders } from "./health";

export const REMINDER_CONFIG = {
  // desde esta hora (Colombia) el recordatorio de registro diario pasa a prioridad alta
  DAILY_LOG_LATE_HOUR: 18,
} as const;

export type ReminderType = "daily_log" | "medication_dose" | "vaccine_due";

export interface Reminder {
  // estable por tipo, mascota y día: sirve para no repetir un envío por otros canales
  id: string;
  type: ReminderType;
  petId: string;
  petName: string;
  title: string;
  message: string;
  // día al que corresponde (YYYY-MM-DD, Colombia)
  dueDate: string;
  priority: "normal" | "high";
  // dosis de medicamento: permite marcarla como administrada
  medicationId?: string;
  scheduledAt?: string;
  vaccineId?: string;
}

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

// Un recordatorio por cada mascota que todavía no tiene el registro de hoy.
export function buildDailyLogReminders(
  pets: { id: number; name: string; lastLogDate: string | null }[],
  now: Date = new Date(),
  config = REMINDER_CONFIG
): Reminder[] {
  const today = todayInAppTimeZone(now);
  const late = hourInAppTimeZone(now) >= config.DAILY_LOG_LATE_HOUR;

  return pets
    .filter((pet) => pet.lastLogDate !== today)
    .map((pet) => {
      const missedDays = pet.lastLogDate ? daysBetween(pet.lastLogDate, today) - 1 : null;
      let message: string;
      if (missedDays === null) {
        message = `Aún no tienes registros de ${pet.name}. Haz el primero hoy para empezar a conocer su promedio habitual.`;
      } else if (missedDays >= 1) {
        message = `No registras a ${pet.name} desde el ${formatDay(pet.lastLogDate!)}. Los días sin registro impiden detectar a tiempo cambios en su salud.`;
      } else if (late) {
        message = `Ya casi termina el día y aún no registras a ${pet.name}. Tómate un minuto para hacerlo.`;
      } else {
        message = `Aún no has hecho el registro de hoy de ${pet.name}.`;
      }
      return {
        id: `daily_log:${pet.id}:${today}`,
        type: "daily_log" as const,
        petId: String(pet.id),
        petName: pet.name,
        title: `Registro diario de ${pet.name}`,
        message,
        dueDate: today,
        priority: late || (missedDays ?? 0) >= 1 ? ("high" as const) : ("normal" as const),
      };
    });
}

// Todos los recordatorios del dueño: registros diarios, dosis de medicamentos y refuerzos de vacunas.
// Primero los de prioridad alta y luego por fecha.
export async function getRemindersForOwner(ownerId: number, db: PrismaClient = defaultPrisma, now: Date = new Date()) {
  const pets = await db.pet.findMany({
    where: { ownerId },
    select: {
      id: true,
      name: true,
      logs: { select: { date: true }, orderBy: { date: "desc" }, take: 1 },
      vaccines: true,
      medications: { include: { doses: { select: { scheduledAt: true } } } },
    },
    orderBy: { name: "asc" },
  });

  const reminders: Reminder[] = buildDailyLogReminders(
    pets.map((p) => ({ id: p.id, name: p.name, lastLogDate: p.logs[0]?.date ?? null })),
    now
  );
  for (const pet of pets) {
    const medications = pet.medications.map((m) => ({ ...m, administered: m.doses.map((d) => d.scheduledAt) }));
    reminders.push(...buildMedicationReminders(pet, medications, now), ...buildVaccineReminders(pet, pet.vaccines, now));
  }

  const rank = (r: Reminder) => (r.priority === "high" ? 0 : 1);
  return reminders.sort((a, b) => rank(a) - rank(b) || (a.scheduledAt ?? a.dueDate).localeCompare(b.scheduledAt ?? b.dueDate));
}
