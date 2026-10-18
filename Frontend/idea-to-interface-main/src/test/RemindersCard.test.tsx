import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import RemindersCard from "@/components/RemindersCard";
import { Reminder } from "@/lib/types";

const reminder: Reminder = {
  id: "daily_log:1:2026-10-18",
  type: "daily_log",
  petId: "1",
  petName: "Luna",
  title: "Registro diario de Luna",
  message: "Aún no has hecho el registro de hoy de Luna.",
  dueDate: "2026-10-18",
  priority: "normal",
};

const RegistroProbe = () => {
  const location = useLocation();
  return <p>registro para {(location.state as { petId: string }).petId}</p>;
};

describe("RemindersCard", () => {
  it("no muestra nada si no hay recordatorios", () => {
    const { container } = render(<MemoryRouter><RemindersCard reminders={[]} /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el recordatorio y lleva al registro de esa mascota", () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<RemindersCard reminders={[reminder]} />} />
          <Route path="/registro" element={<RegistroProbe />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("Aún no has hecho el registro de hoy de Luna.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Registrar ahora" }));
    expect(screen.getByText("registro para 1")).toBeInTheDocument();
  });
});
