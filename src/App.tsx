import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LessonPage from "./pages/LessonPage";
import ParentDashboard from "./pages/ParentDashboard";
import ReferralsPage from "./pages/ReferralsPage";
import LoginPage from "./pages/LoginPage";
import PricingPage from "./pages/PricingPage";
import EcaLgpdPage from "./pages/EcaLgpdPage";
import ModuleSelectPage from "./pages/ModuleSelectPage";
import ChildDashboard from "./pages/ChildDashboard";
import TeenDashboard from "./pages/TeenDashboard";
import AdultDashboard from "./pages/AdultDashboard";
import FinanceiroPage from "./pages/FinanceiroPage";
import AdminIndexPage from "./pages/admin/AdminIndexPage";
import AdminFinanceiroPage from "./pages/admin/AdminFinanceiroPage";
import AdminClientesPage from "./pages/admin/AdminClientesPage";
import AdminPlanosPage from "./pages/admin/AdminPlanosPage";
import AdminChamadosPage from "./pages/admin/AdminChamadosPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/lesson" element={<LessonPage />} />
          <Route path="/parent-dashboard" element={<ParentDashboard />} />
          <Route path="/modulos" element={<ModuleSelectPage />} />
          <Route path="/dashboard/crianca" element={<ChildDashboard />} />
          <Route path="/dashboard/adolescente" element={<TeenDashboard />} />
          <Route path="/dashboard/adulto" element={<AdultDashboard />} />
          <Route path="/referrals" element={<ReferralsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/financeiro" element={<FinanceiroPage />} />
          <Route path="/admin" element={<AdminIndexPage />} />
          <Route path="/admin/financeiro" element={<AdminFinanceiroPage />} />
          <Route path="/admin/clientes" element={<AdminClientesPage />} />
          <Route path="/admin/planos" element={<AdminPlanosPage />} />
          <Route path="/admin/chamados" element={<AdminChamadosPage />} />
          <Route path="/eca-lgpd" element={<EcaLgpdPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
