import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

type CreateCheckoutBody = {
  plan_id?: string;
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

const getEnv = (key: string) => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
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
    throw new Error(text || `Asaas error: ${res.status}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
};

const formatDueDate = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  try {
    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const asaasApiKey = getEnv("ASAAS_API_KEY");
    const asaasBaseUrl = process.env.ASAAS_BASE_URL ?? "https://api.asaas.com/v3";

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.authorization ?? "" } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) return res.status(401).json({ error: "unauthorized" });

    const userId = userData.user.id;
    const userEmail = userData.user.email ?? null;
    const fullName = (userData.user.user_metadata?.full_name as string | undefined) ?? null;

    const body = (req.body ?? {}) as CreateCheckoutBody;
    const planId = body.plan_id;
    if (!planId) return res.status(400).json({ error: "plan_id required" });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });

    const { data: planData, error: planError } = await adminClient
      .from("plans")
      .select("id, name, price_cents, currency, interval")
      .eq("id", planId)
      .maybeSingle();

    if (planError) return res.status(400).json({ error: planError.message });
    if (!planData) return res.status(404).json({ error: "plan not found" });

    const plan = planData as PlanRow;
    if (!plan.price_cents || plan.price_cents <= 0) return res.status(400).json({ error: "paid plan required for pix" });

    const { data: profileData } = await adminClient
      .from("profiles")
      .select("user_id, full_name, email, asaas_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    let asaasCustomerId = (profileData as { asaas_customer_id?: string | null } | null)?.asaas_customer_id ?? null;

    if (!asaasCustomerId) {
      const customerPayload = {
        name: (profileData as { full_name?: string | null } | null)?.full_name ?? fullName ?? userEmail ?? "Cliente",
        email: (profileData as { email?: string | null } | null)?.email ?? userEmail ?? undefined,
      };

      const createdCustomer = await asaasRequest<AsaasCustomerResponse>(asaasBaseUrl, asaasApiKey, "/customers", {
        method: "POST",
        body: JSON.stringify(customerPayload),
      });

      asaasCustomerId = createdCustomer.id;
      await adminClient.from("profiles").update({ asaas_customer_id: asaasCustomerId }).eq("user_id", userId);
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

