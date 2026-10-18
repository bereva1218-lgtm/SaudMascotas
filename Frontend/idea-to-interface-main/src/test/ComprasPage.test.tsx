import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ComprasPage from "@/pages/ComprasPage";
import * as api from "@/lib/api";
import { Pet } from "@/lib/types";
import { Purchase, formatCOP, totalSpent } from "@/lib/purchases";

vi.mock("@/lib/images", () => ({
  compressImage: vi.fn(async (file: File) => `data:image/jpeg;base64,${file.name}`),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getPets: vi.fn(),
    getPurchases: vi.fn(),
    createPurchase: vi.fn(),
    updatePurchase: vi.fn(),
    deletePurchase: vi.fn(),
  };
});

// en jsdom Radix Select necesita estas APIs del navegador
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.scrollIntoView = () => {};
});

const pets: Pet[] = [
  { id: "1", name: "Luna", breed: "Beagle", age: 3, weight: 10, avatar: "/x", status: "stable" },
  { id: "2", name: "Max", breed: "Lab", age: 9, weight: 30, avatar: "/x", status: "stable" },
];
const purchases: Purchase[] = [
  { id: "1", petId: "1", petName: "Luna", itemName: "Pelota", category: "juguetes", purchaseDate: "2026-10-10", price: 25000, notes: null, images: [], createdAt: "" },
  { id: "2", petId: "2", petName: "Max", itemName: "Concentrado 15 kg", category: "comida", purchaseDate: "2026-10-12", price: 180000, notes: "Tienda del barrio", images: [], createdAt: "" },
  { id: "3", petId: "1", petName: "Luna", itemName: "Collar rojo", category: "collar", purchaseDate: "2026-10-01", price: null, notes: null, images: [], createdAt: "" },
];

const renderPage = () => render(<MemoryRouter><ComprasPage /></MemoryRouter>);

beforeEach(() => {
  vi.mocked(api.getPets).mockResolvedValue(pets);
  vi.mocked(api.getPurchases).mockResolvedValue(purchases);
});
afterEach(() => vi.clearAllMocks());

const chooseOption = async (triggerLabel: string, option: string) => {
  fireEvent.click(screen.getByRole("combobox", { name: triggerLabel }));
  fireEvent.click(await screen.findByRole("option", { name: option }));
};

describe("helpers de compras", () => {
  it("suma solo las compras con precio", () => {
    expect(totalSpent(purchases)).toBe(205000);
  });
  it("formatea pesos colombianos sin decimales", () => {
    expect(formatCOP(205000).replace(/\s/g, " ")).toMatch(/\$ ?205\.000/);
  });
});

describe("ComprasPage", () => {
  it("lista las compras y muestra el total gastado", async () => {
    renderPage();
    expect(await screen.findByText("Pelota")).toBeInTheDocument();
    expect(screen.getByText("Concentrado 15 kg")).toBeInTheDocument();
    expect(screen.getByTestId("total-gastado").textContent).toMatch(/205\.000/);
    expect(screen.getByText(/3 compras · 1 sin precio registrado/)).toBeInTheDocument();
  });

  it("filtra por mascota y por categoría y recalcula el total", async () => {
    renderPage();
    await screen.findByText("Pelota");

    await chooseOption("Filtrar por mascota", "Luna");
    expect(screen.queryByText("Concentrado 15 kg")).not.toBeInTheDocument();
    expect(screen.getByTestId("total-gastado").textContent).toMatch(/25\.000/);

    await chooseOption("Filtrar por categoría", "Collar");
    expect(screen.queryByText("Pelota")).not.toBeInTheDocument();
    expect(screen.getByText("Collar rojo")).toBeInTheDocument();
  });

  it("valida el formulario antes de enviar", async () => {
    renderPage();
    await screen.findByText("Pelota");
    fireEvent.click(screen.getByRole("button", { name: /agregar/i }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Agregar compra" }));
    await waitFor(() => expect(api.createPurchase).not.toHaveBeenCalled());
  });

  it("crea una compra y la agrega a la lista", async () => {
    const created: Purchase = { ...purchases[0], id: "9", itemName: "Cama acolchada", category: "accesorios", price: 90000 };
    vi.mocked(api.createPurchase).mockResolvedValue(created);
    renderPage();
    await screen.findByText("Pelota");

    fireEvent.click(screen.getByRole("button", { name: /agregar/i }));
    const dialog = await screen.findByRole("dialog");
    await chooseOption("Mascota", "Luna");
    fireEvent.change(within(dialog).getByLabelText("Artículo *"), { target: { value: "Cama acolchada" } });
    await chooseOption("Categoría", "Accesorios");
    fireEvent.change(within(dialog).getByLabelText("Precio (COP)"), { target: { value: "90000" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Agregar compra" }));

    await waitFor(() =>
      expect(api.createPurchase).toHaveBeenCalledWith(
        expect.objectContaining({ petId: "1", itemName: "Cama acolchada", category: "accesorios", price: 90000, notes: null, images: [] })
      )
    );
    expect(await screen.findByText("Cama acolchada")).toBeInTheDocument();
  });
});

describe("ComprasPage: fotos", () => {
  it("muestra las miniaturas y amplía la foto al hacer clic", async () => {
    vi.mocked(api.getPurchases).mockResolvedValue([{ ...purchases[0], images: ["data:image/jpeg;base64,AAA"] }]);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Ver foto 1 de Pelota" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByAltText("Foto de Pelota")).toBeInTheDocument();
  });

  it("adjunta fotos (máximo 3), permite quitarlas y las envía al guardar", async () => {
    vi.mocked(api.updatePurchase).mockImplementation(async (_id, input) => ({ ...purchases[0], ...input }));
    renderPage();
    await screen.findByText("Pelota");
    fireEvent.click(screen.getAllByRole("button", { name: /editar/i })[1]); // Pelota es la 2.ª por fecha
    const dialog = await screen.findByRole("dialog");

    const files = ["a.jpg", "b.jpg", "c.jpg", "d.jpg"].map((n) => new File(["x"], n, { type: "image/jpeg" }));
    fireEvent.change(within(dialog).getByLabelText("Agregar fotos de la compra"), { target: { files } });
    await waitFor(() => expect(within(dialog).getAllByAltText(/^Foto \d de la compra$/)).toHaveLength(3));
    // con 3 fotos ya no se ofrece agregar más
    expect(within(dialog).queryByLabelText("Agregar fotos de la compra")).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Quitar foto 1" }));
    expect(within(dialog).getAllByAltText(/^Foto \d de la compra$/)).toHaveLength(2);

    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() =>
      expect(api.updatePurchase).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({ images: ["data:image/jpeg;base64,b.jpg", "data:image/jpeg;base64,c.jpg"] })
      )
    );
  });
});
