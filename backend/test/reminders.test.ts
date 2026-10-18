import { describe, it, expect } from "vitest";
import { buildDailyLogReminders } from "../src/reminders";

// 18 de octubre de 2026 en Bogotá (UTC-5)
const at = (hourBogota: number) => new Date(Date.UTC(2026, 9, 18, hourBogota + 5));

describe("recordatorios de registro diario", () => {
  it("no recuerda a las mascotas que ya tienen el registro de hoy", () => {
    const r = buildDailyLogReminders([{ id: 1, name: "Luna", lastLogDate: "2026-10-18" }], at(10));
    expect(r).toHaveLength(0);
  });

  it("recuerda el registro de hoy con prioridad normal durante el día", () => {
    const [r] = buildDailyLogReminders([{ id: 1, name: "Luna", lastLogDate: "2026-10-17" }], at(10));
    expect(r).toMatchObject({
      id: "daily_log:1:2026-10-18",
      priority: "normal",
      message: "Aún no has hecho el registro de hoy de Luna.",
    });
  });

  it("desde las 6 p. m. (hora de Colombia) sube la prioridad", () => {
    const [r] = buildDailyLogReminders([{ id: 1, name: "Luna", lastLogDate: "2026-10-17" }], at(19));
    expect(r.priority).toBe("high");
    expect(r.message).toContain("Ya casi termina el día");
  });

  it("si lleva días sin registro lo indica con la fecha", () => {
    const [r] = buildDailyLogReminders([{ id: 2, name: "Max", lastLogDate: "2026-10-15" }], at(9));
    expect(r.priority).toBe("high");
    expect(r.message).toContain("No registras a Max desde el 15 de octubre");
  });

  it("a las 9 p. m. de Bogotá sigue siendo el mismo día aunque en UTC ya sea el siguiente", () => {
    const r = buildDailyLogReminders([{ id: 1, name: "Luna", lastLogDate: "2026-10-18" }], at(21));
    expect(r).toHaveLength(0);
  });

  it("mascota sin registros: invita a hacer el primero", () => {
    const [r] = buildDailyLogReminders([{ id: 3, name: "Rocky", lastLogDate: null }], at(9));
    expect(r.message).toContain("Aún no tienes registros de Rocky");
  });
});
