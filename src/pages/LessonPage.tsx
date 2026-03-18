import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Volume2, Mic, ArrowLeft, Star, Flame, Trophy } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import { speak } from "@/lib/speak";
import { toast } from "@/hooks/use-toast";
import { recognizeSpeech } from "@/lib/recognizeSpeech";
import { supabase } from "@/lib/supabaseClient";

type ModuleKey = "crianca" | "adolescente" | "adulto";

type Phrase = {
  english: string;
  translation: string;
};

const phraseBank: Record<ModuleKey, Record<number, Phrase[]>> = {
  crianca: {
    1: [
      { english: "Good morning!", translation: "Bom dia!" },
      { english: "My name is Ana.", translation: "Meu nome é Ana." },
      { english: "I like to play.", translation: "Eu gosto de brincar." },
      { english: "The cat is black.", translation: "O gato é preto." },
      { english: "I am happy today.", translation: "Eu estou feliz hoje." },
    ],
    2: [
      { english: "Can I have water, please?", translation: "Posso tomar água, por favor?" },
      { english: "I want to go to the park.", translation: "Eu quero ir ao parque." },
      { english: "My favorite color is blue.", translation: "Minha cor favorita é azul." },
      { english: "I can jump and run.", translation: "Eu consigo pular e correr." },
      { english: "Let’s play together!", translation: "Vamos brincar juntos!" },
    ],
    3: [
      { english: "Today I will learn something new.", translation: "Hoje eu vou aprender algo novo." },
      { english: "I am brave and I can try again.", translation: "Eu sou corajoso(a) e posso tentar de novo." },
      { english: "I like reading books before bed.", translation: "Eu gosto de ler livros antes de dormir." },
      { english: "Please help me with this.", translation: "Por favor, me ajude com isso." },
      { english: "I did my homework!", translation: "Eu fiz minha lição de casa!" },
    ],
  },
  adolescente: {
    1: [
      { english: "Nice to meet you.", translation: "Prazer em te conhecer." },
      { english: "I am from Brazil.", translation: "Eu sou do Brasil." },
      { english: "What do you like to do?", translation: "O que você gosta de fazer?" },
      { english: "I like music and movies.", translation: "Eu gosto de música e filmes." },
      { english: "See you later!", translation: "Até mais!" },
    ],
    2: [
      { english: "I study in the morning.", translation: "Eu estudo de manhã." },
      { english: "I’m learning English every day.", translation: "Eu estou aprendendo inglês todos os dias." },
      { english: "Could you repeat that, please?", translation: "Você pode repetir isso, por favor?" },
      { english: "I didn’t understand the last part.", translation: "Eu não entendi a última parte." },
      { english: "Let’s practice together.", translation: "Vamos praticar juntos." },
    ],
    3: [
      { english: "I’m trying to improve my pronunciation.", translation: "Estou tentando melhorar minha pronúncia." },
      { english: "I want to speak with more confidence.", translation: "Eu quero falar com mais confiança." },
      { english: "What’s your opinion about this?", translation: "Qual a sua opinião sobre isso?" },
      { english: "I agree, but I have a question.", translation: "Eu concordo, mas tenho uma pergunta." },
      { english: "That makes sense to me.", translation: "Isso faz sentido para mim." },
    ],
  },
  adulto: {
    1: [
      { english: "How can I help you?", translation: "Como posso ajudar?" },
      { english: "I would like a coffee, please.", translation: "Eu gostaria de um café, por favor." },
      { english: "Where is the bathroom?", translation: "Onde fica o banheiro?" },
      { english: "I’m here for a meeting.", translation: "Estou aqui para uma reunião." },
      { english: "Thank you very much.", translation: "Muito obrigado(a)." },
    ],
    2: [
      { english: "Could you send me an email?", translation: "Você pode me enviar um email?" },
      { english: "Let’s schedule a call.", translation: "Vamos agendar uma ligação." },
      { english: "I will be there in ten minutes.", translation: "Eu estarei aí em dez minutos." },
      { english: "I need more information about this.", translation: "Eu preciso de mais informações sobre isso." },
      { english: "I’m available this afternoon.", translation: "Estou disponível esta tarde." },
    ],
    3: [
      { english: "I’m working on it and I will update you.", translation: "Estou trabalhando nisso e vou te atualizar." },
      { english: "Can we review this together?", translation: "Podemos revisar isso juntos?" },
      { english: "I’m not sure, but I can check.", translation: "Não tenho certeza, mas posso verificar." },
      { english: "Let’s focus on the main goal.", translation: "Vamos focar no objetivo principal." },
      { english: "I appreciate your help.", translation: "Eu agradeço a sua ajuda." },
    ],
  },
};

const getPhrasesFor = (module: ModuleKey | null, level: number | null) => {
  const moduleKey: ModuleKey = module ?? "crianca";
  const rawLevel = level ?? 1;
  const normalizedLevel = Math.max(1, Math.min(10, rawLevel));
  const byLevel = phraseBank[moduleKey];
  return byLevel[normalizedLevel] ?? byLevel[Math.min(3, normalizedLevel)] ?? byLevel[1];
};

type Feedback = "correct" | "almost" | "wrong" | null;

const feedbackConfig = {
  correct: { emoji: "✅", text: "Perfeito!", color: "bg-success/20 border-success text-success" },
  almost: { emoji: "⚠️", text: "Quase lá!", color: "bg-gamification/20 border-gamification text-gamification-foreground" },
  wrong: { emoji: "❌", text: "Tente novamente!", color: "bg-destructive/20 border-destructive text-destructive" },
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const levenshteinDistance = (a: string, b: string) => {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const aLen = a.length;
  const bLen = b.length;
  const prev = new Array<number>(bLen + 1);
  const curr = new Array<number>(bLen + 1);

  for (let j = 0; j <= bLen; j += 1) prev[j] = j;

  for (let i = 1; i <= aLen; i += 1) {
    curr[0] = i;
    const aChar = a.charCodeAt(i - 1);
    for (let j = 1; j <= bLen; j += 1) {
      const cost = aChar === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= bLen; j += 1) prev[j] = curr[j];
  }

  return prev[bLen];
};

const similarity = (a: string, b: string) => {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  const dist = levenshteinDistance(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
};

const LessonPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(3);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [module, setModule] = useState<ModuleKey | null>(null);
  const [level, setLevel] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [lessonNo, setLessonNo] = useState<number | null>(null);
  const [totalLessons, setTotalLessons] = useState<number | null>(null);
  const [lessonIdsInLevel, setLessonIdsInLevel] = useState<string[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [isLevelFinished, setIsLevelFinished] = useState(false);

  const phrases = useMemo(() => getPhrasesFor(module, level), [module, level]);
  const phaseCount = phrases.length;
  const isLessonCompleted = currentPhrase >= phaseCount;
  const phrase = isLessonCompleted ? null : phrases[currentPhrase];

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!supabase) {
        if (!mounted) return;
        toast({ title: "Configuração pendente", description: "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY." });
        setIsLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;
      const sessionUserId = sessionData.session?.user.id;
      if (!sessionUserId) {
        navigate("/login");
        return;
      }
      setUserId(sessionUserId);

      const { data: pathData } = await supabase.from("user_learning_path").select("module, level").eq("user_id", sessionUserId).maybeSingle();
      if (!mounted) return;

      const selectedModule = (pathData?.module as ModuleKey | undefined) ?? null;
      const selectedLevel = (pathData?.level as number | undefined) ?? null;
      setModule(selectedModule);
      setLevel(selectedLevel);
      setIsLevelFinished(false);

      if (!selectedModule || !selectedLevel) {
        setIsLoading(false);
        return;
      }

      const phaseCountForSelection = getPhrasesFor(selectedModule, selectedLevel).length;

      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("id, lesson_no")
        .eq("module", selectedModule)
        .eq("level", selectedLevel)
        .order("lesson_no", { ascending: true });

      if (!mounted) return;

      if (lessonsError) {
        toast({ title: "Erro ao carregar lições", description: lessonsError.message });
        setIsLoading(false);
        return;
      }

      const lessonRows = (lessonsData ?? []) as Array<{ id: string; lesson_no: number }>;
      const allLessonIds = lessonRows.map((l) => l.id);
      setLessonIdsInLevel(allLessonIds);
      setTotalLessons(lessonRows.length);

      const requestedLessonId = searchParams.get("lessonId");
      const requested = requestedLessonId ? lessonRows.find((l) => l.id === requestedLessonId) : null;

      const completedSet = new Set<string>();
      const byId = new Map<string, { status: "not_started" | "in_progress" | "completed"; current_phase: number }>();

      if (allLessonIds.length) {
        const { data: progressData, error: progressError } = await supabase
          .from("user_lesson_progress")
          .select("lesson_id, status, current_phase")
          .eq("user_id", sessionUserId)
          .in("lesson_id", allLessonIds);

        if (!mounted) return;

        if (progressError) {
          toast({ title: "Erro ao carregar progresso", description: progressError.message });
          setIsLoading(false);
          return;
        }

        for (const row of (progressData ?? []) as Array<{
          lesson_id: string;
          status: "not_started" | "in_progress" | "completed";
          current_phase: number | null;
        }>) {
          const current_phase = Number(row.current_phase ?? 0);
          byId.set(row.lesson_id, { status: row.status, current_phase });
          if (row.status === "completed") completedSet.add(row.lesson_id);
        }
      }

      let chosen = requested ?? null;
      if (!chosen && allLessonIds.length) {
        const next = lessonRows.find((l) => byId.get(l.id)?.status !== "completed");
        chosen = next ?? null;
      }

      setCompletedLessonIds(completedSet);
      if (chosen) {
        setLessonId(chosen.id);
        setLessonNo(chosen.lesson_no);
        setIsLevelFinished(false);

        const row = byId.get(chosen.id);
        const currentStatus = row?.status ?? "not_started";
        const savedPhase = row?.current_phase ?? 0;
        setCurrentPhrase(Math.min(Math.max(savedPhase, 0), phaseCountForSelection));

        if (currentStatus !== "completed") {
          if (currentStatus === "not_started") {
            await supabase.from("user_lesson_progress").upsert(
              {
                user_id: sessionUserId,
                lesson_id: chosen.id,
                status: "in_progress",
                current_phase: 0,
                started_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id,lesson_id" },
            );
          } else {
            await supabase.from("user_lesson_progress").update({ updated_at: new Date().toISOString() }).eq("user_id", sessionUserId).eq("lesson_id", chosen.id);
          }
        } else {
          setCurrentPhrase(phaseCountForSelection);
        }
      } else {
        setLessonId(null);
        setLessonNo(null);
        setIsLevelFinished(true);
        setCurrentPhrase(phaseCountForSelection);
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [navigate, searchParams]);

  const handleListen = async () => {
    if (!phrase) return;
    setIsSpeaking(true);
    try {
      await speak(phrase.english, { lang: "en-US" });
    } catch (e) {
      toast({
        title: "Não foi possível reproduzir o áudio",
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setIsSpeaking(false);
    }
  };

  const persistLessonPhaseProgress = async (nextPhase: number, completed: boolean) => {
    if (!supabase || !userId || !lessonId) return;
    await supabase.from("user_lesson_progress").upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        status: completed ? "completed" : "in_progress",
        current_phase: nextPhase,
        updated_at: new Date().toISOString(),
        completed_at: completed ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,lesson_id" },
    );
  };

  const completeCurrentLesson = async () => {
    if (!supabase || !userId || !lessonId) return;
    const { error } = await supabase
      .from("user_lesson_progress")
      .upsert(
        {
          user_id: userId,
          lesson_id: lessonId,
          status: "completed",
          current_phase: phaseCount,
          score: points,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" },
      );

    if (error) {
      toast({ title: "Não foi possível salvar o progresso", description: error.message });
      return;
    }

    setCompletedLessonIds((prev) => {
      const next = new Set(prev);
      next.add(lessonId);
      return next;
    });
  };

  const startNextLessonIfAny = async () => {
    if (!supabase || !userId || !module || !level) return false;
    if (!lessonIdsInLevel.length) return false;

    const { data: lessonsData } = await supabase
      .from("lessons")
      .select("id, lesson_no")
      .eq("module", module)
      .eq("level", level)
      .order("lesson_no", { ascending: true });

    const rows = (lessonsData ?? []) as Array<{ id: string; lesson_no: number }>;
    const lessonIds = rows.map((r) => r.id);
    const { data: progressData } = await supabase
      .from("user_lesson_progress")
      .select("lesson_id, status, current_phase")
      .eq("user_id", userId)
      .in("lesson_id", lessonIds);

    const statusById = new Map<string, { status: "not_started" | "in_progress" | "completed"; current_phase: number }>();
    for (const row of (progressData ?? []) as Array<{
      lesson_id: string;
      status: "not_started" | "in_progress" | "completed";
      current_phase: number | null;
    }>) {
      statusById.set(row.lesson_id, { status: row.status, current_phase: Number(row.current_phase ?? 0) });
    }

    const next = rows.find((l) => statusById.get(l.id)?.status !== "completed" && l.id !== lessonId);
    if (!next) return false;

    setIsLevelFinished(false);
    setLessonId(next.id);
    setLessonNo(next.lesson_no);
    setPoints(0);
    setFeedback(null);
    const savedPhase = statusById.get(next.id)?.current_phase ?? 0;
    setCurrentPhrase(Math.min(Math.max(savedPhase, 0), phaseCount));
    if ((statusById.get(next.id)?.status ?? "not_started") === "not_started") {
      await supabase.from("user_lesson_progress").upsert(
        {
          user_id: userId,
          lesson_id: next.id,
          status: "in_progress",
          current_phase: 0,
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" },
      );
    }

    return true;
  };

  const handleRecord = () => {
    if (isRecording || !phrase) return;
    setIsRecording(true);
    setFeedback(null);

    (async () => {
      try {
        const transcript = await recognizeSpeech({ lang: "en-US" });
        const score = similarity(transcript, phrase.english);
        const result: Feedback = score >= 0.85 ? "correct" : score >= 0.65 ? "almost" : "wrong";
        setFeedback(result);
        if (result === "correct") setPoints((p) => p + 10);
        if (result === "almost") setPoints((p) => p + 5);
        if (result === "correct") {
          const nextPhase = Math.min(currentPhrase + 1, phaseCount);
          const completed = nextPhase >= phaseCount;
          await persistLessonPhaseProgress(nextPhase, completed);
          setTimeout(() => {
            handleNext(nextPhase);
          }, 700);
        }
      } catch (e) {
        toast({
          title: "Não foi possível usar o microfone",
          description: e instanceof Error ? e.message : "Tente novamente.",
        });
      } finally {
        setIsRecording(false);
      }
    })();
  };

  const handleNext = (nextPhase?: number) => {
    setFeedback(null);
    if (typeof nextPhase === "number") {
      setCurrentPhrase(nextPhase);
      if (nextPhase >= phaseCount) {
        void completeCurrentLesson().then(async () => {
          const startedNext = await startNextLessonIfAny();
          if (!startedNext) {
            setIsLevelFinished(true);
            setLessonId(null);
            setLessonNo(null);
            setCurrentPhrase(phaseCount);
          }
        });
      }
      return;
    }
    const phase = Math.min(currentPhrase + 1, phaseCount);
    void persistLessonPhaseProgress(phase, phase >= phaseCount);
    setCurrentPhrase(phase);
    if (phase >= phaseCount) {
      void completeCurrentLesson().then(async () => {
        const startedNext = await startNextLessonIfAny();
        if (!startedNext) {
          setIsLevelFinished(true);
          setLessonId(null);
          setLessonNo(null);
          setCurrentPhrase(phaseCount);
        }
      });
    }
  };

  const handleRestartLevel = async () => {
    setFeedback(null);
    setCurrentPhrase(0);
    setPoints(0);

    if (supabase && userId && lessonIdsInLevel.length) {
      const { error } = await supabase.from("user_lesson_progress").delete().eq("user_id", userId).in("lesson_id", lessonIdsInLevel);
      if (error) {
        toast({ title: "Não foi possível refazer o nível", description: error.message });
      } else {
        setCompletedLessonIds(new Set());
        setIsLevelFinished(false);
        setLessonId(null);
        setLessonNo(null);
        navigate("/lesson");
      }
    }
  };

  const handleRedoCurrentLesson = async () => {
    if (!supabase || !userId || !lessonId) return;
    const { error } = await supabase.from("user_lesson_progress").delete().eq("user_id", userId).eq("lesson_id", lessonId);
    if (error) {
      toast({ title: "Não foi possível refazer a lição", description: error.message });
      return;
    }
    setCurrentPhrase(0);
    setFeedback(null);
    setPoints(0);
    setIsLevelFinished(false);
    await supabase.from("user_lesson_progress").upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        status: "in_progress",
        current_phase: 0,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" },
    );
  };

  const handleNextLevel = async () => {
    if (!supabase || !module || !level) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      navigate("/login");
      return;
    }

    const nextLevel = level + 1;
    const { error } = await supabase
      .from("user_learning_path")
      .update({ level: nextLevel, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Não foi possível avançar de nível", description: error.message });
      return;
    }

    setLevel(nextLevel);
    setCurrentPhrase(0);
    setFeedback(null);
    setPoints(0);
    setIsLevelFinished(false);
    setLessonId(null);
    setLessonNo(null);
    navigate("/lesson");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        {/* Stats bar */}
        <div className="mb-6 flex items-center justify-between rounded-2xl bg-card border-2 border-border p-4">
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-destructive" fill="hsl(var(--destructive))" />
            <span className="font-display font-bold text-foreground">{streak}</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6 text-gamification" fill="hsl(var(--gamification))" />
            <span className="font-display font-bold text-foreground">{points} pts</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" fill="hsl(var(--primary))" />
            <span className="font-display font-bold text-foreground">{level ? `Nível ${level}` : "Nível"}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8 h-4 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-success transition-all duration-500"
            style={{ width: `${(Math.min(currentPhrase, phaseCount) / phaseCount) * 100}%` }}
          />
        </div>

        {/* Lesson card */}
        <div className="mx-auto max-w-md">
          <div className="rounded-3xl border-2 border-border bg-card p-8 text-center shadow-lg">
            {lessonNo && totalLessons ? (
              <p className="mb-2 font-body text-sm text-muted-foreground">
                Lição {lessonNo} de {totalLessons}
              </p>
            ) : null}
            {isLoading ? (
              <p className="font-body text-muted-foreground">Carregando...</p>
            ) : isLevelFinished ? (
              <>
                <h2 className="mb-2 font-display text-3xl font-bold text-success">Nível concluído ✅</h2>
                <p className="mb-8 font-body text-muted-foreground">Você completou todas as fases deste nível.</p>
              </>
            ) : isLessonCompleted ? (
              <>
                <h2 className="mb-2 font-display text-3xl font-bold text-success">Lição concluída ✅</h2>
                <p className="mb-8 font-body text-muted-foreground">Você completou todas as fases desta lição.</p>
                <div className="flex flex-col gap-3">
                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full"
                    onClick={async () => {
                      const startedNext = await startNextLessonIfAny();
                      if (!startedNext) setIsLevelFinished(true);
                    }}
                  >
                    Próxima lição →
                  </Button>
                  <Button variant="outline" size="lg" className="w-full" onClick={handleRedoCurrentLesson}>
                    Refazer lição
                  </Button>
                </div>
              </>
            ) : phrase ? (
              <>
                <p className="mb-2 font-body text-sm text-muted-foreground">Repita a frase:</p>
                <h2 className="mb-2 font-display text-3xl font-bold text-primary animate-bounce-in">
                  "{phrase.english}"
                </h2>
                <p className="mb-8 font-body text-muted-foreground">{phrase.translation}</p>
              </>
            ) : null}

            {/* Buttons */}
            <div className="flex flex-col gap-4">
              <Button variant="default" size="xl" className="w-full" onClick={handleListen} disabled={isSpeaking}>
                <Volume2 className="h-6 w-6" /> Ouvir 🎧
              </Button>
              <Button
                variant={isRecording ? "destructive" : "success"}
                size="xl"
                className="w-full"
                onClick={handleRecord}
                disabled={isRecording || isSpeaking || isLoading || isLevelFinished || isLessonCompleted}
              >
                <Mic className="h-6 w-6" />
                {isRecording ? "Gravando..." : "Falar 🎤"}
              </Button>
            </div>

            {/* Feedback */}
            {feedback && (
              <div className={`mt-6 rounded-2xl border-2 p-4 animate-bounce-in ${feedbackConfig[feedback].color}`}>
                <span className="text-3xl">{feedbackConfig[feedback].emoji}</span>
                <p className="mt-1 font-display text-xl font-bold">
                  {feedbackConfig[feedback].text}
                </p>
                {(feedback === "correct" || feedback === "almost") && (
                  <Button variant="success" className="mt-3" onClick={handleNext}>
                    Próxima frase →
                  </Button>
                )}
                {feedback === "wrong" && (
                  <Button variant="default" className="mt-3" onClick={handleRecord}>
                    Tentar de novo 🔄
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Lesson path preview */}
          <div className="mt-8 flex flex-col items-center gap-3">
            {phrases.map((p, i) => (
              <div
                key={i}
                className={`h-10 w-10 rounded-full flex items-center justify-center font-display font-bold text-sm border-2 transition-all ${
                  i < currentPhrase
                    ? "bg-success text-success-foreground border-success"
                    : i === currentPhrase
                    ? "bg-primary text-primary-foreground border-primary scale-125"
                    : "bg-secondary text-muted-foreground border-border"
                }`}
              >
                {i < currentPhrase ? "✓" : i + 1}
              </div>
            ))}
          </div>

          {isLevelFinished ? (
            <div className="mt-6 flex w-full flex-col gap-3">
              <Button variant="hero" size="lg" className="w-full" onClick={handleNextLevel} disabled={!level}>
                Próximo nível →
              </Button>
              <Button variant="outline" size="lg" className="w-full" onClick={handleRestartLevel}>
                Refazer nível
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default LessonPage;
