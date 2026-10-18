import { type Alert, ALERT_DISCLAIMER, ALERT_LEVEL_LABELS, METRIC_ICONS, METRIC_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/dates";
import { AlertTriangle, CheckCircle2, Info, Lightbulb, ShieldAlert } from "lucide-react";
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
  const resolved = alert.status === "resolved";
  const Icon = resolved ? CheckCircle2 : style.icon;
  const label = alert.level ? ALERT_LEVEL_LABELS[alert.level] : style.label;
  const MetricIcon = alert.metric ? METRIC_ICONS[alert.metric] : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "rounded-lg border p-4 transition-all",
        resolved ? "border-border bg-muted/30" : [style.border, style.bg],
        !alert.read && !resolved && "ring-1 ring-offset-1 ring-offset-background",
        !alert.read && !resolved && alert.type === "urgent" && "ring-status-alert/40",
        !alert.read && !resolved && alert.type === "preventive" && "ring-status-observation/40",
        !alert.read && !resolved && alert.type === "informative" && "ring-status-stable/40"
      )}
    >
      <div className="flex gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", resolved ? "text-status-stable" : style.iconColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("text-xs font-semibold uppercase", resolved ? "text-muted-foreground" : style.iconColor)}>
                {label}
              </span>
              <span className="text-xs text-muted-foreground">· {alert.petName}</span>
              {alert.metric && (
                <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-xs text-muted-foreground">
                  {MetricIcon && <MetricIcon className="h-3 w-3" />}
                  {METRIC_LABELS[alert.metric]}
                </span>
              )}
              {resolved && (
                <span className="rounded-full bg-status-stable/10 px-2 py-0.5 text-xs font-medium text-status-stable">
                  Resuelta
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{formatDateTime(alert.updatedAt || alert.date)}</span>
          </div>

          <p className="text-sm leading-relaxed">{alert.message}</p>

          {alert.recommendation && !resolved && (
            <div className="mt-3 rounded-md bg-background/70 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <Lightbulb className="h-3.5 w-3.5 text-primary" />
                Recomendación
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{alert.recommendation}</p>
              <p className="mt-2 text-[11px] italic text-muted-foreground">{ALERT_DISCLAIMER}</p>
            </div>
          )}

          {resolved && alert.resolvedAt && (
            <p className="mt-2 text-xs text-muted-foreground">
              Se resolvió automáticamente el {formatDateTime(alert.resolvedAt)} al recuperarse la métrica.
            </p>
          )}

          {!alert.read && !resolved && onMarkRead && (
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
