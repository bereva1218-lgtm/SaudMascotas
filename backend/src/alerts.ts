// Sincroniza las alertas de una mascota con su historial de registros diarios:
// crea, actualiza o resuelve una alerta activa por métrica (nunca duplicadas).
import { Alert, PrismaClient } from "@prisma/client";
import defaultPrisma from "./prisma";
import {
  ALERT_CONFIG,
  LEVEL_TO_TYPE,
  RecommendationContext,
  buildExplanation,
  buildRecommendation,
  decideAlertAction,
  evaluateAllMetrics,
} from "./alertRules";
import { healthContextForAlerts } from "./health";

// registros que se leen: suficientes para la línea base más una racha larga
const LOGS_TO_READ = ALERT_CONFIG.BASELINE_WINDOW + 30;

// Contexto para las recomendaciones: condición, medicamentos activos y vacunas recientes.
async function loadRecommendationContext(
  pet: { id: number; condition: string | null },
  db: PrismaClient,
  now: Date
): Promise<RecommendationContext> {
  const [medications, vaccines] = await Promise.all([
    db.medication.findMany({ where: { petId: pet.id } }),
    db.vaccine.findMany({ where: { petId: pet.id } }),
  ]);
  return {
    condition: pet.condition,
    ...healthContextForAlerts(medications, vaccines, ALERT_CONFIG.RECENT_VACCINE_DAYS, now),
  };
}

// Estado general de la mascota según sus alertas activas
export function statusFromActiveAlerts(alerts: Pick<Alert, "level">[]) {
  if (alerts.some((a) => a.level === "alerta")) return "alert";
  if (alerts.some((a) => a.level === "precaucion")) return "observation";
  return "stable";
}

export async function evaluatePetAlerts(petId: number, db: PrismaClient = defaultPrisma, now: Date = new Date()) {
  const pet = await db.pet.findUnique({ where: { id: petId } });
  if (!pet) return null;

  const logs = (
    await db.dailyLog.findMany({ where: { petId }, orderBy: { date: "desc" }, take: LOGS_TO_READ })
  ).reverse();
  const activeAlerts = await db.alert.findMany({
    where: { petId, status: "active", metric: { not: null } },
    orderBy: { id: "asc" },
  });
  const context = await loadRecommendationContext(pet, db, now);
  const timestamp = now.toISOString();

  for (const evaluation of evaluateAllMetrics(logs)) {
    const [existing, ...duplicates] = activeAlerts.filter((a) => a.metric === evaluation.metric);

    // por seguridad: si quedaron alertas activas repetidas para la misma métrica, se resuelven
    for (const duplicate of duplicates) {
      await db.alert.update({ where: { id: duplicate.id }, data: { status: "resolved", resolvedAt: timestamp } });
    }

    const action = decideAlertAction(evaluation, existing ?? null);
    if (action === "resolve") {
      await db.alert.update({
        where: { id: existing!.id },
        data: { status: "resolved", resolvedAt: timestamp, updatedAt: timestamp },
      });
      continue;
    }
    if (action === "none") continue;

    const level = evaluation.level!;
    const data = {
      level,
      type: LEVEL_TO_TYPE[level],
      message: buildExplanation(pet.name, evaluation),
      recommendation: buildRecommendation(pet.name, evaluation, context),
      baseline: evaluation.baseline,
      updatedAt: timestamp,
    };

    if (action === "create") {
      await db.alert.create({
        data: { ...data, petId, metric: evaluation.metric, status: "active", date: timestamp, read: false },
      });
    } else {
      // si sube de precaución a alerta se vuelve a marcar como no leída
      const escalated = existing!.level !== "alerta" && level === "alerta";
      await db.alert.update({ where: { id: existing!.id }, data: { ...data, ...(escalated ? { read: false } : {}) } });
    }
  }

  const stillActive = await db.alert.findMany({ where: { petId, status: "active" } });
  const status = statusFromActiveAlerts(stillActive);
  if (status !== pet.status) await db.pet.update({ where: { id: petId }, data: { status } });
  return { status, activeAlerts: stillActive };
}
