import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SaludPage from "@/pages/SaludPage";
import RemindersCard from "@/components/RemindersCard";
import * as api from "@/lib/api";
import { Pet, Reminder } from "@/lib/types";
import { Medication, Vaccine, frequencyLabel, vaccineDueStatus } from "@/lib/health";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getPets: vi.fn(),
    getVaccines: vi.fn(),
    getMedications: vi.fn(),
    createVaccine: vi.fn(),
    createMedication: vi.fn(),
    markDoseAdministered: vi.fn(),
    undoDose: vi.fn(),
    notifyRemindersChanged: vi.fn(),
  };
});

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.scrollIntoView = () => {};
});

const luna: Pet = { id: "1", name: "Luna", breed: "Beagle", age: 3, weight: 10, avatar: "/x", status: "stable" };
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

const vaccines: Vaccine[] = [
  { id: "1", petId: "1", petName: "Luna", name: "Rabia", appliedDate: "2024-10-01", nextDoseDate: "2025-10-01", clinic: null, notes: null, createdAt: "" },
  { id: "2", petId: "1", petName: "Luna", name: "Rabia", appliedDate: "2025-10-03", nextDoseDate: "2026-01-01", clinic: "VetCare", notes: null, createdAt: "" },
];
const medication: Medication = {
  id: "5",
  petId: "1",
  petName: "Luna",
  name: "Meloxicam",
  dose: "1 tableta",
  frequencyHours: 8,
  startAt: hoursFromNow(-10),
  startDate: "2026-10-18",
  startTime: "08:00",
  endDate: "2099-12-31",
  notes: null,
  status: "activo",
  nextDoseAt: hoursFromNow(6),
  overdueDoses: [hoursFromNow(-2)],
  administeredDoses: [hoursFromNow(-10)],
};

const renderPage = (state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: "/salud", state }]}>
      <SaludPage />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.mocked(api.getPets).mockResolvedValue([luna]);
  vi.mocked(api.getVaccines).mockResolvedValue(vaccines);
  vi.mocked(api.getMedications).mockResolvedValue([medication]);
});
afterEach(() => vi.clearAllMocks());

describe("helpers de salud", () => {
  it("describe la frecuencia", () => {
    expect(frequencyLabel(8)).toBe("Cada 8 horas");
    expect(frequencyLabel(24)).toBe("Una vez al día");
    expect(frequencyLabel(72)).toBe("Cada 3 días");
  });

  it("clasifica el próximo refuerzo", () => {
    expect(vaccineDueStatus("2026-10-10", "2026-10-18")).toBe("vencida");
    expect(vaccineDueStatus("2026-10-25", "2026-10-18")).toBe("proxima");
    expect(vaccineDueStatus("2027-10-25", "2026-10-18")).toBe("al_dia");
    expect(vaccineDueStatus(null)).toBeNull();
  });
});

describe("SaludPage: vacunas", () => {
  it("muestra el historial por mascota; solo la aplicación más reciente define el refuerzo", async () => {
    renderPage();
    const section = await screen.findByRole("region", { name: "Vacunas de Luna" });
    expect(within(section).getAllByText("Rabia")).toHaveLength(2);
    // la más reciente tiene el refuerzo vencido (1 ene 2026)
    expect(within(section).getByText("Refuerzo vencido")).toBeInTheDocument();
    // la anterior ya tuvo su refuerzo registrado
    expect(within(section).getByText(/\(ya registrado\)/)).toBeInTheDocument();
  });

  it("valida que el refuerzo sea posterior a la aplicación antes de enviar", async () => {
    renderPage();
    await screen.findByRole("region", { name: "Vacunas de Luna" });
    fireEvent.click(screen.getByRole("button", { name: /agregar vacuna/i }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Vacuna *"), { target: { value: "Parvovirus" } });
    fireEvent.change(within(dialog).getByLabelText("Fecha de aplicación *"), { target: { value: "2026-10-10" } });
    fireEvent.change(within(dialog).getByLabelText("Próximo refuerzo"), { target: { value: "2026-10-01" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Registrar vacuna" }));
    await waitFor(() => expect(api.createVaccine).not.toHaveBeenCalled());
  });
});

describe("SaludPage: medicamentos", () => {
  it("muestra estado, frecuencia, próxima dosis y dosis pendientes; permite marcarlas", async () => {
    vi.mocked(api.markDoseAdministered).mockResolvedValue({ ...medication, overdueDoses: [] });
    renderPage({ tab: "medicamentos" });

    expect(await screen.findByText("Meloxicam")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText(/1 tableta · Cada 8 horas/)).toBeInTheDocument();
    expect(screen.getByText(/Próxima dosis:/)).toBeInTheDocument();
    expect(screen.getByText("Dosis pendientes por marcar")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /administrada/i }));
    await waitFor(() => expect(api.markDoseAdministered).toHaveBeenCalledWith("5", medication.overdueDoses[0]));
    await waitFor(() => expect(screen.queryByText("Dosis pendientes por marcar")).not.toBeInTheDocument());
    expect(api.notifyRemindersChanged).toHaveBeenCalled();
  });

  it("crea un tratamiento con duración en días", async () => {
    vi.mocked(api.createMedication).mockResolvedValue({ ...medication, id: "9", name: "Omeprazol" });
    renderPage({ tab: "medicamentos" });
    await screen.findByText("Meloxicam");

    fireEvent.click(screen.getByRole("button", { name: /agregar medicamento/i }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Medicamento *"), { target: { value: "Omeprazol" } });
    fireEvent.change(within(dialog).getByLabelText("Dosis *"), { target: { value: "5 ml" } });
    fireEvent.change(within(dialog).getByLabelText("Cada (horas) *"), { target: { value: "12" } });
    fireEvent.change(within(dialog).getByLabelText("Días"), { target: { value: "10" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Registrar medicamento" }));

    await waitFor(() =>
      expect(api.createMedication).toHaveBeenCalledWith(
        expect.objectContaining({ petId: "1", name: "Omeprazol", dose: "5 ml", frequencyHours: 12, durationDays: 10 })
      )
    );
  });
});

describe("RemindersCard: dosis y vacunas", () => {
  const dose: Reminder = {
    id: "medication_dose:5:x",
    type: "medication_dose",
    petId: "1",
    petName: "Luna",
    title: "Dosis de Meloxicam para Luna",
    message: "Tocaba hoy a las 8:00 a. m. (1 tableta) y aún no está marcada como administrada.",
    dueDate: "2026-10-18",
    priority: "high",
    medicationId: "5",
    scheduledAt: hoursFromNow(-1),
  };
  const vaccine: Reminder = {
    id: "vaccine_due:2:2026-01-01",
    type: "vaccine_due",
    petId: "1",
    petName: "Luna",
    title: "Vacuna Rabia de Luna",
    message: "El refuerzo es mañana.",
    dueDate: "2026-10-19",
    priority: "high",
    vaccineId: "2",
  };

  it("permite marcar la dosis como administrada desde el recordatorio", async () => {
    vi.mocked(api.markDoseAdministered).mockResolvedValue(medication);
    const onChanged = vi.fn();
    render(<MemoryRouter><RemindersCard reminders={[dose, vaccine]} onChanged={onChanged} /></MemoryRouter>);

    expect(screen.getByRole("button", { name: "Ver vacunas" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Marcar como administrada" }));
    await waitFor(() => expect(api.markDoseAdministered).toHaveBeenCalledWith("5", dose.scheduledAt));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("una dosis que falta más de 2 horas no se puede marcar todavía", () => {
    render(
      <MemoryRouter>
        <RemindersCard reminders={[{ ...dose, priority: "normal", scheduledAt: hoursFromNow(6) }]} />
      </MemoryRouter>
    );
    expect(screen.queryByRole("button", { name: "Marcar como administrada" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver tratamiento" })).toBeInTheDocument();
  });
});
