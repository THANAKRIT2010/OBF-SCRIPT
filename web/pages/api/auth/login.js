// GET /api/auth/login?state=...
// รับ state ที่บอทสร้างไว้ (ผูก user+guild+role) แล้ว redirect ไป Discord OAuth
// ไม่มีการเก็บอะไรลง database ในขั้นตอนนี้ทั้งสิ้น

export default function handler(req, res) {
  const { state } = req.query;

  if (!state) {
    return res.status(400).send("Missing state");
  }

  const {
    DISCORD_CLIENT_ID,
    DISCORD_REDIRECT_URI, // ต้องตรงกับที่ตั้งใน Discord Developer Portal เป๊ะๆ
  } = process.env;

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: "code",
    // ขอแค่ identify พอ ไม่ขอ email/connections/guilds.join เพราะไม่จำเป็น
    scope: "identify",
    state,
    prompt: "consent",
  });

  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
}
