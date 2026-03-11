import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ClipboardList, Bell, FileText, Dog, PawPrint, ChevronDown } from "lucide-react";
import { useUserRole, ROLE_CONFIG, UserRole } from "@/lib/UserRoleContext";
import { useAuth } from "@/lib/auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/registro", icon: ClipboardList, label: "Registro Diario" },
  { to: "/alertas", icon: Bell, label: "Alertas" },
  { to: "/reportes", icon: FileText, label: "Reportes" },
  { to: "/mascotas", icon: Dog, label: "Mis Mascotas" },
];

const AppSidebar = () => {
  const { pathname } = useLocation();
  const { role, setRole } = useUserRole();
  const { user, logout } = useAuth();
  const config = user ? ROLE_CONFIG[user.role as UserRole] : ROLE_CONFIG[role];

  return (
    <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <PawPrint className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <span className="font-display text-xl font-bold text-sidebar-foreground">PawGuard</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer with user info + logout */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 w-full rounded-lg px-2 py-2 hover:bg-sidebar-accent/50 transition-colors outline-none">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-foreground">
              {config.initials}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-sidebar-foreground">
                {user ? user.name : config.name}
              </p>
              <p className="text-xs text-sidebar-muted">
                {user ? user.role : config.label}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-sidebar-muted" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {user && (
              <DropdownMenuItem onClick={logout} className="font-medium">
                Cerrar sesión
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
};

export default AppSidebar;
