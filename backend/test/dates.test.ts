import { describe, it, expect } from "vitest";
import { dateInTimeZone, todayInAppTimeZone } from "../src/dates";

describe("fecha en America/Bogota", () => {
  it("a las 9 p. m. en Bogotá sigue siendo el mismo día aunque en UTC ya sea el siguiente", () => {
    // 2026-10-19 02:00 UTC = 2026-10-18 21:00 en Bogotá (UTC-5)
    expect(todayInAppTimeZone(new Date("2026-10-19T02:00:00Z"))).toBe("2026-10-18");
  });

  it("cambia de día a medianoche de Bogotá", () => {
    expect(todayInAppTimeZone(new Date("2026-10-19T04:59:59Z"))).toBe("2026-10-18");
    expect(todayInAppTimeZone(new Date("2026-10-19T05:00:00Z"))).toBe("2026-10-19");
  });

  it("usa formato YYYY-MM-DD", () => {
    expect(dateInTimeZone(new Date("2026-01-05T12:00:00Z"))).toBe("2026-01-05");
  });
});
