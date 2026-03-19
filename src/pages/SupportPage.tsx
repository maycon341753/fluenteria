import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type TicketStatus = "open" | "in_progress" | "closed";

type TicketRow = {
  id: string;
  user_id: string;
  subject: string;
  status: TicketStatus;
  message?: string | null;
  created_at: string;
  updated_at: string;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
};

const formatStatus = (status: TicketStatus) => {
  if (status === "open") return "Aberto";
  if (status === "in_progress") return "Em andamento";
  return "Fechado";
};

const SupportPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    if (!supabase) {
      setErrorMessage("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      navigate("/login");
      return;
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .select("id, user_id, subject, status, message, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setTickets(((data ?? []) as TicketRow[]) ?? []);
    setIsLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async () => {
    if (!supabase) return;
    if (!subject.trim()) {
      toast({ title: "Informe o assunto" });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        navigate("/login");
        return;
      }

      const payloadBase = {
        user_id: userId,
        subject: subject.trim(),
        status: "open" as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const tryWithMessage = message.trim()
        ? await supabase.from("support_tickets").insert({ ...payloadBase, message: message.trim() } as unknown as Record<string, unknown>)
        : { error: null as null | { message: string } };

      if (tryWithMessage.error) {
        const msg = tryWithMessage.error.message ?? "";
        if (msg.toLowerCase().includes("message") && msg.toLowerCase().includes("does not exist")) {
          const { error } = await supabase.from("support_tickets").insert(payloadBase);
          if (error) {
            setErrorMessage(error.message);
            return;
          }
        } else {
          setErrorMessage(tryWithMessage.error.message);
          return;
        }
      }

      setSubject("");
      setMessage("");
      toast({ title: "Chamado enviado", description: "Nossa equipe vai te responder em breve." });
      await load();
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasTickets = useMemo(() => tickets.length > 0, [tickets.length]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 md:py-14">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="font-display text-3xl font-bold text-foreground">Suporte</h1>
            <Button variant="outline" onClick={() => load()} disabled={isLoading}>
              Atualizar
            </Button>
          </div>

          {errorMessage ? (
            <div className="mb-6 rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-6">
              <p className="font-body font-semibold text-destructive">Não foi possível carregar.</p>
              <p className="mt-2 font-body text-sm text-destructive/90">{errorMessage}</p>
            </div>
          ) : null}

          <div className="rounded-3xl border-2 border-border bg-card p-6">
            <h2 className="font-display text-xl font-bold text-foreground">Abrir chamado</h2>
            <div className="mt-4 grid gap-4">
              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Assunto</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                  placeholder="Ex: Não consigo avançar no nível"
                />
              </div>

              <div>
                <label className="mb-1 block font-body text-sm font-semibold text-foreground">Mensagem</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-32 w-full resize-none rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                  placeholder="Descreva o que aconteceu (opcional)."
                />
              </div>

              <div className="flex items-center justify-end">
                <Button variant="hero" onClick={submit} disabled={isSubmitting}>
                  Enviar
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border-2 border-border bg-card p-6">
            <h2 className="font-display text-xl font-bold text-foreground">Meus chamados</h2>
            {isLoading ? (
              <div className="mt-4 font-body text-sm text-muted-foreground">Carregando...</div>
            ) : hasTickets ? (
              <div className="mt-4 grid gap-3">
                {tickets.map((t) => (
                  <div key={t.id} className="rounded-3xl border-2 border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-display text-lg font-bold text-foreground">{t.subject}</div>
                        <div className="mt-1 font-body text-sm text-muted-foreground">
                          Status: {formatStatus(t.status)} · Criado: {formatDateTime(t.created_at)}
                        </div>
                        {t.message ? <div className="mt-2 font-body text-sm text-muted-foreground">{t.message}</div> : null}
                      </div>
                      <div className="font-body text-xs text-muted-foreground">{t.id.slice(0, 8)}…</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-3xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                Você ainda não abriu nenhum chamado.
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SupportPage;

