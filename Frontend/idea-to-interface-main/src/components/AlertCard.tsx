import { type Alert } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

interface AlertCardProps {
  alert: Alert;
  onMarkRead?: (id: string) => void;
}

const ALERT_STYLES = {
  informative: {
    icon: Info,
    border: "border-status-stable/30",
    bg: "bg-status-stable/5",
    iconColor: "text-status-stable",
    label: "Informativa",
  },
  preventive: {
    icon: AlertTriangle,
    border: "border-status-observation/30",
    bg: "bg-status-observation/5",
    iconColor: "text-status-observation",
    label: "Preventiva",
  },
  urgent: {
    icon: ShieldAlert,
    border: "border-status-alert/30",
    bg: "bg-status-alert/5",
    iconColor: "text-status-alert",
    label: "Urgente",
  },
};

const AlertCard = ({ alert, onMarkRead }: AlertCardProps) => {
  const style = ALERT_STYLES[alert.type];
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "rounded-lg border p-4 transition-all",
        style.border,
        style.bg,
        !alert.read && "ring-1 ring-offset-1 ring-offset-background",
        !alert.read && alert.type === "urgent" && "ring-status-alert/40",
        !alert.read && alert.type === "preventive" && "ring-status-observation/40",
        !alert.read && alert.type === "informative" && "ring-status-stable/40"
      )}
    >
      <div className="flex gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", style.iconColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-semibold uppercase", style.iconColor)}>{style.label}</span>
              <span className="text-xs text-muted-foreground">· {alert.petName}</span>
            </div>
            <span className="text-xs text-muted-foreground">{alert.date}</span>
          </div>
          <p className="text-sm leading-relaxed">{alert.message}</p>
          {!alert.read && onMarkRead && (
            <button
              onClick={() => onMarkRead(alert.id)}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Marcar como leída
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AlertCard;
