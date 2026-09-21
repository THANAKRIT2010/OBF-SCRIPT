export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success:false, error:"method_not_allowed" });
  }

  const provider = process.env.QUEST_PROVIDER_URL;
  if (!provider) {
    return res.status(503).json({
      success:false,
      error:"provider_not_configured"
    });
  }

  try {
    const headers = { accept:"application/json" };
    if (process.env.QUEST_PROVIDER_KEY) {
      headers.authorization = `Bearer ${process.env.QUEST_PROVIDER_KEY}`;
    }

    const r = await fetch(provider, { headers });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw:text }; }

    res.status(r.status).json({
      success:r.ok,
      version:"v1",
      data
    });
  } catch {
    res.status(502).json({
      success:false,
      error:"provider_request_failed"
    });
  }
}
