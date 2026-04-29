import { Agent, run } from "@openai/agents";

const agent = new Agent({
  name: "Pet care recommendation agent",
  instructions:
    "Analiza los datos de la mascota y su último registro de salud. Devuelve solo JSON válido con estas claves: recommendedCondition y careAdvice. recommendedCondition debe ser una frase corta en español que describa el estado actual de la mascota. careAdvice debe ser un párrafo corto con recomendaciones prácticas de cuidado.",
  model: "gpt-4o-mini",
});

export interface PetRecommendationRequest {
  name: string;
  breed: string;
  age: number;
  weight: number;
  condition?: string | null;
  status: string;
  latestLog?: {
    date: string;
    appetite: number;
    energy: number;
    mood: number;
    waterIntake: number;
    sleep: number;
    mobility: number;
    notes: string;
  };
}

export interface PetRecommendationResponse {
  recommendedCondition: string;
  careAdvice: string;
}

function ensureOpenAiKey(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required to generate pet recommendations. Set it in your environment before starting the backend."
    );
  }
}

export async function generatePetRecommendation(
  request: PetRecommendationRequest
): Promise<PetRecommendationResponse> {
  ensureOpenAiKey();

  const petInfoLines = [
    `Nombre: ${request.name}`,
    `Raza: ${request.breed}`,
    `Edad: ${request.age} años`,
    `Peso: ${request.weight} kg`,
    `Estado actual: ${request.status}`,
    `Condición diagnosticada: ${request.condition ?? "No hay condición registrada"}`,
  ];

  const logLines = request.latestLog
    ? [
        "Último registro de salud:",
        `Fecha: ${request.latestLog.date}`,
        `Apetito: ${request.latestLog.appetite}`,
        `Energía: ${request.latestLog.energy}`,
        `Ánimo: ${request.latestLog.mood}`,
        `Consumo de agua: ${request.latestLog.waterIntake}`,
        `Sueño: ${request.latestLog.sleep}`,
        `Movilidad: ${request.latestLog.mobility}`,
        `Notas: ${request.latestLog.notes}`,
      ]
    : ["No hay registro de salud reciente disponible."];

  const prompt = `Analiza estos datos de mascota y su último registro de salud. Responde solo con JSON válido usando las claves exactas recommendedCondition y careAdvice. ${petInfoLines.join("\n")}\n${logLines.join("\n")}`;

  const result = await run(agent, prompt);
  const rawOutput = (result.finalOutput || "").trim();

  try {
    return JSON.parse(rawOutput) as PetRecommendationResponse;
  } catch (error) {
    // Intenta extraer JSON de markdown code blocks (```json ... ```)
    let jsonMatch = rawOutput.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim()) as PetRecommendationResponse;
      } catch (e) {
        // Continúa intentando otras formas
      }
    }
    
    // Intenta extraer cualquier objeto JSON
    jsonMatch = rawOutput.match(/\{[\s\S]*\}$/);
    if (!jsonMatch) {
      throw new Error(`Respuesta no válida de OpenAI: ${rawOutput}`);
    }
    return JSON.parse(jsonMatch[0]) as PetRecommendationResponse;
  }
}
