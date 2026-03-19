import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

type ModuleKey = "crianca" | "adolescente" | "adulto";

const getDashboardForModule = (module: ModuleKey) => {
  if (module === "crianca") return { label: "Dashboard Criança", path: "/dashboard/crianca" };
  if (module === "adolescente") return { label: "Dashboard Adolescente", path: "/dashboard/adolescente" };
  return { label: "Dashboard Adulto", path: "/dashboard/adulto" };
};

const Navbar = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<ModuleKey | null>(null);

  useEffect(() => {
    let mounted = true;

    const setSessionState = (user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null) => {
      if (!user) {
        setUserName(null);
        setSelectedModule(null);
        return;
      }

      setUserName((user.user_metadata?.full_name as string | undefined) ?? user.email ?? null);
    };

    const fetchModule = async (userId: string) => {
      if (!supabase) return;
      const { data } = await supabase.from("user_learning_path").select("module").eq("user_id", userId).maybeSingle();
      if (!mounted) return;
      const module = data?.module as ModuleKey | undefined;
      setSelectedModule(module ?? null);
    };

    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const user = data.session?.user;
      setSessionState(user ? { id: user.id, email: user.email, user_metadata: user.user_metadata } : null);
      if (user) {
        await fetchModule(user.id);
      }
    })();

    if (!supabase) return () => {
      mounted = false;
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setSessionState(user ? { id: user.id, email: user.email, user_metadata: user.user_metadata } : null);
      if (user) {
        void fetchModule(user.id);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const isLoggedIn = Boolean(userName);
  const dashboard = selectedModule ? getDashboardForModule(selectedModule) : null;

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-border bg-card/95 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <span className="text-2xl">🗣️</span>
          <span className="font-display text-2xl font-bold text-primary">Fluenteria</span>
        </button>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 md:flex">
          {isLoggedIn ? (
            <>
              <button onClick={() => navigate("/modulos")} className="font-body font-semibold text-foreground hover:text-primary transition-colors">
                Módulos
              </button>
              <button onClick={() => navigate("/financeiro")} className="font-body font-semibold text-foreground hover:text-primary transition-colors">
                Financeiro
              </button>
              {dashboard ? (
                <>
                  <button onClick={() => navigate("/lesson")} className="font-body font-semibold text-foreground hover:text-primary transition-colors">
                    Aprender
                  </button>
                  <button onClick={() => navigate(dashboard.path)} className="font-body font-semibold text-foreground hover:text-primary transition-colors">
                    {dashboard.label}
                  </button>
                </>
              ) : null}
            </>
          ) : (
            <>
              <button onClick={() => navigate("/lesson")} className="font-body font-semibold text-foreground hover:text-primary transition-colors">
                Aprender
              </button>
              <button onClick={() => navigate("/parent-dashboard")} className="font-body font-semibold text-foreground hover:text-primary transition-colors">
                Pais
              </button>
              <button onClick={() => navigate("/referrals")} className="font-body font-semibold text-foreground hover:text-primary transition-colors">
                Indicar
              </button>
            </>
          )}
          {userName ? (
            <div className="flex items-center gap-3">
              <span className="font-body text-sm font-semibold text-foreground">{userName}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (supabase) {
                    await supabase.auth.signOut();
                  }
                  navigate("/");
                }}
              >
                Sair
              </Button>
            </div>
          ) : (
            <Button variant="default" size="sm" onClick={() => navigate("/login")}>
              Entrar
            </Button>
          )}
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden text-foreground" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-border bg-card px-4 py-4 md:hidden animate-slide-up">
          <div className="flex flex-col gap-3">
            {isLoggedIn ? (
              <>
                <button onClick={() => { navigate("/modulos"); setMenuOpen(false); }} className="font-body font-semibold text-foreground text-left py-2">
                  Módulos
                </button>
                <button onClick={() => { navigate("/financeiro"); setMenuOpen(false); }} className="font-body font-semibold text-foreground text-left py-2">
                  Financeiro
                </button>
                {dashboard ? (
                  <>
                    <button onClick={() => { navigate("/lesson"); setMenuOpen(false); }} className="font-body font-semibold text-foreground text-left py-2">
                      Aprender
                    </button>
                    <button onClick={() => { navigate(dashboard.path); setMenuOpen(false); }} className="font-body font-semibold text-foreground text-left py-2">
                      {dashboard.label}
                    </button>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <button onClick={() => { navigate("/"); setMenuOpen(false); }} className="font-body font-semibold text-foreground text-left py-2">Início</button>
                <button onClick={() => { navigate("/lesson"); setMenuOpen(false); }} className="font-body font-semibold text-foreground text-left py-2">Aprender</button>
                <button onClick={() => { navigate("/parent-dashboard"); setMenuOpen(false); }} className="font-body font-semibold text-foreground text-left py-2">Pais</button>
                <button onClick={() => { navigate("/referrals"); setMenuOpen(false); }} className="font-body font-semibold text-foreground text-left py-2">Indicar</button>
              </>
            )}
            {userName ? (
              <>
                <div className="font-body text-sm font-semibold text-foreground py-2">{userName}</div>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (supabase) {
                      await supabase.auth.signOut();
                    }
                    setMenuOpen(false);
                    navigate("/");
                  }}
                >
                  Sair
                </Button>
              </>
            ) : (
              <Button variant="default" onClick={() => { navigate("/login"); setMenuOpen(false); }}>Entrar</Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
