import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type ModuleKey = "crianca" | "adolescente" | "adulto";

type LessonRow = {
  id: string;
  lesson_no: number;
  title: string;
};

type ProgressRow = {
  lesson_id: string;
  status: "not_started" | "in_progress" | "completed";
  score: number;
};

type Props = {
  module: ModuleKey;
};

const LessonProgressPanel = ({ module }: Props) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [level, setLevel] = useState<number | null>(null);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [progressByLessonId, setProgressByLessonId] = useState<Record<string, ProgressRow>>({});

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
        navigate("/login");
        return;
      }

      const { data: selectionData, error: selectionError } = await supabase
        .from("user_learning_path")
        .select("level")
        .eq("user_id", userId)
        .eq("module", module)
        .maybeSingle();

      if (!mounted) return;

      if (selectionError) {
        setErrorMessage(selectionError.message);
        setIsLoading(false);
        return;
      }

      const selectedLevel = selectionData?.level ?? null;
      setLevel(selectedLevel);

      if (!selectedLevel) {
        setLessons([]);
        setProgressByLessonId({});
        setIsLoading(false);
        return;
      }

      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("id, lesson_no, title")
        .eq("module", module)
        .eq("level", selectedLevel)
        .order("lesson_no", { ascending: true });

      if (!mounted) return;

      if (lessonsError) {
        setErrorMessage(lessonsError.message);
        setIsLoading(false);
        return;
      }

      const lessonRows = (lessonsData ?? []) as LessonRow[];
      setLessons(lessonRows);

      if (!lessonRows.length) {
        setProgressByLessonId({});
        setIsLoading(false);
        return;
      }

      const lessonIds = lessonRows.map((l) => l.id);
      const { data: progressData, error: progressError } = await supabase
        .from("user_lesson_progress")
        .select("lesson_id, status, score")
        .eq("user_id", userId)
        .in("lesson_id", lessonIds);

      if (!mounted) return;

      if (progressError) {
        setErrorMessage(progressError.message);
        setIsLoading(false);
        return;
      }

      const byId: Record<string, ProgressRow> = {};
      for (const row of (progressData ?? []) as ProgressRow[]) {
        byId[row.lesson_id] = row;
      }
      setProgressByLessonId(byId);
      setIsLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [module, navigate]);

  const totals = useMemo(() => {
    const total = lessons.length;
    const completed = lessons.filter((l) => progressByLessonId[l.id]?.status === "completed").length;
    const inProgress = lessons.filter((l) => progressByLessonId[l.id]?.status === "in_progress").length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, inProgress, percent };
  }, [lessons, progressByLessonId]);

  const nextLesson = useMemo(() => {
    for (const lesson of lessons) {
      const status = progressByLessonId[lesson.id]?.status ?? "not_started";
      if (status !== "completed") return lesson;
    }
    return null;
  }, [lessons, progressByLessonId]);

  if (isLoading) {
    return (
      <div className="rounded-3xl border-2 border-border bg-card p-6">
        <p className="font-body text-muted-foreground">Carregando progresso...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-6">
        <p className="font-body font-semibold text-destructive">Não foi possível carregar o progresso.</p>
        <p className="mt-2 font-body text-sm text-destructive/90">{errorMessage}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => navigate("/modulos")}>
            Voltar para Módulos
          </Button>
        </div>
      </div>
    );
  }

  if (!level) {
    return (
      <div className="rounded-3xl border-2 border-border bg-card p-6">
        <p className="font-body text-muted-foreground">Selecione um nível para ver suas lições.</p>
        <div className="mt-4">
          <Button variant="hero" onClick={() => navigate("/modulos")}>
            Escolher módulo e nível
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border-2 border-border bg-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Progresso</h2>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Nível {level} · {totals.completed}/{totals.total} lições concluídas
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button variant="outline" onClick={() => navigate("/modulos")}>
            Trocar nível
          </Button>
          <Button variant="hero" onClick={() => navigate("/lesson")} disabled={!nextLesson}>
            {nextLesson ? `Continuar (Lição ${nextLesson.lesson_no})` : "Concluído"}
          </Button>
        </div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-success transition-all" style={{ width: `${totals.percent}%` }} />
      </div>
      <div className="mt-2 flex justify-between font-body text-xs text-muted-foreground">
        <span>{totals.percent}%</span>
        <span>{totals.inProgress > 0 ? `${totals.inProgress} em andamento` : ""}</span>
      </div>

      <div className="mt-6 grid gap-3">
        {lessons.map((lesson) => {
          const progress = progressByLessonId[lesson.id];
          const status = progress?.status ?? "not_started";
          const statusLabel = status === "completed" ? "Concluída" : status === "in_progress" ? "Em andamento" : "Não iniciada";
          const statusClass =
            status === "completed"
              ? "bg-success/15 text-success border-success/40"
              : status === "in_progress"
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-secondary text-muted-foreground border-border";

          return (
            <div key={lesson.id} className="flex flex-col gap-3 rounded-2xl border-2 border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-foreground">Lição {lesson.lesson_no}</span>
                  <span className={`rounded-full border px-2 py-0.5 font-body text-xs ${statusClass}`}>{statusLabel}</span>
                </div>
                <div className="mt-1 truncate font-body text-sm text-muted-foreground">{lesson.title}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={status === "completed" ? "outline" : "default"}
                  size="sm"
                  onClick={() => navigate("/lesson")}
                >
                  {status === "completed" ? "Rever" : "Abrir"}
                </Button>
              </div>
            </div>
          );
        })}
        {!lessons.length ? (
          <div className="rounded-2xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
            Nenhuma lição encontrada para este módulo/nível. Rode o SQL de geração de lições no Supabase.
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default LessonProgressPanel;
