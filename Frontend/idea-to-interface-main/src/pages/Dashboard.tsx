import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { METRIC_LABELS, METRIC_ICONS, Pet, Alert, DailyLog } from "@/lib/types";
import { getPets, getAlerts, getLogs, markAlertRead } from "@/lib/api";
import PetCard from "@/components/PetCard";
import AlertCard from "@/components/AlertCard";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useUserRole, ROLE_CONFIG } from "@/lib/UserRoleContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const unreadAlerts = alerts.filter((a) => !a.read);
  const latestLog = logs[0] ?? null;
  const { role } = useUserRole();
  const config = ROLE_CONFIG[role];
  const { user } = useAuth();

  useEffect(() => {
    getPets().then(setPets).catch((e) => console.error("failed pets", e));
    getAlerts().then(setAlerts).catch((e) => console.error("failed alerts", e));
    getLogs().then(setLogs).catch((e) => console.error("failed logs", e));
  }, []);

  const handleMarkRead = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
    markAlertRead(id).catch((e) => console.error("failed to mark read", e));
  };

  const metricKeys = ["appetite", "energy", "mood", "waterIntake", "sleep", "mobility"] as const;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      { /* load data */ }
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold">
          Buen día, {user ? user.name.split(" ")[0] : config.name.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {role === "cuidador" && "Resumen del estado de tus mascotas"}
          {role === "administrador" && "Panel de administración — gestiona usuarios y configuración"}
          {role === "gerente" && "Vista gerencial — métricas y reportes del sistema"}
        </p>
      </motion.div>

      {/* Semáforo general */}
      <div className="grid grid-cols-3 gap-3">
        {(["stable", "observation", "alert"] as const).map((status) => {
          const count = pets.filter((p) => p.status === status).length;
          return (
            <Card key={status} className="p-4 text-center border-border/50 shadow-card">
              <StatusBadge status={status} />
              <p className="mt-2 text-2xl font-bold">{count}</p>
            </Card>
          );
        })}
      </div>

      {/* Mascotas */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Mis mascotas</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {pets.map((pet) => (
            <PetCard key={pet.id} pet={pet} onClick={() => navigate("/mascotas")} />
          ))}
        </div>
      </section>

      {/* Último registro */}
      {latestLog && pets.find((p) => p.id === latestLog.petId) && (
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Último registro de {pets.find((p) => p.id === latestLog.petId)?.name}
          </h2>
          <Card className="p-5 border-border/50 shadow-card">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {metricKeys.map((key) => {
                const Icon = METRIC_ICONS[key];
                const val = latestLog[key] as number;
                const trend = val >= 4 ? "up" : val <= 2 ? "down" : "flat";
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-warm">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{METRIC_LABELS[key]}</p>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">{val}/5</span>
                        {trend === "up" && <TrendingUp className="h-3 w-3 text-status-stable" />}
                        {trend === "down" && <TrendingDown className="h-3 w-3 text-status-alert" />}
                        {trend === "flat" && <Minus className="h-3 w-3 text-status-observation" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {latestLog.notes && (
              <p className="mt-4 text-sm text-muted-foreground italic border-t border-border pt-3">
                "{latestLog.notes}"
              </p>
            )}
          </Card>
        </section>
      )}

      {/* Alertas recientes */}
      {unreadAlerts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Alertas sin leer <span className="text-sm font-normal text-muted-foreground">({unreadAlerts.length})</span>
          </h2>
          <div className="space-y-3">
            {unreadAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onMarkRead={handleMarkRead} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
