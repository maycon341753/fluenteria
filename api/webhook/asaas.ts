import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

type AsaasWebhookBody = {
  id?: string;
  event?: string;
  payment?: {
    id?: string;
    status?: string;
  };
};

const ok = (res: VercelResponse) => res.status(200).json({ ok: true });

const getEnvAny = (keys: string[]) => {
  for (const key of keys) {
    const v = process.env[key];
    if (v) return v;
  }
  throw new Error(`Missing env: ${keys[0]}`);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

    const token = String(req.headers["asaas-access-token"] ?? "");
    const expected = getEnvAny(["ASAAS_WEBHOOK_TOKEN", "ASAAS_WEBHOOK_ACCESS_TOKEN"]);
    if (!token || token !== expected) return res.status(401).json({ error: "unauthorized" });

    const payload = (req.body ?? {}) as AsaasWebhookBody;
    const eventId = payload.id ?? null;
    const event = payload.event ?? null;
    const paymentId = payload.payment?.id ?? null;
    const status = payload.payment?.status ?? null;

    const supabaseUrl = getEnvAny(["SUPABASE_URL", "VITE_SUPABASE_URL"]);
    const serviceRoleKey = getEnvAny(["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE"]);
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    if (eventId) {
      const { error } = await admin.from("asaas_webhook_events").insert({ id: eventId }).select("id").maybeSingle();
      if (error && !error.message.toLowerCase().includes("duplicate")) {
        return res.status(400).json({ error: error.message });
      }
      if (error && error.message.toLowerCase().includes("duplicate")) {
        return ok(res);
      }
    }

    if (!paymentId) return ok(res);

    const normalizedStatus = String(status ?? "").toUpperCase();
    const isPaid =
      event === "PAYMENT_CONFIRMED" ||
      event === "PAYMENT_RECEIVED" ||
      event === "PAYMENT_RECEIVED_IN_CASH" ||
      normalizedStatus === "CONFIRMED" ||
      normalizedStatus === "RECEIVED" ||
      normalizedStatus === "RECEIVED_IN_CASH" ||
      normalizedStatus === "SETTLED";

    if (!isPaid) return ok(res);

    const { error: confirmError } = await admin.rpc("confirm_asaas_payment", {
      p_provider_payment_id: paymentId,
    });

    if (confirmError) return res.status(400).json({ error: confirmError.message });

    return ok(res);
  } catch (e) {
    const message = e instanceof Error ? e.message : "unexpected error";
    return res.status(500).json({ error: message });
  }
}
