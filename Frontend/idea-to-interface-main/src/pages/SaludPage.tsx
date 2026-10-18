import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Pet } from "@/lib/types";
import {
  getPets,
  getVaccines,
  createVaccine,
  updateVaccine,
  deleteVaccine,
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication,
  markDoseAdministered,
  undoDose,
  notifyRemindersChanged,
} from "@/lib/api";
import {
  Vaccine,
  VaccineInput,
  Medication,
  MedicationInput,
  MEDICATION_STATUS_CONFIG,
  VACCINE_DUE_CONFIG,
  FREQUENCY_PRESETS,
  frequencyLabel,
  vaccineDueStatus,
} from "@/lib/health";
import { formatDate, formatDateTime, todayInAppTimeZone } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Syringe, Pill, Clock, CheckCircle2, Undo2, Info } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const ALL = "all";
type Tab = "vacunas" | "medicamentos";

type VaccineForm = { petId: string; name: string; appliedDate: string; nextDoseDate: string; clinic: string; notes: string };
type MedicationForm = {
  petId: string;
  name: string;
  dose: string;
  frequencyHours: string;
  startDate: string;
  startTime: string;
  endMode: "fecha" | "duracion";
  endDate: string;
  durationDays: string;
  notes: string;
};

const emptyVaccineForm = (petId = ""): VaccineForm => ({
  petId,
  name: "",
  appliedDate: todayInAppTimeZone(),
  nextDoseDate: "",
  clinic: "",
  notes: "",
});

const emptyMedicationForm = (petId = ""): MedicationForm => ({
  petId,
  name: "",
  dose: "",
  frequencyHours: "24",
  startDate: todayInAppTimeZone(),
  startTime: "08:00",
  endMode: "duracion",
  endDate: "",
  durationDays: "7",
  notes: "",
});

const validateVaccine = (f: VaccineForm) => {
  if (!f.petId) return "Selecciona la mascota";
  if (!f.name.trim()) return "El nombre de la vacuna es obligatorio";
  if (!f.appliedDate) return "Indica la fecha de aplicación";
  if (f.appliedDate > todayInAppTimeZone()) return "La fecha de aplicación no puede ser futura";
  if (f.nextDoseDate && f.nextDoseDate <= f.appliedDate) {
    return "La fecha del próximo refuerzo debe ser posterior a la de aplicación";
  }
  return null;
};

const validateMedication = (f: MedicationForm) => {
  if (!f.petId) return "Selecciona la mascota";
  if (!f.name.trim()) return "El nombre del medicamento es obligatorio";
  if (!f.dose.trim()) return "La dosis es obligatoria (por ejemplo: 1 tableta, 5 ml)";
  const freq = Number(f.frequencyHours);
  if (!Number.isInteger(freq) || freq < 1) return "La frecuencia debe ser un número entero de horas";
  if (!f.startDate || !f.startTime) return "Indica la fecha y hora de la primera dosis";
  if (f.endMode === "fecha") {
    if (!f.endDate) return "Indica la fecha de fin del tratamiento";
    if (f.endDate < f.startDate) return "La fecha de fin no puede ser anterior a la de inicio";
  } else if (!Number.isInteger(Number(f.durationDays)) || Number(f.durationDays) < 1) {
    return "La duración debe ser de al menos 1 día";
  }
  return null;
};

// "hoy, 4:00 p. m." / fecha completa si no es hoy
const formatDose = (iso: string) => formatDateTime(iso);

const SaludPage = () => {
  const location = useLocation();
  const initialTab = (location.state as { tab?: Tab } | null)?.tab ?? "vacunas";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [pets, setPets] = useState<Pet[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [petFilter, setPetFilter] = useState<string>(ALL);

  const [vaccineDialog, setVaccineDialog] = useState(false);
  const [editingVaccine, setEditingVaccine] = useState<Vaccine | null>(null);
  const [vaccineForm, setVaccineForm] = useState<VaccineForm>(emptyVaccineForm());

  const [medicationDialog, setMedicationDialog] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [medicationForm, setMedicationForm] = useState<MedicationForm>(emptyMedicationForm());

  const [saving, setSaving] = useState(false);
  const [busyDose, setBusyDose] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<{ kind: "vacuna" | "medicamento"; id: string; name: string } | null>(null);

  useEffect(() => {
    Promise.all([getPets(), getVaccines(), getMedications()])
      .then(([petList, vaccineList, medicationList]) => {
        setPets(petList);
        setVaccines(vaccineList);
        setMedications(medicationList);
      })
      .catch((e) => {
        console.error("failed to load health data", e);
        toast.error("No se pudo cargar la información de vacunas y medicamentos");
      })
      .finally(() => setLoading(false));
  }, []);

  const defaultPetId = petFilter !== ALL ? petFilter : pets.length === 1 ? pets[0].id : "";
  const visiblePets = pets.filter((p) => petFilter === ALL || p.id === petFilter);

  // la aplicación más reciente de cada vacuna (por mascota) es la que define el próximo refuerzo
  const latestVaccineIds = useMemo(() => {
    const latest = new Map<string, Vaccine>();
    for (const v of vaccines) {
      const key = `${v.petId}:${v.name.trim().toLowerCase()}`;
      const current = latest.get(key);
      if (!current || v.appliedDate > current.appliedDate || (v.appliedDate === current.appliedDate && Number(v.id) > Number(current.id))) {
        latest.set(key, v);
      }
    }
    return new Set([...latest.values()].map((v) => v.id));
  }, [vaccines]);

  const visibleMedications = medications
    .filter((m) => petFilter === ALL || m.petId === petFilter)
    .sort((a, b) => {
      const order = { activo: 0, programado: 1, finalizado: 2 };
      return order[a.status] - order[b.status] || b.endDate.localeCompare(a.endDate);
    });

  // ---------- Vacunas ----------

  const openVaccine = (vaccine?: Vaccine) => {
    setEditingVaccine(vaccine ?? null);
    setVaccineForm(
      vaccine
        ? {
            petId: vaccine.petId,
            name: vaccine.name,
            appliedDate: vaccine.appliedDate,
            nextDoseDate: vaccine.nextDoseDate ?? "",
            clinic: vaccine.clinic ?? "",
            notes: vaccine.notes ?? "",
          }
        : emptyVaccineForm(defaultPetId)
    );
    setVaccineDialog(true);
  };

  const saveVaccine = async () => {
    const error = validateVaccine(vaccineForm);
    if (error) return toast.error(error);
    const payload: VaccineInput = {
      petId: vaccineForm.petId,
      name: vaccineForm.name.trim(),
      appliedDate: vaccineForm.appliedDate,
      nextDoseDate: vaccineForm.nextDoseDate || null,
      clinic: vaccineForm.clinic.trim() || null,
      notes: vaccineForm.notes.trim() || null,
    };
    setSaving(true);
    try {
      const saved = editingVaccine ? await updateVaccine(editingVaccine.id, payload) : await createVaccine(payload);
      setVaccines((prev) => [saved, ...prev.filter((v) => v.id !== saved.id)]);
      toast.success(editingVaccine ? "Vacuna actualizada" : `Vacuna ${saved.name} registrada para ${saved.petName}`);
      notifyRemindersChanged();
      setVaccineDialog(false);
    } catch (e) {
      console.error("failed to save vaccine", e);
      toast.error(e instanceof Error ? e.message : "No se pudo guardar la vacuna");
    } finally {
      setSaving(false);
    }
  };

  // ---------- Medicamentos ----------

  const openMedication = (medication?: Medication) => {
    setEditingMedication(medication ?? null);
    setMedicationForm(
      medication
        ? {
            petId: medication.petId,
            name: medication.name,
            dose: medication.dose,
            frequencyHours: String(medication.frequencyHours),
            startDate: medication.startDate,
            startTime: medication.startTime,
            endMode: "fecha",
            endDate: medication.endDate,
            durationDays: "",
            notes: medication.notes ?? "",
          }
        : emptyMedicationForm(defaultPetId)
    );
    setMedicationDialog(true);
  };

  const saveMedication = async () => {
    const error = validateMedication(medicationForm);
    if (error) return toast.error(error);
    const f = medicationForm;
    const payload: MedicationInput = {
      petId: f.petId,
      name: f.name.trim(),
      dose: f.dose.trim(),
      frequencyHours: Number(f.frequencyHours),
      startDate: f.startDate,
      startTime: f.startTime,
      ...(f.endMode === "fecha" ? { endDate: f.endDate } : { durationDays: Number(f.durationDays) }),
      notes: f.notes.trim() || null,
    };
    setSaving(true);
    try {
      const saved = editingMedication
        ? await updateMedication(editingMedication.id, payload)
        : await createMedication(payload);
      setMedications((prev) => [saved, ...prev.filter((m) => m.id !== saved.id)]);
      toast.success(editingMedication ? "Tratamiento actualizado" : `Tratamiento con ${saved.name} registrado para ${saved.petName}`);
      notifyRemindersChanged();
      setMedicationDialog(false);
    } catch (e) {
      console.error("failed to save medication", e);
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el medicamento");
    } finally {
      setSaving(false);
    }
  };

  const handleDose = async (medication: Medication, scheduledAt: string, undo = false) => {
    setBusyDose(`${medication.id}:${scheduledAt}`);
    try {
      const updated = undo ? await undoDose(medication.id, scheduledAt) : await markDoseAdministered(medication.id, scheduledAt);
      setMedications((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      toast.success(undo ? "Se deshizo la dosis" : "Dosis marcada como administrada");
      notifyRemindersChanged();
    } catch (e) {
      console.error("failed to update dose", e);
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar la dosis");
    } finally {
      setBusyDose(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const target = toDelete;
    setToDelete(null);
    try {
      if (target.kind === "vacuna") {
        await deleteVaccine(target.id);
        setVaccines((prev) => prev.filter((v) => v.id !== target.id));
      } else {
        await deleteMedication(target.id);
        setMedications((prev) => prev.filter((m) => m.id !== target.id));
      }
      notifyRemindersChanged();
      toast.success(target.kind === "vacuna" ? "Vacuna eliminada" : "Medicamento eliminado");
    } catch (e) {
      console.error("failed to delete", e);
      toast.error("No se pudo eliminar");
    }
  };

  const canMark = (iso: string) => Date.parse(iso) <= Date.now() + 2 * 3_600_000;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Vacunas y medicamentos</h1>
            <p className="text-muted-foreground mt-1">Historial de vacunas, tratamientos y recordatorios de dosis</p>
          </div>
          <Button
            className="gap-2 shrink-0"
            disabled={pets.length === 0}
            onClick={() => (tab === "vacunas" ? openVaccine() : openMedication())}
          >
            <Plus className="h-4 w-4" />
            {tab === "vacunas" ? "Agregar vacuna" : "Agregar medicamento"}
          </Button>
        </div>
      </motion.div>

      {!loading && pets.length === 0 ? (
        <Card className="p-8 text-center border-border/50 shadow-card">
          <p className="text-muted-foreground">Primero registra una mascota para llevar sus vacunas y medicamentos.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/mascotas">Ir a Mis Mascotas</Link>
          </Button>
        </Card>
      ) : (
        <>
          <div className="space-y-1.5 sm:max-w-xs">
            <Label>Mascota</Label>
            <Select value={petFilter} onValueChange={setPetFilter}>
              <SelectTrigger aria-label="Filtrar por mascota">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las mascotas</SelectItem>
                {pets.map((pet) => (
                  <SelectItem key={pet.id} value={pet.id}>
                    {pet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList>
              <TabsTrigger value="vacunas" className="gap-1.5">
                <Syringe className="h-4 w-4" /> Vacunas
              </TabsTrigger>
              <TabsTrigger value="medicamentos" className="gap-1.5">
                <Pill className="h-4 w-4" /> Medicamentos
              </TabsTrigger>
            </TabsList>

            {/* ---------- Vacunas ---------- */}
            <TabsContent value="vacunas" className="mt-4 space-y-6">
              {loading ? (
                <p className="text-center text-muted-foreground py-12">Cargando...</p>
              ) : (
                visiblePets.map((pet) => {
                  const history = vaccines
                    .filter((v) => v.petId === pet.id)
                    .sort((a, b) => b.appliedDate.localeCompare(a.appliedDate) || Number(b.id) - Number(a.id));
                  return (
                    <section key={pet.id} aria-label={`Vacunas de ${pet.name}`}>
                      <h2 className="mb-2 font-semibold">{pet.name}</h2>
                      {history.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                          Sin vacunas registradas.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {history.map((v) => {
                            const isLatest = latestVaccineIds.has(v.id);
                            const due = isLatest ? vaccineDueStatus(v.nextDoseDate) : null;
                            return (
                              <Card key={v.id} className="flex gap-4 p-4 border-border/50 shadow-card">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
                                  <Syringe className="h-5 w-5 text-secondary-foreground" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold">{v.name}</p>
                                    {due && (
                                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", VACCINE_DUE_CONFIG[due].className)}>
                                        {VACCINE_DUE_CONFIG[due].label}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Aplicada el {formatDate(v.appliedDate)}
                                    {v.clinic && ` · ${v.clinic}`}
                                  </p>
                                  {v.nextDoseDate && (
                                    <p className="text-sm text-muted-foreground">
                                      {isLatest
                                        ? `Próximo refuerzo: ${formatDate(v.nextDoseDate)}`
                                        : `Refuerzo previsto para ${formatDate(v.nextDoseDate)} (ya registrado)`}
                                    </p>
                                  )}
                                  {v.notes && <p className="mt-1 text-sm text-muted-foreground">{v.notes}</p>}
                                  <div className="mt-2 flex gap-1">
                                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2" onClick={() => openVaccine(v)}>
                                      <Pencil className="h-3.5 w-3.5" /> Editar
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 gap-1.5 px-2 text-destructive hover:text-destructive"
                                      onClick={() => setToDelete({ kind: "vacuna", id: v.id, name: v.name })}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                })
              )}
            </TabsContent>

            {/* ---------- Medicamentos ---------- */}
            <TabsContent value="medicamentos" className="mt-4 space-y-3">
              <div className="flex gap-3 rounded-lg border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Los recordatorios de dosis aparecen en el inicio y en Alertas mientras el tratamiento esté activo. Sigue
                  siempre las indicaciones de tu veterinario.
                </p>
              </div>
              {loading ? (
                <p className="text-center text-muted-foreground py-12">Cargando...</p>
              ) : visibleMedications.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">Aún no hay medicamentos registrados</p>
              ) : (
                visibleMedications.map((m) => {
                  const status = MEDICATION_STATUS_CONFIG[m.status];
                  const lastDose = m.administeredDoses[m.administeredDoses.length - 1];
                  return (
                    <Card key={m.id} className={cn("flex gap-4 p-4 border-border/50 shadow-card", m.status === "finalizado" && "opacity-80")}>
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
                        <Pill className="h-5 w-5 text-secondary-foreground" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{m.name}</p>
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", status.className)}>{status.label}</span>
                          <span className="text-xs text-muted-foreground">· {m.petName}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {m.dose} · {frequencyLabel(m.frequencyHours)} · del {formatDate(m.startDate)} al {formatDate(m.endDate)}
                        </p>
                        {m.status !== "finalizado" && m.nextDoseAt && (
                          <p className="flex items-center gap-1.5 text-sm">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            Próxima dosis: {formatDose(m.nextDoseAt)}
                            {canMark(m.nextDoseAt) && (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 pl-1"
                                disabled={busyDose === `${m.id}:${m.nextDoseAt}`}
                                onClick={() => handleDose(m, m.nextDoseAt!)}
                              >
                                Marcar como administrada
                              </Button>
                            )}
                          </p>
                        )}
                        {m.overdueDoses.length > 0 && (
                          <div className="mt-2 space-y-1.5 rounded-md bg-status-observation/5 p-3">
                            <p className="text-xs font-semibold text-status-observation">Dosis pendientes por marcar</p>
                            {m.overdueDoses.map((d) => (
                              <div key={d} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                <span>{formatDose(d)}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1"
                                  disabled={busyDose === `${m.id}:${d}`}
                                  onClick={() => handleDose(m, d)}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Administrada
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {m.administeredDoses.length} {m.administeredDoses.length === 1 ? "dosis administrada" : "dosis administradas"}
                          {lastDose && ` · última: ${formatDose(lastDose)}`}
                          {lastDose && (
                            <button
                              type="button"
                              className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
                              onClick={() => handleDose(m, lastDose, true)}
                              disabled={busyDose === `${m.id}:${lastDose}`}
                            >
                              <Undo2 className="h-3 w-3" /> Deshacer
                            </button>
                          )}
                        </p>
                        {m.notes && <p className="text-sm text-muted-foreground">{m.notes}</p>}
                        <div className="flex gap-1 pt-1">
                          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2" onClick={() => openMedication(m)}>
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 px-2 text-destructive hover:text-destructive"
                            onClick={() => setToDelete({ kind: "medicamento", id: m.id, name: m.name })}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Eliminar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Formulario de vacuna */}
      <Dialog open={vaccineDialog} onOpenChange={setVaccineDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVaccine ? "Editar vacuna" : "Nueva vacuna"}</DialogTitle>
            <DialogDescription>Registra la vacuna aplicada y, si aplica, la fecha del próximo refuerzo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <PetSelect pets={pets} value={vaccineForm.petId} onChange={(petId) => setVaccineForm((f) => ({ ...f, petId }))} />
            <div>
              <Label htmlFor="vaccine-name">Vacuna *</Label>
              <Input
                id="vaccine-name"
                maxLength={100}
                value={vaccineForm.name}
                onChange={(e) => setVaccineForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Rabia, Parvovirus, Triple felina"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="vaccine-applied">Fecha de aplicación *</Label>
                <Input
                  id="vaccine-applied"
                  type="date"
                  max={todayInAppTimeZone()}
                  value={vaccineForm.appliedDate}
                  onChange={(e) => setVaccineForm((f) => ({ ...f, appliedDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="vaccine-next">Próximo refuerzo</Label>
                <Input
                  id="vaccine-next"
                  type="date"
                  min={vaccineForm.appliedDate}
                  value={vaccineForm.nextDoseDate}
                  onChange={(e) => setVaccineForm((f) => ({ ...f, nextDoseDate: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="vaccine-clinic">Veterinario o clínica</Label>
              <Input
                id="vaccine-clinic"
                maxLength={100}
                value={vaccineForm.clinic}
                onChange={(e) => setVaccineForm((f) => ({ ...f, clinic: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
            <div>
              <Label htmlFor="vaccine-notes">Notas</Label>
              <Textarea
                id="vaccine-notes"
                rows={3}
                maxLength={500}
                value={vaccineForm.notes}
                onChange={(e) => setVaccineForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Opcional: lote, reacciones, indicaciones..."
              />
            </div>
            <Button className="w-full" onClick={saveVaccine} disabled={saving}>
              {saving ? "Guardando..." : editingVaccine ? "Guardar cambios" : "Registrar vacuna"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Formulario de medicamento */}
      <Dialog open={medicationDialog} onOpenChange={setMedicationDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMedication ? "Editar medicamento" : "Nuevo medicamento"}</DialogTitle>
            <DialogDescription>Las dosis se programan cada cierto número de horas desde la primera dosis.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <PetSelect pets={pets} value={medicationForm.petId} onChange={(petId) => setMedicationForm((f) => ({ ...f, petId }))} />
            <div>
              <Label htmlFor="med-name">Medicamento *</Label>
              <Input
                id="med-name"
                maxLength={100}
                value={medicationForm.name}
                onChange={(e) => setMedicationForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Meloxicam"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="med-dose">Dosis *</Label>
                <Input
                  id="med-dose"
                  maxLength={60}
                  value={medicationForm.dose}
                  onChange={(e) => setMedicationForm((f) => ({ ...f, dose: e.target.value }))}
                  placeholder="Ej: 1 tableta, 5 ml"
                />
              </div>
              <div>
                <Label htmlFor="med-frequency">Cada (horas) *</Label>
                <Input
                  id="med-frequency"
                  type="number"
                  min={1}
                  list="frequency-presets"
                  value={medicationForm.frequencyHours}
                  onChange={(e) => setMedicationForm((f) => ({ ...f, frequencyHours: e.target.value }))}
                />
                <datalist id="frequency-presets">
                  {FREQUENCY_PRESETS.map((h) => (
                    <option key={h} value={h}>
                      {frequencyLabel(h)}
                    </option>
                  ))}
                </datalist>
                {Number(medicationForm.frequencyHours) >= 1 && (
                  <p className="mt-1 text-xs text-muted-foreground">{frequencyLabel(Number(medicationForm.frequencyHours))}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="med-start-date">Inicio *</Label>
                <Input
                  id="med-start-date"
                  type="date"
                  value={medicationForm.startDate}
                  onChange={(e) => setMedicationForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="med-start-time">Hora de la primera dosis *</Label>
                <Input
                  id="med-start-time"
                  type="time"
                  value={medicationForm.startTime}
                  onChange={(e) => setMedicationForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fin del tratamiento *</Label>
                <Select
                  value={medicationForm.endMode}
                  onValueChange={(v) => setMedicationForm((f) => ({ ...f, endMode: v as MedicationForm["endMode"] }))}
                >
                  <SelectTrigger aria-label="Fin del tratamiento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="duracion">Duración en días</SelectItem>
                    <SelectItem value="fecha">Fecha de fin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {medicationForm.endMode === "fecha" ? (
                <div>
                  <Label htmlFor="med-end-date">Último día</Label>
                  <Input
                    id="med-end-date"
                    type="date"
                    min={medicationForm.startDate}
                    value={medicationForm.endDate}
                    onChange={(e) => setMedicationForm((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="med-duration">Días</Label>
                  <Input
                    id="med-duration"
                    type="number"
                    min={1}
                    value={medicationForm.durationDays}
                    onChange={(e) => setMedicationForm((f) => ({ ...f, durationDays: e.target.value }))}
                  />
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="med-notes">Notas</Label>
              <Textarea
                id="med-notes"
                rows={3}
                maxLength={500}
                value={medicationForm.notes}
                onChange={(e) => setMedicationForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Opcional: con comida, motivo del tratamiento..."
              />
            </div>
            <Button className="w-full" onClick={saveMedication} disabled={saving}>
              {saving ? "Guardando..." : editingMedication ? "Guardar cambios" : "Registrar medicamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {toDelete?.kind === "vacuna" ? "esta vacuna" : "este medicamento"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{toDelete?.name}"
              {toDelete?.kind === "medicamento" && " junto con el registro de dosis administradas"}. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const PetSelect = ({ pets, value, onChange }: { pets: Pet[]; value: string; onChange: (petId: string) => void }) => (
  <div>
    <Label>Mascota *</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Mascota">
        <SelectValue placeholder="Selecciona la mascota" />
      </SelectTrigger>
      <SelectContent>
        {pets.map((pet) => (
          <SelectItem key={pet.id} value={pet.id}>
            {pet.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default SaludPage;
