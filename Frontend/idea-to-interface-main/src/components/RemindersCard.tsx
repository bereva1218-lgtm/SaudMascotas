import { useNavigate } from "react-router-dom";
import { type Reminder } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BellRing, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface RemindersCardProps {
  reminders: Reminder[];
}

// Recordatorios pendientes con acceso directo para resolverlos
const RemindersCard = ({ reminders }: RemindersCardProps) => {
  const navigate = useNavigate();
  if (reminders.length === 0) return null;

  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} aria-label="Recordatorios">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <BellRing className="h-5 w-5 text-primary" />
        Recordatorios <span className="text-sm font-normal text-muted-foreground">({reminders.length})</span>
      </h2>
      <div className="space-y-2">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className={cn(
              "flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center",
              reminder.priority === "high"
                ? "border-status-observation/30 bg-status-observation/5"
                : "border-primary/20 bg-primary/5"
            )}
          >
            <ClipboardList
              className={cn(
                "hidden h-5 w-5 shrink-0 sm:block",
                reminder.priority === "high" ? "text-status-observation" : "text-primary"
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{reminder.title}</p>
              <p className="text-sm text-muted-foreground">{reminder.message}</p>
            </div>
            <Button
              size="sm"
              className="shrink-0"
              onClick={() => navigate("/registro", { state: { petId: reminder.petId } })}
            >
              Registrar ahora
            </Button>
          </div>
        ))}
      </div>
    </motion.section>
  );
};

export default RemindersCard;
