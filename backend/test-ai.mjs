#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config();

import { generatePetRecommendation } from "./dist/openai.js";

async function test() {
  try {
    console.log("🧪 Testing AI recommendation generation...\n");
    
    const result = await generatePetRecommendation({
      name: "Max",
      breed: "Labrador Retriever",
      age: 11,
      weight: 30,
      condition: "Artritis leve",
      status: "stable",
      latestLog: {
        date: new Date().toISOString().split("T")[0],
        appetite: 7,
        energy: 5,
        mood: 7,
        waterIntake: 8,
        sleep: 6,
        mobility: 4,
        notes: "Muestra dolor en las patas traseras después de ejercicio",
      },
    });

    console.log("✅ ¡ÉXITO! Recomendación generada:\n");
    console.log("Condición recomendada:", result.recommendedCondition);
    console.log("\nConsejo de cuidado:");
    console.log(result.careAdvice);
  } catch (error) {
    console.error("❌ Error al generar recomendación:");
    console.error(error);
    process.exit(1);
  }
}

test();
