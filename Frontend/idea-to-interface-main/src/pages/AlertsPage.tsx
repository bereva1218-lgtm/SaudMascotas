import { useState, useEffect } from "react";
import { getAlerts, markAlertRead } from "@/lib/api";
import { Alert, ALERT_DISCLAIMER } from "@/lib/types";
import AlertCard from "@/components/AlertCard";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AlertsPage = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const handleMarkRead = (id: string) => {
    // optimistic update
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
    markAlertRead(id).catch((e) => {
      console.error("failed to mark alert read", e);
    });
  };

  // las alertas antiguas no tienen `status`; se tratan como activas
  const active = alerts.filter((a) => a.status !== "resolved");
  const resolved = alerts.filter((a) => a.status === "resolved");
  const unreadCount = active.filter((a) => !a.read).length;

  useEffect(() => {
    getAlerts().then(setAlerts).catch((e) => console.error("failed to load alerts", e));
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Alertas</h1>
        <p className="text-muted-foreground mt-1">
          Se generan automáticamente al comparar cada registro diario con el historial de tu mascota
        </p>
      </motion.div>

      <div className="flex gap-3 rounded-lg border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          <span className="font-medium text-foreground">Precaución:</span> descenso de 1 a 2 días frente a su
          promedio habitual. <span className="font-medium text-foreground">Alerta:</span> 3 o más días seguidos o una
          caída marcada. {ALERT_DISCLAIMER}
        </p>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Activas ({active.length}){unreadCount > 0 ? ` · ${unreadCount} sin leer` : ""}
          </TabsTrigger>
          <TabsTrigger value="resolved">Resueltas ({resolved.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="space-y-3 mt-4">
          {active.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No hay alertas activas 🎉</p>
          ) : (
            active.map((a) => <AlertCard key={a.id} alert={a} onMarkRead={handleMarkRead} />)
          )}
        </TabsContent>
        <TabsContent value="resolved" className="space-y-3 mt-4">
          {resolved.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Aún no hay alertas resueltas</p>
          ) : (
            resolved.map((a) => <AlertCard key={a.id} alert={a} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AlertsPage;
