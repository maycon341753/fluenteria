import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ActivePlanCard from "@/components/account/ActivePlanCard";
import { Button } from "@/components/ui/button";
import LessonProgressPanel from "@/components/dashboard/LessonProgressPanel";
import { useNavigate } from "react-router-dom";

const ChildDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 md:py-14">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="font-display text-3xl font-bold text-foreground">Dashboard Criança 🧒</h1>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <ActivePlanCard />
              <Button variant="outline" onClick={() => navigate("/modulos")}>
                Trocar módulo
              </Button>
            </div>
          </div>

          <LessonProgressPanel module="crianca" />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ChildDashboard;
