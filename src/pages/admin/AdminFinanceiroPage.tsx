import AdminShell from "@/components/admin/AdminShell";
import RequireSuperAdmin from "@/components/admin/RequireSuperAdmin";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";

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

type SubscriptionRow = {
  user_id: string;
  plan_id: string | null;
  status: "active" | "trialing" | "past_due" | "canceled";
  updated_at: string;
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
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);

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

      setInvoices(((invData ?? []) as InvoiceRow[]) ?? []);
      setSubscriptions(((subData ?? []) as SubscriptionRow[]) ?? []);
      setIsLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const totals = useMemo(() => {
    const paid = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.amount_cents, 0);
    const pending = invoices.filter((i) => i.status === "pending").reduce((sum, i) => sum + i.amount_cents, 0);
    const paidCount = invoices.filter((i) => i.status === "paid").length;
    const pendingCount = invoices.filter((i) => i.status === "pending").length;
    return { paid, pending, paidCount, pendingCount };
  }, [invoices]);

  const activeSubs = useMemo(() => subscriptions.filter((s) => s.status === "active").length, [subscriptions]);

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
            <div className="mt-4">
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
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-body text-xs text-muted-foreground">{inv.user_id.slice(0, 8)}…</TableCell>
                      <TableCell className="font-body">{inv.status}</TableCell>
                      <TableCell className="font-body">{formatMoney(inv.amount_cents, inv.currency)}</TableCell>
                      <TableCell className="font-body">{formatDateTime(inv.due_date)}</TableCell>
                      <TableCell className="font-body">{formatDateTime(inv.paid_at)}</TableCell>
                      <TableCell className="font-body">{formatDateTime(inv.created_at)}</TableCell>
                    </TableRow>
                  ))}
                  {!invoices.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="font-body text-muted-foreground">
                        Nenhuma fatura encontrada.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
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
