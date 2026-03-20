import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type PlanRow = {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  interval: "month" | "year";
  max_level: number | null;
  max_users: number | null;
};

type UserSubscription = {
  plan_id: string | null;
  status: "active" | "past_due" | "canceled" | "trialing";
};

type PixCheckout = {
  payment_id: string;
  invoice_id: string;
  amount_cents: number;
  currency: string;
  pix_payload: string;
  qr_code_base64?: string;
  expires_at: string | null;
};

type PixPaymentStatus = "pending" | "paid" | "expired" | "canceled";

const formatMoney = (amountCents: number, currency: string) => {
  const amount = amountCents / 100;
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const getPlanMarketing = (name: string) => {
  const key = name.trim().toLowerCase();

  if (key === "gratuito") {
    return {
      emoji: "🟢",
      subtitle: "Para conhecer a plataforma",
      highlights: ["Acesso ao nível 1", "Ideal para testar"],
      benefits: ["10 dias de acesso", "Gamificação básica", "Acesso ao módulo selecionado"],
      variant: "outline" as const,
      popular: false,
    };
  }

  if (key === "premium") {
    return {
      emoji: "🔵",
      subtitle: "Para avançar com velocidade",
      highlights: ["Todos os níveis", "Lições ilimitadas"],
      benefits: ["Painel dos pais completo", "Notificações WhatsApp", "Até 6 usuários (Família)", "7 dias grátis"],
      variant: "hero" as const,
      popular: true,
    };
  }

  if (key === "max") {
    return {
      emoji: "🟣",
      subtitle: "Para performance máxima",
      highlights: ["Tudo do Premium", "Relatórios avançados"],
      benefits: ["Suporte prioritário", "Correção por IA avançada", "Conteúdo exclusivo", "7 dias grátis"],
      variant: "referral" as const,
      popular: false,
    };
  }

  return {
    emoji: "⭐",
    subtitle: "Plano de assinatura",
    highlights: ["Benefícios exclusivos"],
    benefits: ["Acesso conforme o plano"],
    variant: "default" as const,
    popular: false,
  };
};

const FinanceiroPlanosPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isSubmittingPlanId, setIsSubmittingPlanId] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<PlanRow | null>(null);
  const [checkout, setCheckout] = useState<PixCheckout | null>(null);
  const [checkoutQr, setCheckoutQr] = useState<string | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<PixPaymentStatus | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const load = async () => {
    if (!supabase) {
      setErrorMessage("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      navigate("/login");
      return;
    }

    const { data: planData, error: planError } = await supabase
      .from("plans")
      .select("id, name, price_cents, currency, interval, max_level, max_users")
      .order("price_cents", { ascending: true })
      .limit(20);

    if (planError) {
      setErrorMessage(planError.message);
      setIsLoading(false);
      return;
    }

    const { data: subData, error: subError } = await supabase
      .from("user_subscriptions")
      .select("plan_id, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (subError) {
      setErrorMessage(subError.message);
      setIsLoading(false);
      return;
    }

    setPlans(((planData ?? []) as PlanRow[]) ?? []);
    setSubscription((subData ?? null) as UserSubscription | null);
    setIsLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const currentPlanId = subscription?.plan_id ?? null;

  const sortedPlans = useMemo(() => {
    const list = [...plans];
    return list.sort((a, b) => {
      const ap = a.price_cents ?? 0;
      const bp = b.price_cents ?? 0;
      if (ap !== bp) return ap - bp;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });
  }, [plans]);

  const openCheckout = async (plan: PlanRow) => {
    if (!supabase) return;
    setCheckoutPlan(plan);
    setCheckout(null);
    setCheckoutQr(null);
    setCheckoutStatus(null);
    setCheckoutError(null);
    setCheckoutOpen(true);

    if (plan.price_cents === 0) {
      setIsSubmittingPlanId(plan.id);
      setErrorMessage(null);
      try {
        const { error } = await supabase.rpc("request_plan_subscription", { p_plan_id: plan.id });
        if (error) {
          setCheckoutError(error.message);
          return;
        }
        toast({ title: "Plano atualizado", description: "Plano gratuito ativado." });
        setCheckoutStatus("paid");
        await load();
      } finally {
        setIsSubmittingPlanId(null);
      }
      return;
    }

    setIsCheckingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-create-pix-checkout", { body: { plan_id: plan.id } });
      if (error) {
        setCheckoutError(error.message);
        return;
      }

      const checkoutRow = (data as PixCheckout | null) ?? null;
      if (!checkoutRow?.payment_id || !checkoutRow?.pix_payload) {
        setCheckoutError("Resposta inválida do checkout PIX.");
        return;
      }

      setCheckout(checkoutRow);
      setCheckoutStatus("pending");
      if (checkoutRow.qr_code_base64) {
        setCheckoutQr(`data:image/png;base64,${checkoutRow.qr_code_base64}`);
      } else {
        setCheckoutError("QR Code não disponível.");
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  useEffect(() => {
    if (!supabase) return;
    if (!checkoutOpen) return;
    if (!checkout?.payment_id) return;
    if (checkoutStatus !== "pending") return;

    let active = true;
    const interval = window.setInterval(async () => {
      const { data, error } = await supabase
        .from("pix_payments")
        .select("status")
        .eq("id", checkout.payment_id)
        .maybeSingle();

      if (!active) return;
      if (error) {
        setCheckoutError(error.message);
        return;
      }

      const status = (data?.status as PixPaymentStatus | undefined) ?? "pending";
      setCheckoutStatus(status);
      if (status === "paid") {
        await load();
      }
    }, 3000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [checkout?.payment_id, checkoutOpen, checkoutStatus]);

  const copyPix = async () => {
    if (!checkout?.pix_payload) return;
    try {
      await navigator.clipboard.writeText(checkout.pix_payload);
      toast({ title: "Copiado", description: "Código PIX copiado para a área de transferência." });
    } catch {
      toast({ title: "Não foi possível copiar" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">Financeiro · Planos</h1>
              <p className="mt-2 font-body text-muted-foreground">Escolha o plano ideal e assine com um clique.</p>
            </div>
            <Button variant="outline" onClick={() => navigate("/financeiro")}>
              Voltar
            </Button>
          </div>

          {isLoading ? (
            <div className="rounded-3xl border-2 border-border bg-card p-6 font-body text-muted-foreground">Carregando...</div>
          ) : errorMessage ? (
            <div className="rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-6">
              <p className="font-body font-semibold text-destructive">Não foi possível carregar.</p>
              <p className="mt-2 font-body text-sm text-destructive/90">{errorMessage}</p>
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="rounded-3xl border-2 border-border bg-card p-6">
                <div className="font-body text-sm text-muted-foreground">Plano atual</div>
                <div className="mt-2 font-display text-xl font-bold text-foreground">
                  {sortedPlans.find((p) => p.id === currentPlanId)?.name ?? "Gratuito"}
                </div>
                <div className="mt-1 font-body text-sm text-muted-foreground">Status: {subscription?.status ?? "—"}</div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                {sortedPlans.map((p) => {
                  const m = getPlanMarketing(p.name);
                  const isCurrent = currentPlanId === p.id;
                  const priceLabel =
                    p.price_cents === 0
                      ? "R$ 0"
                      : `${formatMoney(p.price_cents, p.currency)}/${p.interval === "year" ? "ano" : "mês"}`;

                  return (
                    <div
                      key={p.id}
                      className={`rounded-3xl border-2 bg-card p-6 ${m.popular ? "border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]" : "border-border"}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{m.emoji}</span>
                            <h2 className="font-display text-2xl font-bold text-foreground">{p.name}</h2>
                          </div>
                          <p className="mt-2 font-body text-sm text-muted-foreground">{m.subtitle}</p>
                        </div>
                        {m.popular ? (
                          <span className="rounded-full bg-primary/15 px-3 py-1 font-body text-xs font-semibold text-primary">
                            Popular
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-5 rounded-2xl border-2 border-border bg-background p-4">
                        <div className="font-display text-3xl font-bold text-foreground">{priceLabel}</div>
                        <div className="mt-2 grid gap-1">
                          {m.highlights.map((h) => (
                            <div key={h} className="font-body text-sm text-muted-foreground">
                              {h}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-2">
                        {m.benefits.map((b) => (
                          <div key={b} className="rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-sm text-foreground">
                            {b}
                          </div>
                        ))}
                      </div>

                      <div className="mt-6">
                        <Button
                          className="w-full"
                          variant={m.variant}
                          size="lg"
                          disabled={isCurrent || isSubmittingPlanId === p.id}
                          onClick={() => openCheckout(p)}
                        >
                          {isCurrent ? "Plano atual" : "Assinar plano"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Pagamento via PIX</DialogTitle>
            <DialogDescription>
              {checkoutPlan
                ? `Plano: ${checkoutPlan.name} · ${checkoutPlan.price_cents === 0 ? "R$ 0" : formatMoney(checkoutPlan.price_cents, checkoutPlan.currency)}`
                : "—"}
            </DialogDescription>
          </DialogHeader>

          {checkoutError ? (
            <div className="rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-4 font-body text-sm text-destructive/90">
              {checkoutError}
            </div>
          ) : null}

          {checkoutPlan?.price_cents === 0 && checkoutStatus === "paid" ? (
            <div className="rounded-3xl border-2 border-success/40 bg-success/5 p-4 font-body text-sm text-success">
              Plano ativado com sucesso.
            </div>
          ) : null}

          {isCheckingOut ? (
            <div className="rounded-3xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
              Gerando QR Code PIX...
            </div>
          ) : null}

          {checkout && checkoutQr ? (
            <div className="grid gap-4">
              <div className="flex items-center justify-center">
                <img src={checkoutQr} alt="QR Code PIX" className="h-72 w-72 rounded-3xl border-2 border-border bg-background p-3" />
              </div>
              <div className="rounded-3xl border-2 border-border bg-background p-4">
                <div className="font-body text-xs text-muted-foreground">PIX copia e cola</div>
                <div className="mt-2 break-all font-mono text-xs text-foreground">{checkout.pix_payload}</div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={copyPix}>
                    Copiar
                  </Button>
                </div>
              </div>

              {checkoutStatus === "pending" ? (
                <div className="rounded-3xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                  Aguardando pagamento...
                </div>
              ) : null}

              {checkoutStatus === "paid" ? (
                <div className="rounded-3xl border-2 border-success/40 bg-success/5 p-4 font-body text-sm text-success">
                  Pagamento confirmado.
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
              Fechar
            </Button>
            {checkoutStatus === "paid" ? (
              <Button
                onClick={() => {
                  setCheckoutOpen(false);
                  navigate("/financeiro");
                }}
              >
                Sucesso!
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
};

export default FinanceiroPlanosPage;
