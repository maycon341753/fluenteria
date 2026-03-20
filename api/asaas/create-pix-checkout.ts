import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

type CreateCheckoutBody = {
  plan_id?: string;
  cpf_cnpj?: string;
};

type PlanRow = {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  interval: "month" | "year";
};

type AsaasCustomerResponse = { id: string };

type AsaasPaymentResponse = {
  id: string;
  dueDate: string;
  value: number;
  status: string;
};

type AsaasPixQrCodeResponse = {
  encodedImage: string;
  payload: string;
  expirationDate: string | null;
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

    const body = (req.body ?? {}) as CreateCheckoutBody;
    const planId = body.plan_id;
    if (!planId) return res.status(400).json({ error: "plan_id required" });

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

    const { data: planData, error: planError } = await adminClient
      .from("plans")
      .select("id, name, price_cents, currency, interval")
      .eq("id", planId)
      .maybeSingle();

    if (planError) return res.status(400).json({ error: planError.message });
    if (!planData) return res.status(404).json({ error: "plan not found" });

    const plan = planData as PlanRow;
    if (!plan.price_cents || plan.price_cents <= 0) return res.status(400).json({ error: "paid plan required for pix" });

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

    if (docFromBody && docFromBody !== docFromProfile) {
      const upd = await adminClient.from("profiles").update({ cpf_cnpj: docFromBody }).eq("user_id", userId);
      if (upd.error && !upd.error.message.toLowerCase().includes("cpf_cnpj")) {
        return res.status(400).json({ error: upd.error.message });
      }
    }

    if (!cpfCnpj) {
      return res.status(400).json({ error: "cpf_required", detail: "Informe CPF ou CNPJ para gerar o PIX." });
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

    const dueDate = formatDueDate(new Date());
    const value = Number((plan.price_cents / 100).toFixed(2));

    const createdPayment = await asaasRequest<AsaasPaymentResponse>(asaasBaseUrl, asaasApiKey, "/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "PIX",
        value,
        dueDate,
        description: `Assinatura ${plan.name}`,
        externalReference: `${userId}:${plan.id}`,
      }),
    });

    const pixQr = await asaasRequest<AsaasPixQrCodeResponse>(asaasBaseUrl, asaasApiKey, `/payments/${createdPayment.id}/pixQrCode`, {
      method: "GET",
    });

    const expiresAt = pixQr.expirationDate ? new Date(pixQr.expirationDate).toISOString() : null;

    const { data: invoiceInsert, error: invoiceError } = await adminClient
      .from("invoices")
      .insert({
        user_id: userId,
        status: "pending",
        amount_cents: plan.price_cents,
        currency: plan.currency,
        due_date: expiresAt,
        paid_at: null,
        provider: "asaas",
        provider_payment_id: createdPayment.id,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();

    if (invoiceError) return res.status(400).json({ error: invoiceError.message });
    const invoiceId = (invoiceInsert as { id: string } | null)?.id;
    if (!invoiceId) return res.status(500).json({ error: "invoice not created" });

    const { data: paymentInsert, error: paymentError } = await adminClient
      .from("pix_payments")
      .insert({
        user_id: userId,
        plan_id: plan.id,
        invoice_id: invoiceId,
        status: "pending",
        provider: "asaas",
        provider_payment_id: createdPayment.id,
        pix_payload: pixQr.payload,
        qr_code_base64: pixQr.encodedImage,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();

    if (paymentError) return res.status(400).json({ error: paymentError.message });

    const paymentId = (paymentInsert as { id: string } | null)?.id;
    if (!paymentId) return res.status(500).json({ error: "pix payment not created" });

    return res.status(200).json({
      payment_id: paymentId,
      invoice_id: invoiceId,
      amount_cents: plan.price_cents,
      currency: plan.currency,
      pix_payload: pixQr.payload,
      qr_code_base64: pixQr.encodedImage,
      expires_at: expiresAt,
      provider_payment_id: createdPayment.id,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unexpected error";
    return res.status(500).json({ error: message });
  }
}
