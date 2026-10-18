// Mismas reglas que backend/src/validation.ts; el servidor sigue siendo la fuente de verdad.

export const normalizePetName = (name: string) => name.trim().toLowerCase();

export function findDuplicatePetName<T extends { id: string; name: string }>(
  pets: T[],
  name: string,
  excludeId?: string
): T | undefined {
  const normalized = normalizePetName(name);
  return pets.find((pet) => pet.id !== excludeId && normalizePetName(pet.name) === normalized);
}

export const duplicatePetNameMessage = (name: string) => `Ya tienes una mascota llamada ${name.trim()}`;
