import { type Pet } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

interface PetCardProps {
  pet: Pet;
  onClick?: () => void;
}

const PetCard = ({ pet, onClick }: PetCardProps) => {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card
        className="cursor-pointer overflow-hidden border-border/50 shadow-card hover:shadow-soft transition-shadow"
        onClick={onClick}
      >
        <div className="flex items-center gap-4 p-5">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-primary/20">
            <img src={pet.avatar} alt={pet.name} className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold truncate">{pet.name}</h3>
              <StatusBadge status={pet.status} size="sm" />
            </div>
            <p className="text-sm text-muted-foreground">{pet.breed} · {pet.age} años · {pet.weight} kg</p>
            {pet.condition && (
              <p className="text-xs text-muted-foreground/70 mt-1">📋 {pet.condition}</p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default PetCard;
