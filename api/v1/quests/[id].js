import { requireApiKey } from "../../../lib/auth.js";

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = requireApiKey(req);
  if (!auth.ok) return res.status(auth.status).json(auth.body);

  const provider = process.env.QUEST_PROVIDER_URL;
  const providerKey = process.env.QUEST_PROVIDER_KEY;
  const id = req.query?.id;

  if (!provider) {
    return res.status(503).json({
      ok: false,
      error: "QUEST_PROVIDER_URL is not configured"
    });
  }

  try {
    const url = new URL(provider.replace(/\/$/, "") + "/" + encodeURIComponent(id));
    const headers = {
      accept: "application/json"
    };

    if (providerKey) headers["x-api-key"] = providerKey;

    const options = { method: req.method, headers };

    if (req.method === "POST") {
      headers["content-type"] = "application/json";
      options.body = JSON.stringify(req.body || {});
    }

    const upstream = await fetch(url, options);
    const text = await upstream.text();

    let body;
    try { body = JSON.parse(text); } catch { body = { data: text }; }

    return res.status(upstream.status).json(body);
  } catch {
    return res.status(502).json({
      ok: false,
      error: "Provider request failed"
    });
  }
}
