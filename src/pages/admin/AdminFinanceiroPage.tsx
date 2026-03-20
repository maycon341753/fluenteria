import AdminShell from "@/components/admin/AdminShell";
import RequireSuperAdmin from "@/components/admin/RequireSuperAdmin";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

type InvoiceRow = {
  id: string;
  user_id: string;
  status: "pending" | "paid" | "canceled";
  amount_cents: number;
  currency: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

type SubscriptionRow = {
  user_id: string;
  plan_id: string | null;
  status: "active" | "trialing" | "past_due" | "canceled";
  updated_at: string;
};

type FinanceMetricRow = {
  month: number;
  revenue_cents: number;
  paying_users: number;
  paid_invoices: number;
};

const formatMoney = (amountCents: number, currency: string) => {
  const amount = amountCents / 100;
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
};

const AdminFinanceiroPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [profilesByUserId, setProfilesByUserId] = useState<Record<string, ProfileRow>>({});
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [metricsYear, setMetricsYear] = useState<number>(new Date().getFullYear());
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<FinanceMetricRow[]>([]);

  const latestInvoices = useMemo(() => invoices.slice(0, 5), [invoices]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!supabase) {
        if (!mounted) return;
        setErrorMessage("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
        setIsLoading(false);
        return;
      }

      const { data: invData, error: invError } = await supabase
        .from("invoices")
        .select("id, user_id, status, amount_cents, currency, due_date, paid_at, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!mounted) return;

      if (invError) {
        setErrorMessage(invError.message);
        setIsLoading(false);
        return;
      }

      const invRows = ((invData ?? []) as InvoiceRow[]) ?? [];
      const userIds = Array.from(new Set(invRows.map((r) => r.user_id).filter(Boolean)));
      if (userIds.length) {
        const { data: profData, error: profError } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds)
          .limit(200);

        if (!mounted) return;

        if (!profError) {
          const map: Record<string, ProfileRow> = {};
          for (const p of ((profData ?? []) as ProfileRow[]) ?? []) {
            if (p.user_id) map[p.user_id] = p;
          }
          setProfilesByUserId(map);
        }
      }

      const { data: subData, error: subError } = await supabase
        .from("user_subscriptions")
        .select("user_id, plan_id, status, updated_at")
        .order("updated_at", { ascending: false })
        .limit(200);

      if (!mounted) return;

      if (subError) {
        setErrorMessage(subError.message);
        setIsLoading(false);
        return;
      }

      setInvoices(invRows);
      setSubscriptions(((subData ?? []) as SubscriptionRow[]) ?? []);
      setIsLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!supabase) return;
      setMetricsLoading(true);
      setMetricsError(null);
      const { data, error } = await supabase.rpc("admin_finance_metrics", { p_year: metricsYear });
      if (!mounted) return;
      if (error) {
        setMetricsError(error.message);
        setMetrics([]);
      } else {
        setMetrics(((data ?? []) as FinanceMetricRow[]) ?? []);
      }
      setMetricsLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [metricsYear]);

  const totals = useMemo(() => {
    const paid = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.amount_cents, 0);
    const pending = invoices.filter((i) => i.status === "pending").reduce((sum, i) => sum + i.amount_cents, 0);
    const paidCount = invoices.filter((i) => i.status === "paid").length;
    const pendingCount = invoices.filter((i) => i.status === "pending").length;
    return { paid, pending, paidCount, pendingCount };
  }, [invoices]);

  const activeSubs = useMemo(() => subscriptions.filter((s) => s.status === "active").length, [subscriptions]);

  const chartData = useMemo(() => {
    const byMonth = new Map<number, FinanceMetricRow>();
    for (const row of metrics) byMonth.set(row.month, row);
    const rows = Array.from({ length: 12 }).map((_, idx) => {
      const month = idx + 1;
      const row = byMonth.get(month);
      return {
        month,
        label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(metricsYear, idx, 1)),
        revenueCents: row?.revenue_cents ?? 0,
        payingUsers: row?.paying_users ?? 0,
        paidInvoices: row?.paid_invoices ?? 0,
      };
    });
    return rows;
  }, [metrics, metricsYear]);

  return (
    <AdminShell title="Financeiro">
      {isLoading ? (
        <div className="rounded-3xl border-2 border-border bg-card p-6 font-body text-muted-foreground">Carregando...</div>
      ) : errorMessage ? (
        <div className="rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-6">
          <p className="font-body font-semibold text-destructive">Não foi possível carregar.</p>
          <p className="mt-2 font-body text-sm text-destructive/90">{errorMessage}</p>
        </div>
      ) : (
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border-2 border-border bg-card p-6">
              <p className="font-body text-sm text-muted-foreground">Faturas pendentes</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">{totals.pendingCount}</p>
              <p className="mt-1 font-body text-sm text-muted-foreground">{formatMoney(totals.pending, "BRL")}</p>
            </div>
            <div className="rounded-3xl border-2 border-border bg-card p-6">
              <p className="font-body text-sm text-muted-foreground">Faturas pagas</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">{totals.paidCount}</p>
              <p className="mt-1 font-body text-sm text-muted-foreground">{formatMoney(totals.paid, "BRL")}</p>
            </div>
            <div className="rounded-3xl border-2 border-border bg-card p-6">
              <p className="font-body text-sm text-muted-foreground">Assinaturas ativas</p>
              <p className="mt-2 font-display text-3xl font-bold text-foreground">{activeSubs}</p>
              <p className="mt-1 font-body text-sm text-muted-foreground">Últimas 200</p>
            </div>
          </div>

          <div className="rounded-3xl border-2 border-border bg-card p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold text-foreground">Últimas faturas</h2>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Atualizar
              </Button>
            </div>
            <div className="mt-4 hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Pago em</TableHead>
                    <TableHead>Criada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-body">
                        {profilesByUserId[inv.user_id]?.full_name ?? profilesByUserId[inv.user_id]?.email ?? `${inv.user_id.slice(0, 8)}…`}
                      </TableCell>
                      <TableCell className="font-body">{inv.status}</TableCell>
                      <TableCell className="font-body">{formatMoney(inv.amount_cents, inv.currency)}</TableCell>
                      <TableCell className="font-body">{formatDateTime(inv.due_date)}</TableCell>
                      <TableCell className="font-body">{formatDateTime(inv.paid_at)}</TableCell>
                      <TableCell className="font-body">{formatDateTime(inv.created_at)}</TableCell>
                    </TableRow>
                  ))}
                  {!latestInvoices.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="font-body text-muted-foreground">
                        Nenhuma fatura encontrada.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 grid gap-3 md:hidden">
              {latestInvoices.length ? (
                latestInvoices.map((inv) => (
                  <div key={inv.id} className="rounded-3xl border-2 border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-body text-xs text-muted-foreground">
                          {profilesByUserId[inv.user_id]?.full_name ?? profilesByUserId[inv.user_id]?.email ?? `${inv.user_id.slice(0, 8)}…`}
                        </div>
                        <div className="mt-1 font-display text-lg font-bold text-foreground">{formatMoney(inv.amount_cents, inv.currency)}</div>
                        <div className="mt-1 font-body text-sm text-muted-foreground">{inv.status}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-body text-xs text-muted-foreground">Vencimento</div>
                        <div className="font-body text-sm text-foreground">{formatDateTime(inv.due_date)}</div>
                        <div className="mt-2 font-body text-xs text-muted-foreground">Pago em</div>
                        <div className="font-body text-sm text-foreground">{formatDateTime(inv.paid_at)}</div>
                      </div>
                    </div>
                    <div className="mt-3 font-body text-xs text-muted-foreground">Criada: {formatDateTime(inv.created_at)}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                  Nenhuma fatura encontrada.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border-2 border-border bg-card p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">Gráfico financeiro</h2>
                <p className="mt-1 font-body text-sm text-muted-foreground">Assinaturas (usuários pagantes) e receita por mês.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setMetricsYear((y) => y - 1)} disabled={metricsLoading}>
                  ◀
                </Button>
                <div className="rounded-2xl border-2 border-border bg-background px-4 py-2 font-body text-sm text-foreground">
                  {metricsYear}
                </div>
                <Button variant="outline" onClick={() => setMetricsYear((y) => y + 1)} disabled={metricsLoading}>
                  ▶
                </Button>
              </div>
            </div>

            {metricsError ? (
              <div className="mt-4 rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-4 font-body text-sm text-destructive/90">
                {metricsError}
              </div>
            ) : null}

            <div className="mt-4 overflow-hidden rounded-3xl border-2 border-border bg-background p-4">
              <ChartContainer
                config={{
                  payingUsers: { label: "Assinaturas", color: "hsl(var(--primary))" },
                  revenue: { label: "Receita", color: "hsl(var(--referral))" },
                }}
                className="h-[260px] w-full"
              >
                <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-payingUsers)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-payingUsers)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickMargin={8} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tickMargin={8} width={48} allowDecimals={false} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                    width={72}
                    tickFormatter={(v) => formatMoney(Number(v), "BRL")}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(label) => label}
                        formatter={(value, name) => {
                          if (name === "payingUsers") {
                            return (
                              <div className="flex w-full justify-between gap-4">
                                <span className="text-muted-foreground">Assinaturas</span>
                                <span className="font-mono font-medium tabular-nums text-foreground">{Number(value ?? 0)}</span>
                              </div>
                            );
                          }
                          if (name === "revenue") {
                            return (
                              <div className="flex w-full justify-between gap-4">
                                <span className="text-muted-foreground">Receita</span>
                                <span className="font-mono font-medium tabular-nums text-foreground">
                                  {formatMoney(Number(value ?? 0), "BRL")}
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div className="flex w-full justify-between gap-4">
                              <span className="text-muted-foreground">{String(name)}</span>
                              <span className="font-mono font-medium tabular-nums text-foreground">{String(value ?? "")}</span>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenueCents"
                    name="revenue"
                    stroke="var(--color-revenue)"
                    fill="url(#fillRevenue)"
                    strokeWidth={2}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="payingUsers"
                    name="payingUsers"
                    stroke="var(--color-payingUsers)"
                    fill="url(#fillUsers)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
};

const AdminFinanceiroPageProtected = () => (
  <RequireSuperAdmin>
    <AdminFinanceiroPage />
  </RequireSuperAdmin>
);

export default AdminFinanceiroPageProtected;
