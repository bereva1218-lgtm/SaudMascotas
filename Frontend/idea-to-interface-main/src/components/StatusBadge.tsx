import { STATUS_CONFIG, type HealthStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: HealthStatus;
  size?: "sm" | "md";
}

const StatusBadge = ({ status, size = "md" }: StatusBadgeProps) => {
  const normalizedStatus = status.toLowerCase() === "alerta" ? "alert" : status;
  const config = STATUS_CONFIG[normalizedStatus] ?? STATUS_CONFIG.alert;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        config.bgClass,
        config.textClass,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      <span className={cn("rounded-full", config.dotClass, size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2", normalizedStatus === "alert" && "animate-pulse-gentle")} />
      {config.label}
    </span>
  );
};

export default StatusBadge;
