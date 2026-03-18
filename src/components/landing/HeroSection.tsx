import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-kids.png";
import { Star, Zap, Trophy } from "lucide-react";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-background py-12 md:py-20">
      {/* Floating decorations */}
      <div className="absolute top-10 left-10 animate-float">
        <Star className="h-8 w-8 text-gamification" fill="hsl(var(--gamification))" />
      </div>
      <div className="absolute top-20 right-16 animate-float" style={{ animationDelay: "1s" }}>
        <Zap className="h-6 w-6 text-primary" fill="hsl(var(--primary))" />
      </div>
      <div className="absolute bottom-20 left-20 animate-float" style={{ animationDelay: "2s" }}>
        <Trophy className="h-7 w-7 text-success" fill="hsl(var(--success))" />
      </div>

      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-8 md:flex-row md:gap-12">
          <div className="flex-1 text-center md:text-left">
            <div className="mb-4 inline-block rounded-full bg-gamification/20 px-4 py-2 font-display text-sm font-semibold text-gamification-foreground">
              🎮 Aprenda inglês brincando!
            </div>
            <h1 className="mb-4 font-display text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
              Aprenda idiomas de forma simples,{" "}
              <span className="text-primary">rápida</span> e{" "}
              <span className="text-success">divertida</span>
            </h1>
            <p className="mb-8 max-w-lg font-body text-lg text-muted-foreground md:text-xl">
              Para todas as idades. E para crianças, os pais acompanham a evolução pelo WhatsApp🚀
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center md:justify-start">
              <Button variant="hero" size="xl" onClick={() => navigate("/lesson")}>
                Começar Grátis 🎉
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate("/pricing")}>
                Ver Planos
              </Button>
            </div>
            <div className="mt-6 flex items-center justify-center gap-6 md:justify-start">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-5 w-5 text-gamification" fill="hsl(var(--gamification))" />
                ))}
              </div>
              <span className="font-body text-sm text-muted-foreground">
                +10.000 famílias aprendendo
              </span>
            </div>
          </div>
          <div className="flex-1">
            <img
              src={heroImage}
              alt="Crianças aprendendo inglês com Fluenteria"
              className="w-full max-w-lg mx-auto rounded-3xl shadow-2xl animate-bounce-in"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
