// GET /api/auth/login?state=...
// Redirect ตรงไป Discord OAuth2 ทันที ไม่มีหน้ากลางให้กดลิงก์ซ้ำ

export default function handler(req, res) {
  const { state } = req.query;

  if (!state || typeof state !== "string") {
    return res.status(400).send("Missing state");
  }

  const { DISCORD_CLIENT_ID, DISCORD_REDIRECT_URI } = process.env;

  if (!DISCORD_CLIENT_ID || !DISCORD_REDIRECT_URI) {
    return res.status(500).send("OAuth is not configured");
  }

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify",
    state,
    prompt: "consent",
  });

  return res.redirect(302, `https://discord.com/oauth2/authorize?${params}`);
}
