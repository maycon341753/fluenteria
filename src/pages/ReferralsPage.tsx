import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { Copy, Users, DollarSign, TrendingUp, Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const statusStyles: Record<string, string> = {
  ativo: "bg-success/20 text-success",
  pendente: "bg-gamification/20 text-gamification-foreground",
  cancelado: "bg-destructive/20 text-destructive",
};

type ReferralRow = {
  user_id: string;
  name: string;
  plan: string;
  status: "ativo" | "pendente" | "cancelado";
  commission_cents: number;
  last_commission_at: string | null;
  joined_at: string | null;
};

type ReferralDashboard = {
  referral_code: string;
  total_referred: number;
  active_referred: number;
  pending_referred: number;
  monthly_earnings_cents: number;
  total_earnings_cents: number;
  rows: ReferralRow[];
};

const formatMoney = (amountCents: number, currency = "BRL") => {
  const amount = amountCents / 100;
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const formatDateBr = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
};

const ReferralsPage = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [dashboard, setDashboard] = useState<ReferralDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      const userId = data.session?.user.id;
      if (!userId) {
        navigate("/login");
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      const { data: rpcData, error } = await supabase.rpc("get_my_referral_dashboard");
      if (!mounted) return;
      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setDashboard((rpcData ?? null) as ReferralDashboard | null);
      setIsLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const referralLink = useMemo(() => {
    const code = dashboard?.referral_code ?? "";
    if (!code) return "";
    return `${window.location.origin}/login?mode=signup&ref=${code}`;
  }, [dashboard?.referral_code]);

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Copiado", description: "Link de indicação copiado." });
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <h1 className="mb-2 font-display text-3xl font-bold text-foreground">
          Centro de Indicação 🤝
        </h1>
        <p className="mb-8 font-body text-lg text-muted-foreground">
          Ganhe <span className="font-bold text-referral">40% de comissão recorrente</span> por cada indicação ativa!
        </p>

        {isLoading ? (
          <div className="rounded-3xl border-2 border-border bg-card p-6 font-body text-muted-foreground">Carregando...</div>
        ) : errorMessage ? (
          <div className="rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-6">
            <p className="font-body font-semibold text-destructive">Não foi possível carregar.</p>
            <p className="mt-2 font-body text-sm text-destructive/90">{errorMessage}</p>
          </div>
        ) : null}

        {/* Referral link */}
        <div className="mb-8 rounded-3xl border-2 border-referral/30 bg-referral/5 p-6">
          <h2 className="mb-3 font-display text-lg font-bold text-foreground">Seu link de indicação</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 rounded-2xl border-2 border-border bg-card px-4 py-3 font-body text-sm text-foreground truncate">
              {referralLink || "—"}
            </div>
            <Button variant="referral" onClick={handleCopy} disabled={!referralLink}>
              <Copy className="h-4 w-4" />
              {copied ? "Copiado! ✓" : "Copiar Link"}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, label: "Total Indicados", value: String(dashboard?.total_referred ?? 0), color: "text-primary" },
            { icon: DollarSign, label: "Ganhos Mensais", value: formatMoney(dashboard?.monthly_earnings_cents ?? 0), color: "text-success" },
            { icon: TrendingUp, label: "Ganhos Acumulados", value: formatMoney(dashboard?.total_earnings_cents ?? 0), color: "text-referral" },
            { icon: Clock, label: "Pendentes", value: String(dashboard?.pending_referred ?? 0), color: "text-gamification-foreground" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border-2 border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-secondary p-2">
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="font-body text-sm text-muted-foreground">{stat.label}</p>
                  <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Commission table */}
        <div>
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">Comissões</h2>
          <div className="overflow-x-auto rounded-3xl border-2 border-border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-display text-sm font-bold text-muted-foreground">Indicado</th>
                  <th className="px-4 py-3 text-left font-display text-sm font-bold text-muted-foreground">Plano</th>
                  <th className="px-4 py-3 text-left font-display text-sm font-bold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-display text-sm font-bold text-muted-foreground">Comissão</th>
                  <th className="px-4 py-3 text-left font-display text-sm font-bold text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard?.rows ?? []).length ? (
                  (dashboard?.rows ?? []).map((ref, i) => (
                    <tr key={ref.user_id} className={i < (dashboard?.rows ?? []).length - 1 ? "border-b border-border" : ""}>
                      <td className="px-4 py-3 font-body font-semibold text-foreground">{ref.name}</td>
                      <td className="px-4 py-3 font-body text-foreground">{ref.plan}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 font-display text-xs font-bold ${statusStyles[ref.status] ?? statusStyles.pendente}`}>
                          {ref.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-display font-bold text-foreground">{formatMoney(ref.commission_cents ?? 0)}</td>
                      <td className="px-4 py-3 font-body text-sm text-muted-foreground">{formatDateBr(ref.last_commission_at ?? ref.joined_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center font-body text-sm text-muted-foreground">
                      Você ainda não tem indicações.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-8 rounded-3xl border-2 border-border bg-card p-6">
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">Como Funciona? 💡</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { step: "1", title: "Compartilhe", desc: "Envie seu link para amigos e familiares" },
              { step: "2", title: "Eles Assinam", desc: "Quando assinarem qualquer plano pago" },
              { step: "3", title: "Você Ganha", desc: "40% de comissão recorrente todo mês!" },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-referral font-display text-xl font-bold text-referral-foreground">
                  {s.step}
                </div>
                <h3 className="font-display font-bold text-foreground">{s.title}</h3>
                <p className="font-body text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralsPage;
