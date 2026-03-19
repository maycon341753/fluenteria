import AdminShell from "@/components/admin/AdminShell";
import RequireSuperAdmin from "@/components/admin/RequireSuperAdmin";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

type Ticket = {
  id: string;
  user_id: string;
  subject: string;
  status: "open" | "in_progress" | "closed";
  created_at: string;
  updated_at: string;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
};

const AdminChamadosPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const load = async () => {
    if (!supabase) {
      setErrorMessage("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("id, user_id, subject, status, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setTickets(((data ?? []) as Ticket[]) ?? []);
    setIsLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const updateStatus = async (ticketId: string, status: Ticket["status"]) => {
    if (!supabase) return;
    setIsUpdating(ticketId);
    const { error } = await supabase.from("support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", ticketId);
    setIsUpdating(null);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    await load();
  };

  return (
    <AdminShell title="Chamados">
      {isLoading ? (
        <div className="rounded-3xl border-2 border-border bg-card p-6 font-body text-muted-foreground">Carregando...</div>
      ) : errorMessage ? (
        <div className="rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-6">
          <p className="font-body font-semibold text-destructive">Não foi possível carregar.</p>
          <p className="mt-2 font-body text-sm text-destructive/90">{errorMessage}</p>
          <div className="mt-4">
            <Button variant="outline" onClick={() => load()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border-2 border-border bg-card p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-foreground">Lista de chamados</h2>
            <Button variant="outline" onClick={() => load()}>
              Atualizar
            </Button>
          </div>
          <div className="mt-4 hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-body text-xs text-muted-foreground">{t.id.slice(0, 8)}…</TableCell>
                    <TableCell className="font-body text-xs text-muted-foreground">{t.user_id.slice(0, 8)}…</TableCell>
                    <TableCell className="font-body">{t.subject}</TableCell>
                    <TableCell className="font-body">{t.status}</TableCell>
                    <TableCell className="font-body">{formatDateTime(t.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isUpdating === t.id}
                          onClick={() => updateStatus(t.id, "in_progress")}
                        >
                          Em andamento
                        </Button>
                        <Button size="sm" variant="outline" disabled={isUpdating === t.id} onClick={() => updateStatus(t.id, "closed")}>
                          Fechar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!tickets.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="font-body text-muted-foreground">
                      Nenhum chamado encontrado.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 grid gap-3 md:hidden">
            {tickets.length ? (
              tickets.map((t) => (
                <div key={t.id} className="rounded-3xl border-2 border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-body text-xs text-muted-foreground">{t.id.slice(0, 8)}…</div>
                      <div className="mt-1 truncate font-display text-lg font-bold text-foreground">{t.subject}</div>
                      <div className="mt-1 font-body text-sm text-muted-foreground">Cliente: {t.user_id.slice(0, 8)}…</div>
                      <div className="mt-1 font-body text-sm text-muted-foreground">Criado: {formatDateTime(t.created_at)}</div>
                      <div className="mt-1 font-body text-sm text-muted-foreground">Status: {t.status}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating === t.id}
                      onClick={() => updateStatus(t.id, "in_progress")}
                    >
                      Em andamento
                    </Button>
                    <Button size="sm" variant="outline" disabled={isUpdating === t.id} onClick={() => updateStatus(t.id, "closed")}>
                      Fechar
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                Nenhum chamado encontrado.
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
};

const AdminChamadosPageProtected = () => (
  <RequireSuperAdmin>
    <AdminChamadosPage />
  </RequireSuperAdmin>
);

export default AdminChamadosPageProtected;
