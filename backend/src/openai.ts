import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

  const prompt = `Analiza estos datos de mascota y su último registro de salud. Responde SOLO con JSON válido usando las claves exactas "recommendedCondition" y "careAdvice", sin texto adicional. ${petInfoLines.join("\n")}\n${logLines.join("\n")}`;

  try {
    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres un asistente veterinario especializado en perros mayores. Analiza los datos y devuelve SOLO un JSON válido con las claves 'recommendedCondition' (una frase corta en español describiendo el estado) y 'careAdvice' (un párrafo con recomendaciones prácticas). No incluyas markdown ni explicaciones.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const rawOutput = (result.choices[0]?.message?.content || "").trim();
    console.log("[AI] Respuesta de OpenAI:", rawOutput);

    try {
      return JSON.parse(rawOutput) as PetRecommendationResponse;
    } catch (parseError) {
      console.log("[AI] Error al parsear JSON directo, intentando extraer...");

      let jsonMatch = rawOutput.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1].trim()) as PetRecommendationResponse;
          console.log("[AI] JSON extraído correctamente de markdown");
          return parsed;
        } catch (e) {
          console.log("[AI] Error al parsear JSON de markdown:", e);
        }
      }

      jsonMatch = rawOutput.match(/\{[\s\S]*\}$/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as PetRecommendationResponse;
          console.log("[AI] JSON extraído correctamente del texto");
          return parsed;
        } catch (e) {
          console.log("[AI] Error al parsear JSON del texto:", e);
        }
      }

      throw new Error(`Respuesta no válida de OpenAI: ${rawOutput}`);
    }
  } catch (error) {
    console.error("[AI] Error al generar recomendación:", error);
    throw error;
  }
}
