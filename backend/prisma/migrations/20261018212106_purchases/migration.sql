-- CreateTable
CREATE TABLE "Purchase" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "petId" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "purchaseDate" TEXT NOT NULL,
    "price" INTEGER,
    "notes" TEXT,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "Purchase_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Purchase_petId_purchaseDate_idx" ON "Purchase"("petId", "purchaseDate");
