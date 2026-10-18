-- Alertas inteligentes: métrica, nivel, recomendación, línea base y estado (activa/resuelta).
-- Las alertas anteriores no tienen métrica: se conservan y se marcan como resueltas.
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Alert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "petId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metric" TEXT,
    "level" TEXT,
    "recommendation" TEXT,
    "baseline" REAL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "updatedAt" TEXT,
    "resolvedAt" TEXT,
    CONSTRAINT "Alert_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Alert" ("date", "id", "message", "petId", "read", "type", "status", "resolvedAt") SELECT "date", "id", "message", "petId", "read", "type", 'resolved', strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM "Alert";
DROP TABLE "Alert";
ALTER TABLE "new_Alert" RENAME TO "Alert";
CREATE INDEX "Alert_petId_metric_status_idx" ON "Alert"("petId", "metric", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
