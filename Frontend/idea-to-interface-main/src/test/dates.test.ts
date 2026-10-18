import { greetingFor, todayInAppTimeZone, hourInAppTimeZone } from "@/lib/dates";

describe("fechas y saludo en hora de Colombia", () => {
  it("a las 3:47 p. m. en Bogotá saluda con 'Buenas tardes'", () => {
    // 20:47 UTC = 15:47 en Bogotá
    const now = new Date("2026-10-18T20:47:00Z");
    expect(hourInAppTimeZone(now)).toBe(15);
    expect(greetingFor(now)).toBe("Buenas tardes");
  });

  it("mañana y noche", () => {
    expect(greetingFor(new Date("2026-10-18T13:00:00Z"))).toBe("Buenos días"); // 8 a. m.
    expect(greetingFor(new Date("2026-10-19T01:30:00Z"))).toBe("Buenas noches"); // 8:30 p. m.
    expect(greetingFor(new Date("2026-10-19T08:00:00Z"))).toBe("Buenas noches"); // 3 a. m.
  });

  it("la fecha de 'hoy' es la de Bogotá aunque en UTC ya sea el día siguiente", () => {
    expect(todayInAppTimeZone(new Date("2026-10-19T02:00:00Z"))).toBe("2026-10-18");
  });
});
