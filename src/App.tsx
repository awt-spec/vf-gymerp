import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/hooks/useAuth";
import { GymProvider } from "@/hooks/useGym";
import Index from "./pages/Index";
import GymLanding from "./pages/GymLanding";
import GymLogin from "./pages/GymLogin";
import Socios from "./pages/Socios";
import Planes from "./pages/Planes";
import PlanEditor from "./pages/PlanEditor";
import Acceso from "./pages/Acceso";
import Clases from "./pages/Clases";
import PlanesEjercicio from "./pages/PlanesEjercicio";
import PlanesNutricion from "./pages/PlanesNutricion";
import Inventario from "./pages/Inventario";
import Contabilidad from "./pages/Contabilidad";
import Cobranza from "./pages/Cobranza";
import Pagos from "./pages/Pagos";
import Mercadeo from "./pages/Mercadeo";
import Tienda from "./pages/Tienda";
import Reportes from "./pages/Reportes";
import ProgresoSocio from "./pages/ProgresoSocio";
import Perfil from "./pages/Perfil";
import MiGym from "./pages/MiGym";

import AdminLogin from "./pages/AdminLogin";
import ErpDashboard from "./pages/ErpDashboard";
import RegisterGym from "./pages/RegisterGym";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import RootLanding from "./pages/RootLanding";
import GymSelect from "./pages/GymSelect";
import SetupWizard from "./pages/SetupWizard";
import Usuarios from "./pages/Usuarios";
import CierresCaja from "./pages/CierresCaja";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <GymProvider>
              <Routes>
                <Route path="/" element={<RootLanding />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/gym-select" element={<GymSelect />} />
                <Route path="/admin" element={<AdminLogin />} />
                <Route
                  path="/erp-dashboard"
                  element={
                    <ProtectedRoute requiredRoles={["super_admin"]}>
                      <ErpDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="/register-gym" element={<RegisterGym />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route
                  path="/setup"
                  element={
                    <ProtectedRoute>
                      <SetupWizard />
                    </ProtectedRoute>
                  }
                />
                <Route path="/gym/:slug" element={<GymLanding />} />
                <Route path="/gym/:slug/login" element={<GymLogin />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<Index />} />
                  <Route path="/socios" element={<Socios />} />
                  <Route path="/planes" element={<Planes />} />
                  <Route path="/planes/nuevo" element={<PlanEditor />} />
                  <Route path="/planes/:id/editar" element={<PlanEditor />} />
                  <Route path="/acceso" element={<Acceso />} />
                  <Route path="/clases" element={<Clases />} />
                  <Route path="/planes-ejercicio" element={<PlanesEjercicio />} />
                  <Route path="/planes-nutricion" element={<PlanesNutricion />} />
                  <Route path="/inventario" element={<Inventario />} />
                  <Route path="/contabilidad" element={<Contabilidad />} />
                  <Route path="/cobranza" element={<Cobranza />} />
                  <Route path="/pagos" element={<Pagos />} />
                  <Route path="/mercadeo" element={<Mercadeo />} />
                  <Route path="/tienda" element={<Tienda />} />
                  <Route path="/reportes" element={<Reportes />} />
                  <Route path="/progreso" element={<ProgresoSocio />} />
                  <Route path="/perfil" element={<Perfil />} />
                  <Route path="/mi-gym" element={<MiGym />} />
                  <Route path="/usuarios" element={<Usuarios />} />
                  <Route path="/cierres-caja" element={<CierresCaja />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </GymProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
