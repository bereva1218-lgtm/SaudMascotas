import dotenv from "dotenv";

// Cargar variables de entorno ANTES de cualquier otra importación
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "./prisma";
import { generatePetRecommendation } from "./openai";
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

app.post("/pets", requireAuth, async (req: AuthRequest, res: Response) => {
  const { id, ...petData } = req.body;
  const pet = await prisma.pet.create({ data: { ...petData, ownerId: req.user!.id } });
  res.status(201).json({ ...pet, id: String(pet.id), ownerId: pet.ownerId ? String(pet.ownerId) : null });
});

app.patch("/pets/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { id: bodyId, ...data } = req.body;
  const existingPet = await prisma.pet.findUnique({ where: { id: Number(id) } });
  if (!existingPet || existingPet.ownerId !== req.user?.id) return res.status(404).json({ message: "Not found" });
  
  // Build update object with proper type conversions
  const updateData: any = {};
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.breed !== undefined) updateData.breed = data.breed;
  if (data.age !== undefined) updateData.age = Number(data.age);
  if (data.weight !== undefined) updateData.weight = Number(data.weight);
  if (data.avatar !== undefined) updateData.avatar = data.avatar;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.condition !== undefined) updateData.condition = data.condition;
  
  const pet = await prisma.pet.update({
    where: { id: Number(id) },
    data: updateData,
  });
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
  await prisma.pet.delete({ where: { id: Number(id) } });

  res.status(204).send();
});

app.get("/alerts", requireAuth, async (req: AuthRequest, res: Response) => {
  const alerts = await prisma.alert.findMany({
    where: {
      pet: {
        ownerId: req.user?.id,
      },
    },
    include: {
      pet: true,
    },
  });
  res.json(
    alerts.map((a) => ({
      ...a,
      id: String(a.id),
      petId: String(a.petId),
      petName: a.pet?.name ?? "",
    }))
  );
});

app.get("/alerts/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const alert = await prisma.alert.findUnique({
    where: { id: Number(req.params.id) },
    include: { pet: true },
  });
  if (!alert || alert.pet?.ownerId !== req.user?.id) return res.status(404).json({ message: "Not found" });
  res.json({
    ...alert,
    id: String(alert.id),
    petId: String(alert.petId),
    petName: alert.pet?.name ?? "",
  });
});

app.put("/alerts/:id/read", requireAuth, async (req, res) => {
  const alert = await prisma.alert.update({ where: { id: Number(req.params.id) }, data: { read: true } });
  res.json({ ...alert, id: String(alert.id), petId: String(alert.petId) });
});

app.get("/logs", requireAuth, async (req, res) => {
  const petId = req.query.petId ? Number(req.query.petId) : undefined;
  const where = petId ? { petId } : {};
  const logs = await prisma.dailyLog.findMany({ where });
  // parse stored JSON images field
  const out = logs.map((l) => ({ ...l, id: String(l.id), petId: String(l.petId), images: JSON.parse(l.images) }));
  res.json(out);
});

app.post("/logs", requireAuth, async (req, res) => {
  // convert images array to string for storage
  const {
    id,
    petId,
    appetite,
    energy,
    mood,
    waterIntake,
    sleep,
    mobility,
    images,
    ...rest
  } = req.body;

  const numericPetId = Number(petId);
  const data = {
    ...rest,
    petId: numericPetId,
    appetite: Number(appetite),
    energy: Number(energy),
    mood: Number(mood),
    waterIntake: Number(waterIntake),
    sleep: Number(sleep),
    mobility: Number(mobility),
    images: JSON.stringify(images ?? []),
  };

  const log = await prisma.dailyLog.create({ data });

  const minMetric = Math.min(data.appetite, data.energy, data.mood, data.waterIntake, data.sleep, data.mobility);
  let alertType: string | null = null;
  let alertMessage: string | null = null;

  if (minMetric <= 2) {
    alertType = "urgent";
    alertMessage = "Se detectó un estado crítico en los signos de tu mascota. Revisa su condición de inmediato.";
  } else if (minMetric === 3) {
    alertType = "preventive";
    alertMessage = "Se detectó una atención preventiva necesaria. Revisa los indicadores de tu mascota.";
  }

  if (alertType) {
    const pet = await prisma.pet.findUnique({ where: { id: numericPetId } });
    if (pet) {
      await prisma.alert.create({
        data: {
          petId: numericPetId,
          type: alertType,
          message: alertMessage!,
          date: new Date().toISOString(),
          read: false,
        },
      });
    }
  }

  res.status(201).json({ ...log, id: String(log.id), petId: String(log.petId), images: JSON.parse(log.images) });
});

// error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
