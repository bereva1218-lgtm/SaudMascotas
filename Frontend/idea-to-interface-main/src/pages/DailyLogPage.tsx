import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Pet, DailyLog } from "@/lib/types";
import { getPets, getTodayLog, createLog, updateLog, notifyRemindersChanged, ApiError, DailyLogInput } from "@/lib/api";
import MetricSlider from "@/components/MetricSlider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Send, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const METRICS = ["appetite", "energy", "mood", "waterIntake", "sleep", "mobility"];
const DEFAULT_VALUES: Record<string, number> = {
  appetite: 3,
  energy: 3,
  mood: 3,
  waterIntake: 3,
  sleep: 3,
  mobility: 3,
};

const todayLogNotice = (petName: string) => `Ya registraste hoy a ${petName}; puedes editarlo`;

const DailyLogPage = () => {
  const location = useLocation();
  const requestedPetId = (location.state as { petId?: string } | null)?.petId;
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState(requestedPetId || "");
  const [values, setValues] = useState<Record<string, number>>(DEFAULT_VALUES);
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<string[]>([]);
  // registro de hoy de la mascota seleccionada; si existe, el formulario está en modo edición
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [loadingToday, setLoadingToday] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentPet = pets.find((p) => p.id === selectedPet);

  const fillForm = (log: DailyLog | null) => {
    setTodayLog(log);
    setValues(log ? Object.fromEntries(METRICS.map((m) => [m, log[m as keyof DailyLog] as number])) : DEFAULT_VALUES);
    setNotes(log?.notes ?? "");
    setImages(log?.images ?? []);
  };

  const handleImageUpload = () => {
    // Simular carga de imagen
    setImages((prev) => [...prev, `/placeholder.svg`]);
    toast.info("Imagen adjuntada (simulado)");
  };

  const handleSubmit = async () => {
    const pet = currentPet;
    if (!pet || saving) return;

    const payload: DailyLogInput = { petId: pet.id, ...values, notes, images } as DailyLogInput;
    const editing = todayLog;

    setSaving(true);
    try {
      const saved = editing ? await updateLog(editing.id, payload) : await createLog(payload);
      toast.success(editing ? "Registro de hoy actualizado" : "Registro diario guardado exitosamente", {
        description: `Datos registrados para ${pet.name}`,
      });
      setTodayLog(saved);
      notifyRemindersChanged();

      // el backend reevalúa las alertas y el estado de la mascota al guardar
      const previousStatus = pet.status;
      getPets()
        .then((list) => {
          setPets(list);
          const updated = list.find((p) => p.id === pet.id);
          if (updated && updated.status !== previousStatus && updated.status !== "stable") {
            toast.warning(`Se generó una alerta para ${pet.name}`, {
              description: "Revisa la sección Alertas para ver el porqué y la recomendación.",
            });
          }
        })
        .catch((e) => console.error("failed to refresh pets", e));
    } catch (e: unknown) {
      // ya existía un registro hoy (por ejemplo, guardado desde otra pestaña): se abre en modo edición
      if (e instanceof ApiError && e.status === 409 && e.data?.log) {
        fillForm(e.data.log);
        toast.info(e.message);
      } else {
        console.error("log save failed", e);
        toast.error(e instanceof Error ? e.message : "Falló al guardar el registro");
      }
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    getPets().then((list) => {
      setPets(list);
      if (list.length > 0) setSelectedPet((current) => current || requestedPetId || list[0].id);
    });
  }, [requestedPetId]);

  // al cambiar de mascota, cargar su registro de hoy (si existe) para editarlo
  useEffect(() => {
    if (!selectedPet) return;
    let cancelled = false;
    setLoadingToday(true);
    getTodayLog(selectedPet)
      .then(({ log }) => {
        if (!cancelled) fillForm(log);
      })
      .catch((e) => {
        console.error("failed to load today's log", e);
        if (!cancelled) fillForm(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingToday(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPet]);

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Registro Diario</h1>
        <p className="text-muted-foreground mt-1">Registra el estado de tu mascota hoy</p>
      </motion.div>

      {/* Pet selector */}
      <Select value={selectedPet} onValueChange={setSelectedPet}>
        <SelectTrigger className="w-full">
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

      {/* Aviso de modo edición */}
      {todayLog && currentPet && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          role="status"
          className="flex gap-3 rounded-lg border border-status-observation/30 bg-status-observation/5 p-4"
        >
          <PencilLine className="h-5 w-5 mt-0.5 shrink-0 text-status-observation" />
          <p className="text-sm leading-relaxed">{todayLogNotice(currentPet.name)}</p>
        </motion.div>
      )}

      {/* Metrics */}
      <Card className="p-5 space-y-5 border-border/50 shadow-card">
        <h2 className="font-semibold">Indicadores del día</h2>
        {METRICS.map((metric) => (
          <MetricSlider
            key={metric}
            metric={metric}
            value={values[metric]}
            onChange={(v) => setValues((prev) => ({ ...prev, [metric]: v }))}
          />
        ))}
      </Card>

      {/* Notes */}
      <Card className="p-5 space-y-3 border-border/50 shadow-card">
        <h2 className="font-semibold">Observaciones</h2>
        <Textarea
          placeholder="Describe cualquier comportamiento inusual, cambios de actitud, inquietud, apatía u otros signos..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
        />
      </Card>

      {/* Images */}
      <Card className="p-5 space-y-3 border-border/50 shadow-card">
        <h2 className="font-semibold">Evidencia visual</h2>
        <p className="text-sm text-muted-foreground">
          Adjunta fotos de lesiones, cambios en piel, ojos u otras anomalías.
        </p>
        <div className="flex gap-3 flex-wrap">
          {images.map((img, i) => (
            <div key={i} className="h-20 w-20 rounded-lg bg-muted overflow-hidden">
              <img src={img} alt="evidence" className="h-full w-full object-cover" />
            </div>
          ))}
          <button
            onClick={handleImageUpload}
            className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors"
          >
            <Camera className="h-6 w-6 text-muted-foreground" />
          </button>
        </div>
      </Card>

      {/* Submit */}
      <Button onClick={handleSubmit} className="w-full gap-2" size="lg" disabled={!currentPet || loadingToday || saving}>
        {todayLog ? <PencilLine className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        {saving ? "Guardando..." : todayLog ? "Actualizar registro de hoy" : "Guardar registro"}
      </Button>
    </div>
  );
};

export default DailyLogPage;
