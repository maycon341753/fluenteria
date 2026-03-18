import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";

const plans = [
  {
    name: "Gratuito",
    emoji: "🟢",
    price: "R$ 0",
    period: "",
    features: ["Acesso a 1 nível", "5 lições por dia durante 10 dias", "Gamificação básica"],
    variant: "outline" as const,
    popular: false,
  },
  {
    name: "Premium",
    emoji: "🔵",
    price: "R$ 24,99",
    period: "/mês",
    yearlyPrice: "R$ 159,99/ano",
    features: [
      "Todos os níveis",
      "Lições ilimitadas",
      "Painel dos pais completo",
      "Notificações WhatsApp",
      "Até 6 usuários (Família)",
      "7 dias grátis",
    ],
    variant: "hero" as const,
    popular: true,
  },
  {
    name: "Max",
    emoji: "🟣",
    price: "R$ 49,99",
    period: "/mês",
    features: [
      "Tudo do Premium",
      "Relatórios avançados",
      "Suporte prioritário",
      "Correção por IA avançada",
      "Conteúdo exclusivo",
      "7 dias grátis",
    ],
    variant: "referral" as const,
    popular: false,
  },
];

const PricingSection = () => {
  return (
    <section className="bg-background py-16 md:py-24" id="pricing">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 font-display text-3xl font-bold text-foreground md:text-4xl">
            Escolha seu plano 💎
          </h2>
          <p className="mx-auto max-w-2xl font-body text-lg text-muted-foreground">
            Comece grátis e evolua quando quiser. Teste o Premium por 7 dias sem compromisso!
          </p>
        </div>
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl border-2 p-6 transition-all hover:-translate-y-1 hover:shadow-xl ${
                plan.popular
                  ? "border-primary bg-primary/5 shadow-lg scale-105"
                  : "border-border bg-card"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 font-display text-xs font-bold text-primary-foreground flex items-center gap-1">
                  <Star className="h-3 w-3" fill="currentColor" /> MAIS POPULAR
                </div>
              )}
              <div className="mb-4 text-center">
                <span className="text-3xl">{plan.emoji}</span>
                <h3 className="mt-2 font-display text-2xl font-bold text-foreground">
                  {plan.name}
                </h3>
                <div className="mt-2">
                  <span className="font-display text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="font-body text-muted-foreground">{plan.period}</span>
                </div>
                {plan.yearlyPrice && (
                  <p className="mt-1 font-body text-sm text-success">
                    ou {plan.yearlyPrice} (economize!)
                  </p>
                )}
              </div>
              <ul className="mb-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 font-body text-foreground">
                    <Check className="h-5 w-5 shrink-0 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button variant={plan.variant} className="w-full" size="lg">
                {plan.price === "R$ 0" ? "Começar Grátis" : "Teste 7 Dias Grátis"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
