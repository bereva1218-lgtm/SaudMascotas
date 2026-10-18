import { Heart, Activity, Droplets, Moon, Utensils, Footprints, Smile } from "lucide-react";

export type HealthStatus = "stable" | "observation" | "alert" | "alerta";

export interface Pet {
  id: string;
  name: string;
  breed: string;
  age: number;
  weight: number;
  avatar: string;
  condition?: string;
  status: HealthStatus;
}

export interface DailyLog {
  id: string;
  petId: string;
  date: string;
  appetite: number;
  energy: number;
  mood: number;
  waterIntake: number;
  sleep: number;
  mobility: number;
  notes: string;
  images: string[];
}

export type AlertLevel = "precaucion" | "alerta";

export interface Alert {
  id: string;
  petId: string;
  petName: string;
  type: "informative" | "preventive" | "urgent";
  // explicación basada en los registros
  message: string;
  // fecha ISO en que se detectó
  date: string;
  read: boolean;
  // métrica afectada (appetite, energy, ...); null en alertas antiguas
  metric?: keyof typeof METRIC_ICONS | null;
  level?: AlertLevel | null;
  recommendation?: string | null;
  baseline?: number | null;
  status?: "active" | "resolved";
  updatedAt?: string | null;
  resolvedAt?: string | null;
}

export const ALERT_LEVEL_LABELS: Record<AlertLevel, string> = {
  precaucion: "Precaución",
  alerta: "Alerta",
};

// Recordatorio para el dueño: registro diario, dosis de medicamento o refuerzo de vacuna
export interface Reminder {
  id: string;
  type: "daily_log" | "medication_dose" | "vaccine_due";
  petId: string;
  petName: string;
  title: string;
  message: string;
  dueDate: string;
  priority: "normal" | "high";
  medicationId?: string;
  scheduledAt?: string;
  vaccineId?: string;
}

export const ALERT_DISCLAIMER = "Sugerencia informativa; no reemplaza el diagnóstico de un veterinario.";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "cuidador" | "administrador" | "gerente";
}

export const STATUS_CONFIG: Record<HealthStatus, { label: string; color: string; bgClass: string; textClass: string; dotClass: string }> = {
  stable: {
    label: "Estable",
    color: "status-stable",
    bgClass: "bg-status-stable/10",
    textClass: "text-status-stable",
    dotClass: "bg-status-stable",
  },
  observation: {
    label: "Observación",
    color: "status-observation",
    bgClass: "bg-status-observation/10",
    textClass: "text-status-observation",
    dotClass: "bg-status-observation",
  },
  alert: {
    label: "Alerta",
    color: "status-alert",
    bgClass: "bg-status-alert/10",
    textClass: "text-status-alert",
    dotClass: "bg-status-alert",
  },
  alerta: {
    label: "Alerta",
    color: "status-alert",
    bgClass: "bg-status-alert/10",
    textClass: "text-status-alert",
    dotClass: "bg-status-alert",
  },
};

export const METRIC_ICONS = {
  appetite: Utensils,
  energy: Activity,
  mood: Smile,
  waterIntake: Droplets,
  sleep: Moon,
  mobility: Footprints,
};

export const METRIC_LABELS: Record<string, string> = {
  appetite: "Apetito",
  energy: "Energía",
  mood: "Ánimo",
  waterIntake: "Agua",
  sleep: "Sueño",
  mobility: "Movilidad",
};
