import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav, FullNavItems } from "@/components/MobileNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Outlet, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { useGym } from "@/hooks/useGym";
import { GymBrand } from "@/components/GymBrand";

export function AppLayout() {
  const { isAdmin, isCoach, isMember, isReceptionist, loading } = useRole();
  const { gym } = useGym();
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSheetOpen(false);
  }, [location.pathname]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b px-4">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground hidden md:flex" />
            <div className="flex items-center gap-2 md:hidden">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-4 overflow-y-auto">
                  <SheetHeader className="mb-4">
                    <SheetTitle>
                      <GymBrand
                        gymName={gym?.name}
                        gymLogoUrl={gym?.logo_url}
                        gymColor={gym?.primary_color}
                        size="md"
                        showName={false}
                      />
                    </SheetTitle>
                    {!loading && (isAdmin || isCoach || isReceptionist || isMember) && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-foreground/70 w-fit">
                        {isAdmin ? "Admin" : isCoach ? "Coach" : isReceptionist ? "Recepción" : "Socio"}
                      </span>
                    )}
                  </SheetHeader>
                  <FullNavItems />
                </SheetContent>
              </Sheet>
              <GymBrand
                gymName={gym?.name}
                gymLogoUrl={gym?.logo_url}
                gymColor={gym?.primary_color}
                size="sm"
                showName={false}
              />
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto pb-20 md:pb-6">
            <Outlet />
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
