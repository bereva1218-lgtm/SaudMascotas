import { describe, it, expect } from "vitest";
import {
  parseVaccineInput,
  parseMedicationInput,
  doseSchedule,
  isScheduledDose,
  medicationStatus,
  medicationSummary,
  buildMedicationReminders,
  buildVaccineReminders,
  latestVaccinePerName,
  healthContextForAlerts,
} from "../src/health";

// Instante a partir de fecha y hora en Bogotá (UTC-5)
const bogota = (date: string, time: string) => new Date(`${date}T${time}:00-05:00`);

const pet = { id: 1, name: "Luna" };
// Meloxicam cada 8 h desde el 18 oct a las 8:00 a. m., hasta el 20 oct
const meloxicam = {
  id: 10,
  name: "Meloxicam",
  dose: "1 tableta",
  frequencyHours: 8,
  startAt: bogota("2026-10-18", "08:00").toISOString(),
  endDate: "2026-10-20",
  administered: [] as string[],
};

describe("parseVaccineInput", () => {
  const now = bogota("2026-10-18", "15:00");
  const valid = { name: " Rabia ", appliedDate: "2026-10-05", nextDoseDate: "2027-10-05", clinic: "", notes: "" };

  it("normaliza una vacuna válida", () => {
    expect(parseVaccineInput(valid, now).input).toEqual({
      name: "Rabia",
      appliedDate: "2026-10-05",
      nextDoseDate: "2027-10-05",
      clinic: null,
      notes: null,
    });
  });

  it("valida nombre, fecha no futura y refuerzo posterior a la aplicación", () => {
    expect(parseVaccineInput({ ...valid, name: "" }, now).error).toBe("El nombre de la vacuna es obligatorio");
    expect(parseVaccineInput({ ...valid, appliedDate: "2026-10-19" }, now).error).toBe(
      "La fecha de aplicación no puede ser futura"
    );
    expect(parseVaccineInput({ ...valid, nextDoseDate: "2026-10-01" }, now).error).toMatch(/posterior/);
    expect(parseVaccineInput({ ...valid, nextDoseDate: "" }, now).input?.nextDoseDate).toBeNull();
  });
});

describe("parseMedicationInput", () => {
  const valid = { name: "Meloxicam", dose: "1 tableta", frequencyHours: "8", startDate: "2026-10-18", startTime: "08:00", endDate: "2026-10-20" };

  it("convierte la hora de inicio de Colombia a UTC", () => {
    expect(parseMedicationInput(valid).input).toMatchObject({
      frequencyHours: 8,
      startAt: "2026-10-18T13:00:00.000Z",
      endDate: "2026-10-20",
    });
  });

  it("acepta duración en días en lugar de fecha de fin (incluye el día de inicio)", () => {
    const { input } = parseMedicationInput({ ...valid, endDate: "", durationDays: 7 });
    expect(input?.endDate).toBe("2026-10-24");
  });

  it("exige dosis, frecuencia válida y fin o duración", () => {
    expect(parseMedicationInput({ ...valid, dose: "" }).error).toMatch(/dosis es obligatoria/);
    expect(parseMedicationInput({ ...valid, frequencyHours: 0 }).error).toMatch(/frecuencia/);
    expect(parseMedicationInput({ ...valid, frequencyHours: 2.5 }).error).toMatch(/frecuencia/);
    expect(parseMedicationInput({ ...valid, endDate: "" }).error).toBe("Indica la fecha de fin o la duración del tratamiento");
    expect(parseMedicationInput({ ...valid, endDate: "2026-10-17" }).error).toMatch(/anterior/);
  });
});

describe("calendario de dosis", () => {
  it("genera las dosis cada X horas y se detiene al terminar el tratamiento", () => {
    const all = doseSchedule(meloxicam, new Date(0), bogota("2030-01-01", "00:00"));
    // 18 oct: 8:00 y 16:00; 19 y 20 oct: 0:00, 8:00 y 16:00 → 8 dosis; la última el 20 a las 4 p. m.
    expect(all).toHaveLength(8);
    expect(all[0]).toBe(bogota("2026-10-18", "08:00").toISOString());
    expect(all[all.length - 1]).toBe(bogota("2026-10-20", "16:00").toISOString());
  });

  it("reconoce solo las horas que pertenecen al calendario", () => {
    expect(isScheduledDose(meloxicam, bogota("2026-10-19", "00:00").toISOString())).toBe(true);
    expect(isScheduledDose(meloxicam, bogota("2026-10-19", "01:00").toISOString())).toBe(false);
    expect(isScheduledDose(meloxicam, bogota("2026-10-21", "00:00").toISOString())).toBe(false); // ya terminó
  });

  it("estado: programado, activo y finalizado", () => {
    expect(medicationStatus(meloxicam, bogota("2026-10-17", "12:00"))).toBe("programado");
    expect(medicationStatus(meloxicam, bogota("2026-10-20", "23:00"))).toBe("activo");
    expect(medicationStatus(meloxicam, bogota("2026-10-21", "00:01"))).toBe("finalizado");
  });

  it("resumen: próxima dosis y dosis atrasadas sin marcar", () => {
    const now = bogota("2026-10-18", "17:00");
    const administered = [bogota("2026-10-18", "08:00").toISOString()];
    const summary = medicationSummary(meloxicam, administered, now);
    expect(summary.overdueDoses).toEqual([bogota("2026-10-18", "16:00").toISOString()]);
    expect(summary.nextDoseAt).toBe(bogota("2026-10-19", "00:00").toISOString());
  });
});

describe("recordatorios de medicamentos", () => {
  it("recuerda la dosis atrasada y la próxima", () => {
    const reminders = buildMedicationReminders(pet, [meloxicam], bogota("2026-10-18", "17:00"));
    expect(reminders.map((r) => [r.priority, r.message])).toEqual([
      ["high", "Tocaba hoy a las 8:00 a. m. (1 tableta) y aún no está marcada como administrada."],
      ["high", "Tocaba hoy a las 4:00 p. m. (1 tableta) y aún no está marcada como administrada."],
      ["normal", "Toca mañana a las 12:00 a. m.: 1 tableta."],
    ]);
    expect(reminders[2]).toMatchObject({ type: "medication_dose", medicationId: "10", title: "Próxima dosis de Meloxicam para Luna" });
  });

  it("una dosis marcada como administrada deja de recordarse", () => {
    const administered = [bogota("2026-10-18", "08:00"), bogota("2026-10-18", "16:00")].map((d) => d.toISOString());
    const reminders = buildMedicationReminders(pet, [{ ...meloxicam, administered }], bogota("2026-10-18", "17:00"));
    expect(reminders).toHaveLength(1);
    expect(reminders[0].priority).toBe("normal");
  });

  it("deja de generar recordatorios cuando termina el tratamiento", () => {
    expect(buildMedicationReminders(pet, [meloxicam], bogota("2026-10-21", "09:00"))).toEqual([]);
    // el último día solo queda la dosis de las 4 p. m.; después de ella no hay próxima
    const lastDay = buildMedicationReminders(pet, [meloxicam], bogota("2026-10-20", "17:00"));
    expect(lastDay.every((r) => r.priority === "high")).toBe(true);
  });
});

describe("recordatorios de vacunas", () => {
  const rabia = { id: 1, name: "Rabia", appliedDate: "2025-10-20", nextDoseDate: "2026-10-25" };

  it("recuerda el refuerzo próximo (14 días antes) y el vencido", () => {
    expect(buildVaccineReminders(pet, [rabia], bogota("2026-10-01", "09:00"))).toEqual([]);
    expect(buildVaccineReminders(pet, [rabia], bogota("2026-10-18", "09:00"))[0]).toMatchObject({
      priority: "normal",
      message: "El refuerzo es en 7 días (25 de octubre).",
    });
    expect(buildVaccineReminders(pet, [rabia], bogota("2026-10-25", "09:00"))[0].message).toBe("El refuerzo es hoy.");
    expect(buildVaccineReminders(pet, [rabia], bogota("2026-11-02", "09:00"))[0]).toMatchObject({
      priority: "high",
      message: "El refuerzo está vencido desde el 25 de octubre. Agenda la cita con el veterinario.",
    });
  });

  it("al registrar el refuerzo, deja de recordarse el de la dosis anterior", () => {
    const refuerzo = { id: 2, name: "rabia", appliedDate: "2026-10-25", nextDoseDate: "2027-10-25" };
    expect(latestVaccinePerName([rabia, refuerzo])).toEqual([refuerzo]);
    expect(buildVaccineReminders(pet, [rabia, refuerzo], bogota("2026-11-02", "09:00"))).toEqual([]);
  });
});

describe("contexto para las alertas", () => {
  it("incluye medicamentos activos y vacunas aplicadas en los últimos días", () => {
    const now = bogota("2026-10-19", "10:00");
    const context = healthContextForAlerts(
      [meloxicam, { ...meloxicam, name: "Antiguo", endDate: "2026-09-01", startAt: bogota("2026-08-01", "08:00").toISOString() }],
      [
        { name: "Rabia", appliedDate: "2026-10-17" },
        { name: "Parvovirus", appliedDate: "2026-06-01" },
      ],
      3,
      now
    );
    expect(context.activeMedications).toEqual([{ name: "Meloxicam" }]);
    expect(context.recentVaccines).toEqual([{ name: "Rabia", appliedDate: "2026-10-17" }]);
  });
});
