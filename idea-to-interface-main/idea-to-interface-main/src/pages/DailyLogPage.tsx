import { useState, useEffect } from "react";
import { Pet, DailyLog } from "@/lib/types";
import { getPets, createLog } from "@/lib/api";
import MetricSlider from "@/components/MetricSlider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Send } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const METRICS = ["appetite", "energy", "mood", "waterIntake", "sleep", "mobility"];

const DailyLogPage = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState("");
  const [values, setValues] = useState<Record<string, number>>({
    appetite: 3,
    energy: 3,
    mood: 3,
    waterIntake: 3,
    sleep: 3,
    mobility: 3,
  });
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<string[]>([]);

  const handleImageUpload = () => {
    // Simular carga de imagen
    setImages((prev) => [...prev, `/placeholder.svg`]);
    toast.info("Imagen adjuntada (simulado)");
  };

  const handleSubmit = () => {
    const pet = pets.find((p) => p.id === selectedPet);
    if (!pet) return;
    const log: DailyLog = {
      id: `log-${Date.now()}`,
      petId: pet.id,
      date: new Date().toISOString().split("T")[0],
      ...values,
      notes,
      images,
    };
    createLog(log)
      .then(() => {
        toast.success("Registro diario guardado exitosamente", {
          description: `Datos registrados para ${pet.name}`,
        });
        // Reset
        setValues({ appetite: 3, energy: 3, mood: 3, waterIntake: 3, sleep: 3, mobility: 3 });
        setNotes("");
        setImages([]);
      })
      .catch((e) => {
        console.error("log save failed", e);
        toast.error("Falló al guardar el registro");
      });
  };

  useEffect(() => {
    getPets().then((list) => {
      setPets(list);
      if (list.length > 0 && !selectedPet) setSelectedPet(list[0].id);
    });
  }, []);

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
      <Button onClick={handleSubmit} className="w-full gap-2" size="lg">
        <Send className="h-4 w-4" />
        Guardar registro
      </Button>
    </div>
  );
};

export default DailyLogPage;
