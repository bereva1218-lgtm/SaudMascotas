-- CreateTable
CREATE TABLE "Vaccine" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "petId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "appliedDate" TEXT NOT NULL,
    "nextDoseDate" TEXT,
    "clinic" TEXT,
    "notes" TEXT,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "Vaccine_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "petId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "frequencyHours" INTEGER NOT NULL,
    "startAt" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "Medication_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MedicationDose" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "medicationId" INTEGER NOT NULL,
    "scheduledAt" TEXT NOT NULL,
    "administeredAt" TEXT NOT NULL,
    CONSTRAINT "MedicationDose_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Vaccine_petId_appliedDate_idx" ON "Vaccine"("petId", "appliedDate");

-- CreateIndex
CREATE INDEX "Medication_petId_idx" ON "Medication"("petId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationDose_medicationId_scheduledAt_key" ON "MedicationDose"("medicationId", "scheduledAt");
