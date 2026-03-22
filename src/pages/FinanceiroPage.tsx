import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { Copy, FileDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type Plan = {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  interval: "month" | "year";
  max_level: number | null;
  max_users: number | null;
};

type UserSubscription = {
  plan_id: string | null;
  status: "active" | "past_due" | "canceled" | "trialing";
  current_period_end: string | null;
  billing_cycle: "month" | "year" | null;
};

type Invoice = {
  id: string;
  status: "pending" | "paid" | "canceled";
  amount_cents: number;
  currency: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  billing_cycle: "month" | "year" | null;
};

type PaymentMethod = "pix" | "credit_card";

type PixCheckout = {
  payment_id: string;
  invoice_id: string;
  amount_cents: number;
  currency: string;
  pix_payload: string;
  qr_code_base64?: string;
  expires_at: string | null;
};

type CardCheckout = {
  invoice_id: string;
  amount_cents: number;
  currency: string;
  provider_payment_id: string;
  status: string;
};

const formatMoney = (amountCents: number, currency: string) => {
  const amount = amountCents / 100;
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(date);
};

const addDaysIso = (value: string, days: number) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const dayStartUtcMs = (value: Date) => Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());

const getCycleDays = (cycle: Invoice["billing_cycle"]) => (cycle === "year" ? 365 : 30);

const getCycleLabel = (cycle: Invoice["billing_cycle"]) => (cycle === "year" ? "Anual" : "Mensal");

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatCpfCnpj = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    const part1 = digits.slice(0, 3);
    const part2 = digits.slice(3, 6);
    const part3 = digits.slice(6, 9);
    const part4 = digits.slice(9, 11);
    return [part1, part2, part3].filter(Boolean).join(".") + (part4 ? `-${part4}` : "");
  }
  const p1 = digits.slice(0, 2);
  const p2 = digits.slice(2, 5);
  const p3 = digits.slice(5, 8);
  const p4 = digits.slice(8, 12);
  const p5 = digits.slice(12, 14);
  return [p1, p2, p3].filter(Boolean).join(".") + (p4 ? `/${p4}` : "") + (p5 ? `-${p5}` : "");
};

const formatCardNumber = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
};

const formatPostalCode = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const formatPhoneBr = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 2) return digits;
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
};

const resolveApiBase = () => {
  const raw = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "").trim();
  if (!raw) {
    if (typeof window === "undefined") return "";
    const host = window.location.hostname;
    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host);
    return isLocal ? "https://blastidiomas.vercel.app" : "";
  }
  const base = raw.replace(/\/+$/, "");
  if (base.includes("fluenteria.vercel.app")) return base.replace("fluenteria.vercel.app", "blastidiomas.vercel.app");
  return base;
};

const shouldRetryAuth = (json: { error?: string; detail?: string } | null) => {
  const err = String(json?.error ?? "").toLowerCase();
  const detail = String(json?.detail ?? "").toLowerCase();
  if (err === "unauthorized" || err === "invalid_authorization") return true;
  if (detail.includes("auth session missing")) return true;
  return false;
};

const FinanceiroPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userCpf, setUserCpf] = useState<string | null>(null);

  const [futurePayOpen, setFuturePayOpen] = useState(false);
  const [futurePaymentMethod, setFuturePaymentMethod] = useState<PaymentMethod>("pix");
  const [pixCheckout, setPixCheckout] = useState<PixCheckout | null>(null);
  const [pixQr, setPixQr] = useState<string | null>(null);
  const [pixStatus, setPixStatus] = useState<"pending" | "paid" | "expired" | "canceled" | null>(null);
  const [cardCheckout, setCardCheckout] = useState<CardCheckout | null>(null);
  const [cardInvoiceStatus, setCardInvoiceStatus] = useState<"pending" | "paid" | "canceled" | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [cpfCnpjRequired, setCpfCnpjRequired] = useState(false);
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpMonth, setCardExpMonth] = useState("");
  const [cardExpYear, setCardExpYear] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardPhone, setCardPhone] = useState("");
  const [cardPostalCode, setCardPostalCode] = useState("");
  const [cardAddressNumber, setCardAddressNumber] = useState("");
  const [pixCopied, setPixCopied] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!supabase) {
        if (!mounted) return;
        setErrorMessage("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
        setIsLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;

      const userId = sessionData.session?.user.id;
      if (!userId) {
        navigate("/");
        return;
      }
      setUserDisplayName((sessionData.session.user.user_metadata?.full_name as string | undefined) ?? null);
      setUserEmail(sessionData.session.user.email ?? null);
      setUserCreatedAt((sessionData.session.user.created_at as string | undefined) ?? null);
      setUserCpf((sessionData.session.user.user_metadata?.cpf as string | undefined) ?? null);

      let subscriptionRow: UserSubscription | null = null;

      const subscriptionAttempt = await supabase
        .from("user_subscriptions")
        .select("plan_id, status, current_period_end, billing_cycle")
        .eq("user_id", userId)
        .maybeSingle();

      if (!mounted) return;

      if (subscriptionAttempt.error) {
        if (subscriptionAttempt.error.message.toLowerCase().includes("billing_cycle")) {
          const fallback = await supabase
            .from("user_subscriptions")
            .select("plan_id, status, current_period_end")
            .eq("user_id", userId)
            .maybeSingle();

          if (!mounted) return;

          if (fallback.error) {
            setErrorMessage(fallback.error.message);
            setIsLoading(false);
            return;
          }

          const row = (fallback.data ?? null) as Omit<UserSubscription, "billing_cycle"> | null;
          subscriptionRow = row ? ({ ...row, billing_cycle: "month" } as UserSubscription) : null;
        } else {
          setErrorMessage(subscriptionAttempt.error.message);
          setIsLoading(false);
          return;
        }
      } else {
        subscriptionRow = (subscriptionAttempt.data ?? null) as UserSubscription | null;
      }

      setSubscription(subscriptionRow);

      const planId = subscriptionRow?.plan_id ?? null;

      if (planId) {
        const { data: planData, error: planError } = await supabase
          .from("plans")
          .select("id, name, price_cents, currency, interval, max_level, max_users")
          .eq("id", planId)
          .maybeSingle();

        if (!mounted) return;

        if (planError) {
          setErrorMessage(planError.message);
          setIsLoading(false);
          return;
        }

        setPlan((planData ?? null) as Plan | null);
      } else {
        setPlan(null);
      }

      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("id, status, amount_cents, currency, due_date, paid_at, created_at, billing_cycle")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!mounted) return;

      if (invoicesError) {
        setErrorMessage(invoicesError.message);
        setIsLoading(false);
        return;
      }

      setInvoices(((invoicesData ?? []) as Invoice[]) ?? []);
      setIsLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const pendingInvoices = useMemo(() => invoices.filter((i) => i.status === "pending"), [invoices]);
  const paidInvoices = useMemo(() => invoices.filter((i) => i.status === "paid"), [invoices]);

  const latestPending = useMemo(() => pendingInvoices[0] ?? null, [pendingInvoices]);

  const latestPaid = useMemo(() => {
    const sorted = [...paidInvoices].sort((a, b) => {
      const da = new Date(a.paid_at ?? a.created_at).getTime();
      const db = new Date(b.paid_at ?? b.created_at).getTime();
      return db - da;
    });
    return sorted[0] ?? null;
  }, [paidInvoices]);

  const isFreePlan = useMemo(() => Boolean(plan && (plan.price_cents === 0 || plan.name.trim().toLowerCase() === "gratuito")), [plan]);

  const freeEndIso = useMemo(() => {
    if (!isFreePlan) return null;
    if (!userCreatedAt) return null;
    const created = new Date(userCreatedAt);
    if (Number.isNaN(created.getTime())) return null;
    const start = dayStartUtcMs(created);
    return new Date(start + 10 * 24 * 60 * 60 * 1000).toISOString();
  }, [isFreePlan, userCreatedAt]);

  const freeDaysLeft = useMemo(() => {
    if (!isFreePlan) return null;
    if (!userCreatedAt) return null;
    const created = new Date(userCreatedAt);
    if (Number.isNaN(created.getTime())) return null;
    const createdStart = dayStartUtcMs(created);
    const nowStart = dayStartUtcMs(new Date());
    const days = Math.max(0, Math.floor((nowStart - createdStart) / (1000 * 60 * 60 * 24)));
    return 10 - days;
  }, [isFreePlan, userCreatedAt]);

  const freeExpired = useMemo(() => (freeDaysLeft !== null ? freeDaysLeft <= 0 : false), [freeDaysLeft]);

  const nextDueIso = useMemo(() => {
    if (subscription?.plan_id && isFreePlan) return freeEndIso;
    if (subscription?.current_period_end) return subscription.current_period_end;
    if (latestPending) return addDaysIso(latestPending.created_at, getCycleDays(latestPending.billing_cycle));
    if (latestPaid) return addDaysIso(latestPaid.paid_at ?? latestPaid.created_at, getCycleDays(latestPaid.billing_cycle));
    return null;
  }, [freeEndIso, isFreePlan, latestPaid, latestPending, subscription?.current_period_end, subscription?.plan_id]);

  const futureInvoices = useMemo(() => {
    if (!subscription?.plan_id) return [];
    if (!plan) return [];
    if (isFreePlan) return [];
    if (plan.price_cents <= 0) return [];
    if ((subscription.billing_cycle ?? "month") !== "month") return [];
    if (!nextDueIso) return [];
    if (subscription.status !== "active" && subscription.status !== "trialing" && subscription.status !== "past_due") return [];
    const dueMs = new Date(nextDueIso).getTime();
    if (Number.isFinite(dueMs)) {
      const diffDays = Math.ceil((dueMs - Date.now()) / (1000 * 60 * 60 * 24));
      if (diffDays > 45) return [];
    }

    return [
      {
        key: "next",
        due_iso: nextDueIso,
        amount_cents: plan.price_cents,
        currency: plan.currency,
      },
    ];
  }, [isFreePlan, nextDueIso, plan, subscription?.billing_cycle, subscription?.plan_id, subscription?.status]);

  const openReceipt = (inv: Invoice) => {
    if (inv.status !== "paid") return;

    const title = "Comprovante de pagamento";
    const paidAt = formatDate(inv.paid_at ?? inv.created_at);
    const createdAt = formatDate(inv.created_at);
    const amount = formatMoney(inv.amount_cents, inv.currency);
    const cycle = getCycleLabel(inv.billing_cycle);
    const client = escapeHtml(userDisplayName ?? userEmail ?? "—");
    const planName = escapeHtml(plan?.name ?? "—");
    const invoiceId = escapeHtml(inv.id);

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; }
    .wrap { max-width: 720px; margin: 0 auto; }
    .card { border: 2px solid #e2e8f0; border-radius: 16px; padding: 20px; }
    .row { display: flex; justify-content: space-between; gap: 16px; }
    .title { font-size: 22px; font-weight: 900; margin: 0; }
    .muted { color: #64748b; font-size: 13px; margin-top: 6px; }
    .divider { height: 1px; background: #e2e8f0; margin: 16px 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .label { color: #64748b; font-size: 12px; margin: 0 0 2px; }
    .value { font-weight: 700; margin: 0; }
    .amount { font-size: 24px; font-weight: 900; }
    .badge { display: inline-block; background: #dcfce7; color: #166534; border: 1px solid #86efac; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; }
    @media print { body { padding: 0; } .card { border: none; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="row">
        <div>
          <p class="title">${title}</p>
          <div class="muted">Blastidiomas · CNPJ: 39.433.448/0001-34</div>
        </div>
        <div class="badge">Pago</div>
      </div>
      <div class="divider"></div>
      <div class="grid">
        <div>
          <p class="label">Cliente</p>
          <p class="value">${client}</p>
        </div>
        <div>
          <p class="label">Plano</p>
          <p class="value">${planName}</p>
        </div>
        <div>
          <p class="label">Ciclo</p>
          <p class="value">${cycle}</p>
        </div>
        <div>
          <p class="label">Valor</p>
          <p class="value amount">${amount}</p>
        </div>
        <div>
          <p class="label">Pago em</p>
          <p class="value">${paidAt}</p>
        </div>
        <div>
          <p class="label">Criada em</p>
          <p class="value">${createdAt}</p>
        </div>
        <div style="grid-column: 1 / -1;">
          <p class="label">Fatura</p>
          <p class="value">${invoiceId}</p>
        </div>
      </div>
    </div>
  </div>
  <script>
    window.addEventListener('load', () => { window.print(); });
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) {
      window.location.assign(url);
    } else {
      try {
        w.opener = null;
      } catch {
        // ignore
      }
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const openFuturePayment = async () => {
    if (!plan) return;
    if (!subscription?.plan_id) return;
    if (isFreePlan) return;
    if ((subscription.billing_cycle ?? "month") !== "month") return;

    setCheckoutError(null);
    setCpfCnpjRequired(false);
    setCpfCnpj(formatCpfCnpj(userCpf ?? ""));
    setFuturePaymentMethod("pix");
    setPixCheckout(null);
    setPixQr(null);
    setPixStatus(null);
    setCardCheckout(null);
    setCardInvoiceStatus(null);
    setPixCopied(false);

    setCardHolderName(userDisplayName ?? "");
    setCardNumber("");
    setCardExpMonth("");
    setCardExpYear("");
    setCardCvc("");
    setCardPhone("");
    setCardPostalCode("");
    setCardAddressNumber("");

    setFuturePayOpen(true);
  };

  const createPixCheckout = async (cpfDigits: string | null, didRetryAuth = false) => {
    if (!supabase) return;
    if (!plan) return;
    setIsCheckingOut(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      let accessToken = session?.access_token;
      const expiresAtMs = session?.expires_at ? session.expires_at * 1000 : null;
      if (expiresAtMs && expiresAtMs - Date.now() < 60_000) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        accessToken = refreshed.session?.access_token ?? accessToken;
      }
      if (!accessToken) {
        setCheckoutError("Sessão expirada. Faça login novamente.");
        return;
      }

      const apiBase = resolveApiBase();
      const res = await fetch(`${apiBase}/api/asaas/create-pix-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plan_id: plan.id, cpf_cnpj: cpfDigits, billing_cycle: "month" }),
      });

      const json = (await res.json().catch(() => null)) as (PixCheckout & { error?: string; detail?: string }) | null;
      if (!res.ok) {
        if (!didRetryAuth && shouldRetryAuth(json)) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          const nextToken = refreshed.session?.access_token ?? null;
          if (nextToken) {
            void createPixCheckout(cpfDigits, true);
            return;
          }
        }
        const base = json?.error ?? "Falha ao gerar PIX.";
        const detail = json?.detail ? ` (${json.detail})` : "";
        const msg = `${base}${detail}`;
        setCheckoutError(msg);
        if (msg.toLowerCase().includes("cpf") || base === "cpf_required") {
          setCpfCnpjRequired(true);
        }
        return;
      }

      const checkoutRow = json as PixCheckout | null;
      if (!checkoutRow?.payment_id || !checkoutRow?.pix_payload) {
        setCheckoutError("Resposta inválida do checkout PIX.");
        return;
      }

      setPixCheckout(checkoutRow);
      setPixStatus("pending");
      setCpfCnpjRequired(false);
      if (checkoutRow.qr_code_base64) {
        setPixQr(`data:image/png;base64,${checkoutRow.qr_code_base64}`);
      } else {
        setCheckoutError("QR Code não disponível.");
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  const createCreditCardCheckout = async (didRetryAuth = false) => {
    if (!supabase) return;
    if (!plan) return;
    setIsCheckingOut(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      let accessToken = session?.access_token;
      const expiresAtMs = session?.expires_at ? session.expires_at * 1000 : null;
      if (expiresAtMs && expiresAtMs - Date.now() < 60_000) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        accessToken = refreshed.session?.access_token ?? accessToken;
      }
      const email = session?.user.email ?? null;
      const metaFullName = (session?.user.user_metadata?.full_name as string | undefined) ?? "";

      if (!accessToken) {
        setCheckoutError("Sessão expirada. Faça login novamente.");
        return;
      }

      const digits = cpfCnpj.replace(/\D/g, "");
      const cpfDigits = digits.length === 11 || digits.length === 14 ? digits : null;
      if (!cpfDigits) {
        setCpfCnpjRequired(true);
        setCheckoutError(null);
        return;
      }

      const apiBase = resolveApiBase();
      const res = await fetch(`${apiBase}/api/asaas/create-credit-card-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          plan_id: plan.id,
          billing_cycle: "month",
          cpf_cnpj: cpfDigits,
          holder_name: cardHolderName.trim() || metaFullName,
          card_number: cardNumber,
          card_exp_month: cardExpMonth,
          card_exp_year: cardExpYear,
          card_cvc: cardCvc,
          holder_phone: cardPhone,
          holder_postal_code: cardPostalCode,
          holder_address_number: cardAddressNumber,
          holder_email: email,
        }),
      });

      const json = (await res.json()) as { error?: string; detail?: string } & Partial<CardCheckout>;
      if (!res.ok) {
        if (!didRetryAuth && shouldRetryAuth(json)) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          const nextToken = refreshed.session?.access_token ?? null;
          if (nextToken) {
            void createCreditCardCheckout(true);
            return;
          }
        }
        if (json.error === "cpf_required") {
          setCpfCnpjRequired(true);
          setCheckoutError("Informe CPF ou CNPJ para continuar.");
          return;
        }
        setCheckoutError(json.error ?? "Não foi possível gerar a cobrança no cartão.");
        return;
      }

      setCardCheckout(json as CardCheckout);
      setCardInvoiceStatus("pending");
      setCheckoutError(null);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const copyPix = async () => {
    if (!pixCheckout?.pix_payload) return;
    try {
      await navigator.clipboard.writeText(pixCheckout.pix_payload);
      setPixCopied(true);
      window.setTimeout(() => setPixCopied(false), 1500);
    } catch {
      setCheckoutError("Não foi possível copiar o código PIX.");
    }
  };

  useEffect(() => {
    if (!supabase) return;
    if (!futurePayOpen) return;
    if (futurePaymentMethod !== "pix") return;
    if (!pixCheckout?.payment_id) return;
    if (pixStatus !== "pending") return;

    let active = true;
    const interval = window.setInterval(async () => {
      const { data, error } = await supabase.from("pix_payments").select("status").eq("id", pixCheckout.payment_id).maybeSingle();
      if (!active) return;
      if (error) {
        setCheckoutError(error.message);
        return;
      }
      const status = (data?.status as "pending" | "paid" | "expired" | "canceled" | undefined) ?? "pending";
      setPixStatus(status);
    }, 3000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [futurePayOpen, futurePaymentMethod, pixCheckout?.payment_id, pixStatus]);

  useEffect(() => {
    if (!supabase) return;
    if (!futurePayOpen) return;
    if (futurePaymentMethod !== "credit_card") return;
    if (!cardCheckout?.invoice_id) return;
    if (cardInvoiceStatus !== "pending") return;

    let active = true;
    const interval = window.setInterval(async () => {
      const { data, error } = await supabase.from("invoices").select("status").eq("id", cardCheckout.invoice_id).maybeSingle();
      if (!active) return;
      if (error) {
        setCheckoutError(error.message);
        return;
      }
      const status = (data?.status as "pending" | "paid" | "canceled" | undefined) ?? "pending";
      setCardInvoiceStatus(status);
    }, 3000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [cardCheckout?.invoice_id, cardInvoiceStatus, futurePayOpen, futurePaymentMethod]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 md:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">Financeiro</h1>
              <p className="mt-2 font-body text-muted-foreground">
                Veja seu plano, faturas pagas e faturas pendentes.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/modulos")}>
              Voltar
            </Button>
          </div>

          {isLoading ? (
            <div className="rounded-3xl border-2 border-border bg-card p-6 font-body text-muted-foreground">
              Carregando...
            </div>
          ) : errorMessage ? (
            <div className="rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-6">
              <p className="font-body font-semibold text-destructive">Não foi possível carregar o financeiro.</p>
              <p className="mt-2 font-body text-sm text-destructive/90">{errorMessage}</p>
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-3xl border-2 border-border bg-card p-6 md:col-span-2">
                  <h2 className="font-display text-xl font-bold text-foreground">Plano atual</h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border-2 border-border bg-background p-4">
                      <p className="font-body text-sm text-muted-foreground">Plano</p>
                      <p className="mt-1 font-display text-lg font-bold text-foreground">{plan?.name ?? "Nenhum"}</p>
                    </div>
                    <div className="rounded-2xl border-2 border-border bg-background p-4">
                      <p className="font-body text-sm text-muted-foreground">Status</p>
                      <p className="mt-1 font-display text-lg font-bold text-foreground">{subscription?.status ?? "—"}</p>
                    </div>
                    <div className="rounded-2xl border-2 border-border bg-background p-4">
                      <p className="font-body text-sm text-muted-foreground">Valor</p>
                      <p className="mt-1 font-display text-lg font-bold text-foreground">
                        {plan ? `${formatMoney(plan.price_cents, plan.currency)}/${plan.interval === "year" ? "ano" : "mês"}` : "—"}
                      </p>
                    </div>
                    {subscription?.plan_id ? (
                      <div className="rounded-2xl border-2 border-border bg-background p-4">
                        <p className="font-body text-sm text-muted-foreground">Renovação</p>
                        <p className="mt-1 font-display text-lg font-bold text-foreground">{formatDate(nextDueIso)}</p>
                        {isFreePlan && freeDaysLeft !== null ? (
                          <p className="mt-1 font-body text-xs text-muted-foreground">
                            {freeExpired
                              ? "Período gratuito expirado. Assine um plano para continuar."
                              : `Acesso gratuito restante: ${freeDaysLeft} dias`}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Button variant="default" onClick={() => navigate("/financeiro/planos")}>
                      Ver planos
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/referrals")}>
                      Indicar e ganhar
                    </Button>
                  </div>
                </div>

                <div className="rounded-3xl border-2 border-border bg-card p-6">
                  <h2 className="font-display text-xl font-bold text-foreground">Resumo</h2>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl border-2 border-border bg-background p-4">
                      <p className="font-body text-sm text-muted-foreground">Pendentes</p>
                      <p className="mt-1 font-display text-2xl font-bold text-foreground">{pendingInvoices.length}</p>
                      {nextDueIso ? (
                        <p className="mt-1 font-body text-xs text-muted-foreground">
                          Próximo vencimento: {formatDate(nextDueIso)}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-2xl border-2 border-border bg-background p-4">
                      <p className="font-body text-sm text-muted-foreground">Pagas</p>
                      <p className="mt-1 font-display text-2xl font-bold text-foreground">{paidInvoices.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl border-2 border-border bg-card p-6">
                  <h2 className="font-display text-xl font-bold text-foreground">Faturas pendentes</h2>
                  <div className="mt-4 grid gap-3">
                    {pendingInvoices.length ? (
                      pendingInvoices.slice(0, 4).map((inv) => (
                        <div key={inv.id} className="rounded-2xl border-2 border-border bg-background p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-body text-sm font-semibold text-foreground">
                                Vencimento: {formatDate(addDaysIso(inv.created_at, getCycleDays(inv.billing_cycle)))}
                              </p>
                              <p className="mt-1 font-body text-xs text-muted-foreground">Criada em: {formatDate(inv.created_at)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-display text-lg font-bold text-foreground">{formatMoney(inv.amount_cents, inv.currency)}</p>
                              <p className="mt-1 font-body text-xs text-muted-foreground">Pendente</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                        Nenhuma fatura pendente.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border-2 border-border bg-card p-6">
                  <h2 className="font-display text-xl font-bold text-foreground">Faturas pagas</h2>
                  <div className="mt-4 grid gap-3">
                    {paidInvoices.length ? (
                      paidInvoices.slice(0, 4).map((inv) => (
                        <div key={inv.id} className="rounded-2xl border-2 border-border bg-background p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-body text-sm font-semibold text-foreground">Pago em: {formatDate(inv.paid_at)}</p>
                              <p className="mt-1 font-body text-xs text-muted-foreground">Criada em: {formatDate(inv.created_at)}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <p className="font-display text-lg font-bold text-foreground">{formatMoney(inv.amount_cents, inv.currency)}</p>
                                <Button variant="outline" size="sm" onClick={() => openReceipt(inv)} aria-label="Gerar comprovante">
                                  <FileDown className="h-4 w-4" />
                                </Button>
                              </div>
                              <p className="mt-1 font-body text-xs text-muted-foreground">Paga</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
                        Nenhuma fatura paga ainda.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {futureInvoices.length ? (
                <div className="rounded-3xl border-2 border-border bg-card p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-display text-xl font-bold text-foreground">Faturas futuras</h2>
                      <p className="mt-1 font-body text-sm text-muted-foreground">
                        Pague a próxima fatura com antecedência para evitar atraso na renovação.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => void openFuturePayment()}
                    >
                      Pagar agora
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {futureInvoices.map((inv) => (
                      <div key={inv.key} className="rounded-2xl border-2 border-border bg-background p-4">
                        <p className="font-body text-sm text-muted-foreground">Vencimento (próximo mês)</p>
                        <p className="mt-1 font-display text-lg font-bold text-foreground">{formatDate(inv.due_iso)}</p>
                        <p className="mt-2 font-body text-sm text-muted-foreground">Valor</p>
                        <p className="mt-1 font-display text-lg font-bold text-foreground">{formatMoney(inv.amount_cents, inv.currency)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </main>

      <Dialog open={futurePayOpen} onOpenChange={setFuturePayOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pagamento</DialogTitle>
            <DialogDescription>
              {plan ? `Plano: ${plan.name} · ${formatMoney(plan.price_cents, plan.currency)}/mês` : "—"}
            </DialogDescription>
          </DialogHeader>

          {checkoutError ? (
            <div className="rounded-3xl border-2 border-destructive/40 bg-destructive/5 p-4 font-body text-sm text-destructive/90">
              {checkoutError}
            </div>
          ) : null}

          {!pixCheckout && !cardCheckout && plan?.price_cents ? (
            <div className="grid gap-3 rounded-3xl border-2 border-border bg-background p-4">
              <div className="font-body text-sm font-semibold text-foreground">Forma de pagamento</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setFuturePaymentMethod("pix");
                    setCheckoutError(null);
                  }}
                  className={`rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                    futurePaymentMethod === "pix" ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className="font-display text-sm font-bold text-foreground">PIX</div>
                  <div className="mt-1 font-body text-xs text-muted-foreground">QR Code e copia e cola</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFuturePaymentMethod("credit_card");
                    setCheckoutError(null);
                  }}
                  className={`rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                    futurePaymentMethod === "credit_card" ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className="font-display text-sm font-bold text-foreground">Cartão</div>
                  <div className="mt-1 font-body text-xs text-muted-foreground">Crédito</div>
                </button>
              </div>
            </div>
          ) : null}

          {!pixCheckout && !cardCheckout && plan?.price_cents ? (
            <div className="rounded-3xl border-2 border-border bg-background p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-body text-sm font-semibold text-foreground">Próxima fatura (mensal)</div>
                  <div className="mt-1 font-body text-xs text-muted-foreground">Vencimento: {formatDate(nextDueIso)}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-xl font-bold text-foreground">{formatMoney(plan.price_cents, plan.currency)}</div>
                </div>
              </div>
            </div>
          ) : null}

          {!pixCheckout && !cardCheckout && plan?.price_cents ? (
            <div className="grid gap-3 rounded-3xl border-2 border-border bg-background p-4">
              <div>
                <div className="font-body text-sm font-semibold text-foreground">CPF ou CNPJ</div>
                <div className="mt-1 font-body text-xs text-muted-foreground">Necessário para gerar a cobrança.</div>
                <input
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                  inputMode="numeric"
                  className="mt-3 w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                  placeholder="000.000.000-00"
                />
              </div>
              {cpfCnpjRequired ? (
                <div className="font-body text-xs text-destructive">Informe um CPF ou CNPJ válido.</div>
              ) : null}
            </div>
          ) : null}

          {!pixCheckout && !cardCheckout && plan?.price_cents && futurePaymentMethod === "pix" ? (
            <div className="flex items-center justify-end">
              <Button
                variant="hero"
                disabled={isCheckingOut || !plan}
                onClick={() => {
                  const digits = cpfCnpj.replace(/\D/g, "");
                  const doc = digits.length === 11 || digits.length === 14 ? digits : null;
                  setCpfCnpjRequired(!doc);
                  if (!doc) return;
                  void createPixCheckout(doc);
                }}
              >
                Gerar PIX
              </Button>
            </div>
          ) : null}

          {!pixCheckout && !cardCheckout && plan?.price_cents && futurePaymentMethod === "credit_card" ? (
            <div className="grid gap-4 rounded-3xl border-2 border-border bg-background p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <div className="font-body text-sm font-semibold text-foreground">Nome no cartão</div>
                  <input
                    value={cardHolderName}
                    onChange={(e) => setCardHolderName(e.target.value)}
                    className="mt-2 w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                    placeholder="Nome completo"
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="font-body text-sm font-semibold text-foreground">Número do cartão</div>
                  <input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    inputMode="numeric"
                    className="mt-2 w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                    placeholder="0000 0000 0000 0000"
                  />
                </div>
                <div>
                  <div className="font-body text-sm font-semibold text-foreground">Mês</div>
                  <input
                    value={cardExpMonth}
                    onChange={(e) => setCardExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    inputMode="numeric"
                    className="mt-2 w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                    placeholder="MM"
                  />
                </div>
                <div>
                  <div className="font-body text-sm font-semibold text-foreground">Ano</div>
                  <input
                    value={cardExpYear}
                    onChange={(e) => setCardExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    inputMode="numeric"
                    className="mt-2 w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                    placeholder="AAAA"
                  />
                </div>
                <div>
                  <div className="font-body text-sm font-semibold text-foreground">CVC</div>
                  <input
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    inputMode="numeric"
                    className="mt-2 w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                    placeholder="000"
                  />
                </div>
                <div>
                  <div className="font-body text-sm font-semibold text-foreground">Telefone</div>
                  <input
                    value={cardPhone}
                    onChange={(e) => setCardPhone(formatPhoneBr(e.target.value))}
                    inputMode="tel"
                    className="mt-2 w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <div className="font-body text-sm font-semibold text-foreground">CEP</div>
                  <input
                    value={cardPostalCode}
                    onChange={(e) => setCardPostalCode(formatPostalCode(e.target.value))}
                    inputMode="numeric"
                    className="mt-2 w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                    placeholder="00000-000"
                  />
                </div>
                <div>
                  <div className="font-body text-sm font-semibold text-foreground">Número</div>
                  <input
                    value={cardAddressNumber}
                    onChange={(e) => setCardAddressNumber(e.target.value)}
                    className="mt-2 w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                    placeholder="123"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end">
                <Button
                  variant="hero"
                  disabled={isCheckingOut || !plan}
                  onClick={() => {
                    const digits = cpfCnpj.replace(/\D/g, "");
                    const doc = digits.length === 11 || digits.length === 14 ? digits : null;
                    setCpfCnpjRequired(!doc);
                    if (!doc) return;
                    void createCreditCardCheckout();
                  }}
                >
                  Pagar com cartão
                </Button>
              </div>
            </div>
          ) : null}

          {isCheckingOut ? (
            <div className="rounded-3xl border-2 border-border bg-background p-4 font-body text-sm text-muted-foreground">
              Processando pagamento...
            </div>
          ) : null}

          {pixCheckout && pixQr ? (
            <div className="grid gap-4">
              <div className="rounded-3xl border-2 border-border bg-background p-4">
                <div className="font-body text-sm font-semibold text-foreground">Escaneie o QR Code</div>
                <div className="mt-3 flex items-center justify-center">
                  <img src={pixQr} alt="QR Code PIX" className="h-56 w-56 rounded-2xl border-2 border-border bg-card p-2" />
                </div>
              </div>
              <div className="rounded-3xl border-2 border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-body text-sm font-semibold text-foreground">Código PIX (copia e cola)</div>
                  <Button variant="outline" size="sm" onClick={() => void copyPix()}>
                    <Copy className="h-4 w-4" />
                    {pixCopied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                <div className="mt-2 break-all font-mono text-xs text-foreground">{pixCheckout.pix_payload}</div>
                {pixStatus === "paid" ? (
                  <div className="mt-3 font-body text-sm text-success">Pagamento confirmado.</div>
                ) : (
                  <div className="mt-3 font-body text-sm text-muted-foreground">Aguardando pagamento...</div>
                )}
              </div>
            </div>
          ) : null}

          {cardCheckout ? (
            <div className="grid gap-3 rounded-3xl border-2 border-border bg-background p-4">
              <div className="font-body text-sm text-muted-foreground">Cobrança criada</div>
              <div className="font-body text-xs text-muted-foreground">ID: {cardCheckout.provider_payment_id}</div>
              {cardInvoiceStatus === "pending" ? (
                <div className="font-body text-sm text-muted-foreground">Aguardando confirmação...</div>
              ) : null}
              {cardInvoiceStatus === "paid" ? (
                <div className="font-body text-sm text-success">Pagamento confirmado.</div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-3">
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setFuturePayOpen(false)}>
              Fechar
            </Button>
            {pixStatus === "paid" || cardInvoiceStatus === "paid" ? (
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  setFuturePayOpen(false);
                  window.location.reload();
                }}
              >
                Atualizar
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default FinanceiroPage;
