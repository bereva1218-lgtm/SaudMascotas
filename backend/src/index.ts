import dotenv from "dotenv";

// Cargar variables de entorno ANTES de cualquier otra importación
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Alert, Prisma } from "@prisma/client";
import prisma from "./prisma";
import { normalizePetName, findDuplicatePetName, duplicatePetNameMessage } from "./validation";
import { todayInAppTimeZone } from "./dates";
import {
  parseLogInput,
  toLogResponse,
  findLogForDay,
  createDailyLog,
  updateDailyLog,
  DuplicateDailyLogError,
  duplicateLogMessage,
} from "./dailyLogs";
import { evaluatePetAlerts } from "./alerts";
import { getRemindersForOwner } from "./reminders";
import { PURCHASE_CATEGORIES, parsePurchaseInput, toPurchaseResponse } from "./purchases";
import { generatePetRecommendation, generateChatResponse } from "./openai";
import "express-async-errors";

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

interface AuthRequest extends Request {
  user?: { id: number; email: string; name: string; role: string };
}

// middleware to parse token if present
const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      req.user = { id: payload.id, email: payload.email, name: payload.name, role: payload.role };
    } catch (e) {
      // ignore invalid token; requireAuth will reject later
    }
  }
  next();
};

const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  next();
};

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));
app.use(authenticate);

// seed demo user/data if database is empty
async function seed() {
  const count = await prisma.user.count();
  if (count === 0) {
    const hash = await bcrypt.hash("password", 10);
    const user = await prisma.user.create({
      data: { email: "demo@example.com", password: hash, name: "Demo Usuario", role: "cuidador" },
    });
    await prisma.pet.createMany({
      data: [
        {
          name: "Max",
          normalizedName: "max",
          breed: "Labrador Retriever",
          age: 11,
          weight: 30,
          avatar: "/dog-avatar-1.webp",
          condition: "Artritis leve",
          status: "stable",
          ownerId: user.id,
        },
        {
          name: "Luna",
          normalizedName: "luna",
          breed: "Beagle",
          age: 13,
          weight: 12,
          avatar: "/dog-avatar-2.webp",
          condition: "Insuficiencia renal",
          status: "observation",
          ownerId: user.id,
        },
      ],
    });
    // logs and alerts could also be seeded similarly
  }
}

seed().catch(console.error);

// auth routes
app.post("/auth/register", async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) return res.status(400).json({ message: "Missing fields" });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ message: "Email already in use" });
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, password: hash, name, role: role || "cuidador" } });
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });
  res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// protected resources
app.get("/pets", requireAuth, async (req: AuthRequest, res: Response) => {
  // el estado (stable/observation/alert) se mantiene al evaluar las alertas tras cada registro
  const pets = await prisma.pet.findMany({ where: { ownerId: req.user?.id } });
  res.json(
    pets.map((p) => ({
      ...p,
      id: String(p.id),
      ownerId: p.ownerId ? String(p.ownerId) : null,
    }))
  );
});

app.get("/pets/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const pet = await prisma.pet.findUnique({ where: { id: Number(req.params.id) } });
  if (!pet || pet.ownerId !== req.user?.id) return res.status(404).json({ message: "Not found" });
  res.json({ ...pet, id: String(pet.id), ownerId: pet.ownerId ? String(pet.ownerId) : null });
});

// Devuelve la mascota del dueño que ya usa ese nombre (ignorando mayúsculas y espacios), si existe.
const findOwnerPetWithName = async (ownerId: number, name: string, excludeId?: number) => {
  const pets = await prisma.pet.findMany({ where: { ownerId }, select: { id: true, name: true } });
  return findDuplicatePetName(pets, name, excludeId);
};

const isUniqueConstraintError = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

app.post("/pets", requireAuth, async (req: AuthRequest, res: Response) => {
  const { id, normalizedName, ...petData } = req.body;
  const name = typeof petData.name === "string" ? petData.name.trim() : "";
  if (!name) return res.status(400).json({ message: "El nombre de la mascota es obligatorio" });

  const duplicate = await findOwnerPetWithName(req.user!.id, name);
  if (duplicate) return res.status(409).json({ message: duplicatePetNameMessage(duplicate.name) });

  try {
    const pet = await prisma.pet.create({
      data: { ...petData, name, normalizedName: normalizePetName(name), ownerId: req.user!.id },
    });
    res.status(201).json({ ...pet, id: String(pet.id), ownerId: pet.ownerId ? String(pet.ownerId) : null });
  } catch (e) {
    // otra petición pudo registrar el mismo nombre entre la validación y la inserción
    if (isUniqueConstraintError(e)) return res.status(409).json({ message: duplicatePetNameMessage(name) });
    throw e;
  }
});

app.patch("/pets/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { id: bodyId, ...data } = req.body;
  const existingPet = await prisma.pet.findUnique({ where: { id: Number(id) } });
  if (!existingPet || existingPet.ownerId !== req.user?.id) return res.status(404).json({ message: "Not found" });
  
  // Build update object with proper type conversions
  const updateData: any = {};
  
  if (data.name !== undefined) {
    const name = typeof data.name === "string" ? data.name.trim() : "";
    if (!name) return res.status(400).json({ message: "El nombre de la mascota es obligatorio" });
    const duplicate = await findOwnerPetWithName(req.user!.id, name, existingPet.id);
    if (duplicate) return res.status(409).json({ message: duplicatePetNameMessage(duplicate.name) });
    updateData.name = name;
    updateData.normalizedName = normalizePetName(name);
  }
  if (data.breed !== undefined) updateData.breed = data.breed;
  if (data.age !== undefined) updateData.age = Number(data.age);
  if (data.weight !== undefined) updateData.weight = Number(data.weight);
  if (data.avatar !== undefined) updateData.avatar = data.avatar;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.condition !== undefined) updateData.condition = data.condition;
  
  let pet;
  try {
    pet = await prisma.pet.update({
      where: { id: Number(id) },
      data: updateData,
    });
  } catch (e) {
    if (isUniqueConstraintError(e)) return res.status(409).json({ message: duplicatePetNameMessage(updateData.name) });
    throw e;
  }
  res.json({ ...pet, id: String(pet.id), ownerId: pet.ownerId ? String(pet.ownerId) : null });
});

app.patch("/pets/:id/recommendation", requireAuth, async (req: AuthRequest, res: Response) => {
  const petId = Number(req.params.id);
  const pet = await prisma.pet.findUnique({ where: { id: petId } });
  if (!pet || pet.ownerId !== req.user?.id) return res.status(404).json({ message: "Not found" });

  const latestLog = await prisma.dailyLog.findFirst({
    where: { petId },
    orderBy: { date: "desc" },
  });

  const recommendation = await generatePetRecommendation({
    name: pet.name,
    breed: pet.breed,
    age: pet.age,
    weight: pet.weight,
    condition: pet.condition,
    status: pet.status,
    latestLog: latestLog
      ? {
          date: latestLog.date,
          appetite: latestLog.appetite,
          energy: latestLog.energy,
          mood: latestLog.mood,
          waterIntake: latestLog.waterIntake,
          sleep: latestLog.sleep,
          mobility: latestLog.mobility,
          notes: latestLog.notes,
        }
      : undefined,
  });

  const updatedPet = await prisma.pet.update({
    where: { id: petId },
    data: { condition: recommendation.recommendedCondition },
  });

  res.json({
    ...updatedPet,
    id: String(updatedPet.id),
    ownerId: updatedPet.ownerId ? String(updatedPet.ownerId) : null,
    advice: recommendation.careAdvice,
  });
});

app.delete("/pets/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const existingPet = await prisma.pet.findUnique({ where: { id: Number(id) } });
  if (!existingPet || existingPet.ownerId !== req.user?.id) return res.status(404).json({ message: "Not found" });

  // Remove related logs and alerts before deleting the pet to avoid foreign key constraint errors
  await prisma.dailyLog.deleteMany({ where: { petId: Number(id) } });
  await prisma.alert.deleteMany({ where: { petId: Number(id) } });
  await prisma.purchase.deleteMany({ where: { petId: Number(id) } });
  await prisma.pet.delete({ where: { id: Number(id) } });

  res.status(204).send();
});

// Sin el objeto `pet` completo (su avatar puede ser una imagen pesada en base64)
const toAlertResponse = ({ pet, ...a }: Alert & { pet: { name: string } | null }) => ({
  ...a,
  id: String(a.id),
  petId: String(a.petId),
  petName: pet?.name ?? "",
});

app.get("/alerts", requireAuth, async (req: AuthRequest, res: Response) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const alerts = await prisma.alert.findMany({
    where: {
      pet: {
        ownerId: req.user?.id,
      },
      ...(status ? { status } : {}),
    },
    include: {
      pet: { select: { name: true } },
    },
    // activas primero ("active" < "resolved"), luego las más recientes
    orderBy: [{ status: "asc" }, { id: "desc" }],
  });
  res.json(alerts.map(toAlertResponse));
});

app.get("/alerts/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const alert = await prisma.alert.findUnique({
    where: { id: Number(req.params.id) },
    include: { pet: { select: { name: true, ownerId: true } } },
  });
  if (!alert || alert.pet?.ownerId !== req.user?.id) return res.status(404).json({ message: "Not found" });
  res.json(toAlertResponse(alert));
});

app.put("/alerts/:id/read", requireAuth, async (req: AuthRequest, res: Response) => {
  const existing = await prisma.alert.findUnique({
    where: { id: Number(req.params.id) },
    include: { pet: { select: { ownerId: true } } },
  });
  if (!existing || existing.pet.ownerId !== req.user?.id) return res.status(404).json({ message: "Not found" });
  const alert = await prisma.alert.update({
    where: { id: existing.id },
    data: { read: true },
    include: { pet: { select: { name: true } } },
  });
  res.json(toAlertResponse(alert));
});

// Mascota del usuario autenticado, o null si no existe o es de otro dueño.
const findOwnedPet = async (petId: number, ownerId: number) => {
  if (!Number.isInteger(petId)) return null;
  const pet = await prisma.pet.findUnique({ where: { id: petId } });
  return pet && pet.ownerId === ownerId ? pet : null;
};

app.get("/logs", requireAuth, async (req: AuthRequest, res: Response) => {
  const petId = req.query.petId ? Number(req.query.petId) : undefined;
  // solo los registros de las mascotas del usuario
  const logs = await prisma.dailyLog.findMany({
    where: { ...(petId ? { petId } : {}), pet: { ownerId: req.user!.id } },
  });
  res.json(logs.map(toLogResponse));
});

// Registro de hoy (zona horaria de la app) para una mascota; `log` es null si aún no existe.
app.get("/logs/today", requireAuth, async (req: AuthRequest, res: Response) => {
  const pet = await findOwnedPet(Number(req.query.petId), req.user!.id);
  if (!pet) return res.status(404).json({ message: "Mascota no encontrada" });
  const date = todayInAppTimeZone();
  const log = await findLogForDay(pet.id, date);
  res.json({ date, log: log ? toLogResponse(log) : null });
});

app.post("/logs", requireAuth, async (req: AuthRequest, res: Response) => {
  const pet = await findOwnedPet(Number(req.body.petId), req.user!.id);
  if (!pet) return res.status(404).json({ message: "Mascota no encontrada" });
  const { input, error } = parseLogInput(req.body);
  if (!input) return res.status(400).json({ message: error });

  // la fecha la decide el servidor para que "hoy" sea siempre el día en Bogotá
  let log;
  try {
    log = await createDailyLog(pet.id, todayInAppTimeZone(), input);
  } catch (e) {
    if (e instanceof DuplicateDailyLogError) {
      return res.status(409).json({ message: duplicateLogMessage(pet.name), log: toLogResponse(e.existing) });
    }
    throw e;
  }

  await evaluatePetAlerts(pet.id);
  res.status(201).json(toLogResponse(log));
});

app.put("/logs/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const existing = await prisma.dailyLog.findUnique({ where: { id: Number(req.params.id) }, include: { pet: true } });
  if (!existing || existing.pet.ownerId !== req.user!.id) return res.status(404).json({ message: "Registro no encontrado" });
  const { input, error } = parseLogInput(req.body);
  if (!input) return res.status(400).json({ message: error });

  const log = await updateDailyLog(existing.id, input);
  // al editar puede aparecer, cambiar de nivel o resolverse una alerta
  await evaluatePetAlerts(existing.petId);
  res.json(toLogResponse(log));
});

// ---------- Compras ----------

// Compra del usuario autenticado, o null si no existe o es de otro dueño
const findOwnedPurchase = async (id: number, ownerId: number) => {
  if (!Number.isInteger(id)) return null;
  const purchase = await prisma.purchase.findUnique({ where: { id }, include: { pet: { select: { ownerId: true } } } });
  return purchase && purchase.pet.ownerId === ownerId ? purchase : null;
};

app.get("/purchases", requireAuth, async (req: AuthRequest, res: Response) => {
  const petId = req.query.petId ? Number(req.query.petId) : undefined;
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  if (category && !PURCHASE_CATEGORIES.includes(category as any)) {
    return res.status(400).json({ message: "Categoría no válida" });
  }
  const purchases = await prisma.purchase.findMany({
    where: {
      pet: { ownerId: req.user!.id },
      ...(petId ? { petId } : {}),
      ...(category ? { category } : {}),
    },
    include: { pet: { select: { name: true } } },
    orderBy: [{ purchaseDate: "desc" }, { id: "desc" }],
  });
  res.json(purchases.map(toPurchaseResponse));
});

app.post("/purchases", requireAuth, async (req: AuthRequest, res: Response) => {
  const pet = await findOwnedPet(Number(req.body.petId), req.user!.id);
  if (!pet) return res.status(404).json({ message: "Mascota no encontrada" });
  const { input, error } = parsePurchaseInput(req.body);
  if (!input) return res.status(400).json({ message: error });

  const purchase = await prisma.purchase.create({
    data: { ...input, images: JSON.stringify(input.images), petId: pet.id, createdAt: new Date().toISOString() },
    include: { pet: { select: { name: true } } },
  });
  res.status(201).json(toPurchaseResponse(purchase));
});

app.put("/purchases/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const existing = await findOwnedPurchase(Number(req.params.id), req.user!.id);
  if (!existing) return res.status(404).json({ message: "Compra no encontrada" });
  // se puede cambiar la mascota asociada, siempre que también sea del usuario
  const pet = await findOwnedPet(Number(req.body.petId ?? existing.petId), req.user!.id);
  if (!pet) return res.status(404).json({ message: "Mascota no encontrada" });
  const { input, error } = parsePurchaseInput(req.body);
  if (!input) return res.status(400).json({ message: error });

  const purchase = await prisma.purchase.update({
    where: { id: existing.id },
    data: { ...input, images: JSON.stringify(input.images), petId: pet.id },
    include: { pet: { select: { name: true } } },
  });
  res.json(toPurchaseResponse(purchase));
});

app.delete("/purchases/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const existing = await findOwnedPurchase(Number(req.params.id), req.user!.id);
  if (!existing) return res.status(404).json({ message: "Compra no encontrada" });
  await prisma.purchase.delete({ where: { id: existing.id } });
  res.status(204).send();
});

// Recordatorios pendientes del usuario (por ahora: registros diarios sin hacer)
app.get("/reminders", requireAuth, async (req: AuthRequest, res: Response) => {
  res.json(await getRemindersForOwner(req.user!.id));
});

// Chat endpoint
app.post("/chat", requireAuth, async (req: AuthRequest, res: Response) => {
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ message: "Message is required" });
  }

  try {
    // Get all pets for the user
    const pets = await prisma.pet.findMany({
      where: { ownerId: req.user?.id },
    });

    // Get latest log for each pet
    const petsWithLogs = await Promise.all(
      pets.map(async (pet) => {
        const latestLog = await prisma.dailyLog.findFirst({
          where: { petId: pet.id },
          orderBy: { date: "desc" },
        });

        return {
          id: pet.id,
          name: pet.name,
          breed: pet.breed,
          age: pet.age,
          weight: pet.weight,
          condition: pet.condition,
          status: pet.status,
          latestLog: latestLog
            ? {
                date: latestLog.date,
                appetite: latestLog.appetite,
                energy: latestLog.energy,
                mood: latestLog.mood,
                waterIntake: latestLog.waterIntake,
                sleep: latestLog.sleep,
                mobility: latestLog.mobility,
                notes: latestLog.notes,
              }
            : undefined,
        };
      })
    );

    // Generate chat response
    const chatResponse = await generateChatResponse({
      message,
      pets: petsWithLogs,
    });

    res.json(chatResponse);
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ message: "Error generating response" });
  }
});

// error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
