import { render, screen } from "@testing-library/react";
import AlertCard from "@/components/AlertCard";
import { Alert } from "@/lib/types";

const base: Alert = {
  id: "1",
  petId: "1",
  petName: "Luna",
  type: "urgent",
  level: "alerta",
  metric: "appetite",
  message: "Tu mascota Luna ha presentado varios días con desnivel alimenticio (4 días seguidos con apetito bajo; promedio 2,5/5), por debajo de su promedio habitual (4/5).",
  recommendation: "Revisa que el alimento sea el habitual. Si el apetito no mejora en 24 a 48 horas, consulta al veterinario.",
  date: "2026-10-18T20:47:00.000Z",
  updatedAt: "2026-10-18T20:47:00.000Z",
  read: false,
  status: "active",
};

describe("AlertCard", () => {
  it("muestra nivel, métrica, explicación, recomendación y el aviso de que no es un diagnóstico", () => {
    render(<AlertCard alert={base} onMarkRead={() => {}} />);
    expect(screen.getByText("Alerta")).toBeInTheDocument();
    expect(screen.getByText("Apetito")).toBeInTheDocument();
    expect(screen.getByText(/4 días seguidos con apetito bajo/)).toBeInTheDocument();
    expect(screen.getByText(/Revisa que el alimento sea el habitual/)).toBeInTheDocument();
    expect(screen.getByText(/no reemplaza el diagnóstico de un veterinario/)).toBeInTheDocument();
  });

  it("muestra la hora en Colombia (UTC-5)", () => {
    render(<AlertCard alert={base} />);
    // 20:47 UTC = 3:47 p. m. en Bogotá
    expect(screen.getByText(/3:47/)).toBeInTheDocument();
  });

  it("precaución usa su etiqueta", () => {
    render(<AlertCard alert={{ ...base, level: "precaucion", type: "preventive" }} />);
    expect(screen.getByText("Precaución")).toBeInTheDocument();
  });

  it("una alerta resuelta lo indica y ya no muestra la recomendación ni 'marcar como leída'", () => {
    render(
      <AlertCard
        alert={{ ...base, status: "resolved", resolvedAt: "2026-10-19T14:00:00.000Z" }}
        onMarkRead={() => {}}
      />
    );
    expect(screen.getByText("Resuelta")).toBeInTheDocument();
    expect(screen.getByText(/Se resolvió automáticamente/)).toBeInTheDocument();
    expect(screen.queryByText(/Revisa que el alimento/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Marcar como leída/)).not.toBeInTheDocument();
  });
});
