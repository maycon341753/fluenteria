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
          <Route path="/referrals" element={<ReferralsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/eca-lgpd" element={<EcaLgpdPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
