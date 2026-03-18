import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Volume2, Mic, ArrowLeft, Star, Flame, Trophy } from "lucide-react";
import Navbar from "@/components/landing/Navbar";

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

const LessonPage = () => {
  const navigate = useNavigate();
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(3);
  const [isRecording, setIsRecording] = useState(false);

  const phrase = phrases[currentPhrase];

  const handleListen = () => {
    // Mock: would use speech synthesis API
  };

  const handleRecord = () => {
    setIsRecording(true);
    setFeedback(null);
    setTimeout(() => {
      setIsRecording(false);
      // Mock random feedback
      const results: Feedback[] = ["correct", "correct", "correct", "almost", "wrong"];
      const result = results[Math.floor(Math.random() * results.length)];
      setFeedback(result);
      if (result === "correct") setPoints((p) => p + 10);
      if (result === "almost") setPoints((p) => p + 5);
    }, 2000);
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
              <Button variant="default" size="xl" className="w-full" onClick={handleListen}>
                <Volume2 className="h-6 w-6" /> Ouvir 🎧
              </Button>
              <Button
                variant={isRecording ? "destructive" : "success"}
                size="xl"
                className="w-full"
                onClick={handleRecord}
                disabled={isRecording}
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
