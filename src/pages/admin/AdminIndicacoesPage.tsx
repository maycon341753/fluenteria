import AdminShell from "@/components/admin/AdminShell";
import RequireSuperAdmin from "@/components/admin/RequireSuperAdmin";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";

type MetricsRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  referral_code: string | null;
  total_referred: number;
  active_referred: number;
  total_earnings_cents: number;
  earnings_since_from_cents: number;
  referred_revenue_total_cents: number;
  referred_revenue_since_from_cents: number;
};

const formatMoney = (amountCents: number, currency = "BRL") => {
  const amount = amountCents / 100;
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const daysToFromIso = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const AdminIndicacoesPage = () => {
  const [days, setDays] = useState<number>(30);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<MetricsRow[]>([]);

  const fromIso = useMemo(() => daysToFromIso(days), [days]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!supabase) {
        if (!mounted) return;
        setErrorMessage("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase.rpc("admin_referral_metrics", { p_from: fromIso });
      if (!mounted) return;
      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setRows(((data ?? []) as MetricsRow[]) ?? []);
      setIsLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [fromIso]);

  return (
    <AdminShell title="Indicações">
      {isLoading ? (
        <div className="rounded-3xl border-2 border-border bg-card p-6 font-body text-muted-foreground">Carregando...</div>
      ) : errorMessage ? (
        <div className="rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-6">
          <p className="font-body font-semibold text-destructive">Não foi possível carregar.</p>
          <p className="mt-2 font-body text-sm text-destructive/90">{errorMessage}</p>
        </div>
      ) : (
        <div className="grid gap-6">
          <div className="flex flex-col gap-3 rounded-3xl border-2 border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-body text-sm text-muted-foreground">Relatório por período</div>
            <div className="flex flex-wrap gap-2">
              {[7, 30, 90].map((v) => (
                <Button key={v} variant={days === v ? "hero" : "outline"} size="sm" onClick={() => setDays(v)}>
                  {v} dias
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border-2 border-border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-display text-sm font-bold text-muted-foreground">Usuário</th>
                  <th className="px-4 py-3 text-left font-display text-sm font-bold text-muted-foreground">Código</th>
                  <th className="px-4 py-3 text-right font-display text-sm font-bold text-muted-foreground">Indicados</th>
                  <th className="px-4 py-3 text-right font-display text-sm font-bold text-muted-foreground">Ativos</th>
                  <th className="px-4 py-3 text-right font-display text-sm font-bold text-muted-foreground">Ganhos ({days}d)</th>
                  <th className="px-4 py-3 text-right font-display text-sm font-bold text-muted-foreground">Ganhos total</th>
                  <th className="px-4 py-3 text-right font-display text-sm font-bold text-muted-foreground">Receita ({days}d)</th>
                  <th className="px-4 py-3 text-right font-display text-sm font-bold text-muted-foreground">Receita total</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((r, i) => (
                    <tr key={r.user_id} className={i < rows.length - 1 ? "border-b border-border" : ""}>
                      <td className="px-4 py-3">
                        <div className="font-body font-semibold text-foreground">{r.full_name || "—"}</div>
                        <div className="font-body text-xs text-muted-foreground">{r.email || "—"}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-foreground">{r.referral_code || "—"}</td>
                      <td className="px-4 py-3 text-right font-body text-foreground">{r.total_referred ?? 0}</td>
                      <td className="px-4 py-3 text-right font-body text-foreground">{r.active_referred ?? 0}</td>
                      <td className="px-4 py-3 text-right font-display font-bold text-referral">
                        {formatMoney(r.earnings_since_from_cents ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-display font-bold text-foreground">
                        {formatMoney(r.total_earnings_cents ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-body text-foreground">
                        {formatMoney(r.referred_revenue_since_from_cents ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-body text-foreground">{formatMoney(r.referred_revenue_total_cents ?? 0)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center font-body text-sm text-muted-foreground">
                      Sem dados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminShell>
  );
};

const AdminIndicacoesPageProtected = () => (
  <RequireSuperAdmin>
    <AdminIndicacoesPage />
  </RequireSuperAdmin>
);

export default AdminIndicacoesPageProtected;

