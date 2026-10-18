-- Un solo registro diario por mascota y fecha.
-- Si existieran duplicados, este índice fallaría sin modificar datos;
-- verificar antes con: SELECT petId, date, COUNT(*) FROM DailyLog GROUP BY petId, date HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX "DailyLog_petId_date_key" ON "DailyLog"("petId", "date");
