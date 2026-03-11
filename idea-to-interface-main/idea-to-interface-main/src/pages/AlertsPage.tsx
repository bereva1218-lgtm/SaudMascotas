import { useState, useEffect } from "react";
import { getAlerts, markAlertRead } from "@/lib/api";
import { Alert } from "@/lib/types";
import AlertCard from "@/components/AlertCard";
import { motion } from "framer-motion";
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

  const unread = alerts.filter((a) => !a.read);
  const read = alerts.filter((a) => a.read);

  useEffect(() => {
    getAlerts().then(setAlerts).catch((e) => console.error("failed to load alerts", e));
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Alertas</h1>
        <p className="text-muted-foreground mt-1">Notificaciones sobre el estado de tus mascotas</p>
      </motion.div>

      <Tabs defaultValue="unread">
        <TabsList>
          <TabsTrigger value="unread">Sin leer ({unread.length})</TabsTrigger>
          <TabsTrigger value="all">Todas ({alerts.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="unread" className="space-y-3 mt-4">
          {unread.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No hay alertas sin leer 🎉</p>
          ) : (
            unread.map((a) => <AlertCard key={a.id} alert={a} onMarkRead={handleMarkRead} />)
          )}
        </TabsContent>
        <TabsContent value="all" className="space-y-3 mt-4">
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} onMarkRead={handleMarkRead} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AlertsPage;
