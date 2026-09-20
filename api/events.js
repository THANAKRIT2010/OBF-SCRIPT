import crypto from "node:crypto";
import { requireApiKey } from "../lib/auth.js";
import { sendWebhook } from "../lib/webhook.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!requireApiKey(req, res)) return;

  const { event, data, webhooks } = req.body || {};
  if (!event || typeof event !== "string") {
    return res.status(400).json({ error: "event_required" });
  }
  if (!Array.isArray(webhooks) || webhooks.length === 0) {
    return res.status(400).json({ error: "webhooks_required" });
  }

  const payload = {
    id: crypto.randomUUID(),
    event,
    data: data ?? {},
    created_at: new Date().toISOString()
  };

  const results = [];
  for (const item of webhooks.slice(0, 20)) {
    if (!item || typeof item.url !== "string") continue;
    try {
      const result = await sendWebhook(item.url, item.secret || "", payload);
      results.push({ url: item.url, ...result });
    } catch (error) {
      results.push({ url: item.url, ok: false, error: error.name === "AbortError" ? "timeout" : error.message });
    }
  }

  res.status(200).json({ ok: true, event: payload, deliveries: results });
}