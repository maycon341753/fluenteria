import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

const formatSubscriptionStatus = (status: SubscriptionStatus) => {
  if (status === "active") return "Ativo";
  if (status === "trialing") return "Teste";
  if (status === "past_due") return "Atrasado";
  return "Cancelado";
};

const ActivePlanCard = () => {
  const [planName, setPlanName] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<SubscriptionStatus | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!supabase) {
        if (!mounted) return;
        setHasError(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const userId = data.session?.user.id;
      if (!userId) {
        setPlanName(null);
        setPlanStatus(null);
        return;
      }

      const { data: subData, error: subError } = await supabase
        .from("user_subscriptions")
        .select("plan_id, status")
        .eq("user_id", userId)
        .maybeSingle();

      if (!mounted) return;

      if (subError) {
        setHasError(true);
        return;
      }

      const status = subData?.status as SubscriptionStatus | undefined;
      const planId = (subData?.plan_id as string | null | undefined) ?? null;

      if (status && (status === "active" || status === "trialing") && planId) {
        const { data: planData, error: planError } = await supabase.from("plans").select("name").eq("id", planId).maybeSingle();
        if (!mounted) return;
        if (planError) {
          setHasError(true);
          return;
        }
        setPlanName((planData?.name as string | undefined) ?? "Premium");
        setPlanStatus(status);
        return;
      }

      setPlanName("Gratuito");
      setPlanStatus(null);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="rounded-2xl border-2 border-border bg-card px-4 py-3">
      <div className="font-body text-xs text-muted-foreground">Plano</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="font-display text-sm font-bold text-foreground">{planName ?? "—"}</span>
        {planStatus ? (
          <span className="rounded-full bg-success/20 px-2 py-0.5 font-body text-xs font-semibold text-success">
            {formatSubscriptionStatus(planStatus)}
          </span>
        ) : null}
      </div>
      {hasError ? <div className="mt-1 font-body text-xs text-muted-foreground">Plano indisponível</div> : null}
    </div>
  );
};

export default ActivePlanCard;

