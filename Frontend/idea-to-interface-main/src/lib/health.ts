// Tipos y utilidades de la sección "Vacunas y medicamentos"
import { daysBetweenDates, todayInAppTimeZone } from "./dates";

export interface Vaccine {
  id: string;
  petId: string;
  petName: string;
  name: string;
  appliedDate: string;
  nextDoseDate: string | null;
  clinic: string | null;
  notes: string | null;
  createdAt: string;
}

export type VaccineInput = Pick<Vaccine, "petId" | "name" | "appliedDate" | "nextDoseDate" | "clinic" | "notes">;

export type MedicationStatus = "programado" | "activo" | "finalizado";

export interface Medication {
  id: string;
  petId: string;
  petName: string;
  name: string;
  dose: string;
  frequencyHours: number;
  // ISO (UTC) de la primera dosis
  startAt: string;
  // fecha y hora de inicio en Colombia
  startDate: string;
  startTime: string;
  endDate: string;
  notes: string | null;
  status: MedicationStatus;
  nextDoseAt: string | null;
  // dosis de las últimas 24 h sin marcar como administradas
  overdueDoses: string[];
  administeredDoses: string[];
}

export interface MedicationInput {
  petId: string;
  name: string;
  dose: string;
  frequencyHours: number;
  startDate: string;
  startTime: string;
  endDate?: string;
  durationDays?: number;
  notes: string | null;
}

export const MEDICATION_STATUS_CONFIG: Record<MedicationStatus, { label: string; className: string }> = {
  activo: { label: "Activo", className: "bg-status-stable/10 text-status-stable" },
  programado: { label: "Programado", className: "bg-primary/10 text-primary" },
  finalizado: { label: "Finalizado", className: "bg-muted text-muted-foreground" },
};

// Frecuencias comunes; también se puede escribir cualquier número de horas
export const FREQUENCY_PRESETS = [4, 6, 8, 12, 24, 48, 72, 168];

export const frequencyLabel = (hours: number) => {
  if (hours === 24) return "Una vez al día";
  if (hours === 168) return "Una vez a la semana";
  if (hours % 24 === 0) return `Cada ${hours / 24} días`;
  return `Cada ${hours} horas`;
};

export type VaccineDueStatus = "vencida" | "proxima" | "al_dia";

// Estado del próximo refuerzo: vencido, en los próximos 14 días o al día
export function vaccineDueStatus(nextDoseDate: string | null, today: string = todayInAppTimeZone()): VaccineDueStatus | null {
  if (!nextDoseDate) return null;
  const days = daysBetweenDates(today, nextDoseDate);
  if (days < 0) return "vencida";
  if (days <= 14) return "proxima";
  return "al_dia";
}

export const VACCINE_DUE_CONFIG: Record<VaccineDueStatus, { label: string; className: string }> = {
  vencida: { label: "Refuerzo vencido", className: "bg-status-alert/10 text-status-alert" },
  proxima: { label: "Refuerzo próximo", className: "bg-status-observation/10 text-status-observation" },
  al_dia: { label: "Al día", className: "bg-status-stable/10 text-status-stable" },
};
