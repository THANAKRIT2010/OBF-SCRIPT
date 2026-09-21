export default async function handler(req, res) {
  const id = req.query.id;
  const provider = process.env.QUEST_PROVIDER_URL;

  if (!provider) {
    return res.status(503).json({
      success:false,
      error:"provider_not_configured"
    });
  }

  try {
    const url = `${provider.replace(/\/$/,"")}/${encodeURIComponent(id)}`;
    const headers = {
      accept:"application/json",
      ...(process.env.QUEST_PROVIDER_KEY
        ? { authorization:`Bearer ${process.env.QUEST_PROVIDER_KEY}` }
        : {})
    };

    const options = { method:req.method, headers };
    if (req.method === "POST") {
      options.headers["content-type"] = "application/json";
      options.body = JSON.stringify(req.body ?? {});
    }

    const r = await fetch(url, options);
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw:text }; }

    res.status(r.status).json({
      success:r.ok,
      version:"v1",
      questId:id,
      data
    });
  } catch {
    res.status(502).json({
      success:false,
      error:"provider_request_failed"
    });
  }
}
