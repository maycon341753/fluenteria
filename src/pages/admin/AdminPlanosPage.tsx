import AdminShell from "@/components/admin/AdminShell";
import RequireSuperAdmin from "@/components/admin/RequireSuperAdmin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

type Plan = {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  interval: "month" | "year";
  max_level: number | null;
  max_users: number | null;
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

const AdminPlanosPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!supabase) {
        if (!mounted) return;
        setErrorMessage("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("plans")
        .select("id, name, price_cents, currency, interval, max_level, max_users, created_at")
        .order("price_cents", { ascending: true });

      if (!mounted) return;

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setPlans(((data ?? []) as Plan[]) ?? []);
      setIsLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AdminShell title="Planos">
      {isLoading ? (
        <div className="rounded-3xl border-2 border-border bg-card p-6 font-body text-muted-foreground">Carregando...</div>
      ) : errorMessage ? (
        <div className="rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-6">
          <p className="font-body font-semibold text-destructive">Não foi possível carregar.</p>
          <p className="mt-2 font-body text-sm text-destructive/90">{errorMessage}</p>
        </div>
      ) : (
        <div className="rounded-3xl border-2 border-border bg-card p-6">
          <h2 className="font-display text-xl font-bold text-foreground">Lista de planos</h2>
          <div className="mt-4 hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Intervalo</TableHead>
                  <TableHead>Níveis</TableHead>
                  <TableHead>Usuários</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-body font-semibold">{p.name}</TableCell>
                    <TableCell className="font-body">{formatMoney(p.price_cents, p.currency)}</TableCell>
                    <TableCell className="font-body">{p.interval === "year" ? "ano" : "mês"}</TableCell>
                    <TableCell className="font-body">{p.max_level ?? "Todos"}</TableCell>
                    <TableCell className="font-body">{p.max_users ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {!plans.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="font-body text-muted-foreground">
                      Nenhum plano encontrado.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 grid gap-3 md:hidden">
            {plans.length ? (
              plans.map((p) => (
                <div key={p.id} className="rounded-3xl border-2 border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-display text-lg font-bold text-foreground">{p.name}</div>
                      <div className="mt-1 font-body text-sm text-muted-foreground">
                        {formatMoney(p.price_cents, p.currency)}/{p.interval === "year" ? "ano" : "mês"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-body text-xs text-muted-foreground">Níveis</div>
                      <div className="font-body text-sm text-foreground">{p.max_level ?? "Todos"}</div>
                      <div className="mt-2 font-body text-xs text-muted-foreground">Usuários</div>
                      <div className="font-body text-sm text-foreground">{p.max_users ?? "—"}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                Nenhum plano encontrado.
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
};

const AdminPlanosPageProtected = () => (
  <RequireSuperAdmin>
    <AdminPlanosPage />
  </RequireSuperAdmin>
);

export default AdminPlanosPageProtected;
