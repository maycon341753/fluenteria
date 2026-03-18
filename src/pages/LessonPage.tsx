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

type Word = { en: string; pt: string };

const getDifficulty = (level: number) => {
  if (level <= 1) return "easy";
  if (level === 2) return "medium";
  return "hard";
};

const childAnimals: Word[] = [
  { en: "cat", pt: "gato" },
  { en: "dog", pt: "cachorro" },
  { en: "bird", pt: "pássaro" },
  { en: "fish", pt: "peixe" },
  { en: "rabbit", pt: "coelho" },
  { en: "turtle", pt: "tartaruga" },
  { en: "lion", pt: "leão" },
  { en: "monkey", pt: "macaco" },
  { en: "bear", pt: "urso" },
  { en: "frog", pt: "sapo" },
];

const childColors: Word[] = [
  { en: "red", pt: "vermelho" },
  { en: "blue", pt: "azul" },
  { en: "green", pt: "verde" },
  { en: "yellow", pt: "amarelo" },
  { en: "pink", pt: "rosa" },
  { en: "purple", pt: "roxo" },
  { en: "orange", pt: "laranja" },
  { en: "black", pt: "preto" },
  { en: "white", pt: "branco" },
  { en: "brown", pt: "marrom" },
];

const childToys: Word[] = [
  { en: "ball", pt: "bola" },
  { en: "doll", pt: "boneca" },
  { en: "kite", pt: "pipa" },
  { en: "bike", pt: "bicicleta" },
  { en: "car", pt: "carrinho" },
  { en: "puzzle", pt: "quebra-cabeça" },
  { en: "book", pt: "livro" },
  { en: "robot", pt: "robô" },
  { en: "blocks", pt: "blocos" },
  { en: "train", pt: "trem" },
];

const teenHobbies: Word[] = [
  { en: "music", pt: "música" },
  { en: "movies", pt: "filmes" },
  { en: "sports", pt: "esportes" },
  { en: "games", pt: "jogos" },
  { en: "reading", pt: "leitura" },
  { en: "drawing", pt: "desenho" },
  { en: "dancing", pt: "dança" },
  { en: "coding", pt: "programação" },
  { en: "photography", pt: "fotografia" },
  { en: "travel", pt: "viagem" },
];

const adultWork: Word[] = [
  { en: "meeting", pt: "reunião" },
  { en: "email", pt: "email" },
  { en: "deadline", pt: "prazo" },
  { en: "project", pt: "projeto" },
  { en: "client", pt: "cliente" },
  { en: "report", pt: "relatório" },
  { en: "schedule", pt: "agenda" },
  { en: "budget", pt: "orçamento" },
  { en: "proposal", pt: "proposta" },
  { en: "presentation", pt: "apresentação" },
];

const pick = <T,>(list: T[], idx: number) => list[idx % list.length];

const generateChildPhrase = (difficulty: "easy" | "medium" | "hard", idx: number) => {
  const animal = pick(childAnimals, idx);
  const color = pick(childColors, idx + 3);
  const toy = pick(childToys, idx + 7);

  if (difficulty === "easy") {
    const t = idx % 5;
    if (t === 0) return { english: `I see a ${color.en} ${animal.en}.`, translation: `Eu vejo um ${animal.pt} ${color.pt}.` };
    if (t === 1) return { english: `I like my ${toy.en}.`, translation: `Eu gosto do meu/minha ${toy.pt}.` };
    if (t === 2) return { english: `The ${animal.en} is ${color.en}.`, translation: `O ${animal.pt} é ${color.pt}.` };
    if (t === 3) return { english: `I can play with a ${toy.en}.`, translation: `Eu consigo brincar com um/uma ${toy.pt}.` };
    return { english: `Hello! I like the ${color.en} ${toy.en}.`, translation: `Olá! Eu gosto do/a ${toy.pt} ${color.pt}.` };
  }

  if (difficulty === "medium") {
    const t = idx % 5;
    if (t === 0) return { english: `Can I play with the ${toy.en}, please?`, translation: `Posso brincar com o/a ${toy.pt}, por favor?` };
    if (t === 1) return { english: `I want to go to the park with my ${toy.en}.`, translation: `Eu quero ir ao parque com o/a meu/minha ${toy.pt}.` };
    if (t === 2) return { english: `My favorite ${animal.en} is the ${color.en} one.`, translation: `Meu ${animal.pt} favorito é o ${color.pt}.` };
    if (t === 3) return { english: `I can jump, run, and play.`, translation: `Eu consigo pular, correr e brincar.` };
    return { english: `Let’s share and be kind.`, translation: `Vamos compartilhar e ser gentis.` };
  }

  const t = idx % 5;
  if (t === 0) return { english: `Today I will practice English and play with my ${toy.en}.`, translation: `Hoje eu vou praticar inglês e brincar com o/a meu/minha ${toy.pt}.` };
  if (t === 1) return { english: `If I make a mistake, I can try again with a ${color.en} smile.`, translation: `Se eu errar, eu posso tentar de novo com um sorriso ${color.pt}.` };
  if (t === 2) return { english: `I like reading a ${toy.en} book before I sleep.`, translation: `Eu gosto de ler um livro de ${toy.pt} antes de dormir.` };
  if (t === 3) return { english: `Please help me understand the ${color.en} ${animal.en} sentence.`, translation: `Por favor, me ajude a entender a frase do ${animal.pt} ${color.pt}.` };
  return { english: `I feel proud when I learn something new about a ${animal.en}.`, translation: `Eu me sinto orgulhoso(a) quando aprendo algo novo sobre um ${animal.pt}.` };
};

const generateTeenPhrase = (difficulty: "easy" | "medium" | "hard", idx: number) => {
  const hobby = pick(teenHobbies, idx);

  if (difficulty === "easy") {
    const t = idx % 5;
    if (t === 0) return { english: `Nice to meet you. I like ${hobby.en}.`, translation: `Prazer em te conhecer. Eu gosto de ${hobby.pt}.` };
    if (t === 1) return { english: `I like ${hobby.en}.`, translation: `Eu gosto de ${hobby.pt}.` };
    if (t === 2) return { english: `What do you like to do?`, translation: `O que você gosta de fazer?` };
    if (t === 3) return { english: `I study in the morning.`, translation: `Eu estudo de manhã.` };
    return { english: `See you later! Let’s talk about ${hobby.en}.`, translation: `Até mais! Vamos falar sobre ${hobby.pt}.` };
  }

  if (difficulty === "medium") {
    const t = idx % 5;
    if (t === 0) return { english: `I’m learning English every day to talk about ${hobby.en}.`, translation: `Eu estou aprendendo inglês todos os dias para falar sobre ${hobby.pt}.` };
    if (t === 1) return { english: `Could you repeat that about ${hobby.en}, please?`, translation: `Você pode repetir isso sobre ${hobby.pt}, por favor?` };
    if (t === 2) return { english: `I didn’t understand the last part about ${hobby.en}.`, translation: `Eu não entendi a última parte sobre ${hobby.pt}.` };
    if (t === 3) return { english: `Let’s practice together after class using ${hobby.en}.`, translation: `Vamos praticar juntos depois da aula usando ${hobby.pt}.` };
    return { english: `I’m feeling more confident when I talk about ${hobby.en}.`, translation: `Eu me sinto mais confiante quando falo sobre ${hobby.pt}.` };
  }

  const t = idx % 5;
  if (t === 0) return { english: `In my opinion, this idea is helpful.`, translation: `Na minha opinião, essa ideia é útil.` };
  if (t === 1) return { english: `I agree, but I have a question about it.`, translation: `Eu concordo, mas tenho uma pergunta sobre isso.` };
  if (t === 2) return { english: `I’m trying to improve my pronunciation when I talk about ${hobby.en}.`, translation: `Estou tentando melhorar minha pronúncia quando falo sobre ${hobby.pt}.` };
  if (t === 3) return { english: `That makes sense to me, thanks for explaining.`, translation: `Isso faz sentido para mim, obrigado(a) por explicar.` };
  return { english: `I want to speak with more confidence about ${hobby.en}.`, translation: `Eu quero falar com mais confiança sobre ${hobby.pt}.` };
};

const generateAdultPhrase = (difficulty: "easy" | "medium" | "hard", idx: number) => {
  const topic = pick(adultWork, idx);

  if (difficulty === "easy") {
    const t = idx % 5;
    if (t === 0) return { english: `How can I help you with the ${topic.en}?`, translation: `Como posso ajudar com o(a) ${topic.pt}?` };
    if (t === 1) return { english: `I would like a coffee, please.`, translation: `Eu gostaria de um café, por favor.` };
    if (t === 2) return { english: `Where is the bathroom?`, translation: `Onde fica o banheiro?` };
    if (t === 3) return { english: `Thank you for the ${topic.en}.`, translation: `Obrigado(a) pelo(a) ${topic.pt}.` };
    return { english: `I’m here for a ${topic.en}.`, translation: `Estou aqui para uma ${topic.pt}.` };
  }

  if (difficulty === "medium") {
    const t = idx % 5;
    if (t === 0) return { english: `Could you send me an ${topic.en}?`, translation: `Você pode me enviar um(a) ${topic.pt}?` };
    if (t === 1) return { english: `Let’s schedule a call for tomorrow.`, translation: `Vamos agendar uma ligação para amanhã.` };
    if (t === 2) return { english: `I will be there in ten minutes.`, translation: `Eu estarei aí em dez minutos.` };
    if (t === 3) return { english: `I need more information about this ${topic.en}.`, translation: `Eu preciso de mais informações sobre este/esta ${topic.pt}.` };
    return { english: `I’m available this afternoon.`, translation: `Estou disponível esta tarde.` };
  }

  const t = idx % 5;
  if (t === 0) return { english: `I’m working on the ${topic.en} and I will update you soon.`, translation: `Estou trabalhando no(a) ${topic.pt} e vou te atualizar em breve.` };
  if (t === 1) return { english: `Can we review this together before the ${topic.en}?`, translation: `Podemos revisar isso juntos antes do(a) ${topic.pt}?` };
  if (t === 2) return { english: `I’m not sure, but I can check and confirm.`, translation: `Não tenho certeza, mas posso verificar e confirmar.` };
  if (t === 3) return { english: `Let’s focus on the main goal and the next steps.`, translation: `Vamos focar no objetivo principal e nos próximos passos.` };
  return { english: `I appreciate your help with this ${topic.en}.`, translation: `Eu agradeço sua ajuda com este/esta ${topic.pt}.` };
};

const getPhrasesFor = (module: ModuleKey | null, level: number | null, lessonNo: number | null) => {
  const moduleKey: ModuleKey = module ?? "crianca";
  const normalizedLevel = Math.max(1, Math.min(10, level ?? 1));
  const difficulty = getDifficulty(normalizedLevel);
  const baseLesson = Math.max(1, lessonNo ?? 1);
  const baseIndex = (baseLesson - 1) * 5;

  const phrases: Phrase[] = [];
  for (let i = 0; i < 5; i += 1) {
    const idx = baseIndex + i;
    if (moduleKey === "crianca") phrases.push(generateChildPhrase(difficulty, idx));
    if (moduleKey === "adolescente") phrases.push(generateTeenPhrase(difficulty, idx));
    if (moduleKey === "adulto") phrases.push(generateAdultPhrase(difficulty, idx));
  }
  return phrases;
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
  const [dbPhrases, setDbPhrases] = useState<Phrase[] | null>(null);
  const [isPhrasesLoading, setIsPhrasesLoading] = useState(false);
  const [pendingPhase, setPendingPhase] = useState<number | null>(null);

  const fallbackPhrases = useMemo(() => getPhrasesFor(module, level, lessonNo), [module, level, lessonNo]);
  const phrases = useMemo(() => (dbPhrases && dbPhrases.length ? dbPhrases : fallbackPhrases), [dbPhrases, fallbackPhrases]);
  const phaseCount = phrases.length;
  const isLessonCompleted = currentPhrase >= phaseCount;
  const phrase = isLessonCompleted ? null : phrases[currentPhrase];

  useEffect(() => {
    if (pendingPhase === null) return;
    setCurrentPhrase(Math.min(Math.max(pendingPhase, 0), phaseCount));
    setPendingPhase(null);
  }, [pendingPhase, phaseCount]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!supabase || !lessonId) {
        if (!mounted) return;
        setDbPhrases(null);
        setIsPhrasesLoading(false);
        return;
      }

      setIsPhrasesLoading(true);
      const { data, error } = await supabase
        .from("lesson_items")
        .select("item_no, english, translation")
        .eq("lesson_id", lessonId)
        .order("item_no", { ascending: true });

      if (!mounted) return;

      if (error) {
        setDbPhrases(null);
        setIsPhrasesLoading(false);
        return;
      }

      const rows = (data ?? []) as Array<{ item_no: number; english: string | null; translation: string | null }>;
      const mapped = rows
        .filter((r) => Boolean(r.english) && Boolean(r.translation))
        .map((r) => ({ english: r.english as string, translation: r.translation as string }));

      setDbPhrases(mapped.length ? mapped : null);
      setIsPhrasesLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [lessonId]);

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
      setDbPhrases(null);

      if (!selectedModule || !selectedLevel) {
        setIsLoading(false);
        return;
      }

      const phaseCountForSelection = getPhrasesFor(selectedModule, selectedLevel, 1).length;

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
        setPendingPhase(currentStatus === "completed" ? 999 : savedPhase);

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
          setPendingPhase(999);
        }
      } else {
        setLessonId(null);
        setLessonNo(null);
        setIsLevelFinished(true);
        setPendingPhase(999);
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
    setDbPhrases(null);
    setPoints(0);
    setFeedback(null);
    const savedPhase = statusById.get(next.id)?.current_phase ?? 0;
    setPendingPhase(savedPhase);
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
            {isLoading || isPhrasesLoading ? (
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
                disabled={isRecording || isSpeaking || isLoading || isPhrasesLoading || isLevelFinished || isLessonCompleted}
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
