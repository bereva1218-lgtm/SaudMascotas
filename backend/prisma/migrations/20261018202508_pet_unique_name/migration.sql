-- Agrega Pet.normalizedName (lower(trim(name))) y lo hace único por dueño.
-- Si existieran nombres duplicados por dueño, el CREATE UNIQUE INDEX fallaría sin modificar datos.
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "breed" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL,
    "avatar" TEXT NOT NULL,
    "condition" TEXT,
    "status" TEXT NOT NULL,
    "ownerId" INTEGER,
    CONSTRAINT "Pet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Pet" ("age", "avatar", "breed", "condition", "id", "name", "normalizedName", "ownerId", "status", "weight") SELECT "age", "avatar", "breed", "condition", "id", trim("name"), lower(trim("name")), "ownerId", "status", "weight" FROM "Pet";
DROP TABLE "Pet";
ALTER TABLE "new_Pet" RENAME TO "Pet";
CREATE UNIQUE INDEX "Pet_ownerId_normalizedName_key" ON "Pet"("ownerId", "normalizedName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
