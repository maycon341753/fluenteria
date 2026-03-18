import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ChildDashboard = () => {
  const navigate = useNavigate();
  const [level, setLevel] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!supabase) {
        if (!mounted) return;
        setIsLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        navigate("/login");
        return;
      }

      const { data: selectionData } = await supabase.from("user_learning_path").select("level").eq("module", "crianca").single();
      if (!mounted) return;

      setLevel(selectionData?.level ?? null);
      setIsLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 md:py-14">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="font-display text-3xl font-bold text-foreground">Dashboard Criança 🧒</h1>
            <Button variant="outline" onClick={() => navigate("/modulos")}>
              Trocar módulo
            </Button>
          </div>

          <div className="rounded-3xl border-2 border-border bg-card p-6">
            <p className="font-body text-muted-foreground">
              {isLoading ? "Carregando..." : level ? `Nível selecionado: ${level}` : "Nenhum nível selecionado ainda."}
            </p>
            <div className="mt-4">
              <Button variant="hero" size="lg" onClick={() => navigate("/lesson")}>
                Começar lições
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ChildDashboard;
