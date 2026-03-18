import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const EcaLgpdPage = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container mx-auto px-4 py-10 md:py-14">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-3 font-display text-3xl font-bold text-foreground md:text-4xl">
          ECA (Ambiente Digital) e LGPD
        </h1>
        <p className="mb-10 font-body text-lg text-muted-foreground md:text-xl">
          Esta página reúne informações gerais sobre proteção de crianças e adolescentes no ambiente digital (com base no ECA) e sobre
          proteção de dados pessoais (LGPD). Este conteúdo é informativo e não substitui orientação jurídica.
        </p>

        <div className="grid gap-6">
          <section className="rounded-3xl border-2 border-border bg-card p-6 md:p-8">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground">LGPD (Lei Geral de Proteção de Dados)</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border-2 border-border bg-background p-5">
                <h3 className="mb-2 font-display text-lg font-bold text-foreground">O que a LGPD protege</h3>
                <ul className="space-y-2 font-body text-muted-foreground">
                  <li>Dados pessoais e dados pessoais sensíveis</li>
                  <li>Direitos do titular: acesso, correção, exclusão e portabilidade</li>
                  <li>Transparência sobre coleta, uso e compartilhamento</li>
                </ul>
              </div>
              <div className="rounded-2xl border-2 border-border bg-background p-5">
                <h3 className="mb-2 font-display text-lg font-bold text-foreground">Boas práticas esperadas</h3>
                <ul className="space-y-2 font-body text-muted-foreground">
                  <li>Coletar apenas o necessário (minimização)</li>
                  <li>Definir finalidade e base legal para o tratamento</li>
                  <li>Adotar medidas de segurança e controle de acesso</li>
                </ul>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border-2 border-border bg-background p-5">
              <h3 className="mb-2 font-display text-lg font-bold text-foreground">Direitos e transparência</h3>
              <p className="font-body text-muted-foreground">
                Em serviços voltados a famílias e crianças, é especialmente importante apresentar informações claras e acessíveis sobre como
                os dados são usados, por quanto tempo são mantidos e como o responsável pode solicitar atendimento aos direitos previstos na
                LGPD.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border-2 border-border bg-card p-6 md:p-8">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground">ECA no ambiente digital</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border-2 border-border bg-background p-5">
                <h3 className="mb-2 font-display text-lg font-bold text-foreground">Princípios de proteção</h3>
                <ul className="space-y-2 font-body text-muted-foreground">
                  <li>Prioridade absoluta e melhor interesse</li>
                  <li>Proteção contra exposição indevida e riscos</li>
                  <li>Ambiente seguro, com linguagem e conteúdo adequados</li>
                </ul>
              </div>
              <div className="rounded-2xl border-2 border-border bg-background p-5">
                <h3 className="mb-2 font-display text-lg font-bold text-foreground">Responsáveis e acompanhamento</h3>
                <ul className="space-y-2 font-body text-muted-foreground">
                  <li>Participação e supervisão de pais ou responsáveis</li>
                  <li>Canal de contato para dúvidas e solicitações</li>
                  <li>Regras claras de uso e orientações de segurança</li>
                </ul>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border-2 border-border bg-background p-5">
              <h3 className="mb-2 font-display text-lg font-bold text-foreground">O que costuma ser avaliado</h3>
              <ul className="space-y-2 font-body text-muted-foreground">
                <li>Coleta e uso de dados de crianças com transparência e cuidado</li>
                <li>Proteções contra conteúdo impróprio e assédio</li>
                <li>Comunicação responsável, sem práticas abusivas</li>
              </ul>
            </div>
          </section>

          <section className="rounded-3xl border-2 border-border bg-card p-6 md:p-8">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground">Recomendações para pais e responsáveis</h2>
            <div className="rounded-2xl border-2 border-border bg-background p-5">
              <ul className="space-y-2 font-body text-muted-foreground">
                <li>Converse com a criança sobre privacidade e segurança online</li>
                <li>Acompanhe o uso de aplicativos e ative controles disponíveis</li>
                <li>Evite compartilhar dados desnecessários e revise permissões</li>
                <li>Em caso de suspeita de abuso, procure orientação e canais oficiais</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default EcaLgpdPage;
