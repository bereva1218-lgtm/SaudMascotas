import { describe, it, expect } from "vitest";
import { parsePurchaseInput } from "../src/purchases";

// 18 de octubre de 2026, 3 p. m. en Bogotá
const NOW = new Date("2026-10-18T20:00:00Z");
const valid = { itemName: " Pelota ", category: "juguetes", purchaseDate: "2026-10-10", price: "25000", notes: "" };

describe("parsePurchaseInput", () => {
  it("normaliza una compra válida", () => {
    expect(parsePurchaseInput(valid, NOW).input).toEqual({
      itemName: "Pelota",
      category: "juguetes",
      purchaseDate: "2026-10-10",
      price: 25000,
      notes: null,
      images: [],
    });
  });

  it("precio y notas son opcionales", () => {
    const { input } = parsePurchaseInput({ ...valid, price: "", notes: undefined }, NOW);
    expect(input?.price).toBeNull();
    expect(input?.notes).toBeNull();
  });

  it("exige nombre y una categoría predefinida", () => {
    expect(parsePurchaseInput({ ...valid, itemName: "  " }, NOW).error).toBe("El nombre del artículo es obligatorio");
    expect(parsePurchaseInput({ ...valid, category: "carro" }, NOW).error).toBe("Selecciona una categoría válida");
  });

  it("rechaza fechas inválidas o futuras (según el día en Colombia)", () => {
    expect(parsePurchaseInput({ ...valid, purchaseDate: "2026-02-30" }, NOW).error).toBe("La fecha de compra no es válida");
    expect(parsePurchaseInput({ ...valid, purchaseDate: "2026-10-19" }, NOW).error).toBe("La fecha de compra no puede ser futura");
    // a las 9 p. m. del 18 en Bogotá (ya 19 en UTC) el 19 sigue siendo futuro
    expect(parsePurchaseInput({ ...valid, purchaseDate: "2026-10-19" }, new Date("2026-10-19T02:00:00Z")).error).toBeDefined();
    expect(parsePurchaseInput({ ...valid, purchaseDate: "2026-10-18" }, NOW).input).toBeDefined();
  });

  it("rechaza precios negativos o no numéricos", () => {
    expect(parsePurchaseInput({ ...valid, price: -1 }, NOW).error).toMatch(/precio/);
    expect(parsePurchaseInput({ ...valid, price: "abc" }, NOW).error).toMatch(/precio/);
  });
});

describe("fotos de la compra", () => {
  const photo = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

  it("son opcionales", () => {
    expect(parsePurchaseInput(valid, NOW).input?.images).toEqual([]);
  });

  it("acepta hasta 3 imágenes", () => {
    expect(parsePurchaseInput({ ...valid, images: [photo, photo] }, NOW).input?.images).toHaveLength(2);
    expect(parsePurchaseInput({ ...valid, images: [photo, photo, photo, photo] }, NOW).error).toBe(
      "Puedes adjuntar máximo 3 fotos por compra"
    );
  });

  it("rechaza lo que no sea una imagen o una foto demasiado grande", () => {
    expect(parsePurchaseInput({ ...valid, images: ["data:text/html;base64,PGh0bWw+"] }, NOW).error).toMatch(/JPG, PNG o WebP/);
    expect(parsePurchaseInput({ ...valid, images: ["https://ejemplo.com/a.jpg"] }, NOW).error).toMatch(/JPG, PNG o WebP/);
    const huge = "data:image/jpeg;base64," + "A".repeat(1_600_000);
    expect(parsePurchaseInput({ ...valid, images: [huge] }, NOW).error).toBe("Una de las fotos es demasiado grande");
  });
});
