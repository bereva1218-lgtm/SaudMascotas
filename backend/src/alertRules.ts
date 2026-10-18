// Reglas de las alertas inteligentes: detección de descensos por métrica, textos explicativos
// y recomendaciones. Funciones puras (sin base de datos) para poder probarlas.
import { LOG_METRICS, LogMetric, METRIC_MAX } from "./dailyLogs";
import { APP_TIME_ZONE } from "./dates";

// Umbrales ajustables. Los valores de las métricas van de 1 a 5.
export const ALERT_CONFIG = {
  // registros anteriores usados para calcular el promedio habitual (línea base) de la mascota
  BASELINE_WINDOW: 14,
  // mínimo de registros previos para tener línea base; con menos se usa ABSOLUTE_LOW
  MIN_BASELINE_LOGS: 3,
  // un día es "bajo" si el valor queda al menos esta cantidad de puntos por debajo de la línea base
  DROP_POINTS: 1,
  // sin línea base suficiente, un día es "bajo" si el valor es menor o igual a esto
  ABSOLUTE_LOW: 2,
  // días bajos seguidos para pasar de precaución a alerta
  ALERT_STREAK_DAYS: 3,
  // caída del promedio reciente frente a la línea base que también se considera alerta (30 %)
  SIGNIFICANT_DROP_PCT: 0.3,
  // registros recientes promediados para medir la caída significativa
  SIGNIFICANT_DROP_WINDOW: 3,
  // la alerta se resuelve cuando el valor vuelve a (línea base - este margen) o más
  RECOVERY_MARGIN: 0.5,
  // si entre dos registros pasan más días que esto, la racha de días bajos se corta
  MAX_GAP_DAYS: 2,
  // vacunas aplicadas hace este número de días o menos se mencionan en la recomendación
  RECENT_VACCINE_DAYS: 3,
} as const;

export type AlertLevel = "precaucion" | "alerta";

// Tipo visual existente en el frontend para cada nivel
export const LEVEL_TO_TYPE: Record<AlertLevel, "preventive" | "urgent"> = {
  precaucion: "preventive",
  alerta: "urgent",
};

export type MetricLog = { date: string } & Record<LogMetric, number>;

export interface MetricEvaluation {
  metric: LogMetric;
  level: AlertLevel | null;
  // "streak": días bajos seguidos; "drop": caída marcada del promedio reciente
  reason: "streak" | "drop" | null;
  streak: number;
  baseline: number | null;
  latestValue: number;
  // promedio de los días bajos de la racha
  streakAverage: number | null;
  recentAverage: number | null;
  dropPct: number | null;
  // fecha del último registro normal antes de la racha
  lastNormalDate: string | null;
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

const isLowDay = (value: number, baseline: number | null, config = ALERT_CONFIG) =>
  baseline !== null ? value <= baseline - config.DROP_POINTS : value <= config.ABSOLUTE_LOW;

// Promedio habitual de la métrica con los registros anteriores a `index`.
function baselineBefore(logs: MetricLog[], metric: LogMetric, index: number, config = ALERT_CONFIG) {
  const history = logs.slice(Math.max(0, index - config.BASELINE_WINDOW), index).map((l) => l[metric]);
  return history.length >= config.MIN_BASELINE_LOGS ? mean(history) : null;
}

// Evalúa una métrica a partir del historial de la mascota (cualquier orden; se ordena por fecha).
export function evaluateMetric(
  logsInput: MetricLog[],
  metric: LogMetric,
  config = ALERT_CONFIG
): MetricEvaluation | null {
  const logs = [...logsInput].sort((a, b) => a.date.localeCompare(b.date));
  const n = logs.length;
  if (n === 0) return null;
  const latestValue = logs[n - 1][metric];

  // Racha de días bajos al final del historial: el inicio más antiguo tal que todos los días
  // desde ahí están por debajo de la línea base calculada con los registros ANTERIORES a ese
  // inicio, para que los días bajos no rebajen su propio promedio. No se corta en el primer
  // inicio que falla: con 5,5,5,5,4,4 el último día no es bajo frente a 4,8 pero sí frente a 5.
  let streak = 0;
  let baseline = baselineBefore(logs, metric, n - 1, config);
  // con historial suficiente solo se compara contra la línea base propia, nunca contra ABSOLUTE_LOW
  const hasHistory = baseline !== null;
  for (let start = n - 1; start >= 0; start--) {
    if (start < n - 1 && daysBetween(logs[start].date, logs[start + 1].date) > config.MAX_GAP_DAYS) break;
    const candidateBaseline = baselineBefore(logs, metric, start, config);
    if (hasHistory && candidateBaseline === null) break;
    const allLow = logs.slice(start).every((l) => isLowDay(l[metric], candidateBaseline, config));
    if (allLow) {
      streak = n - start;
      baseline = candidateBaseline;
    }
  }

  const streakLogs = streak > 0 ? logs.slice(n - streak) : [];
  const streakAverage = streak > 0 ? mean(streakLogs.map((l) => l[metric])) : null;
  const lastNormalDate = streak > 0 && n - streak - 1 >= 0 ? logs[n - streak - 1].date : null;

  // Caída marcada: promedio de los últimos registros frente a la línea base previa a ellos
  const windowSize = Math.min(config.SIGNIFICANT_DROP_WINDOW, n);
  const dropBaseline = baselineBefore(logs, metric, n - windowSize, config);
  const recentAverage = mean(logs.slice(n - windowSize).map((l) => l[metric]));
  const dropPct = dropBaseline ? (dropBaseline - recentAverage) / dropBaseline : null;

  let level: AlertLevel | null = null;
  let reason: MetricEvaluation["reason"] = null;
  if (streak >= config.ALERT_STREAK_DAYS) {
    level = "alerta";
    reason = "streak";
  } else if (streak > 0 && dropPct !== null && dropPct >= config.SIGNIFICANT_DROP_PCT) {
    level = "alerta";
    reason = "drop";
    baseline = dropBaseline;
  } else if (streak > 0) {
    level = "precaucion";
    reason = "streak";
  }

  return {
    metric,
    level,
    reason,
    streak,
    baseline,
    latestValue,
    streakAverage,
    recentAverage,
    dropPct,
    lastNormalDate,
  };
}

export const evaluateAllMetrics = (logs: MetricLog[], config = ALERT_CONFIG) =>
  LOG_METRICS.map((metric) => evaluateMetric(logs, metric, config)).filter(
    (e): e is MetricEvaluation => e !== null
  );

// ¿El último valor volvió a su nivel habitual? Se usa la línea base guardada en la alerta.
export function isRecovered(latestValue: number, alertBaseline: number | null, config = ALERT_CONFIG) {
  return alertBaseline !== null
    ? latestValue >= alertBaseline - config.RECOVERY_MARGIN
    : latestValue > config.ABSOLUTE_LOW;
}

export type AlertAction = "create" | "update" | "resolve" | "none";

export function decideAlertAction(
  evaluation: MetricEvaluation,
  existing: { baseline: number | null } | null,
  config = ALERT_CONFIG
): AlertAction {
  if (evaluation.level) return existing ? "update" : "create";
  if (existing && isRecovered(evaluation.latestValue, existing.baseline, config)) return "resolve";
  return "none";
}

// ---------- Textos ----------

const METRIC_TEXT: Record<LogMetric, { label: string; low: string; summary: string }> = {
  appetite: { label: "apetito", low: "apetito bajo", summary: "desnivel alimenticio" },
  energy: { label: "energía", low: "energía baja", summary: "baja energía" },
  mood: { label: "ánimo", low: "ánimo bajo", summary: "decaimiento del ánimo" },
  waterIntake: { label: "consumo de agua", low: "consumo de agua bajo", summary: "bajo consumo de agua" },
  sleep: { label: "sueño", low: "sueño bajo", summary: "alteraciones del sueño" },
  mobility: { label: "actividad física", low: "actividad física baja", summary: "poca actividad física" },
};

const formatScore = (value: number) =>
  `${value.toLocaleString("es-CO", { maximumFractionDigits: 1 })}/${METRIC_MAX}`;

export const formatDay = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    timeZone: APP_TIME_ZONE,
  });

const comparedToBaseline = (baseline: number | null) =>
  baseline !== null
    ? `, por debajo de su promedio habitual (${formatScore(baseline)})`
    : " (aún no hay suficiente historial para calcular su promedio habitual)";

// Explicación ("el porqué") basada en los datos reales del historial.
export function buildExplanation(petName: string, ev: MetricEvaluation): string {
  const text = METRIC_TEXT[ev.metric];

  if (ev.level === "alerta" && ev.reason === "drop") {
    const pct = Math.round((ev.dropPct ?? 0) * 100);
    return (
      `Tu mascota ${petName} muestra una caída marcada en su ${text.label}: ` +
      `el promedio de sus últimos registros (${formatScore(ev.recentAverage!)}) está un ${pct} % ` +
      `por debajo de su promedio habitual (${formatScore(ev.baseline!)}).`
    );
  }

  if (ev.level === "alerta") {
    return (
      `Tu mascota ${petName} ha presentado varios días con ${text.summary} ` +
      `(${ev.streak} días seguidos con ${text.low}; promedio ${formatScore(ev.streakAverage!)})` +
      `${comparedToBaseline(ev.baseline)}.`
    );
  }

  if (ev.streak === 1) {
    return `Tu mascota ${petName} registró ${text.low} en su último registro (${formatScore(ev.latestValue)})${comparedToBaseline(ev.baseline)}.`;
  }

  return (
    `Tu mascota ${petName} ha presentado ${text.low} en los últimos ${ev.streak} días ` +
    `(promedio ${formatScore(ev.streakAverage!)})${comparedToBaseline(ev.baseline)}.`
  );
}

const METRIC_ADVICE: Record<LogMetric, { base: string; vet: string }> = {
  appetite: {
    base: "Revisa que el alimento sea el habitual, esté fresco y bien conservado; ofrécelo en porciones pequeñas y verifica que esté tomando agua.",
    vet: "Si el apetito no mejora en 24 a 48 horas o aparecen vómito, diarrea o pérdida de peso, consulta al veterinario.",
  },
  energy: {
    base: "Procura que descanse en un lugar tranquilo y con temperatura agradable, y observa si hay otros signos como fiebre, dolor o falta de apetito.",
    vet: "Si el decaimiento continúa o empeora, consulta al veterinario.",
  },
  mood: {
    base: "Dedícale tiempo de juego y compañía, mantén sus rutinas y revisa si hubo cambios recientes en casa (mudanza, ruidos, visitas).",
    vet: "Si sigue decaído o se aísla, consulta al veterinario para descartar dolor u otra causa.",
  },
  waterIntake: {
    base: "Asegúrate de que tenga agua limpia y fresca siempre disponible; ofrecer alimento húmedo también ayuda a la hidratación.",
    vet: "Si bebe muy poco durante más de un día o notas encías secas o mucho cansancio, consulta al veterinario: la deshidratación puede ser seria.",
  },
  sleep: {
    base: "Revisa que su lugar de descanso sea cómodo, tranquilo y oscuro, y observa si algo lo despierta (dolor, ruidos, necesidad de orinar).",
    vet: "Si las alteraciones del sueño continúan, coméntalo con el veterinario.",
  },
  mobility: {
    base: "Ofrece paseos cortos y suaves, evita saltos y escaleras, y revisa si cojea o se queja al moverse.",
    vet: "Si la poca actividad continúa o notas dolor o rigidez, consulta al veterinario.",
  },
};

// Información adicional de la mascota que enriquece la recomendación.
// Vacunas y medicamentos se completan cuando existan esas secciones.
export interface RecommendationContext {
  condition?: string | null;
  activeMedications?: { name: string }[];
  recentVaccines?: { name: string; appliedDate: string }[];
}

const joinNames = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;

export function buildRecommendation(
  petName: string,
  ev: MetricEvaluation,
  context: RecommendationContext = {}
): string {
  const text = METRIC_TEXT[ev.metric];
  const advice = METRIC_ADVICE[ev.metric];
  const parts = [advice.base];

  if (ev.lastNormalDate) {
    parts.push(`Su último registro con ${text.label} normal fue el ${formatDay(ev.lastNormalDate)}; piensa qué cambió desde entonces (alimento, rutina, entorno).`);
  }
  if (context.condition) {
    parts.push(`Ten en cuenta su condición registrada: ${context.condition}.`);
  }
  if (context.activeMedications?.length) {
    parts.push(
      `${petName} está tomando ${joinNames(context.activeMedications.map((m) => m.name))}; ` +
        `algunos medicamentos pueden afectar el ${text.label}, coméntalo con el veterinario.`
    );
  }
  for (const vaccine of context.recentVaccines ?? []) {
    parts.push(
      `Recibió la vacuna ${vaccine.name} el ${formatDay(vaccine.appliedDate)}; un decaimiento leve en los días siguientes puede ser normal, pero avisa al veterinario si persiste.`
    );
  }

  parts.push(ev.level === "alerta" ? advice.vet : "Sigue registrándolo a diario para ver si se recupera.");
  return parts.join(" ");
}
