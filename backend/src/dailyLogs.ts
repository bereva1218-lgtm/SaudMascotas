import { DailyLog, Prisma, PrismaClient } from "@prisma/client";
import defaultPrisma from "./prisma";

export const LOG_METRICS = ["appetite", "energy", "mood", "waterIntake", "sleep", "mobility"] as const;
export type LogMetric = (typeof LOG_METRICS)[number];

export const METRIC_MIN = 1;
export const METRIC_MAX = 5;

export type LogInput = Record<LogMetric, number> & { notes: string; images: string[] };

// Valida y normaliza el cuerpo de un registro diario.
export function parseLogInput(body: any): { input?: LogInput; error?: string } {
  const input = {
    notes: typeof body?.notes === "string" ? body.notes : "",
    images: Array.isArray(body?.images) ? body.images.map(String) : [],
  } as LogInput;

  for (const metric of LOG_METRICS) {
    const value = Number(body?.[metric]);
    if (!Number.isInteger(value) || value < METRIC_MIN || value > METRIC_MAX) {
      return { error: `Los indicadores deben ser valores entre ${METRIC_MIN} y ${METRIC_MAX}` };
    }
    input[metric] = value;
  }
  return { input };
}

export const toLogResponse = (log: DailyLog) => ({
  ...log,
  id: String(log.id),
  petId: String(log.petId),
  images: JSON.parse(log.images),
});

export const duplicateLogMessage = (petName: string) => `Ya registraste hoy a ${petName}; puedes editarlo`;

export class DuplicateDailyLogError extends Error {
  constructor(public existing: DailyLog) {
    super("Ya existe un registro para esta mascota en esta fecha");
    this.name = "DuplicateDailyLogError";
  }
}

export const findLogForDay = (petId: number, date: string, db: PrismaClient = defaultPrisma) =>
  db.dailyLog.findUnique({ where: { petId_date: { petId, date } } });

// Crea el registro del día; si ya existe uno lanza DuplicateDailyLogError con el existente.
export async function createDailyLog(
  petId: number,
  date: string,
  input: LogInput,
  db: PrismaClient = defaultPrisma
): Promise<DailyLog> {
  const existing = await findLogForDay(petId, date, db);
  if (existing) throw new DuplicateDailyLogError(existing);

  try {
    return await db.dailyLog.create({
      data: { ...input, petId, date, images: JSON.stringify(input.images) },
    });
  } catch (e) {
    // dos envíos simultáneos: la restricción única (petId, date) rechaza el segundo
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const winner = await findLogForDay(petId, date, db);
      if (winner) throw new DuplicateDailyLogError(winner);
    }
    throw e;
  }
}

// Actualiza indicadores, notas e imágenes; la fecha y la mascota no cambian.
export const updateDailyLog = (id: number, input: LogInput, db: PrismaClient = defaultPrisma) =>
  db.dailyLog.update({
    where: { id },
    data: { ...input, images: JSON.stringify(input.images) },
  });
