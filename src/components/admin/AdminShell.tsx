import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

type Props = {
  title: string;
  children: ReactNode;
};

const AdminShell = ({ title, children }: Props) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
              <p className="mt-2 font-body text-muted-foreground">Área Super Admin</p>
            </div>
            <Button variant="outline" onClick={() => navigate("/")}>
              Voltar
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-12">
            <aside className="md:col-span-3">
              <div className="rounded-3xl border-2 border-border bg-card p-4">
                <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 justify-start md:whitespace-nowrap"
                    onClick={() => navigate("/admin/financeiro")}
                  >
                    Financeiro
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 justify-start md:whitespace-nowrap"
                    onClick={() => navigate("/admin/clientes")}
                  >
                    Clientes
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 justify-start md:whitespace-nowrap"
                    onClick={() => navigate("/admin/planos")}
                  >
                    Planos
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 justify-start md:whitespace-nowrap"
                    onClick={() => navigate("/admin/indicacoes")}
                  >
                    Indicações
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 justify-start md:whitespace-nowrap"
                    onClick={() => navigate("/admin/chamados")}
                  >
                    Chamados
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 justify-start md:whitespace-nowrap"
                    onClick={() => navigate("/admin/conteudos")}
                  >
                    Conteúdos
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 justify-start md:whitespace-nowrap"
                    onClick={() => navigate("/admin/video-aulas")}
                  >
                    Video Aula + Musicas
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 justify-start md:whitespace-nowrap"
                    onClick={() => navigate("/admin/progresso")}
                  >
                    Progresso
                  </Button>
                </div>
              </div>
            </aside>

            <section className="md:col-span-9">{children}</section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminShell;
