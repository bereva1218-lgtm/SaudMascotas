import { describe, it, expect } from "vitest";
import { normalizePetName, findDuplicatePetName, duplicatePetNameMessage } from "../src/validation";

describe("normalizePetName", () => {
  it("ignora mayúsculas y espacios en los extremos", () => {
    expect(normalizePetName("Luna")).toBe("luna");
    expect(normalizePetName("luna ")).toBe("luna");
    expect(normalizePetName("  LUNA")).toBe("luna");
  });
});

describe("findDuplicatePetName", () => {
  const pets = [
    { id: 1, name: "Luna" },
    { id: 2, name: "Max" },
  ];

  it("detecta un nombre repetido con distinta escritura", () => {
    expect(findDuplicatePetName(pets, "LUNA ")).toEqual({ id: 1, name: "Luna" });
  });

  it("permite nombres distintos", () => {
    expect(findDuplicatePetName(pets, "Rocky")).toBeUndefined();
  });

  it("excluye a la propia mascota al editar", () => {
    expect(findDuplicatePetName(pets, "luna", 1)).toBeUndefined();
  });

  it("detecta el choque al renombrar con el nombre de otra mascota", () => {
    expect(findDuplicatePetName(pets, "max", 1)).toEqual({ id: 2, name: "Max" });
  });
});

describe("duplicatePetNameMessage", () => {
  it("genera un mensaje claro", () => {
    expect(duplicatePetNameMessage(" Luna ")).toBe("Ya tienes una mascota llamada Luna");
  });
});
