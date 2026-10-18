import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import {
  createDailyLog,
  updateDailyLog,
  findLogForDay,
  parseLogInput,
  DuplicateDailyLogError,
  duplicateLogMessage,
  LogInput,
} from "../src/dailyLogs";

// Base SQLite temporaria con las migraciones reales; no toca dev.db.
const DB_FILE = path.join(__dirname, "..", "prisma", "test-dailylogs.db");
const DB_URL = `file:${DB_FILE}`;
let db: PrismaClient;
let petId: number;

const input = (overrides: Partial<LogInput> = {}): LogInput => ({
  appetite: 4, energy: 4, mood: 4, waterIntake: 4, sleep: 4, mobility: 4, notes: "", images: [],
  ...overrides,
});

beforeAll(async () => {
  fs.rmSync(DB_FILE, { force: true });
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: DB_URL }, stdio: "ignore" });
  db = new PrismaClient({ datasourceUrl: DB_URL });
  const user = await db.user.create({ data: { email: "t@t.co", password: "x", name: "T" } });
  const pet = await db.pet.create({
    data: { name: "Luna", normalizedName: "luna", breed: "b", age: 1, weight: 1, avatar: "/x", status: "stable", ownerId: user.id },
  });
  petId = pet.id;
}, 60_000);

afterAll(async () => {
  await db?.$disconnect();
  fs.rmSync(DB_FILE, { force: true });
  fs.rmSync(`${DB_FILE}-journal`, { force: true });
});

describe("un solo registro por mascota y día", () => {
  it("crea el primer registro del día", async () => {
    const log = await createDailyLog(petId, "2026-10-18", input(), db);
    expect(log.date).toBe("2026-10-18");
  });

  it("rechaza un segundo registro el mismo día y devuelve el existente", async () => {
    const err = await createDailyLog(petId, "2026-10-18", input({ appetite: 1 }), db).catch((e) => e);
    expect(err).toBeInstanceOf(DuplicateDailyLogError);
    expect((err as DuplicateDailyLogError).existing.appetite).toBe(4);
    expect(await db.dailyLog.count({ where: { petId } })).toBe(1);
  });

  it("la base de datos también lo impide si se salta la validación", async () => {
    const raw = db.dailyLog.create({ data: { ...input(), images: "[]", petId, date: "2026-10-18" } });
    await expect(raw).rejects.toMatchObject({ code: "P2002" });
  });

  it("permite registrar otro día", async () => {
    await createDailyLog(petId, "2026-10-19", input(), db);
    expect(await db.dailyLog.count({ where: { petId } })).toBe(2);
  });

  it("editar el registro del día conserva la fecha y actualiza los valores", async () => {
    const existing = (await findLogForDay(petId, "2026-10-18", db))!;
    const updated = await updateDailyLog(existing.id, input({ appetite: 2, notes: "comió poco" }), db);
    expect(updated).toMatchObject({ date: "2026-10-18", appetite: 2, notes: "comió poco" });
  });

  it("genera el aviso para el usuario", () => {
    expect(duplicateLogMessage("Luna")).toBe("Ya registraste hoy a Luna; puedes editarlo");
  });
});

describe("parseLogInput", () => {
  it("rechaza indicadores fuera de 1 a 5", () => {
    expect(parseLogInput({ ...input(), sleep: 0 }).error).toMatch(/entre 1 y 5/);
    expect(parseLogInput({ ...input(), mood: 6 }).error).toMatch(/entre 1 y 5/);
    expect(parseLogInput({ ...input(), energy: "abc" }).error).toBeDefined();
  });

  it("acepta valores válidos enviados como texto", () => {
    expect(parseLogInput({ ...input(), appetite: "3" }).input?.appetite).toBe(3);
  });
});
