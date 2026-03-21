import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { Check, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type DbPlan = {
  name: string;
  price_cents: number;
  currency: string;
  interval: "month" | "year";
  annual_discount_percent: number;
  is_active: boolean;
};

const formatMoney = (amountCents: number, currency: string) => {
  const amount = amountCents / 100;
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const marketingPlans = [
  {
    name: "Gratuito",
    emoji: "🟢",
    features: ["Acesso a 1 nível", "5 lições por dia durante 10 dias", "Gamificação básica"],
    variant: "outline" as const,
    popular: false,
  },
  {
    name: "Premium",
    emoji: "🔵",
    features: [
      "Todos os níveis",
      "Lições ilimitadas",
      "Painel completo",
      "Notificações WhatsApp",
      "Até 2 usuários (Família)",
      "Vídeos e Músicas completo",
    ],
    variant: "hero" as const,
    popular: true,
  },
  {
    name: "Max",
    emoji: "🟣",
    features: [
      "Tudo do Premium",
      "Relatórios avançados",
      "Suporte prioritário",
      "Correção por IA avançada",
      "Conteúdo exclusivo",
      "Vídeos e Músicas completo",
    ],
    variant: "referral" as const,
    popular: false,
  },
];

const PricingSection = () => {
  const navigate = useNavigate();
  const [dbPlans, setDbPlans] = useState<DbPlan[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from("plans")
        .select("name, price_cents, currency, interval, annual_discount_percent, is_active")
        .in("name", ["Gratuito", "Premium", "Max"])
        .limit(10);
      if (!mounted) return;
      setDbPlans(((data ?? []) as DbPlan[]) ?? []);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const byName = useMemo(() => {
    const map = new Map<string, DbPlan>();
    for (const p of dbPlans ?? []) map.set(p.name.trim().toLowerCase(), p);
    return map;
  }, [dbPlans]);

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
          {marketingPlans.map((plan) => {
            const db = byName.get(plan.name.trim().toLowerCase()) ?? null;
            if (plan.name !== "Gratuito" && db && db.is_active === false) return null;
            const priceCents = db?.price_cents ?? (plan.name === "Gratuito" ? 0 : plan.name === "Premium" ? 2499 : 4999);
            const currency = db?.currency ?? "BRL";
            const interval = db?.interval ?? (plan.name === "Gratuito" ? "month" : "month");
            const priceLabel = priceCents === 0 ? "R$ 0" : formatMoney(priceCents, currency);
            const periodLabel = priceCents === 0 ? "" : `/${interval === "year" ? "ano" : "mês"}`;
            const yearlyLabel =
              priceCents > 0 && interval === "month"
                ? (() => {
                    const percent = Math.max(0, Math.min(100, Number(db?.annual_discount_percent ?? 0)));
                    const base = priceCents * 12;
                    const discounted = Math.round((base * (100 - percent)) / 100);
                    const suffix = percent > 0 ? ` (economize ${percent}%)` : "";
                    return `${formatMoney(discounted, currency)}/ano${suffix}`;
                  })()
                : null;

            return (
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
                    {priceLabel}
                  </span>
                  <span className="font-body text-muted-foreground">{periodLabel}</span>
                </div>
                {yearlyLabel && (
                  <p className="mt-1 font-body text-sm text-success">
                    ou {yearlyLabel}
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
              <Button variant={plan.variant} className="w-full" size="lg" onClick={() => navigate("/login?mode=signup")}>
                {priceCents === 0 ? "Começar Grátis" : "Assine Já"}
              </Button>
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
