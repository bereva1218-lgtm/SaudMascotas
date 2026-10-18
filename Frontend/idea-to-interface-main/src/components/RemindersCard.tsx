import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { type Reminder } from "@/lib/types";
import { markDoseAdministered, notifyRemindersChanged } from "@/lib/api";
import { cn } from "@/lib/utils";
import { BellRing, ClipboardList, Pill, Syringe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface RemindersCardProps {
  reminders: Reminder[];
  // se llama después de una acción que cambia los recordatorios (p. ej., marcar una dosis)
  onChanged?: () => void;
  title?: string;
}

const TYPE_ICON = {
  daily_log: ClipboardList,
  medication_dose: Pill,
  vaccine_due: Syringe,
};

// una dosis se puede marcar desde 2 horas antes de su hora (mismo margen que el servidor)
const canMarkDose = (scheduledAt?: string) =>
  !!scheduledAt && Date.parse(scheduledAt) <= Date.now() + 2 * 3_600_000;

// Recordatorios pendientes con acceso directo para resolverlos
const RemindersCard = ({ reminders, onChanged, title = "Recordatorios" }: RemindersCardProps) => {
  const navigate = useNavigate();
  const [marking, setMarking] = useState<string | null>(null);

  if (reminders.length === 0) return null;

  const handleMarkDose = async (reminder: Reminder) => {
    if (!reminder.medicationId || !reminder.scheduledAt) return;
    setMarking(reminder.id);
    try {
      await markDoseAdministered(reminder.medicationId, reminder.scheduledAt);
      toast.success("Dosis marcada como administrada");
      notifyRemindersChanged();
      onChanged?.();
    } catch (e) {
      console.error("failed to mark dose", e);
      toast.error(e instanceof Error ? e.message : "No se pudo marcar la dosis");
    } finally {
      setMarking(null);
    }
  };

  const action = (reminder: Reminder) => {
    if (reminder.type === "daily_log") {
      return (
        <Button size="sm" className="shrink-0" onClick={() => navigate("/registro", { state: { petId: reminder.petId } })}>
          Registrar ahora
        </Button>
      );
    }
    if (reminder.type === "medication_dose" && canMarkDose(reminder.scheduledAt)) {
      return (
        <Button size="sm" className="shrink-0" disabled={marking === reminder.id} onClick={() => handleMarkDose(reminder)}>
          {marking === reminder.id ? "Guardando..." : "Marcar como administrada"}
        </Button>
      );
    }
    return (
      <Button
        size="sm"
        variant="outline"
        className="shrink-0"
        onClick={() => navigate("/salud", { state: { tab: reminder.type === "vaccine_due" ? "vacunas" : "medicamentos" } })}
      >
        {reminder.type === "vaccine_due" ? "Ver vacunas" : "Ver tratamiento"}
      </Button>
    );
  };

  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} aria-label={title}>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <BellRing className="h-5 w-5 text-primary" />
        {title} <span className="text-sm font-normal text-muted-foreground">({reminders.length})</span>
      </h2>
      <div className="space-y-2">
        {reminders.map((reminder) => {
          const Icon = TYPE_ICON[reminder.type];
          return (
            <div
              key={reminder.id}
              className={cn(
                "flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center",
                reminder.priority === "high"
                  ? "border-status-observation/30 bg-status-observation/5"
                  : "border-primary/20 bg-primary/5"
              )}
            >
              <Icon
                className={cn(
                  "hidden h-5 w-5 shrink-0 sm:block",
                  reminder.priority === "high" ? "text-status-observation" : "text-primary"
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{reminder.title}</p>
                <p className="text-sm text-muted-foreground">{reminder.message}</p>
              </div>
              {action(reminder)}
            </div>
          );
        })}
      </div>
    </motion.section>
  );
};

export default RemindersCard;
