import { METRIC_ICONS, METRIC_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MetricSliderProps {
  metric: string;
  value: number;
  onChange: (value: number) => void;
}

const MetricSlider = ({ metric, value, onChange }: MetricSliderProps) => {
  const Icon = METRIC_ICONS[metric as keyof typeof METRIC_ICONS];
  const label = METRIC_LABELS[metric];

  const getColor = (v: number) => {
    if (v <= 2) return "bg-status-alert";
    if (v <= 3) return "bg-status-observation";
    return "bg-status-stable";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <span>{label}</span>
        </div>
        <span className="text-xs text-muted-foreground">{value}/5</span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={cn(
              "h-3 flex-1 rounded-full transition-all",
              i <= value ? getColor(value) : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
};

export default MetricSlider;
