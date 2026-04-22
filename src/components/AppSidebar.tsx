import {
  LayoutDashboard, Users, CreditCard, ScanLine, CalendarDays, LogOut,
  Dumbbell, Apple, Package, Receipt, HandCoins, TrendingUp, UserCircle, Home, BarChart3, Wallet, Megaphone, ShoppingBag, UserCog, Vault
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { useGym } from "@/hooks/useGym";
import { useGymFeatures } from "@/hooks/useGymFeatures";
import { toast } from "@/hooks/use-toast";
import { GymSwitcher } from "@/components/GymSwitcher";
import { GymBrand } from "@/components/GymBrand";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const sharedItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Usuarios", url: "/socios", icon: Users },
  { title: "Control de Acceso", url: "/acceso", icon: ScanLine },
  { title: "Clases y Horarios", url: "/clases", icon: CalendarDays },
];

const coachItems = [
  { title: "Planes Ejercicio", url: "/planes-ejercicio", icon: Dumbbell },
  { title: "Planes Nutrición", url: "/planes-nutricion", icon: Apple },
  { title: "Progreso Usuarios", url: "/progreso", icon: TrendingUp },
];

const receptionistItems = [
  { title: "Planes", url: "/planes", icon: CreditCard },
  { title: "Cobranza", url: "/cobranza", icon: HandCoins },
  { title: "Cierres de Caja", url: "/cierres-caja", icon: Vault },
  { title: "Tienda", url: "/tienda", icon: ShoppingBag },
];

const adminItems = [
  { title: "Planes", url: "/planes", icon: CreditCard },
  { title: "Cobranza", url: "/cobranza", icon: HandCoins },
  { title: "Cierres de Caja", url: "/cierres-caja", icon: Vault },
  { title: "Pasarela de Pagos", url: "/pagos", icon: Wallet },
  { title: "Tienda", url: "/tienda", icon: ShoppingBag },
  { title: "CRM & Mercadeo", url: "/mercadeo", icon: Megaphone },
  { title: "Contabilidad", url: "/contabilidad", icon: Receipt },
  { title: "Inventario", url: "/inventario", icon: Package },
  { title: "Reportes", url: "/reportes", icon: BarChart3 },
  { title: "Socios", url: "/usuarios", icon: UserCog },
];

const memberItems = [
  { title: "Mi Gym", url: "/mi-gym", icon: Home },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { isAdmin, isCoach, isMember, isReceptionist, loading } = useRole();
  const { gym } = useGym();
  const { isRouteEnabled } = useGymFeatures();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("current_gym_id");
    localStorage.removeItem("last_gym_slug");
    toast({ title: "Sesión cerrada" });
    navigate("/");
  };

  const isStaffUser = isAdmin || isCoach || isReceptionist;
  
  let items: typeof sharedItems = [];
  if (loading) {
    items = [];
  } else if (isAdmin) {
    items = [...sharedItems, ...coachItems, ...adminItems];
  } else if (isReceptionist) {
    items = [...sharedItems, ...receptionistItems];
  } else if (isCoach) {
    items = [...sharedItems, ...coachItems];
  } else if (isStaffUser) {
    items = sharedItems;
  } else if (isMember) {
    items = memberItems;
  }

  // Filter by enabled gym features
  items = items.filter(item => isRouteEnabled(item.url));

  return (
    <Sidebar collapsible="icon" className="hidden md:flex">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="mb-3 flex items-center justify-center py-2">
            <GymBrand
              gymName={gym?.name}
              gymLogoUrl={gym?.logo_url}
              gymColor={gym?.primary_color}
              size={collapsed ? "sm" : "md"}
              showName={false}
            />
          </SidebarGroupLabel>
          <GymSwitcher collapsed={collapsed} />
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="hover:bg-sidebar-accent/50 transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/perfil" className="hover:bg-sidebar-accent/50 transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                <UserCircle className="mr-2 h-4 w-4" />
                {!collapsed && <span>Mi Perfil</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Cerrar Sesión</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
