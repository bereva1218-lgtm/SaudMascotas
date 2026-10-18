import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DailyLogPage from "@/pages/DailyLogPage";
import * as api from "@/lib/api";
import { DailyLog, Pet } from "@/lib/types";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getPets: vi.fn(),
    getLogs: vi.fn(),
    getTodayLog: vi.fn(),
    notifyRemindersChanged: vi.fn(),
    createLog: vi.fn(),
    updateLog: vi.fn(),
    updatePet: vi.fn(),
  };
});

const luna: Pet = { id: "1", name: "Luna", breed: "Beagle", age: 3, weight: 10, avatar: "/x", status: "stable" };
const todayLog: DailyLog = {
  id: "7", petId: "1", date: "2026-10-18",
  appetite: 2, energy: 4, mood: 4, waterIntake: 4, sleep: 4, mobility: 4, notes: "comió poco", images: [],
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <DailyLogPage />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.mocked(api.getPets).mockResolvedValue([luna]);
  vi.mocked(api.getLogs).mockResolvedValue([]);
  vi.mocked(api.updatePet).mockResolvedValue(luna);
});

afterEach(() => vi.clearAllMocks());

describe("DailyLogPage: un registro por día", () => {
  it("sin registro hoy, guarda uno nuevo", async () => {
    vi.mocked(api.getTodayLog).mockResolvedValue({ date: "2026-10-18", log: null });
    vi.mocked(api.createLog).mockResolvedValue({ ...todayLog, appetite: 3, notes: "" });
    renderPage();

    const button = await screen.findByRole("button", { name: /guardar registro/i });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    await waitFor(() => expect(api.createLog).toHaveBeenCalledTimes(1));
    expect(api.updateLog).not.toHaveBeenCalled();
    // tras guardar, el formulario pasa a modo edición
    expect(await screen.findByText("Ya registraste hoy a Luna; puedes editarlo")).toBeInTheDocument();
  });

  it("si ya existe el registro de hoy, lo abre en modo edición con los datos precargados", async () => {
    vi.mocked(api.getTodayLog).mockResolvedValue({ date: "2026-10-18", log: todayLog });
    vi.mocked(api.updateLog).mockResolvedValue(todayLog);
    renderPage();

    expect(await screen.findByText("Ya registraste hoy a Luna; puedes editarlo")).toBeInTheDocument();
    expect(screen.getByDisplayValue("comió poco")).toBeInTheDocument();
    expect(screen.getByText("2/5")).toBeInTheDocument(); // apetito precargado

    fireEvent.click(screen.getByRole("button", { name: /actualizar registro de hoy/i }));
    await waitFor(() => expect(api.updateLog).toHaveBeenCalledWith("7", expect.objectContaining({ appetite: 2 })));
    expect(api.createLog).not.toHaveBeenCalled();
  });

  it("si el servidor responde 409, cambia a edición con el registro existente", async () => {
    vi.mocked(api.getTodayLog).mockResolvedValue({ date: "2026-10-18", log: null });
    vi.mocked(api.createLog).mockRejectedValue(
      new api.ApiError(409, JSON.stringify({ message: "Ya registraste hoy a Luna; puedes editarlo", log: todayLog }))
    );
    renderPage();

    const button = await screen.findByRole("button", { name: /guardar registro/i });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    expect(await screen.findByRole("button", { name: /actualizar registro de hoy/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("comió poco")).toBeInTheDocument();
  });
});
