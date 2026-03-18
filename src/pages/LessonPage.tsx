import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Volume2, Mic, ArrowLeft, Star, Flame, Trophy } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import { speak } from "@/lib/speak";
import { toast } from "@/hooks/use-toast";
import { recognizeSpeech } from "@/lib/recognizeSpeech";

const phrases = [
  { english: "My name is John", translation: "Meu nome é John" },
  { english: "I like to play", translation: "Eu gosto de brincar" },
  { english: "The cat is black", translation: "O gato é preto" },
  { english: "I am happy today", translation: "Eu estou feliz hoje" },
  { english: "Good morning!", translation: "Bom dia!" },
];

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
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(3);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const phrase = phrases[currentPhrase];

  const handleListen = async () => {
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

  const handleRecord = () => {
    if (isRecording) return;
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
          setTimeout(() => {
            handleNext();
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

  const handleNext = () => {
    setFeedback(null);
    setCurrentPhrase((c) => (c + 1) % phrases.length);
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
            <span className="font-display font-bold text-foreground">Nível 1</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8 h-4 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-success transition-all duration-500"
            style={{ width: `${((currentPhrase + 1) / phrases.length) * 100}%` }}
          />
        </div>

        {/* Lesson card */}
        <div className="mx-auto max-w-md">
          <div className="rounded-3xl border-2 border-border bg-card p-8 text-center shadow-lg">
            <p className="mb-2 font-body text-sm text-muted-foreground">Repita a frase:</p>
            <h2 className="mb-2 font-display text-3xl font-bold text-primary animate-bounce-in">
              "{phrase.english}"
            </h2>
            <p className="mb-8 font-body text-muted-foreground">{phrase.translation}</p>

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
                disabled={isRecording || isSpeaking}
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
        </div>
      </div>
    </div>
  );
};

export default LessonPage;
