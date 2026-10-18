-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Purchase" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "petId" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "purchaseDate" TEXT NOT NULL,
    "price" INTEGER,
    "notes" TEXT,
    "images" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "Purchase_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Purchase" ("category", "createdAt", "id", "itemName", "notes", "petId", "price", "purchaseDate") SELECT "category", "createdAt", "id", "itemName", "notes", "petId", "price", "purchaseDate" FROM "Purchase";
DROP TABLE "Purchase";
ALTER TABLE "new_Purchase" RENAME TO "Purchase";
CREATE INDEX "Purchase_petId_purchaseDate_idx" ON "Purchase"("petId", "purchaseDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
