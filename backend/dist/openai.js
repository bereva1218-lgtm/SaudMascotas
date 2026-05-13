"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePetRecommendation = generatePetRecommendation;
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
function ensureOpenAiKey() {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is required to generate pet recommendations. Set it in your environment before starting the backend.");
    }
}
async function generatePetRecommendation(request) {
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
                    content: "Eres un asistente veterinario especializado en perros mayores. Analiza los datos y devuelve SOLO un JSON válido con las claves 'recommendedCondition' (una frase corta en español describiendo el estado) y 'careAdvice' (un párrafo con recomendaciones prácticas). No incluyas markdown ni explicaciones.",
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
            return JSON.parse(rawOutput);
        }
        catch (parseError) {
            console.log("[AI] Error al parsear JSON directo, intentando extraer...");
            let jsonMatch = rawOutput.match(/```json\s*([\s\S]*?)```/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[1].trim());
                    console.log("[AI] JSON extraído correctamente de markdown");
                    return parsed;
                }
                catch (e) {
                    console.log("[AI] Error al parsear JSON de markdown:", e);
                }
            }
            jsonMatch = rawOutput.match(/\{[\s\S]*\}$/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    console.log("[AI] JSON extraído correctamente del texto");
                    return parsed;
                }
                catch (e) {
                    console.log("[AI] Error al parsear JSON del texto:", e);
                }
            }
            throw new Error(`Respuesta no válida de OpenAI: ${rawOutput}`);
        }
    }
    catch (error) {
        console.error("[AI] Error al generar recomendación:", error);
        throw error;
    }
}
