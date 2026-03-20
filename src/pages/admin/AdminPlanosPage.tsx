import AdminShell from "@/components/admin/AdminShell";
import RequireSuperAdmin from "@/components/admin/RequireSuperAdmin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

type Plan = {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  interval: "month" | "year";
  annual_discount_percent: number;
  is_active: boolean;
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

const maskCurrencyFromCents = (cents: number, currency: string) => formatMoney(Number.isFinite(cents) ? cents : 0, currency);

const parseCurrencyToCents = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
};

const parsePercent = (value: string) => {
  const normalized = value.replace(",", ".").trim();
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
};

const AdminPlanosPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPriceCents, setEditPriceCents] = useState<number>(0);
  const [editPriceMasked, setEditPriceMasked] = useState("");
  const [editCurrency, setEditCurrency] = useState("BRL");
  const [editInterval, setEditInterval] = useState<Plan["interval"]>("month");
  const [editAnnualDiscountPercent, setEditAnnualDiscountPercent] = useState<number>(0);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editMaxLevel, setEditMaxLevel] = useState<number | "all">("all");
  const [editMaxUsers, setEditMaxUsers] = useState<number | "none">("none");
  const [isSaving, setIsSaving] = useState(false);

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
        .select("id, name, price_cents, currency, interval, annual_discount_percent, is_active, max_level, max_users, created_at")
        .order("price_cents", { ascending: true });

      if (!mounted) return;

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("annual_discount_percent") || msg.includes("is_active")) {
          const fallback = await supabase
            .from("plans")
            .select("id, name, price_cents, currency, interval, max_level, max_users, created_at")
            .order("price_cents", { ascending: true });

          if (!mounted) return;
          if (fallback.error) {
            setErrorMessage(fallback.error.message);
            setIsLoading(false);
            return;
          }

          setPlans(
            (((fallback.data ?? []) as Omit<Plan, "annual_discount_percent" | "is_active">[]) ?? []).map((p) => ({
              ...p,
              annual_discount_percent: 0,
              is_active: true,
            })),
          );
          setIsLoading(false);
          return;
        }

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

  const openEdit = (plan: Plan) => {
    setSelectedPlanId(plan.id);
    setEditName(plan.name ?? "");
    setEditCurrency(plan.currency ?? "BRL");
    const cents = plan.price_cents ?? 0;
    setEditPriceCents(cents);
    setEditPriceMasked(maskCurrencyFromCents(cents, plan.currency ?? "BRL"));
    setEditInterval(plan.interval ?? "month");
    setEditAnnualDiscountPercent(plan.annual_discount_percent ?? 0);
    setEditIsActive(plan.is_active ?? true);
    setEditMaxLevel(plan.max_level ?? "all");
    setEditMaxUsers(plan.max_users ?? "none");
    setEditOpen(true);
  };

  useEffect(() => {
    if (!editOpen) return;
    setEditPriceMasked(maskCurrencyFromCents(editPriceCents, editCurrency));
  }, [editCurrency, editOpen, editPriceCents]);

  const savePlan = async () => {
    if (!supabase || !selectedPlanId) return;
    if (!editName.trim()) {
      setErrorMessage("Informe o nome do plano.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const maxLevel = editMaxLevel === "all" ? null : Number(editMaxLevel);
      const maxUsers = editMaxUsers === "none" ? null : Number(editMaxUsers);

      const { error } = await supabase
        .from("plans")
        .update({
          name: editName.trim(),
          price_cents: Number(editPriceCents),
          currency: editCurrency.trim().toUpperCase(),
          interval: editInterval,
          annual_discount_percent: Math.max(0, Math.min(100, Number(editAnnualDiscountPercent))),
          is_active: Boolean(editIsActive),
          max_level: maxLevel,
          max_users: maxUsers,
        })
        .eq("id", selectedPlanId);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setPlans((prev) =>
        prev.map((p) =>
          p.id === selectedPlanId
            ? {
                ...p,
                name: editName.trim(),
                price_cents: Number(editPriceCents),
                currency: editCurrency.trim().toUpperCase(),
                interval: editInterval,
                annual_discount_percent: Math.max(0, Math.min(100, Number(editAnnualDiscountPercent))),
                is_active: Boolean(editIsActive),
                max_level: maxLevel,
                max_users: maxUsers,
              }
            : p,
        ),
      );
      setEditOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

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
                  <TableHead>Ativo</TableHead>
                  <TableHead>Níveis</TableHead>
                  <TableHead>Usuários</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-body font-semibold">{p.name}</TableCell>
                    <TableCell className="font-body">{formatMoney(p.price_cents, p.currency)}</TableCell>
                    <TableCell className="font-body">{p.interval === "year" ? "ano" : "mês"}</TableCell>
                    <TableCell className="font-body">{p.is_active ? "Sim" : "Não"}</TableCell>
                    <TableCell className="font-body">{p.max_level ?? "Todos"}</TableCell>
                    <TableCell className="font-body">{p.max_users ?? "—"}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!plans.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="font-body text-muted-foreground">
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
                      <div className="mt-1 font-body text-xs text-muted-foreground">{p.is_active ? "Ativo" : "Inativo"}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-body text-xs text-muted-foreground">Níveis</div>
                      <div className="font-body text-sm text-foreground">{p.max_level ?? "Todos"}</div>
                      <div className="mt-2 font-body text-xs text-muted-foreground">Usuários</div>
                      <div className="font-body text-sm text-foreground">{p.max_users ?? "—"}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end">
                    <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                      Editar
                    </Button>
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar plano</DialogTitle>
            <DialogDescription>Atualize informações do plano.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div>
              <label className="mb-1 block font-body text-sm font-semibold text-foreground">Nome</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Preço (centavos)</label>
                <input
                  value={editPriceMasked}
                  onChange={(e) => {
                    const cents = parseCurrencyToCents(e.target.value);
                    setEditPriceCents(cents);
                    setEditPriceMasked(maskCurrencyFromCents(cents, editCurrency));
                  }}
                  inputMode="numeric"
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                  placeholder="R$ 0,00"
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Moeda</label>
                <input
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                  placeholder="BRL"
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Intervalo</label>
                <select
                  value={editInterval}
                  onChange={(e) => setEditInterval(e.target.value as Plan["interval"])}
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="month">mês</option>
                  <option value="year">ano</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block font-body text-sm font-semibold text-foreground">Desconto anual (%)</label>
              <input
                type="number"
                value={editAnnualDiscountPercent}
                onChange={(e) => setEditAnnualDiscountPercent(parsePercent(e.target.value))}
                min={0}
                max={100}
                className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                placeholder="0"
              />
              {editPriceCents > 0 && editInterval === "month" ? (
                <div className="mt-2 rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-sm text-muted-foreground">
                  <div className="flex items-center justify-between gap-4">
                    <span>Anual sem desconto</span>
                    <span className="font-mono font-semibold tabular-nums text-foreground">
                      {formatMoney(editPriceCents * 12, editCurrency)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-4">
                    <span>Anual com desconto</span>
                    <span className="font-mono font-semibold tabular-nums text-foreground">
                      {formatMoney(
                        Math.round((editPriceCents * 12 * (100 - Math.max(0, Math.min(100, editAnnualDiscountPercent)))) / 100),
                        editCurrency,
                      )}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block font-body text-sm font-semibold text-foreground">Status do plano</label>
              <select
                value={editIsActive ? "active" : "inactive"}
                onChange={(e) => setEditIsActive(e.target.value === "active")}
                className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Nível máximo</label>
                <select
                  value={editMaxLevel}
                  onChange={(e) => setEditMaxLevel(e.target.value === "all" ? "all" : Number(e.target.value))}
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="all">Todos</option>
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Usuários</label>
                <select
                  value={editMaxUsers}
                  onChange={(e) => setEditMaxUsers(e.target.value === "none" ? "none" : Number(e.target.value))}
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="none">—</option>
                  {[1, 5, 10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={savePlan} disabled={isSaving || !selectedPlanId}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
};

const AdminPlanosPageProtected = () => (
  <RequireSuperAdmin>
    <AdminPlanosPage />
  </RequireSuperAdmin>
);

export default AdminPlanosPageProtected;
