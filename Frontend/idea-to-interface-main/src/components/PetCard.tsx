import { type Pet } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PetCardProps {
  pet: Pet;
  onClick?: () => void;
  onAddRecord?: () => void;
}

const PetCard = ({ pet, onClick, onAddRecord }: PetCardProps) => {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card
        className="w-[min(82vw,285px)] shrink-0 overflow-hidden border-border/50 shadow-card transition-shadow hover:shadow-soft"
        onClick={onClick}
      >
        <div className="p-4">
          <div className="relative mb-4 h-36 overflow-hidden rounded-xl bg-muted">
            <img src={pet.avatar} alt={pet.name} className="h-full w-full object-cover" />
            <div className="absolute right-2 top-2">
              <StatusBadge status={pet.status} size="sm" />
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-semibold">{pet.name}</h3>
            <p className="text-sm text-muted-foreground">{pet.breed} · {pet.age} años · {pet.weight} kg</p>
            {pet.condition && (
              <p className="text-xs text-muted-foreground/70 mt-1">📋 {pet.condition}</p>
            )}
          </div>
          {onAddRecord && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full gap-1.5"
              onClick={(event) => {
                event.stopPropagation();
                onAddRecord();
              }}
            >
              <Plus className="h-4 w-4" />
              Agregar registro
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default PetCard;
