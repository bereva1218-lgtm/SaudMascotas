import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { evaluatePetAlerts } from "../src/alerts";

// Base SQLite temporal con las migraciones reales; no toca dev.db.
const DB_FILE = path.join(__dirname, "..", "prisma", "test-alerts.db");
const DB_URL = `file:${DB_FILE}`;
let db: PrismaClient;
let petId: number;
let day = 0;

// Agrega el registro del día siguiente (todas las métricas en 4 salvo las indicadas)
const addLog = (values: Record<string, number> = {}) => {
  const date = new Date(Date.parse("2026-10-01T00:00:00Z") + day++ * 86_400_000).toISOString().slice(0, 10);
  return db.dailyLog.create({
    data: {
      petId, date, notes: "", images: "[]",
      appetite: 4, energy: 4, mood: 4, waterIntake: 4, sleep: 4, mobility: 4,
      ...values,
    },
  });
};
const activeAppetiteAlerts = () => db.alert.findMany({ where: { petId, metric: "appetite", status: "active" } });

beforeAll(async () => {
  fs.rmSync(DB_FILE, { force: true });
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: DB_URL }, stdio: "ignore" });
  db = new PrismaClient({ datasourceUrl: DB_URL });
  const user = await db.user.create({ data: { email: "a@t.co", password: "x", name: "T" } });
  const pet = await db.pet.create({
    data: { name: "Luna", normalizedName: "luna", breed: "b", age: 1, weight: 1, avatar: "/x", status: "stable", ownerId: user.id, condition: "Artritis" },
  });
  petId = pet.id;
  for (let i = 0; i < 5; i++) await addLog();
}, 60_000);

afterAll(async () => {
  await db?.$disconnect();
  fs.rmSync(DB_FILE, { force: true });
  fs.rmSync(`${DB_FILE}-journal`, { force: true });
});

describe("evaluatePetAlerts", () => {
  it("historial normal: sin alertas y mascota estable", async () => {
    const result = await evaluatePetAlerts(petId, db);
    expect(result?.status).toBe("stable");
    expect(await db.alert.count()).toBe(0);
  });

  it("1 día bajo crea una alerta de precaución con explicación y recomendación", async () => {
    await addLog({ appetite: 3 });
    const result = await evaluatePetAlerts(petId, db);
    const [alert] = await activeAppetiteAlerts();
    expect(alert).toMatchObject({ level: "precaucion", type: "preventive", baseline: 4, read: false });
    expect(alert.message).toContain("Tu mascota Luna registró apetito bajo");
    expect(alert.recommendation).toContain("Ten en cuenta su condición registrada: Artritis.");
    expect(result?.status).toBe("observation");
  });

  it("evaluar de nuevo no duplica la alerta", async () => {
    await evaluatePetAlerts(petId, db);
    await evaluatePetAlerts(petId, db);
    expect(await activeAppetiteAlerts()).toHaveLength(1);
  });

  it("al llegar a 3 días bajos la misma alerta sube a nivel alerta y vuelve a no leída", async () => {
    const [before] = await activeAppetiteAlerts();
    await db.alert.update({ where: { id: before.id }, data: { read: true } });
    await addLog({ appetite: 3 });
    await addLog({ appetite: 3 });
    const result = await evaluatePetAlerts(petId, db);
    const active = await activeAppetiteAlerts();
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({ id: before.id, level: "alerta", type: "urgent", read: false });
    expect(active[0].message).toContain("3 días seguidos con apetito bajo");
    expect(result?.status).toBe("alert");
  });

  it("si el apetito se recupera, la alerta se resuelve y la mascota vuelve a estable", async () => {
    await addLog({ appetite: 4 });
    const result = await evaluatePetAlerts(petId, db);
    expect(await activeAppetiteAlerts()).toHaveLength(0);
    const resolved = await db.alert.findFirst({ where: { petId, metric: "appetite" } });
    expect(resolved).toMatchObject({ status: "resolved" });
    expect(resolved?.resolvedAt).toBeTruthy();
    expect(result?.status).toBe("stable");
    expect((await db.pet.findUnique({ where: { id: petId } }))?.status).toBe("stable");
  });

  it("un nuevo descenso después de resolverse crea una alerta nueva", async () => {
    await addLog({ appetite: 2 });
    await evaluatePetAlerts(petId, db);
    expect(await activeAppetiteAlerts()).toHaveLength(1);
    expect(await db.alert.count({ where: { petId, metric: "appetite" } })).toBe(2);
  });
});
