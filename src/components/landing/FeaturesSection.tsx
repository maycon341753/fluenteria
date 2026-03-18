import { Mic, Headphones, Trophy, BarChart3, Smartphone } from "lucide-react";

const features = [
  {
    icon: Headphones,
    title: "Ouvir e Repetir",
    description: "A criança ouve a frase em inglês e repete em voz alta",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Mic,
    title: "Correção por Voz",
    description: "Avaliação automática da pronúncia com feedback visual",
    color: "bg-success/10 text-success",
  },
  {
    icon: Trophy,
    title: "Gamificação",
    description: "Pontos, medalhas, streaks e desbloqueio de fases",
    color: "bg-gamification/10 text-gamification-foreground",
  },
  {
    icon: BarChart3,
    title: "Painel dos Pais",
    description: "Acompanhe o progresso e desempenho em tempo real",
    color: "bg-referral/10 text-referral",
  },
  {
    icon: Smartphone,
    title: "Notificações WhatsApp",
    description: "Receba atualizações do progresso direto no celular",
    color: "bg-success/10 text-success",
  },
];

const FeaturesSection = () => {
  return (
    <section className="bg-card py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 font-display text-3xl font-bold text-foreground md:text-4xl">
            Como funciona? 🎯
          </h2>
          <p className="mx-auto max-w-2xl font-body text-lg text-muted-foreground">
            Uma experiência completa de aprendizado para crianças e tranquilidade para os pais
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group rounded-3xl border-2 border-border bg-background p-6 transition-all hover:shadow-lg hover:-translate-y-1 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`mb-4 inline-flex rounded-2xl p-3 ${feature.color}`}>
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className="mb-2 font-display text-xl font-bold text-foreground">
                {feature.title}
              </h3>
              <p className="font-body text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
