import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import { Lock, ShieldCheck, UserCheck } from "lucide-react";

const PrivacidadeSegurancaPage = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container mx-auto px-4 py-10 md:py-14">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-3 font-display text-3xl font-bold text-foreground md:text-4xl">Privacidade e segurança</h1>
        <p className="mb-10 font-body text-lg text-muted-foreground md:text-xl">
          Esta página explica, de forma simples, como a Fluenteria trata dados pessoais e quais medidas de segurança aplicamos para proteger
          usuários e famílias.
        </p>

        <div className="grid gap-6">
          <section className="rounded-3xl border-2 border-border bg-card p-6 md:p-8">
            <div className="mb-4 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold text-foreground">O que coletamos</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border-2 border-border bg-background p-5">
                <h3 className="mb-2 font-display text-lg font-bold text-foreground">Dados de conta</h3>
                <p className="font-body text-muted-foreground">
                  Nome e email para acesso, suporte e comunicação. Em alguns casos, CPF/CNPJ é solicitado para emissão de cobranças e
                  comprovação de pagamento.
                </p>
              </div>
              <div className="rounded-2xl border-2 border-border bg-background p-5">
                <h3 className="mb-2 font-display text-lg font-bold text-foreground">Dados de uso</h3>
                <p className="font-body text-muted-foreground">
                  Progresso de aprendizado, lições concluídas e preferências do usuário para personalizar a experiência e acompanhar evolução.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border-2 border-border bg-card p-6 md:p-8">
            <div className="mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold text-foreground">Como usamos</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border-2 border-border bg-background p-5">
                <h3 className="mb-2 font-display text-lg font-bold text-foreground">Entrega do serviço</h3>
                <p className="font-body text-muted-foreground">
                  Para autenticar o usuário, liberar conteúdos conforme o plano, registrar progresso e manter histórico de aprendizado.
                </p>
              </div>
              <div className="rounded-2xl border-2 border-border bg-background p-5">
                <h3 className="mb-2 font-display text-lg font-bold text-foreground">Cobrança e suporte</h3>
                <p className="font-body text-muted-foreground">
                  Para processar pagamentos, emitir registros financeiros e prestar atendimento quando você solicitar.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border-2 border-border bg-card p-6 md:p-8">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold text-foreground">Segurança</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border-2 border-border bg-background p-5">
                <h3 className="mb-2 font-display text-lg font-bold text-foreground">Boas práticas</h3>
                <p className="font-body text-muted-foreground">
                  Aplicamos controles de acesso, proteção contra uso indevido, monitoramento de erros e melhorias contínuas para reduzir riscos.
                </p>
              </div>
              <div className="rounded-2xl border-2 border-border bg-background p-5">
                <h3 className="mb-2 font-display text-lg font-bold text-foreground">Pagamentos</h3>
                <p className="font-body text-muted-foreground">
                  Dados sensíveis de pagamento são processados pelo provedor de pagamento. A Fluenteria utiliza as integrações necessárias para
                  criar e confirmar cobranças.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border-2 border-border bg-card p-6 md:p-8">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground">Direitos e contato</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border-2 border-border bg-background p-5">
                <h3 className="mb-2 font-display text-lg font-bold text-foreground">Seus direitos</h3>
                <p className="font-body text-muted-foreground">
                  Você pode solicitar informações, correções e exclusão de dados quando aplicável, além de tirar dúvidas sobre privacidade.
                </p>
              </div>
              <div className="rounded-2xl border-2 border-border bg-background p-5">
                <h3 className="mb-2 font-display text-lg font-bold text-foreground">Contato</h3>
                <p className="font-body text-muted-foreground">Use a página de suporte para falar com a equipe e abrir um chamado.</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border-2 border-border bg-card p-6 md:p-8">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground">Informações da plataforma</h2>
            <div className="rounded-2xl border-2 border-border bg-background p-5">
              <div className="grid gap-2 font-body text-sm text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground">Razão social:</span> Fluenteria
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

export default PrivacidadeSegurancaPage;

