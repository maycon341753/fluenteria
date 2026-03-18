import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-border bg-card/95 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <span className="text-2xl">🗣️</span>
          <span className="font-display text-2xl font-bold text-primary">Fluenteria</span>
        </button>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 md:flex">
          <button onClick={() => navigate("/")} className="font-body font-semibold text-foreground hover:text-primary transition-colors">
            Início
          </button>
          <button onClick={() => navigate("/lesson")} className="font-body font-semibold text-foreground hover:text-primary transition-colors">
            Aprender
          </button>
          <button onClick={() => navigate("/parent-dashboard")} className="font-body font-semibold text-foreground hover:text-primary transition-colors">
            Pais
          </button>
          <button onClick={() => navigate("/referrals")} className="font-body font-semibold text-foreground hover:text-primary transition-colors">
            Indicar
          </button>
          <button onClick={() => navigate("/eca-lgpd")} className="font-body font-semibold text-foreground hover:text-primary transition-colors">
            ECA e LGPD
          </button>
          <Button variant="default" size="sm" onClick={() => navigate("/login")}>
            Entrar
          </Button>
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
            <button onClick={() => { navigate("/"); setMenuOpen(false); }} className="font-body font-semibold text-foreground text-left py-2">Início</button>
            <button onClick={() => { navigate("/lesson"); setMenuOpen(false); }} className="font-body font-semibold text-foreground text-left py-2">Aprender</button>
            <button onClick={() => { navigate("/parent-dashboard"); setMenuOpen(false); }} className="font-body font-semibold text-foreground text-left py-2">Pais</button>
            <button onClick={() => { navigate("/referrals"); setMenuOpen(false); }} className="font-body font-semibold text-foreground text-left py-2">Indicar</button>
            <button onClick={() => { navigate("/eca-lgpd"); setMenuOpen(false); }} className="font-body font-semibold text-foreground text-left py-2">ECA e LGPD</button>
            <Button variant="default" onClick={() => { navigate("/login"); setMenuOpen(false); }}>Entrar</Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
