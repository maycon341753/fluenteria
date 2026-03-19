import AdminShell from "@/components/admin/AdminShell";
import RequireSuperAdmin from "@/components/admin/RequireSuperAdmin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";

type Profile = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

type LearningPath = {
  user_id: string;
  module: "crianca" | "adolescente" | "adulto";
  level: number;
};

type Subscription = {
  user_id: string;
  plan_id: string | null;
  status: "active" | "trialing" | "past_due" | "canceled";
  updated_at: string;
};

type Plan = {
  id: string;
  name: string;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(date);
};

const AdminClientesPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editModule, setEditModule] = useState<LearningPath["module"]>("crianca");
  const [editLevel, setEditLevel] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [detailPlanId, setDetailPlanId] = useState<string>("");
  const [detailSubStatus, setDetailSubStatus] = useState<Subscription["status"]>("active");
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!supabase) {
        if (!mounted) return;
        setErrorMessage("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
        setIsLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (!mounted) return;

      if (profileError) {
        setErrorMessage(profileError.message);
        setIsLoading(false);
        return;
      }

      const { data: subData, error: subError } = await supabase
        .from("user_subscriptions")
        .select("user_id, plan_id, status, updated_at")
        .order("updated_at", { ascending: false })
        .limit(500);

      if (!mounted) return;

      if (subError) {
        setErrorMessage(subError.message);
        setIsLoading(false);
        return;
      }

      const { data: planData, error: planError } = await supabase.from("plans").select("id, name");

      if (!mounted) return;

      if (planError) {
        setErrorMessage(planError.message);
        setIsLoading(false);
        return;
      }

      const ids = ((profileData ?? []) as Profile[]).map((p) => p.user_id);
      const { data: learningData, error: learningError } = ids.length
        ? await supabase.from("user_learning_path").select("user_id, module, level").in("user_id", ids)
        : { data: [], error: null };

      if (!mounted) return;

      if (learningError) {
        setErrorMessage(learningError.message);
        setIsLoading(false);
        return;
      }

      setProfiles(((profileData ?? []) as Profile[]) ?? []);
      setSubscriptions(((subData ?? []) as Subscription[]) ?? []);
      setPlans(((planData ?? []) as Plan[]) ?? []);
      setLearningPaths(((learningData ?? []) as LearningPath[]) ?? []);
      setIsLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const planNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of plans) map[p.id] = p.name;
    return map;
  }, [plans]);

  const subByUserId = useMemo(() => {
    const map: Record<string, Subscription> = {};
    for (const s of subscriptions) {
      if (!map[s.user_id]) map[s.user_id] = s;
    }
    return map;
  }, [subscriptions]);

  const learningByUserId = useMemo(() => {
    const map: Record<string, LearningPath> = {};
    for (const row of learningPaths) {
      if (!map[row.user_id]) map[row.user_id] = row;
    }
    return map;
  }, [learningPaths]);

  const selectedProfile = useMemo(() => {
    if (!selectedUserId) return null;
    return profiles.find((p) => p.user_id === selectedUserId) ?? null;
  }, [profiles, selectedUserId]);

  const selectedSubscription = useMemo(() => {
    if (!selectedUserId) return null;
    return subByUserId[selectedUserId] ?? null;
  }, [selectedUserId, subByUserId]);

  const selectedLearning = useMemo(() => {
    if (!selectedUserId) return null;
    return learningByUserId[selectedUserId] ?? null;
  }, [selectedUserId, learningByUserId]);

  const levelOptions = useMemo(() => [1, 2, 3], []);

  const openDetail = (userId: string) => {
    setSelectedUserId(userId);
    const sub = subByUserId[userId];
    setDetailPlanId(sub?.plan_id ?? "");
    setDetailSubStatus(sub?.status ?? "active");
    setDetailOpen(true);
  };

  const openEdit = (userId: string) => {
    setSelectedUserId(userId);
    const profile = profiles.find((p) => p.user_id === userId);
    const learning = learningByUserId[userId];
    setEditFullName(profile?.full_name ?? "");
    setEditEmail(profile?.email ?? "");
    setEditModule(learning?.module ?? "crianca");
    setEditLevel(learning?.level ?? 1);
    setEditOpen(true);
  };

  const savePlan = async () => {
    if (!supabase || !selectedUserId) return;
    setIsSavingPlan(true);
    try {
      const planId = detailPlanId.trim() ? detailPlanId.trim() : null;
      const { error } = await supabase.from("user_subscriptions").upsert(
        {
          user_id: selectedUserId,
          plan_id: planId,
          status: detailSubStatus,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSubscriptions((prev) => {
        const next = prev.filter((s) => s.user_id !== selectedUserId);
        next.push({ user_id: selectedUserId, plan_id: planId, status: detailSubStatus, updated_at: new Date().toISOString() });
        return next;
      });
    } finally {
      setIsSavingPlan(false);
    }
  };

  const saveEdits = async () => {
    if (!supabase || !selectedUserId) return;
    setIsSaving(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: editFullName.trim() ? editFullName.trim() : null,
          email: editEmail.trim() ? editEmail.trim() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", selectedUserId);

      if (profileError) {
        setErrorMessage(profileError.message);
        return;
      }

      const { error: learningError } = await supabase.from("user_learning_path").upsert(
        {
          user_id: selectedUserId,
          module: editModule,
          level: editLevel,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (learningError) {
        setErrorMessage(learningError.message);
        return;
      }

      setProfiles((prev) =>
        prev.map((p) =>
          p.user_id === selectedUserId
            ? { ...p, full_name: editFullName.trim() ? editFullName.trim() : null, email: editEmail.trim() ? editEmail.trim() : null }
            : p,
        ),
      );
      setLearningPaths((prev) => {
        const next = prev.filter((r) => r.user_id !== selectedUserId);
        next.push({ user_id: selectedUserId, module: editModule, level: editLevel });
        return next;
      });

      setEditOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell title="Clientes">
      {isLoading ? (
        <div className="rounded-3xl border-2 border-border bg-card p-6 font-body text-muted-foreground">Carregando...</div>
      ) : errorMessage ? (
        <div className="rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-6">
          <p className="font-body font-semibold text-destructive">Não foi possível carregar.</p>
          <p className="mt-2 font-body text-sm text-destructive/90">{errorMessage}</p>
        </div>
      ) : (
        <div className="rounded-3xl border-2 border-border bg-card p-6">
          <h2 className="font-display text-xl font-bold text-foreground">Clientes cadastrados</h2>
          <p className="mt-2 font-body text-sm text-muted-foreground">{profiles.length} registros</p>
          <div className="mt-4 hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => {
                  const sub = subByUserId[p.user_id];
                  const planName = sub?.plan_id ? planNameById[sub.plan_id] ?? sub.plan_id : "—";
                  const learning = learningByUserId[p.user_id];
                  return (
                    <TableRow key={p.user_id}>
                      <TableCell className="font-body font-semibold">{p.full_name ?? "—"}</TableCell>
                      <TableCell className="font-body">{p.email ?? "—"}</TableCell>
                      <TableCell className="font-body">{planName}</TableCell>
                      <TableCell className="font-body">{sub?.status ?? "—"}</TableCell>
                      <TableCell className="font-body">{formatDate(p.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openDetail(p.user_id)}>
                            Detalhe
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEdit(p.user_id)}>
                            Editar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!profiles.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="font-body text-muted-foreground">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 grid gap-3 md:hidden">
            {profiles.length ? (
              profiles.map((p) => {
                const sub = subByUserId[p.user_id];
                const planName = sub?.plan_id ? planNameById[sub.plan_id] ?? sub.plan_id : "—";
                return (
                  <div key={p.user_id} className="rounded-3xl border-2 border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-display text-lg font-bold text-foreground">{p.full_name ?? "—"}</div>
                        <div className="mt-1 truncate font-body text-sm text-muted-foreground">{p.email ?? "—"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openDetail(p.user_id)}>
                          Detalhe
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(p.user_id)}>
                          Editar
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-body text-xs text-muted-foreground">Plano</span>
                        <span className="font-body text-sm text-foreground">{planName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-body text-xs text-muted-foreground">Status</span>
                        <span className="font-body text-sm text-foreground">{sub?.status ?? "—"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-body text-xs text-muted-foreground">Cadastro</span>
                        <span className="font-body text-sm text-foreground">{formatDate(p.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-3xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                Nenhum cliente encontrado.
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhe do cliente</DialogTitle>
            <DialogDescription>Informações básicas e plano atual.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 font-body text-sm">
            <div className="rounded-2xl border-2 border-border bg-background p-4">
              <div className="text-muted-foreground">Nome</div>
              <div className="font-semibold text-foreground">{selectedProfile?.full_name ?? "—"}</div>
            </div>
            <div className="rounded-2xl border-2 border-border bg-background p-4">
              <div className="text-muted-foreground">Email</div>
              <div className="font-semibold text-foreground">{selectedProfile?.email ?? "—"}</div>
            </div>
            <div className="rounded-2xl border-2 border-border bg-background p-4">
              <div className="text-muted-foreground">Módulo / Nível</div>
              <div className="font-semibold text-foreground">
                {selectedLearning ? `${selectedLearning.module} · Nível ${selectedLearning.level}` : "—"}
              </div>
            </div>
            <div className="rounded-2xl border-2 border-border bg-background p-4">
              <div className="text-muted-foreground">Plano / Status</div>
              <div className="mt-2 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-body text-sm font-semibold text-foreground">Plano</label>
                    <select
                      value={detailPlanId}
                      onChange={(e) => setDetailPlanId(e.target.value)}
                      className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="">Nenhum</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-body text-sm font-semibold text-foreground">Status</label>
                    <select
                      value={detailSubStatus}
                      onChange={(e) => setDetailSubStatus(e.target.value as Subscription["status"])}
                      className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="active">active</option>
                      <option value="trialing">trialing</option>
                      <option value="past_due">past_due</option>
                      <option value="canceled">canceled</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={savePlan} disabled={isSavingPlan || !selectedUserId}>
                    Atualizar plano
                  </Button>
                  <div className="font-body text-xs text-muted-foreground">
                    Atual:{" "}
                    {selectedSubscription?.plan_id ? planNameById[selectedSubscription.plan_id] ?? selectedSubscription.plan_id : "—"} ·{" "}
                    {selectedSubscription?.status ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>Atualize nome, email e trilha (módulo e nível).</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div>
              <label className="mb-1 block font-body text-sm font-semibold text-foreground">Nome</label>
              <input
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                placeholder="Nome do cliente"
              />
            </div>

            <div>
              <label className="mb-1 block font-body text-sm font-semibold text-foreground">Email</label>
              <input
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                placeholder="email@cliente.com"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Módulo</label>
                <select
                  value={editModule}
                  onChange={(e) => setEditModule(e.target.value as LearningPath["module"])}
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="crianca">Criança</option>
                  <option value="adolescente">Adolescente</option>
                  <option value="adulto">Adulto</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Nível</label>
                <select
                  value={editLevel}
                  onChange={(e) => setEditLevel(Number(e.target.value))}
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                >
                  {levelOptions.map((n) => (
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
            <Button onClick={saveEdits} disabled={isSaving || !selectedUserId}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
};

const AdminClientesPageProtected = () => (
  <RequireSuperAdmin>
    <AdminClientesPage />
  </RequireSuperAdmin>
);

export default AdminClientesPageProtected;
