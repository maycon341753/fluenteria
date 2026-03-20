import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

type CreateCardCheckoutBody = {
  plan_id?: string;
  billing_cycle?: "month" | "year";
  cpf_cnpj?: string;
  holder_name?: string;
  card_number?: string;
  card_exp_month?: string;
  card_exp_year?: string;
  card_cvc?: string;
  holder_phone?: string;
  holder_postal_code?: string;
  holder_address_number?: string;
};

type PlanRow = {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  interval: "month" | "year";
  annual_discount_percent: number;
};

type AsaasCustomerResponse = { id: string };

type AsaasPaymentResponse = {
  id: string;
  dueDate: string;
  value: number;
  status: string;
};

const cors = (res: VercelResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const getEnvAny = (keys: string[]) => {
  for (const key of keys) {
    const v = process.env[key];
    if (v) return v;
  }
  throw new Error(`Missing env: ${keys[0]}`);
};

const asaasRequest = async <T>(baseUrl: string, apiKey: string, path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  if (!res.ok) {
    try {
      const parsed = JSON.parse(text) as { errors?: Array<{ description?: string }> };
      const msg = parsed?.errors?.map((e) => e.description).filter(Boolean).join(" | ");
      throw new Error(msg || text || `Asaas error: ${res.status}`);
    } catch {
      throw new Error(text || `Asaas error: ${res.status}`);
    }
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
};

const formatDueDate = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const normalizeCpfCnpj = (value: string | null | undefined) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 11 || digits.length === 14) return digits;
  return null;
};

const normalizeBillingCycle = (value: unknown): "month" | "year" => {
  if (value === "year") return "year";
  return "month";
};

const normalizeCardNumber = (value: string | null | undefined) => String(value ?? "").replace(/\D/g, "");

const normalizeExpMonth = (value: string | null | undefined) => {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 2);
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 1 || n > 12) return null;
  return String(n).padStart(2, "0");
};

const normalizeExpYear = (value: string | null | undefined) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 2) return `20${digits}`;
  if (digits.length === 4) return digits;
  return null;
};

const normalizeCvc = (value: string | null | undefined) => String(value ?? "").replace(/\D/g, "").slice(0, 4);

const normalizePostalCode = (value: string | null | undefined) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return digits;
};

const normalizePhone = (value: string | null | undefined) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return null;
  return digits;
};

const getRemoteIp = (req: VercelRequest) => {
  const header = String(req.headers["x-forwarded-for"] ?? "");
  const ip = header.split(",")[0]?.trim();
  return ip || null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  try {
    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

    const supabaseUrl = getEnvAny(["SUPABASE_URL", "VITE_SUPABASE_URL"]);
    const supabaseServiceRoleKey = getEnvAny(["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE"]);
    const asaasApiKey = getEnvAny(["ASAAS_API_KEY"]);
    const asaasBaseUrl = process.env.ASAAS_BASE_URL ?? "https://api.asaas.com/v3";

    const authorization = req.headers.authorization ?? "";
    if (!authorization) return res.status(401).json({ error: "missing_authorization" });

    const body = (req.body ?? {}) as CreateCardCheckoutBody;
    const planId = body.plan_id;
    if (!planId) return res.status(400).json({ error: "plan_id required" });
    const billingCycle = normalizeBillingCycle(body.billing_cycle);

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });

    const jwt = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return res.status(401).json({ error: "invalid_authorization" });

    const { data: userData, error: userError } = await adminClient.auth.getUser(jwt);
    if (userError || !userData.user) {
      const detail = userError?.message ?? "invalid session";
      return res.status(401).json({ error: "unauthorized", detail });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email ?? null;
    const fullName = (userData.user.user_metadata?.full_name as string | undefined) ?? null;
    const userCpf = (userData.user.user_metadata?.cpf as string | undefined) ?? null;

    const planResult = await adminClient
      .from("plans")
      .select("id, name, price_cents, currency, interval, annual_discount_percent")
      .eq("id", planId)
      .maybeSingle();

    let planData = planResult.data as unknown;
    if (planResult.error && planResult.error.message.toLowerCase().includes("annual_discount_percent")) {
      const fallback = await adminClient.from("plans").select("id, name, price_cents, currency, interval").eq("id", planId).maybeSingle();
      if (fallback.error) return res.status(400).json({ error: fallback.error.message });
      planData = (fallback.data ? { ...(fallback.data as Record<string, unknown>), annual_discount_percent: 0 } : null) as unknown;
    } else if (planResult.error) {
      return res.status(400).json({ error: planResult.error.message });
    }

    if (!planData) return res.status(404).json({ error: "plan not found" });

    const plan = planData as PlanRow;
    if (!plan.price_cents || plan.price_cents <= 0) return res.status(400).json({ error: "paid plan required for credit card" });

    const profileQuery = await adminClient
      .from("profiles")
      .select("user_id, full_name, email, asaas_customer_id, cpf_cnpj")
      .eq("user_id", userId)
      .maybeSingle();

    const profileQueryFallback =
      profileQuery.error && profileQuery.error.message.toLowerCase().includes("cpf_cnpj")
        ? await adminClient.from("profiles").select("user_id, full_name, email, asaas_customer_id").eq("user_id", userId).maybeSingle()
        : null;

    const profileData = (profileQueryFallback?.data ?? profileQuery.data) as unknown;

    let asaasCustomerId = (profileData as { asaas_customer_id?: string | null } | null)?.asaas_customer_id ?? null;
    const profileDoc = (profileData as { cpf_cnpj?: string | null } | null)?.cpf_cnpj ?? null;
    const docFromBody = normalizeCpfCnpj(body.cpf_cnpj);
    const docFromMeta = normalizeCpfCnpj(userCpf);
    const docFromProfile = normalizeCpfCnpj(profileDoc);
    const cpfCnpj = docFromBody ?? docFromMeta ?? docFromProfile;
    if (!cpfCnpj) return res.status(400).json({ error: "cpf_required" });

    if (docFromBody && docFromBody !== docFromProfile) {
      const upd = await adminClient.from("profiles").update({ cpf_cnpj: docFromBody }).eq("user_id", userId);
      if (upd.error && !upd.error.message.toLowerCase().includes("cpf_cnpj")) {
        return res.status(400).json({ error: upd.error.message });
      }
    }

    if (!asaasCustomerId) {
      const customerPayload = {
        name: (profileData as { full_name?: string | null } | null)?.full_name ?? fullName ?? userEmail ?? "Cliente",
        email: (profileData as { email?: string | null } | null)?.email ?? userEmail ?? undefined,
        cpfCnpj,
      };

      const createdCustomer = await asaasRequest<AsaasCustomerResponse>(asaasBaseUrl, asaasApiKey, "/customers", {
        method: "POST",
        body: JSON.stringify(customerPayload),
      });

      asaasCustomerId = createdCustomer.id;
      await adminClient.from("profiles").update({ asaas_customer_id: asaasCustomerId }).eq("user_id", userId);
    } else {
      await asaasRequest<unknown>(asaasBaseUrl, asaasApiKey, `/customers/${asaasCustomerId}`, {
        method: "PUT",
        body: JSON.stringify({ cpfCnpj }),
      });
    }

    const amountCents = (() => {
      if (billingCycle === "month") return plan.price_cents;
      if (plan.interval === "year") return plan.price_cents;
      const percent = Math.max(0, Math.min(100, Number(plan.annual_discount_percent ?? 0)));
      const base = plan.price_cents * 12;
      return Math.round((base * (100 - percent)) / 100);
    })();

    const cycleDays = billingCycle === "year" ? 365 : 30;
    const value = Number((amountCents / 100).toFixed(2));

    const holderName = String(body.holder_name ?? "").trim();
    const cardNumber = normalizeCardNumber(body.card_number);
    const expMonth = normalizeExpMonth(body.card_exp_month);
    const expYear = normalizeExpYear(body.card_exp_year);
    const cvc = normalizeCvc(body.card_cvc);
    const phone = normalizePhone(body.holder_phone);
    const postalCode = normalizePostalCode(body.holder_postal_code);
    const addressNumber = String(body.holder_address_number ?? "").trim();

    if (!holderName) return res.status(400).json({ error: "holder_name_required" });
    if (!cardNumber || cardNumber.length < 13) return res.status(400).json({ error: "card_number_required" });
    if (!expMonth) return res.status(400).json({ error: "card_exp_month_required" });
    if (!expYear) return res.status(400).json({ error: "card_exp_year_required" });
    if (!cvc || cvc.length < 3) return res.status(400).json({ error: "card_cvc_required" });
    if (!postalCode) return res.status(400).json({ error: "postal_code_required" });
    if (!addressNumber) return res.status(400).json({ error: "address_number_required" });
    if (!phone) return res.status(400).json({ error: "phone_required" });

    const createdPayment = await asaasRequest<AsaasPaymentResponse>(asaasBaseUrl, asaasApiKey, "/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "CREDIT_CARD",
        value,
        dueDate: formatDueDate(new Date()),
        description: `Assinatura ${plan.name} (${billingCycle === "year" ? "Anual" : "Mensal"})`,
        externalReference: `${userId}:${plan.id}:${billingCycle}:credit_card`,
        creditCard: {
          holderName,
          number: cardNumber,
          expiryMonth: expMonth,
          expiryYear: expYear,
          ccv: cvc,
        },
        creditCardHolderInfo: {
          name: holderName,
          email: userEmail ?? undefined,
          cpfCnpj,
          postalCode,
          addressNumber,
          phone,
        },
        remoteIp: getRemoteIp(req) ?? undefined,
      }),
    });

    const billingDueAt = new Date(Date.now() + cycleDays * 24 * 60 * 60 * 1000).toISOString();

    const invoiceInsertBase = {
      user_id: userId,
      status: "pending",
      amount_cents: amountCents,
      currency: plan.currency,
      due_date: billingDueAt,
      paid_at: null,
      provider: "asaas",
      provider_payment_id: createdPayment.id,
      created_at: new Date().toISOString(),
    } as Record<string, unknown>;

    const invoiceAttempt = await adminClient
      .from("invoices")
      .insert({ ...invoiceInsertBase, billing_cycle: billingCycle, plan_id: plan.id, payment_method: "credit_card" })
      .select("id")
      .maybeSingle();

    let invoiceId: string | null = null;
    if (invoiceAttempt.error) {
      const msg = invoiceAttempt.error.message.toLowerCase();
      if (msg.includes("billing_cycle") || msg.includes("plan_id") || msg.includes("payment_method")) {
        const fallback = await adminClient.from("invoices").insert(invoiceInsertBase).select("id").maybeSingle();
        if (fallback.error) return res.status(400).json({ error: fallback.error.message });
        invoiceId = (fallback.data as { id: string } | null)?.id ?? null;
      } else {
        return res.status(400).json({ error: invoiceAttempt.error.message });
      }
    } else {
      invoiceId = (invoiceAttempt.data as { id: string } | null)?.id ?? null;
    }

    if (!invoiceId) return res.status(500).json({ error: "invoice not created" });

    return res.status(200).json({
      invoice_id: invoiceId,
      amount_cents: amountCents,
      currency: plan.currency,
      provider_payment_id: createdPayment.id,
      status: createdPayment.status,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unexpected error";
    return res.status(500).json({ error: message });
  }
}

