import { requireApiKey } from "../../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = requireApiKey(req);
  if (!auth.ok) return res.status(auth.status).json(auth.body);

  const provider = process.env.QUEST_PROVIDER_URL;
  const providerKey = process.env.QUEST_PROVIDER_KEY;

  if (!provider) {
    return res.status(503).json({
      ok: false,
      error: "QUEST_PROVIDER_URL is not configured"
    });
  }

  try {
    const url = new URL(provider);
    for (const [key, value] of Object.entries(req.query || {})) {
      if (typeof value === "string") url.searchParams.set(key, value);
    }

    const headers = { accept: "application/json" };
    if (providerKey) headers["x-api-key"] = providerKey;

    const upstream = await fetch(url, { headers });
    const text = await upstream.text();

    let body;
    try { body = JSON.parse(text); } catch { body = { data: text }; }

    return res.status(upstream.status).json(body);
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: "Provider request failed"
    });
  }
}
