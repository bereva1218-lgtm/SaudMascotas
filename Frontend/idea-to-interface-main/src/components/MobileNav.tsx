import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ClipboardList, Bell, FileText, Dog, Users } from "lucide-react";
import { useUserRole, ROLE_CONFIG, UserRole } from "@/lib/UserRoleContext";
import { useAuth } from "@/lib/auth";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Inicio" },
  { to: "/registro", icon: ClipboardList, label: "Registro" },
  { to: "/alertas", icon: Bell, label: "Alertas" },
  { to: "/reportes", icon: FileText, label: "Reportes" },
  { to: "/mascotas", icon: Dog, label: "Mascotas" },
];

const MobileNav = () => {
  const { pathname } = useLocation();
  const { role, setRole } = useUserRole();
  const { user, logout } = useAuth();
  const roles: UserRole[] = ["cuidador", "administrador", "gerente"];
  const nextRole = () => {
    const idx = roles.indexOf(role);
    setRole(roles[(idx + 1) % roles.length]);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-card/95 backdrop-blur-md">
      <div className="flex items-center justify-around py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        {user && (
          <button
            onClick={logout}
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-xs text-muted-foreground transition-colors"
          >
            <Users className="h-5 w-5" />
            <span>Salir</span>
          </button>
        )}
        <button
          onClick={nextRole}
          className="flex flex-col items-center gap-0.5 px-2 py-1 text-xs text-muted-foreground transition-colors"
        >
          <Users className="h-5 w-5" />
          <span className="truncate max-w-[3.5rem]">{ROLE_CONFIG[role].label}</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileNav;
