import Navbar from "@/components/landing/Navbar";
import { BarChart3, Flame, Star, Trophy, TrendingUp, Calendar, Target } from "lucide-react";

const mockChildren = [
  {
    name: "Sofia",
    avatar: "👧",
    level: 3,
    points: 450,
    streak: 7,
    accuracy: 85,
    lessonsToday: 3,
    totalLessons: 45,
  },
  {
    name: "Pedro",
    avatar: "👦",
    level: 1,
    points: 120,
    streak: 2,
    accuracy: 72,
    lessonsToday: 1,
    totalLessons: 12,
  },
];

const recentActivity = [
  { child: "Sofia", action: "Completou a fase 3 🎉", time: "Há 2 horas" },
  { child: "Sofia", action: "Streak de 7 dias! 🔥", time: "Há 3 horas" },
  { child: "Pedro", action: "Começou o nível 1 🚀", time: "Há 5 horas" },
  { child: "Sofia", action: "85% de acertos hoje 📊", time: "Ontem" },
];

const ParentDashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <h1 className="mb-6 font-display text-3xl font-bold text-foreground">
          Painel dos Pais 👨‍👩‍👧
        </h1>

        {/* Overview cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Star, label: "Total de Pontos", value: "570", color: "text-gamification" },
            { icon: Flame, label: "Maior Streak", value: "7 dias", color: "text-destructive" },
            { icon: Target, label: "Acurácia Média", value: "79%", color: "text-success" },
            { icon: Calendar, label: "Lições Hoje", value: "4", color: "text-primary" },
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

        {/* Children progress */}
        <div className="mb-8">
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">Progresso das Crianças</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {mockChildren.map((child) => (
              <div key={child.name} className="rounded-3xl border-2 border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-4xl">{child.avatar}</span>
                  <div>
                    <h3 className="font-display text-xl font-bold text-foreground">{child.name}</h3>
                    <p className="font-body text-sm text-muted-foreground">Nível {child.level}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <Flame className="h-5 w-5 text-destructive" fill="hsl(var(--destructive))" />
                    <span className="font-display font-bold text-foreground">{child.streak}</span>
                  </div>
                </div>
                {/* Progress bars */}
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 flex justify-between font-body text-sm">
                      <span className="text-muted-foreground">Acurácia</span>
                      <span className="font-semibold text-foreground">{child.accuracy}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-success transition-all" style={{ width: `${child.accuracy}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between font-body text-sm">
                      <span className="text-muted-foreground">Progresso do Nível</span>
                      <span className="font-semibold text-foreground">{child.totalLessons} lições</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min((child.totalLessons / 50) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-gamification" fill="hsl(var(--gamification))" />
                  <span className="font-display font-bold text-foreground">{child.points} pontos</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">Atividade Recente</h2>
          <div className="rounded-3xl border-2 border-border bg-card overflow-hidden">
            {recentActivity.map((activity, i) => (
              <div key={i} className={`flex items-center justify-between p-4 ${i < recentActivity.length - 1 ? "border-b border-border" : ""}`}>
                <div>
                  <span className="font-display font-bold text-primary">{activity.child}</span>
                  <span className="ml-2 font-body text-foreground">{activity.action}</span>
                </div>
                <span className="font-body text-sm text-muted-foreground whitespace-nowrap ml-4">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
