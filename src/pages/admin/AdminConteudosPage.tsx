import AdminShell from "@/components/admin/AdminShell";
import RequireSuperAdmin from "@/components/admin/RequireSuperAdmin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";

type ModuleKey = "crianca" | "adolescente" | "adulto";

type LessonRow = {
  id: string;
  module: ModuleKey;
  level: number;
  lesson_no: number;
  title: string;
};

type LessonItemRow = {
  id: string;
  lesson_id: string;
  item_no: number;
  english: string | null;
  translation: string | null;
};

const formatModuleLabel = (m: ModuleKey) => {
  if (m === "crianca") return "Criança";
  if (m === "adolescente") return "Adolescente";
  return "Adulto";
};

const AdminConteudosPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [module, setModule] = useState<ModuleKey>("crianca");
  const [level, setLevel] = useState<number>(1);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const [itemsLoading, setItemsLoading] = useState(false);
  const [lessonItems, setLessonItems] = useState<LessonItemRow[]>([]);

  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [lessonModalMode, setLessonModalMode] = useState<"create" | "edit">("create");
  const [lessonNo, setLessonNo] = useState<number>(1);
  const [lessonTitle, setLessonTitle] = useState("");
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemModalMode, setItemModalMode] = useState<"create" | "edit">("create");
  const [itemNo, setItemNo] = useState<number>(1);
  const [itemEnglish, setItemEnglish] = useState("");
  const [itemTranslation, setItemTranslation] = useState("");
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const levels = useMemo(() => Array.from({ length: 10 }).map((_, i) => i + 1), []);

  const selectedLesson = useMemo(() => lessons.find((l) => l.id === selectedLessonId) ?? null, [lessons, selectedLessonId]);

  const loadLessons = async () => {
    if (!supabase) {
      setErrorMessage("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    const { data, error } = await supabase
      .from("lessons")
      .select("id, module, level, lesson_no, title")
      .eq("module", module)
      .eq("level", level)
      .order("lesson_no", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    const rows = ((data ?? []) as LessonRow[]) ?? [];
    setLessons(rows);
    if (rows.length) {
      const exists = selectedLessonId ? rows.some((r) => r.id === selectedLessonId) : false;
      setSelectedLessonId(exists ? selectedLessonId : rows[0].id);
    } else {
      setSelectedLessonId(null);
      setLessonItems([]);
    }
    setIsLoading(false);
  };

  const loadItems = async (lessonId: string) => {
    if (!supabase) return;
    setItemsLoading(true);
    setErrorMessage(null);
    const { data, error } = await supabase
      .from("lesson_items")
      .select("id, lesson_id, item_no, english, translation")
      .eq("lesson_id", lessonId)
      .order("item_no", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setItemsLoading(false);
      return;
    }

    setLessonItems(((data ?? []) as LessonItemRow[]) ?? []);
    setItemsLoading(false);
  };

  useEffect(() => {
    void loadLessons();
  }, [module, level]);

  useEffect(() => {
    if (!selectedLessonId) return;
    void loadItems(selectedLessonId);
  }, [selectedLessonId]);

  const openCreateLesson = () => {
    const nextNo = lessons.length ? Math.max(...lessons.map((l) => l.lesson_no)) + 1 : 1;
    setLessonModalMode("create");
    setLessonNo(nextNo);
    setLessonTitle("");
    setLessonModalOpen(true);
  };

  const openEditLesson = (lesson: LessonRow) => {
    setLessonModalMode("edit");
    setLessonNo(lesson.lesson_no);
    setLessonTitle(lesson.title ?? "");
    setLessonModalOpen(true);
  };

  const saveLesson = async () => {
    if (!supabase) return;
    if (!lessonTitle.trim()) {
      setErrorMessage("Informe o título da lição.");
      return;
    }

    setIsSavingLesson(true);
    setErrorMessage(null);
    try {
      if (lessonModalMode === "create") {
        const { data, error } = await supabase
          .from("lessons")
          .insert({
            module,
            level,
            lesson_no: lessonNo,
            title: lessonTitle.trim(),
          })
          .select("id, module, level, lesson_no, title")
          .maybeSingle();

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        if (data) {
          const row = data as LessonRow;
          setLessons((prev) => [...prev, row].sort((a, b) => a.lesson_no - b.lesson_no));
          setSelectedLessonId(row.id);
          setLessonModalOpen(false);
        } else {
          await loadLessons();
          setLessonModalOpen(false);
        }
      } else {
        if (!selectedLessonId) return;
        const { error } = await supabase
          .from("lessons")
          .update({ lesson_no: lessonNo, title: lessonTitle.trim() })
          .eq("id", selectedLessonId);

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        setLessons((prev) =>
          prev
            .map((l) => (l.id === selectedLessonId ? { ...l, lesson_no: lessonNo, title: lessonTitle.trim() } : l))
            .sort((a, b) => a.lesson_no - b.lesson_no),
        );
        setLessonModalOpen(false);
      }
    } finally {
      setIsSavingLesson(false);
    }
  };

  const deleteLesson = async (lessonId: string) => {
    if (!supabase) return;
    setDeletingLessonId(lessonId);
    setErrorMessage(null);
    try {
      const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setLessons((prev) => prev.filter((l) => l.id !== lessonId));
      if (selectedLessonId === lessonId) {
        const next = lessons.filter((l) => l.id !== lessonId).sort((a, b) => a.lesson_no - b.lesson_no)[0];
        setSelectedLessonId(next?.id ?? null);
      }
    } finally {
      setDeletingLessonId(null);
    }
  };

  const openCreateItem = () => {
    const nextNo = lessonItems.length ? Math.max(...lessonItems.map((i) => i.item_no)) + 1 : 1;
    setItemModalMode("create");
    setItemNo(nextNo);
    setItemEnglish("");
    setItemTranslation("");
    setItemModalOpen(true);
  };

  const openEditItem = (item: LessonItemRow) => {
    setItemModalMode("edit");
    setItemNo(item.item_no);
    setItemEnglish(item.english ?? "");
    setItemTranslation(item.translation ?? "");
    setItemModalOpen(true);
  };

  const saveItem = async () => {
    if (!supabase) return;
    if (!selectedLessonId) return;
    if (!itemEnglish.trim() || !itemTranslation.trim()) {
      setErrorMessage("Informe inglês e tradução.");
      return;
    }

    setIsSavingItem(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from("lesson_items")
        .upsert(
          {
            lesson_id: selectedLessonId,
            item_no: itemNo,
            english: itemEnglish.trim(),
            translation: itemTranslation.trim(),
            prompt: itemEnglish.trim(),
            expected: itemEnglish.trim().toLowerCase(),
            updated_at: new Date().toISOString(),
          } as unknown as Record<string, unknown>,
          { onConflict: "lesson_id,item_no" },
        )
        .select("id, lesson_id, item_no, english, translation")
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data) {
        const row = data as LessonItemRow;
        setLessonItems((prev) => {
          const next = prev.filter((p) => !(p.lesson_id === row.lesson_id && p.item_no === row.item_no));
          next.push(row);
          return next.sort((a, b) => a.item_no - b.item_no);
        });
      } else {
        await loadItems(selectedLessonId);
      }

      setItemModalOpen(false);
    } finally {
      setIsSavingItem(false);
    }
  };

  const deleteItem = async (item: LessonItemRow) => {
    if (!supabase) return;
    setDeletingItemId(item.id);
    setErrorMessage(null);
    try {
      const { error } = await supabase.from("lesson_items").delete().eq("id", item.id);
      if (error) {
        const { error: error2 } = await supabase
          .from("lesson_items")
          .delete()
          .eq("lesson_id", item.lesson_id)
          .eq("item_no", item.item_no);
        if (error2) {
          setErrorMessage(error2.message);
          return;
        }
      }
      setLessonItems((prev) => prev.filter((i) => i.id !== item.id));
    } finally {
      setDeletingItemId(null);
    }
  };

  return (
    <AdminShell title="Manutenção de conteúdos">
      {errorMessage ? (
        <div className="rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-6">
          <p className="font-body font-semibold text-destructive">Atenção</p>
          <p className="mt-2 font-body text-sm text-destructive/90">{errorMessage}</p>
        </div>
      ) : null}

      <div className="grid gap-6">
        <div className="rounded-3xl border-2 border-border bg-card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button variant="outline" onClick={() => loadLessons()} disabled={isLoading}>
                Atualizar
              </Button>
              <Button onClick={openCreateLesson} disabled={isLoading}>
                Criar lição
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="rounded-3xl border-2 border-border bg-card p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-bold text-foreground">Lições</h2>
                <div className="font-body text-xs text-muted-foreground">{formatModuleLabel(module)} · Nível {level}</div>
              </div>

              {isLoading ? (
                <div className="mt-4 font-body text-sm text-muted-foreground">Carregando...</div>
              ) : lessons.length ? (
                <div className="mt-4 grid gap-3">
                  {lessons.map((l) => (
                    <div
                      key={l.id}
                      className={`rounded-3xl border-2 p-4 ${selectedLessonId === l.id ? "border-primary bg-primary/5" : "border-border bg-background"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-display text-lg font-bold text-foreground">Lição {l.lesson_no}</div>
                          <div className="mt-1 truncate font-body text-sm text-muted-foreground">{l.title}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedLessonId(l.id)}>
                            Abrir
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEditLesson(l)}>
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" disabled={deletingLessonId === l.id} onClick={() => deleteLesson(l.id)}>
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-3xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                  Nenhuma lição encontrada. Use “Criar lição”.
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-7">
            <div className="rounded-3xl border-2 border-border bg-card p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground">Frases</h2>
                  <div className="mt-1 font-body text-sm text-muted-foreground">
                    {selectedLesson ? `Lição ${selectedLesson.lesson_no} · ${selectedLesson.title}` : "Selecione uma lição"}
                  </div>
                </div>
                <Button onClick={openCreateItem} disabled={!selectedLessonId || itemsLoading}>
                  Adicionar frase
                </Button>
              </div>

              {itemsLoading ? (
                <div className="mt-4 font-body text-sm text-muted-foreground">Carregando...</div>
              ) : !selectedLessonId ? (
                <div className="mt-4 rounded-3xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                  Selecione uma lição para editar as frases.
                </div>
              ) : (
                <>
                  <div className="mt-4 hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Inglês</TableHead>
                          <TableHead>Tradução</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lessonItems.map((it) => (
                          <TableRow key={it.id}>
                            <TableCell className="font-body">{it.item_no}</TableCell>
                            <TableCell className="font-body">{it.english ?? "—"}</TableCell>
                            <TableCell className="font-body">{it.translation ?? "—"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEditItem(it)}>
                                  Editar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={deletingItemId === it.id}
                                  onClick={() => deleteItem(it)}
                                >
                                  Excluir
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {!lessonItems.length ? (
                          <TableRow>
                            <TableCell colSpan={4} className="font-body text-muted-foreground">
                              Nenhuma frase cadastrada.
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-4 grid gap-3 md:hidden">
                    {lessonItems.length ? (
                      lessonItems.map((it) => (
                        <div key={it.id} className="rounded-3xl border-2 border-border bg-background p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-body text-xs text-muted-foreground">Frase {it.item_no}</div>
                              <div className="mt-1 font-display text-lg font-bold text-foreground">{it.english ?? "—"}</div>
                              <div className="mt-1 font-body text-sm text-muted-foreground">{it.translation ?? "—"}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditItem(it)}>
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={deletingItemId === it.id}
                                onClick={() => deleteItem(it)}
                              >
                                Excluir
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-3xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                        Nenhuma frase cadastrada.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={lessonModalOpen} onOpenChange={setLessonModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lessonModalMode === "create" ? "Criar lição" : "Editar lição"}</DialogTitle>
            <DialogDescription>{formatModuleLabel(module)} · Nível {level}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Número</label>
                <input
                  type="number"
                  value={lessonNo}
                  onChange={(e) => setLessonNo(Number(e.target.value))}
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Título</label>
                <input
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                  placeholder="Ex: Saudações"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonModalOpen(false)} disabled={isSavingLesson}>
              Cancelar
            </Button>
            <Button onClick={saveLesson} disabled={isSavingLesson}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{itemModalMode === "create" ? "Adicionar frase" : "Editar frase"}</DialogTitle>
            <DialogDescription>{selectedLesson ? `Lição ${selectedLesson.lesson_no}` : ""}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div>
              <label className="mb-1 block font-body text-sm font-semibold text-foreground">Número da frase</label>
              <input
                type="number"
                value={itemNo}
                onChange={(e) => setItemNo(Number(e.target.value))}
                className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-sm font-semibold text-foreground">Inglês</label>
              <input
                value={itemEnglish}
                onChange={(e) => setItemEnglish(e.target.value)}
                className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                placeholder='Ex: "Hello!"'
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-sm font-semibold text-foreground">Tradução</label>
              <input
                value={itemTranslation}
                onChange={(e) => setItemTranslation(e.target.value)}
                className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                placeholder='Ex: "Olá!"'
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setItemModalOpen(false)} disabled={isSavingItem}>
              Cancelar
            </Button>
            <Button onClick={saveItem} disabled={isSavingItem || !selectedLessonId}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
};

const AdminConteudosPageProtected = () => (
  <RequireSuperAdmin>
    <AdminConteudosPage />
  </RequireSuperAdmin>
);

export default AdminConteudosPageProtected;
