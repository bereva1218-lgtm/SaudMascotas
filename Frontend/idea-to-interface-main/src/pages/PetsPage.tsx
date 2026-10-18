import { useState, useEffect } from "react";
import { Pet } from "@/lib/types";
import { getPets, createPet, updatePet, deletePet, requestPetRecommendation, ApiError } from "@/lib/api";
import { findDuplicatePetName, duplicatePetNameMessage } from "@/lib/validation";
import PetCard from "@/components/PetCard";
import StatusBadge from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Weight, Calendar, Stethoscope, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const PetsPage = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newPet, setNewPet] = useState({ name: "", breed: "", age: "", weight: "", condition: "", avatar: "" });
  const [editPet, setEditPet] = useState<Pet | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [editImagePreview, setEditImagePreview] = useState<string>("");
  const [recommendationText, setRecommendationText] = useState<string>("");
  const [isRecommending, setIsRecommending] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Create an image to compress it
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas and compress image
        const canvas = document.createElement("canvas");
        const maxDim = 500;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxDim) {
            height = (height * maxDim) / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = (width * maxDim) / height;
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.8);
          setNewPet((p) => ({ ...p, avatar: compressed }));
          setImagePreview(compressed);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editPet) return;
    
    // Create an image to compress it
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas and compress image
        const canvas = document.createElement("canvas");
        const maxDim = 500;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxDim) {
            height = (height * maxDim) / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = (width * maxDim) / height;
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.8);
          setEditPet((p) => p ? { ...p, avatar: compressed } : null);
          setEditImagePreview(compressed);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };


  const newPetDuplicate = newPet.name.trim() ? findDuplicatePetName(pets, newPet.name) : undefined;
  const editPetDuplicate = editPet?.name.trim() ? findDuplicatePetName(pets, editPet.name, editPet.id) : undefined;

  const handleAddPet = () => {
    if (!newPet.name.trim() || !newPet.breed.trim()) {
      toast.error("Nombre y raza son obligatorios");
      return;
    }
    if (newPetDuplicate) {
      toast.error(duplicatePetNameMessage(newPetDuplicate.name));
      return;
    }
    const petData = {
      name: newPet.name.trim(),
      breed: newPet.breed,
      age: Number(newPet.age) || 0,
      weight: Number(newPet.weight) || 0,
      avatar: newPet.avatar || "/placeholder.svg",
      condition: newPet.condition || undefined,
      status: "stable" as const,
    };
    createPet(petData)
      .then((created) => {
        const normalized = { ...created, condition: created.condition || undefined };
        setPets((prev) => [...prev, normalized]);
        toast.success(`${created.name} agregado exitosamente`);
        setNewPet({ name: "", breed: "", age: "", weight: "", condition: "", avatar: "" });
        setImagePreview("");
        setDialogOpen(false);
      })
      .catch((e) => {
        console.error("failed to save pet", e);
        // 409 = nombre repetido: se deja el formulario abierto para corregirlo
        toast.error(e instanceof ApiError && e.status === 409 ? e.message : "Falló al agregar mascota");
      });
  };

  useEffect(() => {
    getPets().then((petList) => {
      // Normalize condition from null to undefined
      const normalized = petList.map((pet) => ({
        ...pet,
        condition: pet.condition || undefined,
      }));
      setPets(normalized);
    }).catch((e) => console.error("failed to load pets", e));
  }, []);

  const handleSavePet = () => {
    if (!editPet) return;
    if (!editPet.name.trim() || !editPet.breed.trim()) {
      toast.error("Nombre y raza son obligatorios");
      return;
    }
    if (editPetDuplicate) {
      toast.error(duplicatePetNameMessage(editPetDuplicate.name));
      return;
    }

    const patch = {
      name: editPet.name.trim(),
      breed: String(editPet.breed),
      age: Number(editPet.age) || 0,
      weight: Number(editPet.weight) || 0,
      condition: (editPet.condition ? String(editPet.condition).trim() : null) || null,
      avatar: String(editPet.avatar || "/placeholder.svg"),
      status: String(editPet.status || "stable"),
    } as Partial<Pet>;

    updatePet(editPet.id, patch)
      .then((updated) => {
        const normalized = { ...updated, condition: updated.condition || undefined };
        setPets((prev) => prev.map((pet) => (pet.id === normalized.id ? normalized : pet)));
        setSelectedPet(normalized);
        toast.success(`${updated.name} actualizado correctamente`);
        setEditDialogOpen(false);
      })
      .catch((e) => {
        console.error("failed to update pet", e);
        toast.error(e instanceof ApiError && e.status === 409 ? e.message : "No se pudo actualizar la mascota");
      });
  };

  const handleDeletePet = (petId: string) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta mascota? Esta acción no se puede deshacer.")) {
      return;
    }
    deletePet(petId)
      .then(() => {
        setPets((prev) => prev.filter((pet) => pet.id !== petId));
        if (selectedPet?.id === petId) setSelectedPet(null);
        toast.success("Mascota eliminada");
      })
      .catch((e) => {
        console.error("failed to delete pet", e);
        toast.error("No se pudo eliminar la mascota");
      });
  };

  const handleGenerateRecommendation = async () => {
    if (!selectedPet) return;
    setIsRecommending(true);
    setRecommendationText("");

    try {
      const response = await requestPetRecommendation(selectedPet.id);
      setRecommendationText(response.advice);
      setSelectedPet({ ...response, condition: response.condition || selectedPet.condition });
      setPets((prev) => prev.map((pet) => (pet.id === response.id ? { ...pet, condition: response.condition } : pet)));
      toast.success("Recomendación generada y condición actualizada");
    } catch (error) {
      console.error("failed to generate recommendation", error);
      toast.error("No se pudo generar la recomendación");
    } finally {
      setIsRecommending(false);
    }
  };

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
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nueva mascota</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Foto de la mascota</Label>
                  <div className="flex gap-4">
                    {imagePreview ? (
                      <div className="h-20 w-20 rounded-lg overflow-hidden border-2 border-primary/20">
                        <img src={imagePreview} alt="preview" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                        <Upload className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="flex-1 flex flex-col justify-center">
                      <Input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-2">PNG, JPG o WebP (máx 5MB)</p>
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={newPet.name}
                    onChange={(e) => setNewPet((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ej: Rocky"
                    aria-invalid={!!newPetDuplicate}
                    className={newPetDuplicate ? "border-destructive focus-visible:ring-destructive" : undefined}
                  />
                  {newPetDuplicate && (
                    <p className="text-xs text-destructive mt-1">{duplicatePetNameMessage(newPetDuplicate.name)}</p>
                  )}
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
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button variant="outline" onClick={() => {
                    setEditPet(selectedPet);
                    setEditDialogOpen(true);
                  }}>
                    Editar
                  </Button>
                  <Button variant="secondary" onClick={handleGenerateRecommendation} disabled={isRecommending}>
                    {isRecommending ? "Generando..." : "Generar recomendación AI"}
                  </Button>
                  <Button variant="destructive" onClick={() => handleDeletePet(selectedPet.id)}>
                    Eliminar
                  </Button>
                </div>
                {recommendationText ? (
                  <div className="mt-4 rounded-2xl border border-border/50 bg-muted p-4 text-sm text-muted-foreground">
                    <h3 className="font-semibold">Recomendación AI</h3>
                    <p className="mt-2 whitespace-pre-line">{recommendationText}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          setEditImagePreview("");
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar mascota</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Foto de la mascota</Label>
              <div className="flex gap-4">
                {(editImagePreview || editPet?.avatar) && !editImagePreview ? (
                  <div className="h-20 w-20 rounded-lg overflow-hidden border-2 border-primary/20">
                    <img src={editPet?.avatar} alt="pet" className="h-full w-full object-cover" />
                  </div>
                ) : editImagePreview ? (
                  <div className="h-20 w-20 rounded-lg overflow-hidden border-2 border-primary/20">
                    <img src={editImagePreview} alt="preview" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-center">
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleEditImageChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-2">PNG, JPG o WebP (máx 5MB)</p>
                </div>
              </div>
            </div>
            <div>
              <Label>Nombre *</Label>
              <Input
                value={editPet?.name ?? ""}
                onChange={(e) => editPet && setEditPet({ ...editPet, name: e.target.value })}
                placeholder="Ej: Rocky"
                aria-invalid={!!editPetDuplicate}
                className={editPetDuplicate ? "border-destructive focus-visible:ring-destructive" : undefined}
              />
              {editPetDuplicate && (
                <p className="text-xs text-destructive mt-1">{duplicatePetNameMessage(editPetDuplicate.name)}</p>
              )}
            </div>
            <div>
              <Label>Raza *</Label>
              <Input
                value={editPet?.breed ?? ""}
                onChange={(e) => editPet && setEditPet({ ...editPet, breed: e.target.value })}
                placeholder="Ej: Pastor Alemán"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Edad (años)</Label>
                <Input
                  type="number"
                  value={editPet?.age ?? 0}
                  onChange={(e) => editPet && setEditPet({ ...editPet, age: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Peso (kg)</Label>
                <Input
                  type="number"
                  value={editPet?.weight ?? 0}
                  onChange={(e) => editPet && setEditPet({ ...editPet, weight: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Condición diagnosticada</Label>
              <Input
                value={editPet?.condition ?? ""}
                onChange={(e) => editPet && setEditPet({ ...editPet, condition: e.target.value })}
                placeholder="Ej: Artritis, diabetes..."
              />
            </div>
            <Button onClick={handleSavePet} className="w-full">Guardar cambios</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PetsPage;
