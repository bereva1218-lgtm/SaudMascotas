import { useState, useEffect } from "react";
import { Pet } from "@/lib/types";
import { getPets, createPet } from "@/lib/api";
import PetCard from "@/components/PetCard";
import StatusBadge from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Weight, Calendar, Stethoscope } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const PetsPage = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPet, setNewPet] = useState({ name: "", breed: "", age: "", weight: "", condition: "" });

  // when backend available, POST the new pet and update state
  const handleAddPet = () => {
    if (!newPet.name || !newPet.breed) {
      toast.error("Nombre y raza son obligatorios");
      return;
    }
    const pet: Pet = {
      id: String(Date.now()),
      name: newPet.name,
      breed: newPet.breed,
      age: Number(newPet.age) || 0,
      weight: Number(newPet.weight) || 0,
      avatar: "/placeholder.svg",
      condition: newPet.condition || undefined,
      status: "stable",
    };
    createPet(pet)
      .then((created) => {
        setPets((prev) => [...prev, created]);
        toast.success(`${created.name} agregado exitosamente`);
      })
      .catch((e) => {
        console.error("failed to save pet", e);
        toast.error("Falló al agregar mascota");
      });
    setNewPet({ name: "", breed: "", age: "", weight: "", condition: "" });
    setDialogOpen(false);
  };

  useEffect(() => {
    getPets().then(setPets).catch((e) => console.error("failed to load pets", e));
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mis Mascotas</h1>
            <p className="text-muted-foreground mt-1">Gestiona los perfiles de tus mascotas</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva mascota</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Nombre *</Label>
                  <Input value={newPet.name} onChange={(e) => setNewPet((p) => ({ ...p, name: e.target.value }))} placeholder="Ej: Rocky" />
                </div>
                <div>
                  <Label>Raza *</Label>
                  <Input value={newPet.breed} onChange={(e) => setNewPet((p) => ({ ...p, breed: e.target.value }))} placeholder="Ej: Pastor Alemán" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Edad (años)</Label>
                    <Input type="number" value={newPet.age} onChange={(e) => setNewPet((p) => ({ ...p, age: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Peso (kg)</Label>
                    <Input type="number" value={newPet.weight} onChange={(e) => setNewPet((p) => ({ ...p, weight: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Condición diagnosticada</Label>
                  <Input value={newPet.condition} onChange={(e) => setNewPet((p) => ({ ...p, condition: e.target.value }))} placeholder="Ej: Artritis, diabetes..." />
                </div>
                <Button onClick={handleAddPet} className="w-full">Agregar mascota</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Pet list */}
      <div className="space-y-3">
        {pets.map((pet) => (
          <PetCard key={pet.id} pet={pet} onClick={() => setSelectedPet(pet)} />
        ))}
      </div>

      {/* Selected pet detail */}
      {selectedPet && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 border-border/50 shadow-card">
            <div className="flex items-start gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-primary/20">
                <img src={selectedPet.avatar} alt={selectedPet.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold">{selectedPet.name}</h2>
                  <StatusBadge status={selectedPet.status} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {selectedPet.age} años
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Weight className="h-4 w-4" />
                    {selectedPet.weight} kg
                  </div>
                  {selectedPet.condition && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Stethoscope className="h-4 w-4" />
                      {selectedPet.condition}
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">{selectedPet.breed}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default PetsPage;
