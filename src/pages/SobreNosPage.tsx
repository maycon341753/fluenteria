import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { BookOpen, ShieldCheck, Sparkles } from "lucide-react";

const SobreNosPage = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container mx-auto px-4 py-10 md:py-14">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-3 font-display text-3xl font-bold text-foreground md:text-4xl">Sobre nós</h1>
        <p className="mb-10 font-body text-lg text-muted-foreground md:text-xl">
          A Blastidiomas é uma plataforma de aprendizado de idiomas que combina conteúdo prático, acompanhamento e experiência divertida para
          ajudar alunos e famílias a evoluírem com consistência.
        </p>

        <div className="grid gap-6">
          <section className="rounded-3xl border-2 border-border bg-card p-6 md:p-8">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground">Nossos 3 pilares</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border-2 border-border bg-background p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-display text-lg font-bold text-foreground">Prática diária</h3>
                </div>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  Rotinas curtas e consistentes, com foco em evolução real: ouvir, falar, repetir e aplicar.
                </p>
              </div>
              <div className="rounded-2xl border-2 border-border bg-background p-5">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h3 className="font-display text-lg font-bold text-foreground">Aprendizado guiado</h3>
                </div>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  Conteúdo por módulos e níveis, pensado para cada fase do aluno, com progresso claro e direcionamento.
                </p>
              </div>
              <div className="rounded-2xl border-2 border-border bg-background p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <h3 className="font-display text-lg font-bold text-foreground">Segurança e confiança</h3>
                </div>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  Compromisso com privacidade, boas práticas e um ambiente de aprendizado responsável.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border-2 border-border bg-card p-6 md:p-8">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground">Como a plataforma ajuda</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border-2 border-border bg-background p-5">
                <h3 className="mb-2 font-display text-lg font-bold text-foreground">Conteúdos que prendem a atenção</h3>
                <p className="font-body text-muted-foreground">
                  Aulas e atividades organizadas, com experiências que tornam o estudo mais leve e sustentável.
                </p>
              </div>
              <div className="rounded-2xl border-2 border-border bg-background p-5">
                <h3 className="mb-2 font-display text-lg font-bold text-foreground">Evolução com acompanhamento</h3>
                <p className="font-body text-muted-foreground">
                  Metas, progresso e visão do desempenho para manter o aluno no caminho certo e dar previsibilidade ao aprendizado.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border-2 border-border bg-card p-6 md:p-8">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground">Informações da plataforma</h2>
            <div className="rounded-2xl border-2 border-border bg-background p-5">
              <div className="grid gap-2 font-body text-sm text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground">Razão social:</span> Blastidiomas
                </div>
                <div>
                  <span className="font-semibold text-foreground">CNPJ:</span> 39.433.448/0001-34
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default SobreNosPage;
