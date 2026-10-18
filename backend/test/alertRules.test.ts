import { describe, it, expect } from "vitest";
import {
  ALERT_CONFIG,
  MetricLog,
  evaluateMetric,
  decideAlertAction,
  isRecovered,
  buildExplanation,
  buildRecommendation,
} from "../src/alertRules";
import { LogMetric } from "../src/dailyLogs";

// Historial diario desde el 1 de octubre; solo varía la métrica indicada (el resto en 4).
const history = (metric: LogMetric, values: number[], start = "2026-10-01"): MetricLog[] =>
  values.map((value, i) => {
    const date = new Date(Date.parse(`${start}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10);
    return { date, appetite: 4, energy: 4, mood: 4, waterIntake: 4, sleep: 4, mobility: 4, [metric]: value };
  });

describe("niveles: precaución vs. alerta", () => {
  it("sin descenso no hay alerta", () => {
    const ev = evaluateMetric(history("appetite", [4, 4, 5, 4, 4]), "appetite")!;
    expect(ev.level).toBeNull();
    expect(ev.streak).toBe(0);
  });

  it("1 día bajo frente a su promedio → precaución", () => {
    const ev = evaluateMetric(history("appetite", [4, 4, 4, 4, 3]), "appetite")!;
    expect(ev).toMatchObject({ level: "precaucion", streak: 1, baseline: 4 });
  });

  it("2 días bajos seguidos → precaución", () => {
    const ev = evaluateMetric(history("energy", [5, 5, 5, 5, 4, 4]), "energy")!;
    expect(ev).toMatchObject({ level: "precaucion", streak: 2, baseline: 5 });
  });

  it("3 o más días bajos seguidos → alerta", () => {
    const ev = evaluateMetric(history("appetite", [4, 4, 4, 4, 3, 3, 3, 2]), "appetite")!;
    expect(ev).toMatchObject({ level: "alerta", reason: "streak", streak: 4, baseline: 4 });
  });

  it("caída de 30 % o más del promedio reciente → alerta aunque la racha sea corta", () => {
    // línea base 5; últimos 3: 5, 2, 2 → promedio 3 (40 % menos)
    const ev = evaluateMetric(history("mobility", [5, 5, 5, 5, 2, 2]), "mobility")!;
    expect(ev).toMatchObject({ level: "alerta", reason: "drop", streak: 2 });
    expect(ev.dropPct).toBeCloseTo(0.4);
  });

  it("compara contra la línea base propia de la mascota, no contra un valor genérico", () => {
    // una mascota que siempre registra 2 no está en descenso
    expect(evaluateMetric(history("sleep", [2, 2, 2, 2, 2]), "sleep")!.level).toBeNull();
    // otra con promedio 5 que baja a 4 sí lo está
    expect(evaluateMetric(history("sleep", [5, 5, 5, 4]), "sleep")!.level).toBe("precaucion");
  });

  it("sin historial suficiente usa el umbral absoluto (≤ 2)", () => {
    expect(evaluateMetric(history("mood", [3]), "mood")!.level).toBeNull();
    const ev = evaluateMetric(history("mood", [2]), "mood")!;
    expect(ev).toMatchObject({ level: "precaucion", baseline: null });
  });

  it("los días bajos de la racha no rebajan su propia línea base", () => {
    const ev = evaluateMetric(history("waterIntake", [4, 4, 4, 4, 4, 2, 2, 2, 2, 2]), "waterIntake")!;
    expect(ev.baseline).toBe(4);
    expect(ev.streak).toBe(5);
  });

  it("un hueco de varios días sin registros corta la racha", () => {
    // sin el hueco serían 3 días bajos seguidos; con él solo cuenta el último
    const continuous = history("appetite", [4, 4, 4, 2, 2, 2]);
    expect(evaluateMetric(continuous, "appetite")!.streak).toBe(3);
    const withGap = [...history("appetite", [4, 4, 4, 2, 2]), ...history("appetite", [2], "2026-10-10")];
    expect(evaluateMetric(withGap, "appetite")!.streak).toBe(1);
  });

  it("los umbrales están centralizados en ALERT_CONFIG", () => {
    const custom = { ...ALERT_CONFIG, ALERT_STREAK_DAYS: 2 };
    expect(evaluateMetric(history("energy", [5, 5, 5, 5, 4, 4]), "energy", custom)!.level).toBe("alerta");
  });
});

describe("resolución y duplicados", () => {
  it("si la métrica se recupera, la alerta existente se resuelve", () => {
    const ev = evaluateMetric(history("appetite", [4, 4, 4, 2, 2, 2, 4]), "appetite")!;
    expect(ev.level).toBeNull();
    expect(decideAlertAction(ev, { baseline: 4 })).toBe("resolve");
  });

  it("una recuperación parcial mantiene la alerta activa", () => {
    // línea base 4,6; el último valor 4 no alcanza 4,6 - 0,5
    expect(isRecovered(4, 4.6)).toBe(false);
    expect(isRecovered(4.1, 4.6)).toBe(true);
  });

  it("si ya hay una alerta activa para la métrica se actualiza en vez de crear otra", () => {
    const ev = evaluateMetric(history("appetite", [4, 4, 4, 3, 3, 3]), "appetite")!;
    expect(decideAlertAction(ev, null)).toBe("create");
    expect(decideAlertAction(ev, { baseline: 4 })).toBe("update");
  });
});

describe("explicación", () => {
  it("alerta por varios días con apetito bajo", () => {
    const ev = evaluateMetric(history("appetite", [4, 4, 4, 4, 2, 2, 3, 3]), "appetite")!;
    expect(buildExplanation("Luna", ev)).toBe(
      "Tu mascota Luna ha presentado varios días con desnivel alimenticio " +
        "(4 días seguidos con apetito bajo; promedio 2,5/5), por debajo de su promedio habitual (4/5)."
    );
  });

  it("alerta por poca actividad física", () => {
    const ev = evaluateMetric(history("mobility", [5, 4, 4, 3, 3, 3]), "mobility")!;
    expect(buildExplanation("Max", ev)).toBe(
      "Tu mascota Max ha presentado varios días con poca actividad física " +
        "(3 días seguidos con actividad física baja; promedio 3/5), por debajo de su promedio habitual (4,3/5)."
    );
  });

  it("precaución de un día", () => {
    const ev = evaluateMetric(history("waterIntake", [5, 5, 5, 3]), "waterIntake")!;
    expect(buildExplanation("Luna", ev)).toBe(
      "Tu mascota Luna registró consumo de agua bajo en su último registro (3/5), por debajo de su promedio habitual (5/5)."
    );
  });

  it("caída marcada", () => {
    const ev = evaluateMetric(history("mobility", [5, 5, 5, 5, 2, 2]), "mobility")!;
    expect(buildExplanation("Max", ev)).toBe(
      "Tu mascota Max muestra una caída marcada en su actividad física: el promedio de sus últimos registros (3/5) " +
        "está un 40 % por debajo de su promedio habitual (5/5)."
    );
  });

  it("indica cuando aún no hay historial suficiente", () => {
    const ev = evaluateMetric(history("mood", [2]), "mood")!;
    expect(buildExplanation("Luna", ev)).toContain("aún no hay suficiente historial");
  });
});

describe("recomendación", () => {
  const ev = evaluateMetric(history("appetite", [4, 4, 4, 4, 2, 2, 2]), "appetite")!;

  it("es específica de la métrica y recomienda veterinario en nivel alerta", () => {
    const text = buildRecommendation("Luna", ev);
    expect(text).toContain("Revisa que el alimento sea el habitual");
    expect(text).toContain("consulta al veterinario");
    expect(text).toContain("Su último registro con apetito normal fue el 4 de octubre");
  });

  it("en precaución sugiere seguir observando", () => {
    const caution = evaluateMetric(history("appetite", [4, 4, 4, 3]), "appetite")!;
    expect(buildRecommendation("Luna", caution)).toContain("Sigue registrándolo a diario");
  });

  it("usa condición, medicamentos y vacunas como contexto", () => {
    const text = buildRecommendation("Luna", ev, {
      condition: "Insuficiencia renal",
      activeMedications: [{ name: "Meloxicam" }, { name: "Omeprazol" }],
      recentVaccines: [{ name: "Rabia", appliedDate: "2026-10-05" }],
    });
    expect(text).toContain("Ten en cuenta su condición registrada: Insuficiencia renal.");
    expect(text).toContain("Luna está tomando Meloxicam y Omeprazol");
    expect(text).toContain("Recibió la vacuna Rabia el 5 de octubre");
  });
});
