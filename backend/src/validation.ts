// Reglas de validación compartidas por las rutas.

// "Luna", "luna " y "LUNA" producen el mismo valor normalizado.
export const normalizePetName = (name: string) => name.trim().toLowerCase();

// Busca otra mascota del mismo dueño con el mismo nombre normalizado.
// `excludeId` permite ignorar a la propia mascota al editarla.
export function findDuplicatePetName<T extends { id: number; name: string }>(
  pets: T[],
  name: string,
  excludeId?: number
): T | undefined {
  const normalized = normalizePetName(name);
  return pets.find((pet) => pet.id !== excludeId && normalizePetName(pet.name) === normalized);
}

export const duplicatePetNameMessage = (name: string) => `Ya tienes una mascota llamada ${name.trim()}`;
