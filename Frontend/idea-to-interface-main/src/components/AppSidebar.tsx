import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getReminders, REMINDERS_CHANGED_EVENT } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ClipboardList, Bell, FileText, Dog, PawPrint, ChevronDown, LogOut } from "lucide-react";
import { useUserRole, ROLE_CONFIG, UserRole } from "@/lib/UserRoleContext";
import { useAuth } from "@/lib/auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// El inicio (dashboard) se abre desde el logo/nombre de la aplicación
const NAV_ITEMS = [
  { to: "/registro", icon: ClipboardList, label: "Registro Diario" },
  { to: "/alertas", icon: Bell, label: "Alertas" },
  { to: "/reportes", icon: FileText, label: "Reportes" },
  { to: "/mascotas", icon: Dog, label: "Mis Mascotas" },
];

const AppSidebar = () => {
  const { pathname } = useLocation();
  const { role } = useUserRole();
  const { user, logout } = useAuth();
  const config = user ? ROLE_CONFIG[user.role as UserRole] : ROLE_CONFIG[role];
  // mascotas con el registro de hoy pendiente; se actualiza al cambiar de página
  const [pendingLogs, setPendingLogs] = useState(0);

  useEffect(() => {
    if (!user) return;
    const refresh = () =>
      getReminders()
        .then((list) => setPendingLogs(list.filter((r) => r.type === "daily_log").length))
        .catch((e) => console.error("failed reminders", e));
    refresh();
    // también al guardar un registro sin cambiar de página
    window.addEventListener(REMINDERS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(REMINDERS_CHANGED_EVENT, refresh);
  }, [pathname, user]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center gap-5 px-4 py-3 md:px-8">
        <Link
          to="/dashboard"
          title="Ir al inicio"
          aria-label="Ir al inicio"
          aria-current={pathname === "/dashboard" ? "page" : undefined}
          className="flex shrink-0 items-center gap-2.5 rounded-xl transition-opacity hover:opacity-80"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <PawPrint className="h-5 w-5 text-primary" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">MyPet</span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
                {item.to === "/registro" && pendingLogs > 0 && (
                  <span
                    className="flex h-5 min-w-5 items-center justify-center rounded-full bg-status-observation px-1.5 text-[10px] font-bold text-white"
                    title={`${pendingLogs} registro(s) de hoy pendiente(s)`}
                    aria-label={`${pendingLogs} registro(s) de hoy pendiente(s)`}
                  >
                    {pendingLogs}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button className="hidden items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 sm:flex">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">IA</span>
            LIA
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full px-1.5 py-1.5 outline-none transition-colors hover:bg-muted">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                {config.initials}
              </div>
              <div className="hidden text-left lg:block">
                <p className="max-w-28 truncate text-sm font-semibold">{user ? user.name : config.name}</p>
                <p className="text-xs text-muted-foreground">{user ? user.role : config.label}</p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user && (
                <DropdownMenuItem onClick={logout} className="font-medium">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default AppSidebar;
