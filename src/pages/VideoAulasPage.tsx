import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

type ModuleKey = "crianca" | "adolescente" | "adulto";

type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

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

const getYoutubeEmbedUrl = (url: string) => {
  const trimmed = url.trim();
  const match =
    trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/) ?? trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
  const id = match?.[1];
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}`;
};

const VideoAulasPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<SubscriptionStatus | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(true);

  const [module, setModule] = useState<ModuleKey>("crianca");
  const [level, setLevel] = useState<number>(1);

  const [videos, setVideos] = useState<VideoLessonRow[]>([]);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<VideoLessonRow | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);

  const levels = useMemo(() => [1, 2, 3], []);
  const moduleLocked = useMemo(() => {
    const qModule = (params.get("module") ?? "") as ModuleKey;
    return qModule === "crianca" || qModule === "adolescente" || qModule === "adulto";
  }, [params]);

  const isPaidAccess = useMemo(() => {
    if (!planId || !planStatus) return false;
    if (planStatus !== "active" && planStatus !== "trialing") return false;
    if (!currentPeriodEnd) return false;
    const end = new Date(currentPeriodEnd).getTime();
    return Number.isFinite(end) && end > Date.now();
  }, [currentPeriodEnd, planId, planStatus]);

  const isSubscriptionExpired = useMemo(() => {
    if (!planId || !currentPeriodEnd) return false;
    const end = new Date(currentPeriodEnd).getTime();
    return Number.isFinite(end) && end <= Date.now();
  }, [currentPeriodEnd, planId]);

  const isFreePlan = useMemo(() => {
    if (!planId) return true;
    return !isPaidAccess;
  }, [isPaidAccess, planId]);

  const freeDaysLeft = useMemo(() => {
    if (!isFreePlan) return null;
    if (!userCreatedAt) return null;
    const created = new Date(userCreatedAt);
    if (Number.isNaN(created.getTime())) return null;
    const createdStart = Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate());
    const now = new Date();
    const nowStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const days = Math.max(0, Math.floor((nowStart - createdStart) / (1000 * 60 * 60 * 24)));
    return 10 - days;
  }, [isFreePlan, userCreatedAt]);

  const freeExpired = useMemo(() => (freeDaysLeft !== null ? freeDaysLeft <= 0 : false), [freeDaysLeft]);

  const availableLevels = useMemo(() => {
    if (isPlanLoading) return [1];
    if (!isFreePlan) return levels;
    if (freeExpired) return [];
    return [1];
  }, [freeExpired, isFreePlan, isPlanLoading, levels]);

  const load = async (m: ModuleKey, l: number) => {
    if (!supabase) {
      setErrorMessage("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user.id) {
      navigate("/login");
      return;
    }

    if (isFreePlan) {
      if (freeExpired) {
        setVideos([]);
        setIsLoading(false);
        setErrorMessage(isSubscriptionExpired ? "Sua assinatura expirou. Assine um plano para continuar." : "Seu período gratuito expirou. Assine um plano para continuar.");
        return;
      }
      if (l !== 1) {
        setVideos([]);
        setIsLoading(false);
        setErrorMessage("No plano gratuito, apenas o nível 1 fica disponível durante 10 dias.");
        return;
      }
    }

    const { data, error } = await supabase
      .from("video_lessons")
      .select("id, module, level, position, title, source_type, youtube_url, storage_path, created_at, updated_at")
      .eq("module", m)
      .eq("level", l)
      .order("position", { ascending: true })
      .limit(200);

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
    let mounted = true;
    const qModule = (params.get("module") ?? "") as ModuleKey;
    const qLevel = Number(params.get("level") ?? "1");
    const m: ModuleKey = qModule === "adolescente" || qModule === "adulto" || qModule === "crianca" ? qModule : "crianca";
    const l = Number.isFinite(qLevel) && qLevel >= 1 ? qLevel : 1;
    setModule(m);
    setLevel(l);
    (async () => {
      if (!supabase) {
        if (!mounted) return;
        setErrorMessage("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
        setIsLoading(false);
        setIsPlanLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const userId = data.session?.user.id;
      setUserCreatedAt((data.session?.user.created_at as string | undefined) ?? null);
      if (!userId) {
        navigate("/login");
        return;
      }

      const { data: subData, error: subError } = await supabase
        .from("user_subscriptions")
        .select("plan_id, status, current_period_end")
        .eq("user_id", userId)
        .maybeSingle();

      if (!mounted) return;

      if (subError) {
        setPlanName("Gratuito");
        setPlanStatus(null);
        setPlanId(null);
        setCurrentPeriodEnd(null);
      } else {
        const status = subData?.status as SubscriptionStatus | undefined;
        const userPlanId = (subData?.plan_id as string | null | undefined) ?? null;
        const periodEnd = (subData?.current_period_end as string | null | undefined) ?? null;
        setPlanId(userPlanId);
        setCurrentPeriodEnd(periodEnd);

        if (status && (status === "active" || status === "trialing") && userPlanId) {
          const { data: planData, error: planError } = await supabase
            .from("plans")
            .select("name, price_cents")
            .eq("id", userPlanId)
            .maybeSingle();

          if (!mounted) return;
          if (planError) {
            setPlanName("Gratuito");
            setPlanStatus(null);
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

      setIsPlanLoading(false);
      await load(m, l);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isPlanLoading) return;
    void load(module, level);
  }, [isPlanLoading, module, level]);

  useEffect(() => {
    if (!availableLevels.length) return;
    if (!availableLevels.includes(level)) {
      setLevel(availableLevels[0] ?? 1);
    }
  }, [availableLevels, level]);

  const openVideo = async (v: VideoLessonRow) => {
    if (!supabase) return;
    setSelected(v);
    setSignedUrl(null);
    setOpen(true);

    if (v.source_type === "upload" && v.storage_path) {
      setIsLoadingVideo(true);
      const { data, error } = await supabase.storage.from("video-aulas").createSignedUrl(v.storage_path, 60 * 60);
      setIsLoadingVideo(false);
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      setSignedUrl(data?.signedUrl ?? null);
    }
  };

  const embedUrl = useMemo(() => {
    if (!selected) return null;
    if (selected.source_type !== "youtube") return null;
    if (!selected.youtube_url) return null;
    return getYoutubeEmbedUrl(selected.youtube_url);
  }, [selected]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 md:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">Módulo Video Aula + Musicas</h1>
              <p className="mt-2 font-body text-muted-foreground">Assista aos vídeos do seu módulo e nível.</p>
            </div>
            <Button variant="outline" onClick={() => navigate("/modulos")}>
              Voltar
            </Button>
          </div>

          {errorMessage ? (
            <div className="mb-6 rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-6 font-body text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <div className="rounded-3xl border-2 border-border bg-card p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Módulo</label>
                <select
                  value={module}
                  onChange={(e) => {
                    if (moduleLocked) return;
                    setModule(e.target.value as ModuleKey);
                  }}
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                  disabled={moduleLocked}
                >
                  {moduleLocked ? (
                    <option value={module}>{formatModuleLabel(module)}</option>
                  ) : (
                    <>
                      <option value="crianca">Criança</option>
                      <option value="adolescente">Adolescente</option>
                      <option value="adulto">Adulto</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Nível</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value))}
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                  disabled={!availableLevels.length}
                >
                  {availableLevels.map((n) => (
                    <option key={n} value={n}>
                      Nível {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border-2 border-border bg-card p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h2 className="font-display text-xl font-bold text-foreground">
                {formatModuleLabel(module)} · Nível {level}
              </h2>
              <Button variant="outline" onClick={() => load(module, level)} disabled={isLoading}>
                Atualizar
              </Button>
            </div>

            {isLoading ? (
              <div className="mt-4 font-body text-sm text-muted-foreground">Carregando...</div>
            ) : videos.length ? (
              <div className="mt-4 grid gap-3">
                {videos.map((v) => (
                  <div key={v.id} className="rounded-3xl border-2 border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-display text-lg font-bold text-foreground">
                          {v.position}. {v.title}
                        </div>
                        <div className="mt-1 font-body text-sm text-muted-foreground">
                          Fonte: {v.source_type === "youtube" ? "YouTube" : "Upload"}
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => openVideo(v)}>
                        Abrir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-3xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                Nenhum vídeo cadastrado para este módulo/nível.
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>{selected?.title ?? "Vídeo"}</DialogTitle>
            <DialogDescription>
              {selected ? `${formatModuleLabel(selected.module)} · Nível ${selected.level}` : "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">
            {selected?.source_type === "youtube" ? (
              embedUrl ? (
                <div className="aspect-video w-full overflow-hidden rounded-3xl border-2 border-border bg-background">
                  <iframe
                    className="h-full w-full"
                    src={embedUrl}
                    title={selected.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="rounded-3xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                  Link do YouTube inválido.
                </div>
              )
            ) : isLoadingVideo ? (
              <div className="rounded-3xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                Carregando vídeo...
              </div>
            ) : signedUrl ? (
              <video className="w-full rounded-3xl border-2 border-border bg-background" controls src={signedUrl} />
            ) : (
              <div className="rounded-3xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                Vídeo indisponível.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
};

export default VideoAulasPage;
