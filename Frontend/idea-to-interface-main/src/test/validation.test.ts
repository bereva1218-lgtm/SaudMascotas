import { findDuplicatePetName, duplicatePetNameMessage, normalizePetName } from "@/lib/validation";
import { ApiError } from "@/lib/api";

describe("validación de nombre de mascota", () => {
  const pets = [
    { id: "1", name: "Luna" },
    { id: "2", name: "Max" },
  ];

  it("trata 'Luna', 'luna ' y 'LUNA' como el mismo nombre", () => {
    expect(normalizePetName("Luna")).toBe(normalizePetName("luna "));
    expect(normalizePetName("LUNA")).toBe(normalizePetName(" luna"));
    expect(findDuplicatePetName(pets, " LUNA ")?.id).toBe("1");
  });

  it("no marca como duplicada a la propia mascota al editar", () => {
    expect(findDuplicatePetName(pets, "luna", "1")).toBeUndefined();
    expect(findDuplicatePetName(pets, "MAX", "1")?.id).toBe("2");
  });

  it("muestra el mensaje esperado", () => {
    expect(duplicatePetNameMessage("Luna")).toBe("Ya tienes una mascota llamada Luna");
  });
});

describe("ApiError", () => {
  it("usa el mensaje que envía el servidor", () => {
    const err = new ApiError(409, JSON.stringify({ message: "Ya tienes una mascota llamada Luna" }));
    expect(err.status).toBe(409);
    expect(err.message).toBe("Ya tienes una mascota llamada Luna");
  });
});
