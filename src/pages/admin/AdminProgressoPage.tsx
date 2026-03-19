import AdminShell from "@/components/admin/AdminShell";
import RequireSuperAdmin from "@/components/admin/RequireSuperAdmin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";

type ModuleKey = "crianca" | "adolescente" | "adulto";

type ProgressUserRow = {
  user_id: string;
  module: ModuleKey | null;
  level: number | null;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

type LessonRow = {
  id: string;
  lesson_no: number;
  title: string;
};

type ProgressRow = {
  user_id: string;
  lesson_id: string;
  status: "not_started" | "in_progress" | "completed";
  score: number | null;
  updated_at: string | null;
};

const formatProgressStatus = (status: ProgressRow["status"] | "not_started") => {
  if (status === "completed") return "Concluída";
  if (status === "in_progress") return "Em andamento";
  return "Não iniciada";
};

const formatModuleLabel = (m: ModuleKey) => {
  if (m === "crianca") return "Criança";
  if (m === "adolescente") return "Adolescente";
  return "Adulto";
};

const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
};

const AdminProgressoPage = () => {
  const [module, setModule] = useState<ModuleKey>("crianca");
  const [level, setLevel] = useState<number>(1);
  const levels = useMemo(() => Array.from({ length: 10 }).map((_, i) => i + 1), []);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [users, setUsers] = useState<ProgressUserRow[]>([]);
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const lessonsById = useMemo(() => {
    const map: Record<string, LessonRow> = {};
    for (const l of lessons) map[l.id] = l;
    return map;
  }, [lessons]);

  const progressByUserId = useMemo(() => {
    const map: Record<string, ProgressRow[]> = {};
    for (const row of progressRows) {
      if (!map[row.user_id]) map[row.user_id] = [];
      map[row.user_id].push(row);
    }
    return map;
  }, [progressRows]);

  const totals = useMemo(() => {
    const totalLessons = lessons.length;
    const totalUsers = users.length;
    let completedSum = 0;
    for (const u of users) {
      const rows = progressByUserId[u.user_id] ?? [];
      completedSum += rows.filter((r) => r.status === "completed").length;
    }
    const possible = totalUsers * totalLessons;
    const pct = possible ? Math.round((completedSum / possible) * 100) : 0;
    return { totalLessons, totalUsers, completedSum, pct };
  }, [lessons.length, progressByUserId, users]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users
      .map((u) => {
        const rows = progressByUserId[u.user_id] ?? [];
        const completed = rows.filter((r) => r.status === "completed").length;
        const inProgress = rows.filter((r) => r.status === "in_progress").length;
        const score = rows.reduce((sum, r) => sum + Number(r.score ?? 0), 0);
        const last = rows.reduce<string | null>((acc, r) => {
          if (!r.updated_at) return acc;
          if (!acc) return r.updated_at;
          return new Date(r.updated_at).getTime() > new Date(acc).getTime() ? r.updated_at : acc;
        }, null);

        const name = u.full_name ?? "";
        const email = u.email ?? "";
        const matches = !query || name.toLowerCase().includes(query) || email.toLowerCase().includes(query) || u.user_id.toLowerCase().includes(query);

        return { user: u, completed, inProgress, score, last, matches };
      })
      .filter((r) => r.matches)
      .sort((a, b) => {
        const ac = a.completed;
        const bc = b.completed;
        if (bc !== ac) return bc - ac;
        const at = a.last ? new Date(a.last).getTime() : 0;
        const bt = b.last ? new Date(b.last).getTime() : 0;
        return bt - at;
      });
  }, [progressByUserId, search, users]);

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find((u) => u.user_id === selectedUserId) ?? null;
  }, [selectedUserId, users]);

  const selectedProgress = useMemo(() => {
    if (!selectedUserId) return [];
    const rows = progressByUserId[selectedUserId] ?? [];
    const byLessonId: Record<string, ProgressRow> = {};
    for (const r of rows) byLessonId[r.lesson_id] = r;
    return lessons.map((l) => ({
      lesson: l,
      progress: byLessonId[l.id] ?? null,
    }));
  }, [lessons, progressByUserId, selectedUserId]);

  const load = async () => {
    if (!supabase) {
      setErrorMessage("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const { data: lessonsData, error: lessonsError } = await supabase
      .from("lessons")
      .select("id, lesson_no, title")
      .eq("module", module)
      .eq("level", level)
      .order("lesson_no", { ascending: true });

    if (lessonsError) {
      setErrorMessage(lessonsError.message);
      setIsLoading(false);
      return;
    }

    const lessonRows = ((lessonsData ?? []) as LessonRow[]) ?? [];
    setLessons(lessonRows);
    const lessonIds = lessonRows.map((l) => l.id);

    const query = search.trim();
    const { data: usersData, error: usersError } = query
      ? await supabase.rpc("admin_search_users", { p_search: query, p_limit: 500 })
      : await supabase.rpc("admin_list_users_for_progress", {
          p_module: module,
          p_level: level,
          p_search: null,
          p_limit: 500,
        });

    if (usersError) {
      setErrorMessage(usersError.message);
      setIsLoading(false);
      return;
    }

    const userRows = ((usersData ?? []) as ProgressUserRow[]) ?? [];
    setUsers(userRows);
    const userIds = userRows.map((r) => r.user_id);

    if (!userIds.length) {
      setUsers([]);
      setProgressRows([]);
      setIsLoading(false);
      return;
    }

    if (!lessonIds.length) {
      setProgressRows([]);
      setIsLoading(false);
      return;
    }

    const { data: progressData, error: progressError } = await supabase
      .from("user_lesson_progress")
      .select("user_id, lesson_id, status, score, updated_at")
      .in("user_id", userIds)
      .in("lesson_id", lessonIds);

    if (progressError) {
      setErrorMessage(progressError.message);
      setIsLoading(false);
      return;
    }

    setProgressRows(((progressData ?? []) as ProgressRow[]) ?? []);
    setIsLoading(false);
  };

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [module, level, search]);

  return (
    <AdminShell title="Progresso">
      {errorMessage ? (
        <div className="rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-6">
          <p className="font-body font-semibold text-destructive">Não foi possível carregar.</p>
          <p className="mt-2 font-body text-sm text-destructive/90">{errorMessage}</p>
        </div>
      ) : null}

      <div className="grid gap-6">
        <div className="rounded-3xl border-2 border-border bg-card p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block font-body text-sm font-semibold text-foreground">Módulo</label>
              <select
                value={module}
                onChange={(e) => setModule(e.target.value as ModuleKey)}
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
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
              >
                {levels.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-body text-sm font-semibold text-foreground">Buscar</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                placeholder="Nome, email ou ID"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="font-body text-sm text-muted-foreground">
              {formatModuleLabel(module)} · Nível {level} · {totals.totalUsers} usuários · {totals.totalLessons} lições
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => load()} disabled={isLoading}>
                Atualizar
              </Button>
              <div className="rounded-2xl border-2 border-border bg-background px-4 py-2 font-body text-sm text-foreground">
                Concluído: {totals.pct}%
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border-2 border-border bg-card p-6">
          <h2 className="font-display text-xl font-bold text-foreground">Usuários</h2>

          {isLoading ? (
            <div className="mt-4 font-body text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <>
              <div className="mt-4 hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Concluídas</TableHead>
                      <TableHead>Em andamento</TableHead>
                      <TableHead>Pontos</TableHead>
                      <TableHead>Última atividade</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.user.user_id}>
                        <TableCell className="font-body font-semibold">{r.user.full_name ?? "—"}</TableCell>
                        <TableCell className="font-body">{r.user.email ?? "—"}</TableCell>
                        <TableCell className="font-body">
                          {r.completed}/{totals.totalLessons}
                        </TableCell>
                        <TableCell className="font-body">{r.inProgress}</TableCell>
                        <TableCell className="font-body">{r.score}</TableCell>
                        <TableCell className="font-body">{formatDateTime(r.last)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUserId(r.user.user_id);
                              setDetailOpen(true);
                            }}
                          >
                            Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!rows.length ? (
                      <TableRow>
                        <TableCell colSpan={7} className="font-body text-muted-foreground">
                          Nenhum usuário encontrado neste módulo/nível.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 grid gap-3 md:hidden">
                {rows.length ? (
                  rows.map((r) => (
                    <div key={r.user.user_id} className="rounded-3xl border-2 border-border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-display text-lg font-bold text-foreground">{r.user.full_name ?? "—"}</div>
                          <div className="mt-1 truncate font-body text-sm text-muted-foreground">{r.user.email ?? "—"}</div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUserId(r.user.user_id);
                            setDetailOpen(true);
                          }}
                        >
                          Detalhes
                        </Button>
                      </div>

                      <div className="mt-4 grid gap-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-body text-xs text-muted-foreground">Concluídas</span>
                          <span className="font-body text-sm text-foreground">
                            {r.completed}/{totals.totalLessons}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-body text-xs text-muted-foreground">Em andamento</span>
                          <span className="font-body text-sm text-foreground">{r.inProgress}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-body text-xs text-muted-foreground">Pontos</span>
                          <span className="font-body text-sm text-foreground">{r.score}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-body text-xs text-muted-foreground">Última atividade</span>
                          <span className="font-body text-sm text-foreground">{formatDateTime(r.last)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                    Nenhum usuário encontrado neste módulo/nível.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Detalhes do progresso</DialogTitle>
            <DialogDescription>
              {selectedUser ? `${selectedUser.full_name ?? "—"} · ${selectedUser.email ?? "—"}` : "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[65vh] gap-3 overflow-y-auto pr-1">
            {selectedProgress.map(({ lesson, progress }) => (
              <div key={lesson.id} className="rounded-2xl border-2 border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display text-base font-bold text-foreground">
                      Lição {lesson.lesson_no} · {lesson.title}
                    </div>
                    <div className="mt-1 font-body text-sm text-muted-foreground">
                      Status: {formatProgressStatus(progress?.status ?? "not_started")} · Pontos: {Number(progress?.score ?? 0)}
                    </div>
                  </div>
                  <div className="font-body text-xs text-muted-foreground">{formatDateTime(progress?.updated_at ?? null)}</div>
                </div>
              </div>
            ))}

            {!selectedProgress.length ? (
              <div className="rounded-2xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                Nenhuma lição encontrada para este módulo/nível.
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
};

const AdminProgressoPageProtected = () => (
  <RequireSuperAdmin>
    <AdminProgressoPage />
  </RequireSuperAdmin>
);

export default AdminProgressoPageProtected;
