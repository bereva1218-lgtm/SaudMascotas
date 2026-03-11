import { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "cuidador" | "administrador" | "gerente";

export const ROLE_CONFIG: Record<UserRole, { label: string; initials: string; name: string }> = {
  cuidador: { label: "Cuidador", initials: "JC", name: "Juan Cuidador" },
  administrador: { label: "Administrador", initials: "MA", name: "María Admin" },
  gerente: { label: "Gerente", initials: "CG", name: "Carlos Gerente" },
};

interface UserRoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const UserRoleContext = createContext<UserRoleContextType>({ role: "cuidador", setRole: () => {} });

export const UserRoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<UserRole>("cuidador");
  return (
    <UserRoleContext.Provider value={{ role, setRole }}>
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRole = () => useContext(UserRoleContext);
