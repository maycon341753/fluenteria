import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type Plan = {
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
  current_period_end: string | null;
};

type Invoice = {
  id: string;
  status: "pending" | "paid" | "canceled";
  amount_cents: number;
  currency: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
};

const formatMoney = (amountCents: number, currency: string) => {
  const amount = amountCents / 100;
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(date);
};

const FinanceiroPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!supabase) {
        if (!mounted) return;
        setErrorMessage("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
        setIsLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;

      const userId = sessionData.session?.user.id;
      if (!userId) {
        navigate("/");
        return;
      }

      const { data: subData, error: subError } = await supabase
        .from("user_subscriptions")
        .select("plan_id, status, current_period_end")
        .eq("user_id", userId)
        .maybeSingle();

      if (!mounted) return;

      if (subError) {
        setErrorMessage(subError.message);
        setIsLoading(false);
        return;
      }

      const subscriptionRow = (subData ?? null) as UserSubscription | null;
      setSubscription(subscriptionRow);

      if (subscriptionRow?.plan_id) {
        const { data: planData, error: planError } = await supabase
          .from("plans")
          .select("id, name, price_cents, currency, interval, max_level, max_users")
          .eq("id", subscriptionRow.plan_id)
          .maybeSingle();

        if (!mounted) return;

        if (planError) {
          setErrorMessage(planError.message);
          setIsLoading(false);
          return;
        }

        setPlan((planData ?? null) as Plan | null);
      } else {
        setPlan(null);
      }

      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("id, status, amount_cents, currency, due_date, paid_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!mounted) return;

      if (invoicesError) {
        setErrorMessage(invoicesError.message);
        setIsLoading(false);
        return;
      }

      setInvoices(((invoicesData ?? []) as Invoice[]) ?? []);
      setIsLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const pendingInvoices = useMemo(() => invoices.filter((i) => i.status === "pending"), [invoices]);
  const paidInvoices = useMemo(() => invoices.filter((i) => i.status === "paid"), [invoices]);

  const nextPending = useMemo(() => {
    const sorted = [...pendingInvoices].sort((a, b) => {
      const da = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      const db = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      return da - db;
    });
    return sorted[0] ?? null;
  }, [pendingInvoices]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 md:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">Financeiro</h1>
              <p className="mt-2 font-body text-muted-foreground">
                Veja seu plano, faturas pagas e faturas pendentes.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/modulos")}>
              Voltar
            </Button>
          </div>

          {isLoading ? (
            <div className="rounded-3xl border-2 border-border bg-card p-6 font-body text-muted-foreground">
              Carregando...
            </div>
          ) : errorMessage ? (
            <div className="rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-6">
              <p className="font-body font-semibold text-destructive">Não foi possível carregar o financeiro.</p>
              <p className="mt-2 font-body text-sm text-destructive/90">{errorMessage}</p>
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-3xl border-2 border-border bg-card p-6 md:col-span-2">
                  <h2 className="font-display text-xl font-bold text-foreground">Plano atual</h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border-2 border-border bg-background p-4">
                      <p className="font-body text-sm text-muted-foreground">Plano</p>
                      <p className="mt-1 font-display text-lg font-bold text-foreground">{plan?.name ?? "Nenhum"}</p>
                    </div>
                    <div className="rounded-2xl border-2 border-border bg-background p-4">
                      <p className="font-body text-sm text-muted-foreground">Status</p>
                      <p className="mt-1 font-display text-lg font-bold text-foreground">{subscription?.status ?? "—"}</p>
                    </div>
                    <div className="rounded-2xl border-2 border-border bg-background p-4">
                      <p className="font-body text-sm text-muted-foreground">Valor</p>
                      <p className="mt-1 font-display text-lg font-bold text-foreground">
                        {plan ? `${formatMoney(plan.price_cents, plan.currency)}/${plan.interval === "year" ? "ano" : "mês"}` : "—"}
                      </p>
                    </div>
                    <div className="rounded-2xl border-2 border-border bg-background p-4">
                      <p className="font-body text-sm text-muted-foreground">Renovação</p>
                      <p className="mt-1 font-display text-lg font-bold text-foreground">{formatDate(subscription?.current_period_end ?? null)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Button variant="default" onClick={() => navigate("/financeiro/planos")}>
                      Ver planos
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/referrals")}>
                      Indicar e ganhar
                    </Button>
                  </div>
                </div>

                <div className="rounded-3xl border-2 border-border bg-card p-6">
                  <h2 className="font-display text-xl font-bold text-foreground">Resumo</h2>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl border-2 border-border bg-background p-4">
                      <p className="font-body text-sm text-muted-foreground">Pendentes</p>
                      <p className="mt-1 font-display text-2xl font-bold text-foreground">{pendingInvoices.length}</p>
                      {nextPending ? (
                        <p className="mt-1 font-body text-xs text-muted-foreground">
                          Próximo vencimento: {formatDate(nextPending.due_date)}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-2xl border-2 border-border bg-background p-4">
                      <p className="font-body text-sm text-muted-foreground">Pagas</p>
                      <p className="mt-1 font-display text-2xl font-bold text-foreground">{paidInvoices.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl border-2 border-border bg-card p-6">
                  <h2 className="font-display text-xl font-bold text-foreground">Faturas pendentes</h2>
                  <div className="mt-4 grid gap-3">
                    {pendingInvoices.length ? (
                      pendingInvoices.map((inv) => (
                        <div key={inv.id} className="rounded-2xl border-2 border-border bg-background p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-body text-sm font-semibold text-foreground">Vencimento: {formatDate(inv.due_date)}</p>
                              <p className="mt-1 font-body text-xs text-muted-foreground">Criada em: {formatDate(inv.created_at)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-display text-lg font-bold text-foreground">{formatMoney(inv.amount_cents, inv.currency)}</p>
                              <p className="mt-1 font-body text-xs text-muted-foreground">Pendente</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                        Nenhuma fatura pendente.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border-2 border-border bg-card p-6">
                  <h2 className="font-display text-xl font-bold text-foreground">Faturas pagas</h2>
                  <div className="mt-4 grid gap-3">
                    {paidInvoices.length ? (
                      paidInvoices.slice(0, 12).map((inv) => (
                        <div key={inv.id} className="rounded-2xl border-2 border-border bg-background p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-body text-sm font-semibold text-foreground">Pago em: {formatDate(inv.paid_at)}</p>
                              <p className="mt-1 font-body text-xs text-muted-foreground">Criada em: {formatDate(inv.created_at)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-display text-lg font-bold text-foreground">{formatMoney(inv.amount_cents, inv.currency)}</p>
                              <p className="mt-1 font-body text-xs text-muted-foreground">Paga</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                        Nenhuma fatura paga ainda.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FinanceiroPage;
