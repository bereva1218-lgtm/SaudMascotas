#!/usr/bin/env node

console.log("=== VERIFICACIÓN DE CONFIGURACIÓN ===\n");

// Verificar variables de entorno
console.log("1. Variables de entorno cargadas:");
console.log("   - OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "✓ Configurada" : "✗ NO CONFIGURADA");
console.log("   - DATABASE_URL:", process.env.DATABASE_URL ? "✓ Configurada" : "✗ NO CONFIGURADA");
console.log("   - JWT_SECRET:", process.env.JWT_SECRET ? "✓ Configurada" : "✗ NO CONFIGURADA");
console.log("   - PORT:", process.env.PORT || "4000 (default)");

// Verificar si OpenAI está instalado
console.log("\n2. Dependencias:");
try {
  require("openai");
  console.log("   - openai: ✓ Instalado");
} catch {
  console.log("   - openai: ✗ NO INSTALADO");
}

try {
  require("@prisma/client");
  console.log("   - @prisma/client: ✓ Instalado");
} catch {
  console.log("   - @prisma/client: ✗ NO INSTALADO");
}

// Verificar formato de API key
if (process.env.OPENAI_API_KEY) {
  const key = process.env.OPENAI_API_KEY;
  console.log("\n3. Validación de API key:");
  console.log("   - Comienza con 'sk-':", key.startsWith("sk-") ? "✓ Sí" : "✗ No");
  console.log("   - Longitud:", key.length);
} else {
  console.log("\n3. ⚠️ OPENAI_API_KEY no está configurada");
  console.log("   Agrega en tu .env:");
  console.log("   OPENAI_API_KEY=tu_clave_aqui");
}

console.log("\n=== FIN DE VERIFICACIÓN ===");
