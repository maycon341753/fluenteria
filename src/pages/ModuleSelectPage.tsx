import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type ModuleKey = "crianca" | "adolescente" | "adulto";

type ModuleLevel = {
  value: number;
  label: string;
};

type LearningModule = {
  key: ModuleKey;
  title: string;
  description: string;
  emoji: string;
  dashboardPath: string;
  levels: ModuleLevel[];
};

type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

const formatSubscriptionStatus = (status: SubscriptionStatus) => {
  if (status === "active") return "Ativo";
  if (status === "trialing") return "Teste";
  if (status === "past_due") return "Atrasado";
  return "Cancelado";
};

const ModuleSelectPage = () => {
  const navigate = useNavigate();
  const modules = useMemo<LearningModule[]>(
    () => [
      {
        key: "crianca",
        title: "Módulo Criança",
        description: "Aprendizado lúdico e progressivo para crianças.",
        emoji: "🧒",
        dashboardPath: "/dashboard/crianca",
        levels: [
          { value: 1, label: "Nível 1 (Básico)" },
          { value: 2, label: "Nível 2 (Intermediário)" },
          { value: 3, label: "Nível 3 (Avançado)" },
        ],
      },
      {
        key: "adolescente",
        title: "Módulo Adolescente",
        description: "Foco em conversação, vocabulário e fluência no dia a dia.",
        emoji: "🧑‍🎓",
        dashboardPath: "/dashboard/adolescente",
        levels: [
          { value: 1, label: "Nível 1 (A1)" },
          { value: 2, label: "Nível 2 (A2)" },
          { value: 3, label: "Nível 3 (B1)" },
        ],
      },
      {
        key: "adulto",
        title: "Módulo Adulto",
        description: "Trilhas por objetivos: trabalho, viagens e rotina.",
        emoji: "🧑‍💼",
        dashboardPath: "/dashboard/adulto",
        levels: [
          { value: 1, label: "Nível 1 (A1)" },
          { value: 2, label: "Nível 2 (A2)" },
          { value: 3, label: "Nível 3 (B1)" },
        ],
      },
    ],
    [],
  );

  const [isLoading, setIsLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<ModuleKey>("crianca");
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<SubscriptionStatus | null>(null);
  const [planInfoError, setPlanInfoError] = useState<string | null>(null);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!supabase) {
        if (!mounted) return;
        setErrorMessage("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
        setIsLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!data.session) {
        navigate("/login");
        return;
      }

      const userId = data.session.user.id;
      setUserCreatedAt((data.session.user.created_at as string | undefined) ?? null);

      const { data: subData, error: subError } = await supabase
        .from("user_subscriptions")
        .select("plan_id, status")
        .eq("user_id", userId)
        .maybeSingle();

      if (!mounted) return;

      if (subError) {
        setPlanInfoError(subError.message);
      } else {
        const status = subData?.status as SubscriptionStatus | undefined;
        const userPlanId = (subData?.plan_id as string | null | undefined) ?? null;
        setPlanId(userPlanId);

        if (status && (status === "active" || status === "trialing") && userPlanId) {
          const { data: planData, error: planError } = await supabase
            .from("plans")
            .select("name, price_cents")
            .eq("id", userPlanId)
            .maybeSingle();
          if (!mounted) return;
          if (planError) {
            setPlanInfoError(planError.message);
          } else {
            const fetchedName = (planData?.name as string | undefined) ?? "Premium";
            const priceCents = (planData?.price_cents as number | undefined) ?? null;
            setPlanName(fetchedName);
            setPlanStatus(status);
            if (fetchedName.toLowerCase() === "gratuito" || priceCents === 0) {
              setPlanStatus(null);
            }
          }
        } else {
          setPlanName("Gratuito");
          setPlanStatus(null);
        }
      }

      const { data: selectionData } = await supabase
        .from("user_learning_path")
        .select("module, level")
        .single();

      if (!mounted) return;

      if (selectionData?.module) {
        setSelectedModule(selectionData.module as ModuleKey);
        setSelectedLevel(selectionData.level ?? 1);
      }

      setIsLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const isFreePlan = useMemo(() => {
    if (!planName) return false;
    if (planName.toLowerCase() === "gratuito") return true;
    if (!planId) return true;
    return false;
  }, [planId, planName]);

  const freeDaysLeft = useMemo(() => {
    if (!isFreePlan) return null;
    if (!userCreatedAt) return null;
    const created = new Date(userCreatedAt);
    if (Number.isNaN(created.getTime())) return null;
    const days = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
    return 10 - days;
  }, [isFreePlan, userCreatedAt]);

  const freeExpired = useMemo(() => (freeDaysLeft !== null ? freeDaysLeft < 0 : false), [freeDaysLeft]);

  const currentModule = useMemo(() => modules.find((m) => m.key === selectedModule) ?? modules[0], [modules, selectedModule]);
  const availableLevels = useMemo(() => {
    if (!isFreePlan) return currentModule.levels;
    if (freeExpired) return [];
    return currentModule.levels.filter((l) => l.value === 1);
  }, [currentModule.levels, freeExpired, isFreePlan]);

  useEffect(() => {
    if (!availableLevels.some((l) => l.value === selectedLevel)) {
      setSelectedLevel(availableLevels[0]?.value ?? 1);
    }
  }, [availableLevels, selectedLevel]);

  const handleContinue = async () => {
    if (!supabase) {
      setErrorMessage("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
      return;
    }

    if (isFreePlan) {
      if (freeExpired) {
        setErrorMessage("Seu período gratuito expirou. Assine um plano para continuar.");
        navigate("/pricing");
        return;
      }
      if (selectedLevel !== 1) {
        setErrorMessage("No plano gratuito, apenas o nível 1 fica disponível durante 10 dias.");
        setSelectedLevel(1);
        return;
      }
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      navigate("/login");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.from("user_learning_path").upsert(
        {
          user_id: userId,
          module: selectedModule,
          level: selectedLevel,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      navigate(currentModule.dashboardPath);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueVideo = async () => {
    if (!supabase) {
      setErrorMessage("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
      return;
    }

    if (isFreePlan) {
      if (freeExpired) {
        setErrorMessage("Seu período gratuito expirou. Assine um plano para continuar.");
        navigate("/pricing");
        return;
      }
      if (selectedLevel !== 1) {
        setErrorMessage("No plano gratuito, apenas o nível 1 fica disponível durante 10 dias.");
        setSelectedLevel(1);
        return;
      }
    }

    navigate(`/video-aulas?module=${selectedModule}&level=${selectedLevel}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 md:py-14">
        <div className="mx-auto max-w-5xl">
          <h1 className="mb-3 font-display text-3xl font-bold text-foreground md:text-4xl">
            Escolha seu módulo
          </h1>
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="font-body text-lg text-muted-foreground md:text-xl">
              Antes de continuar, selecione o módulo e o nível de aprendizado.
            </p>
            <div className="rounded-2xl border-2 border-border bg-card px-4 py-3">
              <div className="font-body text-xs text-muted-foreground">Plano</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-display text-sm font-bold text-foreground">{planName ?? "—"}</span>
                {!isFreePlan && planStatus ? (
                  <span className="rounded-full bg-success/20 px-2 py-0.5 font-body text-xs font-semibold text-success">
                    {formatSubscriptionStatus(planStatus)}
                  </span>
                ) : null}
              </div>
              {planInfoError ? <div className="mt-1 font-body text-xs text-muted-foreground">Plano indisponível</div> : null}
              {isFreePlan && freeDaysLeft !== null ? (
                <div className="mt-1 font-body text-xs text-muted-foreground">
                  {freeDaysLeft >= 0 ? `Acesso do plano gratuito: ${freeDaysLeft} dias` : "Acesso do plano gratuito expirado"}
                </div>
              ) : null}
            </div>
          </div>

          {errorMessage ? (
            <div className="mb-6 rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-6 font-body text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-3xl border-2 border-border bg-card p-6 font-body text-muted-foreground">
              Carregando...
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {modules.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    setSelectedModule(m.key);
                    setSelectedLevel(m.levels[0]?.value ?? 1);
                  }}
                  className={`text-left rounded-3xl border-2 p-6 transition-all hover:shadow-lg hover:-translate-y-1 ${
                    m.key === selectedModule ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-3xl">{m.emoji}</span>
                    <h2 className="font-display text-xl font-bold text-foreground">{m.title}</h2>
                  </div>
                  <p className="font-body text-sm text-muted-foreground">{m.description}</p>
                </button>
              ))}
            </div>
          )}

          {!isLoading ? (
            <div className="mt-8 rounded-3xl border-2 border-border bg-card p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">{currentModule.title}</h3>
                  <p className="font-body text-sm text-muted-foreground">Selecione o nível e continue para o dashboard.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(Number(e.target.value))}
                    className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none sm:w-72"
                    disabled={!availableLevels.length}
                  >
                    {availableLevels.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                  <Button variant="hero" size="lg" onClick={handleContinue} disabled={isSubmitting || !availableLevels.length}>
                    Continuar
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {!isLoading ? (
            <div className="mt-6 rounded-3xl border-2 border-border bg-card p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">Módulo Video Aula + Musicas</h3>
                  <p className="font-body text-sm text-muted-foreground">Selecione o nível e continue para os vídeos.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(Number(e.target.value))}
                    className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none sm:w-72"
                    disabled={!availableLevels.length}
                  >
                    {availableLevels.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                  <Button variant="hero" size="lg" onClick={handleContinueVideo} disabled={isSubmitting || !availableLevels.length}>
                    Continuar
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ModuleSelectPage;
