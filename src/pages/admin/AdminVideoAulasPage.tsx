import AdminShell from "@/components/admin/AdminShell";
import RequireSuperAdmin from "@/components/admin/RequireSuperAdmin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";

type ModuleKey = "crianca" | "adolescente" | "adulto";

type VideoLessonRow = {
  id: string;
  module: ModuleKey;
  level: number;
  position: number;
  title: string;
  source_type: "youtube" | "upload";
  youtube_url: string | null;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
};

const formatModuleLabel = (m: ModuleKey) => {
  if (m === "crianca") return "Criança";
  if (m === "adolescente") return "Adolescente";
  return "Adulto";
};

const AdminVideoAulasPage = () => {
  const [module, setModule] = useState<ModuleKey>("crianca");
  const [level, setLevel] = useState<number>(1);
  const [levels] = useState<number[]>([1, 2, 3]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoLessonRow[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [position, setPosition] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<VideoLessonRow["source_type"]>("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const selected = useMemo(() => videos.find((v) => v.id === selectedId) ?? null, [selectedId, videos]);

  const load = async () => {
    if (!supabase) {
      setErrorMessage("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    const { data, error } = await supabase
      .from("video_lessons")
      .select("id, module, level, position, title, source_type, youtube_url, storage_path, created_at, updated_at")
      .eq("module", module)
      .eq("level", level)
      .order("position", { ascending: true })
      .limit(300);

    if (error) {
      setErrorMessage(error.message);
      setVideos([]);
      setIsLoading(false);
      return;
    }

    setVideos(((data ?? []) as VideoLessonRow[]) ?? []);
    setIsLoading(false);
  };

  useEffect(() => {
    void load();
  }, [module, level]);

  const openCreate = () => {
    const next = videos.length ? Math.max(...videos.map((v) => v.position)) + 1 : 1;
    setModalMode("create");
    setSelectedId(null);
    setPosition(next);
    setTitle("");
    setSourceType("youtube");
    setYoutubeUrl("");
    setFile(null);
    setModalOpen(true);
  };

  const openEdit = (v: VideoLessonRow) => {
    setModalMode("edit");
    setSelectedId(v.id);
    setPosition(v.position ?? 1);
    setTitle(v.title ?? "");
    setSourceType(v.source_type);
    setYoutubeUrl(v.youtube_url ?? "");
    setFile(null);
    setModalOpen(true);
  };

  const uploadFileIfNeeded = async () => {
    if (!supabase) return null;
    if (sourceType !== "upload") return null;
    if (!file) return selected?.storage_path ?? null;

    const safeName = file.name.replace(/[^\w.-]+/g, "_");
    const path = `videos/${module}/nivel-${level}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("video-aulas").upload(path, file, { upsert: false });
    if (error) {
      setErrorMessage(error.message);
      return null;
    }
    return path;
  };

  const save = async () => {
    if (!supabase) return;
    if (!title.trim()) {
      setErrorMessage("Informe o título do vídeo.");
      return;
    }
    if (sourceType === "youtube" && !youtubeUrl.trim()) {
      setErrorMessage("Informe o link do YouTube.");
      return;
    }
    if (sourceType === "upload" && modalMode === "create" && !file) {
      setErrorMessage("Selecione um arquivo de vídeo para upload.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const storagePath = await uploadFileIfNeeded();
      if (sourceType === "upload" && !storagePath) {
        return;
      }

      const payload = {
        module,
        level,
        position,
        title: title.trim(),
        source_type: sourceType,
        youtube_url: sourceType === "youtube" ? youtubeUrl.trim() : null,
        storage_path: sourceType === "upload" ? storagePath : null,
        updated_at: new Date().toISOString(),
      };

      if (modalMode === "create") {
        const { data, error } = await supabase
          .from("video_lessons")
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select("id, module, level, position, title, source_type, youtube_url, storage_path, created_at, updated_at")
          .maybeSingle();

        if (error) {
          setErrorMessage(error.message);
          return;
        }
        if (data) {
          setVideos((prev) => [...prev, data as VideoLessonRow].sort((a, b) => a.position - b.position));
        } else {
          await load();
        }
        setModalOpen(false);
        return;
      }

      if (!selectedId) return;
      const { error } = await supabase.from("video_lessons").update(payload).eq("id", selectedId);
      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setVideos((prev) => prev.map((v) => (v.id === selectedId ? ({ ...v, ...payload } as VideoLessonRow) : v)).sort((a, b) => a.position - b.position));
      setModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!supabase) return;
    setDeletingId(id);
    setErrorMessage(null);
    try {
      const { error } = await supabase.from("video_lessons").delete().eq("id", id);
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminShell title="Video Aulas">
      {errorMessage ? (
        <div className="mb-6 rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-6 font-body text-destructive">
          {errorMessage}
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
            <div className="flex items-end justify-end">
              <Button variant="hero" onClick={openCreate}>
                Adicionar vídeo
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border-2 border-border bg-card p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-foreground">
              {formatModuleLabel(module)} · Nível {level}
            </h2>
            <Button variant="outline" onClick={() => load()} disabled={isLoading}>
              Atualizar
            </Button>
          </div>

          {isLoading ? (
            <div className="mt-4 font-body text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <div className="mt-4 hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videos.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-body">{v.position}</TableCell>
                      <TableCell className="font-body font-semibold">{v.title}</TableCell>
                      <TableCell className="font-body">{v.source_type === "youtube" ? "YouTube" : "Upload"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(v)}>
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" disabled={deletingId === v.id} onClick={() => remove(v.id)}>
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!videos.length ? (
                    <TableRow>
                      <TableCell colSpan={4} className="font-body text-muted-foreground">
                        Nenhum vídeo encontrado.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}

          {!isLoading ? (
            <div className="mt-4 grid gap-3 md:hidden">
              {videos.length ? (
                videos.map((v) => (
                  <div key={v.id} className="rounded-3xl border-2 border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-body text-xs text-muted-foreground">#{v.position}</div>
                        <div className="mt-1 truncate font-display text-lg font-bold text-foreground">{v.title}</div>
                        <div className="mt-1 font-body text-sm text-muted-foreground">
                          Fonte: {v.source_type === "youtube" ? "YouTube" : "Upload"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(v)}>
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" disabled={deletingId === v.id} onClick={() => remove(v.id)}>
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                  Nenhum vídeo encontrado.
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>{modalMode === "create" ? "Adicionar vídeo" : "Editar vídeo"}</DialogTitle>
            <DialogDescription>
              {formatModuleLabel(module)} · Nível {level}
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[65vh] gap-4 overflow-y-auto pr-1">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Ordem</label>
                <input
                  type="number"
                  value={position}
                  onChange={(e) => setPosition(Number(e.target.value))}
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Fonte</label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as VideoLessonRow["source_type"])}
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="youtube">YouTube</option>
                  <option value="upload">Upload</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block font-body text-sm font-semibold text-foreground">Título</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {sourceType === "youtube" ? (
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Link do YouTube</label>
                <input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
            ) : (
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Upload de vídeo</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground"
                />
                {modalMode === "edit" && selected?.storage_path ? (
                  <div className="mt-2 font-body text-xs text-muted-foreground">Arquivo atual: {selected.storage_path}</div>
                ) : null}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={isSaving}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
};

const AdminVideoAulasPageProtected = () => (
  <RequireSuperAdmin>
    <AdminVideoAulasPage />
  </RequireSuperAdmin>
);

export default AdminVideoAulasPageProtected;
