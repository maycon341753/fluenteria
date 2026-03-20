import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { FileDown } from "lucide-react";
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
  billing_cycle: "month" | "year" | null;
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

const addDaysIso = (value: string, days: number) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const getCycleDays = (cycle: Invoice["billing_cycle"]) => (cycle === "year" ? 365 : 30);

const getCycleLabel = (cycle: Invoice["billing_cycle"]) => (cycle === "year" ? "Anual" : "Mensal");

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const FinanceiroPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

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
      setUserDisplayName((sessionData.session.user.user_metadata?.full_name as string | undefined) ?? null);
      setUserEmail(sessionData.session.user.email ?? null);
      setUserCreatedAt((sessionData.session.user.created_at as string | undefined) ?? null);

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
        .select("id, status, amount_cents, currency, due_date, paid_at, created_at, billing_cycle")
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

  const latestPending = useMemo(() => pendingInvoices[0] ?? null, [pendingInvoices]);

  const latestPaid = useMemo(() => {
    const sorted = [...paidInvoices].sort((a, b) => {
      const da = new Date(a.paid_at ?? a.created_at).getTime();
      const db = new Date(b.paid_at ?? b.created_at).getTime();
      return db - da;
    });
    return sorted[0] ?? null;
  }, [paidInvoices]);

  const isFreePlan = useMemo(() => Boolean(plan && (plan.price_cents === 0 || plan.name.trim().toLowerCase() === "gratuito")), [plan]);

  const freeEndIso = useMemo(() => {
    if (!isFreePlan) return null;
    if (!userCreatedAt) return null;
    return addDaysIso(userCreatedAt, 10);
  }, [isFreePlan, userCreatedAt]);

  const freeDaysLeft = useMemo(() => {
    if (!freeEndIso) return null;
    const end = new Date(freeEndIso).getTime();
    if (!Number.isFinite(end)) return null;
    const diff = end - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [freeEndIso]);

  const freeExpired = useMemo(() => (freeDaysLeft !== null ? freeDaysLeft <= 0 : false), [freeDaysLeft]);

  const nextDueIso = useMemo(() => {
    if (subscription?.plan_id && isFreePlan) return freeEndIso;
    if (latestPending) return addDaysIso(latestPending.created_at, getCycleDays(latestPending.billing_cycle));
    if (latestPaid) return addDaysIso(latestPaid.paid_at ?? latestPaid.created_at, getCycleDays(latestPaid.billing_cycle));
    return subscription?.current_period_end ?? null;
  }, [freeEndIso, isFreePlan, latestPaid, latestPending, subscription?.current_period_end, subscription?.plan_id]);

  const openReceipt = (inv: Invoice) => {
    if (inv.status !== "paid") return;

    const title = "Comprovante de pagamento";
    const paidAt = formatDate(inv.paid_at ?? inv.created_at);
    const createdAt = formatDate(inv.created_at);
    const amount = formatMoney(inv.amount_cents, inv.currency);
    const cycle = getCycleLabel(inv.billing_cycle);
    const client = escapeHtml(userDisplayName ?? userEmail ?? "—");
    const planName = escapeHtml(plan?.name ?? "—");
    const invoiceId = escapeHtml(inv.id);

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; }
    .wrap { max-width: 720px; margin: 0 auto; }
    .card { border: 2px solid #e2e8f0; border-radius: 16px; padding: 20px; }
    .row { display: flex; justify-content: space-between; gap: 16px; }
    .title { font-size: 22px; font-weight: 900; margin: 0; }
    .muted { color: #64748b; font-size: 13px; margin-top: 6px; }
    .divider { height: 1px; background: #e2e8f0; margin: 16px 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .label { color: #64748b; font-size: 12px; margin: 0 0 2px; }
    .value { font-weight: 700; margin: 0; }
    .amount { font-size: 24px; font-weight: 900; }
    .badge { display: inline-block; background: #dcfce7; color: #166534; border: 1px solid #86efac; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; }
    @media print { body { padding: 0; } .card { border: none; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="row">
        <div>
          <p class="title">${title}</p>
          <div class="muted">Fluenteria · CNPJ: 39.433.448/0001-34</div>
        </div>
        <div class="badge">Pago</div>
      </div>
      <div class="divider"></div>
      <div class="grid">
        <div>
          <p class="label">Cliente</p>
          <p class="value">${client}</p>
        </div>
        <div>
          <p class="label">Plano</p>
          <p class="value">${planName}</p>
        </div>
        <div>
          <p class="label">Ciclo</p>
          <p class="value">${cycle}</p>
        </div>
        <div>
          <p class="label">Valor</p>
          <p class="value amount">${amount}</p>
        </div>
        <div>
          <p class="label">Pago em</p>
          <p class="value">${paidAt}</p>
        </div>
        <div>
          <p class="label">Criada em</p>
          <p class="value">${createdAt}</p>
        </div>
        <div style="grid-column: 1 / -1;">
          <p class="label">Fatura</p>
          <p class="value">${invoiceId}</p>
        </div>
      </div>
    </div>
  </div>
  <script>
    window.addEventListener('load', () => { window.print(); });
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) {
      window.location.assign(url);
    } else {
      try {
        w.opener = null;
      } catch {
        // ignore
      }
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

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
                    {subscription?.plan_id ? (
                      <div className="rounded-2xl border-2 border-border bg-background p-4">
                        <p className="font-body text-sm text-muted-foreground">Renovação</p>
                        <p className="mt-1 font-display text-lg font-bold text-foreground">{formatDate(nextDueIso)}</p>
                        {isFreePlan && freeDaysLeft !== null ? (
                          <p className="mt-1 font-body text-xs text-muted-foreground">
                            {freeExpired
                              ? "Período gratuito expirado. Assine um plano para continuar."
                              : `Acesso gratuito restante: ${freeDaysLeft} dias`}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
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
                      {nextDueIso ? (
                        <p className="mt-1 font-body text-xs text-muted-foreground">
                          Próximo vencimento: {formatDate(nextDueIso)}
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
                              <p className="font-body text-sm font-semibold text-foreground">
                                Vencimento: {formatDate(addDaysIso(inv.created_at, getCycleDays(inv.billing_cycle)))}
                              </p>
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
                              <div className="flex items-center justify-end gap-2">
                                <p className="font-display text-lg font-bold text-foreground">{formatMoney(inv.amount_cents, inv.currency)}</p>
                                <Button variant="outline" size="sm" onClick={() => openReceipt(inv)} aria-label="Gerar comprovante">
                                  <FileDown className="h-4 w-4" />
                                </Button>
                              </div>
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
