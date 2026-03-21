import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type AsaasWebhookBody = {
  id?: string;
  event?: string;
  payment?: {
    id?: string;
    status?: string;
    confirmedDate?: string | null;
    paymentDate?: string | null;
    creditDate?: string | null;
  };
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

serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

    const token = req.headers.get("asaas-access-token") ?? "";
    const expected = getEnv("ASAAS_WEBHOOK_TOKEN");
    if (!token || token !== expected) return json({ error: "unauthorized" }, 401);

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const payload = (await req.json().catch(() => ({}))) as AsaasWebhookBody;
    const eventId = payload.id ?? null;
    const asaasPaymentId = payload.payment?.id ?? null;
    const event = payload.event ?? null;
    const status = payload.payment?.status ?? null;

    if (eventId) {
      const { error } = await adminClient.from("asaas_webhook_events").insert({ id: eventId }).select("id").maybeSingle();
      if (error && !error.message.toLowerCase().includes("duplicate")) {
        return json({ error: error.message }, 400);
      }
    }

    if (!asaasPaymentId) return json({ ok: true });

    const normalizedStatus = String(status ?? "").toUpperCase();
    const paid =
      event === "PAYMENT_CONFIRMED" ||
      event === "PAYMENT_RECEIVED" ||
      event === "PAYMENT_RECEIVED_IN_CASH" ||
      normalizedStatus === "CONFIRMED" ||
      normalizedStatus === "RECEIVED" ||
      normalizedStatus === "RECEIVED_IN_CASH" ||
      normalizedStatus === "SETTLED";

    if (!paid) return json({ ok: true });

    const { error: confirmError } = await adminClient.rpc("confirm_asaas_payment", {
      p_provider_payment_id: asaasPaymentId,
    });

    if (confirmError) return json({ error: confirmError.message }, 400);

    return json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unexpected error";
    return json({ error: message }, 500);
  }
});
