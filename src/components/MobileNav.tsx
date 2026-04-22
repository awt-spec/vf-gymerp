import {
  LayoutDashboard, Users, CreditCard, ScanLine, CalendarDays,
  Dumbbell, Apple, Package, Receipt, HandCoins, LogOut, TrendingUp, UserCircle, Home, BarChart3, Wallet, Megaphone, ShoppingBag
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { useGymFeatures } from "@/hooks/useGymFeatures";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const sharedItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Socios", url: "/socios", icon: Users },
  { title: "Acceso", url: "/acceso", icon: ScanLine },
  { title: "Clases", url: "/clases", icon: CalendarDays },
];

const coachItems = [
  { title: "Ejercicio", url: "/planes-ejercicio", icon: Dumbbell },
  { title: "Nutrición", url: "/planes-nutricion", icon: Apple },
  { title: "Progreso", url: "/progreso", icon: TrendingUp },
];

const receptionistExtras = [
  { title: "Planes", url: "/planes", icon: CreditCard },
  { title: "Tienda", url: "/tienda", icon: ShoppingBag },
];

const adminItems = [
  { title: "Planes", url: "/planes", icon: CreditCard },
  { title: "Cobranza", url: "/cobranza", icon: HandCoins },
  { title: "Pasarela", url: "/pagos", icon: Wallet },
  { title: "Tienda", url: "/tienda", icon: ShoppingBag },
  { title: "CRM", url: "/mercadeo", icon: Megaphone },
  { title: "Contabilidad", url: "/contabilidad", icon: Receipt },
  { title: "Inventario", url: "/inventario", icon: Package },
  { title: "Reportes", url: "/reportes", icon: BarChart3 },
];

export function MobileBottomNav() {
  const { isAdmin, isCoach, isMember, isReceptionist } = useRole();
  const { isRouteEnabled } = useGymFeatures();
  const location = useLocation();

  const isStaffUser = isAdmin || isCoach || isReceptionist;

  let allItems;
  if (isStaffUser) {
    allItems = [
      sharedItems[0],
      sharedItems[1],
      sharedItems[2],
      ...(isAdmin ? [adminItems[0]] : isReceptionist ? [receptionistExtras[0]] : isCoach ? [coachItems[0]] : []),
      sharedItems[3],
    ];
  } else {
    allItems = [
      { title: "Mi Gym", url: "/mi-gym", icon: Home },
      { title: "Perfil", url: "/perfil", icon: UserCircle },
    ];
  }

  // Filter by enabled features then take first 5
  const items = allItems.filter(item => isRouteEnabled(item.url)).slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-16 px-1">
        {items.map((item) => {
          const isActive = item.url === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(item.url);
          return (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/dashboard"}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[56px]",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-tight">{item.title}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export function FullNavItems() {
  const { isAdmin, isCoach, isMember, isReceptionist } = useRole();
  const { isRouteEnabled } = useGymFeatures();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("current_gym_id");
    localStorage.removeItem("last_gym_slug");
    toast({ title: "Sesión cerrada" });
    navigate("/");
  };

  let allItems;
  if (isAdmin) {
    allItems = [...sharedItems, ...coachItems, ...adminItems];
  } else if (isReceptionist) {
    allItems = [...sharedItems, ...receptionistExtras];
  } else if (isCoach) {
    allItems = [...sharedItems, ...coachItems];
  } else if (isMember) {
    allItems = [{ title: "Mi Gym", url: "/mi-gym", icon: Home }];
  } else {
    allItems = [...sharedItems, ...coachItems, ...adminItems];
  }

  // Filter by enabled features
  const items = allItems.filter(item => isRouteEnabled(item.url));

  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => (
        <NavLink
          key={item.url}
          to={item.url}
          end={item.url === "/dashboard"}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-muted-foreground hover:bg-muted/50"
          activeClassName="bg-primary/10 text-foreground font-medium"
        >
          <item.icon className="h-5 w-5" />
          <span>{item.title}</span>
        </NavLink>
      ))}
      <NavLink
        to="/perfil"
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-muted-foreground hover:bg-muted/50 mt-4 border-t border-border pt-4"
        activeClassName="bg-primary/10 text-foreground font-medium"
      >
        <UserCircle className="h-5 w-5" />
        <span>Mi Perfil</span>
      </NavLink>
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-muted-foreground hover:bg-destructive/10 hover:text-destructive mt-2"
      >
        <LogOut className="h-5 w-5" />
        <span>Cerrar Sesión</span>
      </button>
    </div>
  );
}
