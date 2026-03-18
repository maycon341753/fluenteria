import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Copy, Users, DollarSign, TrendingUp, Clock } from "lucide-react";
import { useState } from "react";

const mockReferrals = [
  { name: "Maria S.", plan: "Premium", status: "ativo", commission: "R$ 9,99", date: "10/03/2026" },
  { name: "Carlos R.", plan: "Max", status: "ativo", commission: "R$ 19,99", date: "05/03/2026" },
  { name: "Ana L.", plan: "Premium", status: "pendente", commission: "R$ 9,99", date: "12/03/2026" },
  { name: "João M.", plan: "Premium", status: "cancelado", commission: "R$ 0,00", date: "01/02/2026" },
];

const statusStyles: Record<string, string> = {
  ativo: "bg-success/20 text-success",
  pendente: "bg-gamification/20 text-gamification-foreground",
  cancelado: "bg-destructive/20 text-destructive",
};

const ReferralsPage = () => {
  const [copied, setCopied] = useState(false);
  const referralLink = "https://fluenteria.com/ref/usuario123";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

        {/* Referral link */}
        <div className="mb-8 rounded-3xl border-2 border-referral/30 bg-referral/5 p-6">
          <h2 className="mb-3 font-display text-lg font-bold text-foreground">Seu link de indicação</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 rounded-2xl border-2 border-border bg-card px-4 py-3 font-body text-sm text-foreground truncate">
              {referralLink}
            </div>
            <Button variant="referral" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
              {copied ? "Copiado! ✓" : "Copiar Link"}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, label: "Total Indicados", value: "4", color: "text-primary" },
            { icon: DollarSign, label: "Ganhos Mensais", value: "R$ 39,97", color: "text-success" },
            { icon: TrendingUp, label: "Ganhos Acumulados", value: "R$ 119,91", color: "text-referral" },
            { icon: Clock, label: "Pendentes", value: "1", color: "text-gamification-foreground" },
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
                {mockReferrals.map((ref, i) => (
                  <tr key={i} className={i < mockReferrals.length - 1 ? "border-b border-border" : ""}>
                    <td className="px-4 py-3 font-body font-semibold text-foreground">{ref.name}</td>
                    <td className="px-4 py-3 font-body text-foreground">{ref.plan}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 font-display text-xs font-bold ${statusStyles[ref.status]}`}>
                        {ref.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-display font-bold text-foreground">{ref.commission}</td>
                    <td className="px-4 py-3 font-body text-sm text-muted-foreground">{ref.date}</td>
                  </tr>
                ))}
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
