import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

type AsaasCustomerResponse = {
  id: string;
};

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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const getEnv = (key: string) => {
  const v = Deno.env.get(key);
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
};

const asaasRequest = async <T>(
  baseUrl: string,
  apiKey: string,
  path: string,
  init?: RequestInit,
): Promise<T> => {
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

serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const asaasApiKey = getEnv("ASAAS_API_KEY");
    const asaasBaseUrl = Deno.env.get("ASAAS_BASE_URL") ?? "https://api.asaas.com/v3";

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "unauthorized" }, 401);

    const userId = userData.user.id;
    const userEmail = userData.user.email ?? null;
    const fullName = (userData.user.user_metadata?.full_name as string | undefined) ?? null;

    const body = (await req.json().catch(() => ({}))) as CreateCheckoutBody;
    const planId = body.plan_id;
    if (!planId) return json({ error: "plan_id required" }, 400);

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: planData, error: planError } = await adminClient
      .from("plans")
      .select("id, name, price_cents, currency, interval")
      .eq("id", planId)
      .maybeSingle();

    if (planError) return json({ error: planError.message }, 400);
    if (!planData) return json({ error: "plan not found" }, 404);

    const plan = planData as PlanRow;
    if (!plan.price_cents || plan.price_cents <= 0) {
      return json({ error: "paid plan required for pix" }, 400);
    }

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

      await adminClient
        .from("profiles")
        .update({ asaas_customer_id: asaasCustomerId })
        .eq("user_id", userId);
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

    const pixQr = await asaasRequest<AsaasPixQrCodeResponse>(
      asaasBaseUrl,
      asaasApiKey,
      `/payments/${createdPayment.id}/pixQrCode`,
      { method: "GET" },
    );

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

    if (invoiceError) return json({ error: invoiceError.message }, 400);
    const invoiceId = (invoiceInsert as { id: string } | null)?.id;
    if (!invoiceId) return json({ error: "invoice not created" }, 500);

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

    if (paymentError) return json({ error: paymentError.message }, 400);

    const paymentId = (paymentInsert as { id: string } | null)?.id;
    if (!paymentId) return json({ error: "pix payment not created" }, 500);

    return json({
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
    return json({ error: message }, 500);
  }
});

