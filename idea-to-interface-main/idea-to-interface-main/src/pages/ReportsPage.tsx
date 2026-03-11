import { METRIC_LABELS, Pet, DailyLog } from "@/lib/types";
import { getPets, getLogs } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#4b9e6f", "#e0983e", "#3b82f6", "#8b5cf6", "#06b6d4", "#f43f5e"];
const METRICS = ["appetite", "energy", "mood", "waterIntake", "sleep", "mobility"];

const ReportsPage = () => {
  useEffect(() => {
    getPets().then((l) => {
      setPets(l);
      if (l.length > 0 && !selectedPet) setSelectedPet(l[0].id);
    });
    getLogs().then(setLogs).catch((e) => console.error("failed logs", e));
  }, []);
  const [pets, setPets] = useState<Pet[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [selectedPet, setSelectedPet] = useState("");

  const chartData = useMemo(() => {
    return logs
      .filter((l) => l.petId === selectedPet)
      .reverse()
      .map((log) => ({
        date: log.date.slice(5),
        ...METRICS.reduce((acc, m) => ({ ...acc, [m]: (log as any)[m] }), {}),
      }));
  }, [logs, selectedPet]);

  const handleExport = () => {
    // optionally convert current chartData to PDF
    toast.success("Reporte generado (simulado)", {
      description: "El reporte se descargaría como PDF con el historial completo.",
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reportes</h1>
            <p className="text-muted-foreground mt-1">Historial y evolución de tu mascota</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </motion.div>

      <Select value={selectedPet} onValueChange={setSelectedPet}>
        <SelectTrigger className="w-full max-w-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pets.map((pet) => (
            <SelectItem key={pet.id} value={pet.id}>
              {pet.name} — {pet.breed}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Chart */}
      <Card className="p-5 border-border/50 shadow-card">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Tendencia últimos 14 días
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(35 20% 88%)" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} fontSize={12} />
              <Tooltip />
              <Legend />
              {METRICS.map((m, i) => (
                <Line
                  key={m}
                  type="monotone"
                  dataKey={m}
                  name={METRIC_LABELS[m]}
                  stroke={COLORS[i]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Summary table */}
      <Card className="p-5 border-border/50 shadow-card overflow-x-auto">
        <h2 className="font-semibold mb-4">Registros recientes</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 pr-4 font-medium text-muted-foreground">Fecha</th>
              {METRICS.map((m) => (
                <th key={m} className="pb-2 px-2 font-medium text-muted-foreground text-center">
                  {METRIC_LABELS[m]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs
              .filter((l) => l.petId === selectedPet)
              .slice(0, 7)
              .map((log) => (
                <tr key={log.id} className="border-b border-border/50">
                  <td className="py-2 pr-4">{log.date}</td>
                  {METRICS.map((m) => (
                    <td key={m} className="py-2 px-2 text-center font-medium">
                      {(log as any)[m]}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default ReportsPage;
