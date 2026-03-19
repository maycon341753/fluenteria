import AdminShell from "@/components/admin/AdminShell";
import RequireSuperAdmin from "@/components/admin/RequireSuperAdmin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

type TicketMessageRow = {
  id: string;
  ticket_id: string;
  sender_role: "user" | "admin";
  sender_user_id: string | null;
  message: string;
  created_at: string;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
};

const formatTicketStatus = (status: Ticket["status"]) => {
  if (status === "open") return "Aberto";
  if (status === "in_progress") return "Em andamento";
  return "Fechado";
};

const AdminChamadosPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [profileByUserId, setProfileByUserId] = useState<Record<string, ProfileRow>>({});
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);
  const [detailMessages, setDetailMessages] = useState<TicketMessageRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);

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

    const rows = ((data ?? []) as Ticket[]) ?? [];
    setTickets(rows);

    const userIds = Array.from(new Set(rows.map((t) => t.user_id).filter(Boolean)));
    if (userIds.length) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      if (profilesError) {
        setErrorMessage(profilesError.message);
        setIsLoading(false);
        return;
      }

      const map: Record<string, ProfileRow> = {};
      for (const p of ((profilesData ?? []) as ProfileRow[]) ?? []) {
        map[p.user_id] = p;
      }
      setProfileByUserId(map);
    } else {
      setProfileByUserId({});
    }
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

  const openDetails = async (t: Ticket) => {
    if (!supabase) return;
    setDetailTicket(t);
    setDetailMessages([]);
    setMessageText("");
    setDetailOpen(true);
    setDetailLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from("support_ticket_messages")
        .select("id, ticket_id, sender_role, sender_user_id, message, created_at")
        .eq("ticket_id", t.id)
        .order("created_at", { ascending: true })
        .limit(500);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setDetailMessages(((data ?? []) as TicketMessageRow[]) ?? []);
    } finally {
      setDetailLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!supabase || !detailTicket) return;
    if (!messageText.trim()) {
      setErrorMessage("Informe a mensagem.");
      return;
    }
    setIsSending(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.from("support_ticket_messages").insert({
        ticket_id: detailTicket.id,
        sender_role: "admin",
        sender_user_id: null,
        message: messageText.trim(),
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      await supabase.from("support_tickets").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", detailTicket.id);
      setMessageText("");
      await openDetails(detailTicket);
      await load();
    } finally {
      setIsSending(false);
    }
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
                    <TableCell className="font-body">
                      {profileByUserId[t.user_id]?.full_name ?? profileByUserId[t.user_id]?.email ?? `${t.user_id.slice(0, 8)}…`}
                    </TableCell>
                    <TableCell className="font-body">{t.subject}</TableCell>
                    <TableCell className="font-body">{formatTicketStatus(t.status)}</TableCell>
                    <TableCell className="font-body">{formatDateTime(t.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openDetails(t)}>
                          Detalhes
                        </Button>
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
                      <div className="mt-1 font-body text-sm text-muted-foreground">
                        Cliente: {profileByUserId[t.user_id]?.full_name ?? profileByUserId[t.user_id]?.email ?? `${t.user_id.slice(0, 8)}…`}
                      </div>
                      <div className="mt-1 font-body text-sm text-muted-foreground">Criado: {formatDateTime(t.created_at)}</div>
                      <div className="mt-1 font-body text-sm text-muted-foreground">Status: {formatTicketStatus(t.status)}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openDetails(t)}>
                      Detalhes
                    </Button>
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

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Detalhes do chamado</DialogTitle>
            <DialogDescription>
              {detailTicket
                ? `${profileByUserId[detailTicket.user_id]?.full_name ?? profileByUserId[detailTicket.user_id]?.email ?? detailTicket.user_id.slice(0, 8)} · ${
                    detailTicket.subject
                  }`
                : "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">
            {detailTicket ? (
              <div className="rounded-2xl border-2 border-border bg-background p-4">
                <div className="font-body text-xs text-muted-foreground">
                  Status: {formatTicketStatus(detailTicket.status)} · Criado: {formatDateTime(detailTicket.created_at)}
                </div>
              </div>
            ) : null}

            {detailLoading ? (
              <div className="rounded-2xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">Carregando conversa...</div>
            ) : detailMessages.length ? (
              detailMessages.map((m) => (
                <div key={m.id} className="rounded-2xl border-2 border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-body text-xs text-muted-foreground">{m.sender_role === "admin" ? "Suporte" : "Usuário"}</div>
                    <div className="font-body text-xs text-muted-foreground">{formatDateTime(m.created_at)}</div>
                  </div>
                  <div className="mt-2 font-body text-sm text-foreground">{m.message}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                Nenhuma mensagem ainda.
              </div>
            )}

            <div>
              <label className="mb-1 block font-body text-sm font-semibold text-foreground">Mensagem</label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="min-h-32 w-full resize-none rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                placeholder="Escreva a resposta para o usuário..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)} disabled={isSending}>
              Cancelar
            </Button>
            <Button onClick={sendMessage} disabled={isSending || !detailTicket}>
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
};

const AdminChamadosPageProtected = () => (
  <RequireSuperAdmin>
    <AdminChamadosPage />
  </RequireSuperAdmin>
);

export default AdminChamadosPageProtected;
