// GET /api/auth/login?state=...
// รับ state ที่บอทสร้างไว้ (ผูก user+guild+role) แล้วพาไป Discord OAuth
// ไม่มีการเก็บอะไรลง database ในขั้นตอนนี้ทั้งสิ้น
//
// แสดงหน้า "กำลังพาไปยัง Discord" สั้นๆ ก่อน redirect จริง (ดีไซน์เดียวกับหน้าผลลัพธ์)
// เพื่อให้ผู้ใช้เห็นว่ากำลังจะไปเว็บทางการของ Discord ไม่ใช่หน้าดักข้อมูล

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

  const authorizeUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="refresh" content="1;url=${authorizeUrl}" />
<title>กำลังพาไปยัง Discord…</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #14141f;
    --bg-glow: #1c1e3a;
    --panel: #1c1e2b;
    --panel-border: #2c2f42;
    --text: #f2f1f7;
    --text-dim: #9a9bb0;
    --accent: #ffb454;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    min-height: 100vh;
    font-family: "Noto Sans Thai", system-ui, sans-serif;
    background: radial-gradient(60% 50% at 50% 0%, var(--bg-glow) 0%, transparent 70%), var(--bg);
    color: var(--text);
  }
  body { display: flex; align-items: center; justify-content: center; padding: 24px; }
  .pass {
    width: 100%;
    max-width: 380px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 20px;
    padding: 40px 32px;
    text-align: center;
  }
  .spinner {
    width: 44px; height: 44px;
    margin: 0 auto 20px;
    border-radius: 50%;
    border: 3px solid var(--panel-border);
    border-top-color: var(--accent);
    animation: spin 0.8s linear infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner { animation: none; border-top-color: var(--panel-border); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  h1 { font-size: 17px; font-weight: 700; margin: 0 0 8px; }
  p { font-size: 13px; color: var(--text-dim); margin: 0 0 20px; line-height: 1.6; }
  a.fallback {
    display: inline-block;
    font-size: 13px;
    font-weight: 600;
    color: var(--bg);
    background: var(--accent);
    padding: 10px 20px;
    border-radius: 999px;
    text-decoration: none;
  }
</style>
</head>
<body>
  <div class="pass">
    <div class="spinner"></div>
    <h1>กำลังพาไปยัง Discord</h1>
    <p>ระบบจะพาคุณไปหน้ายืนยันตัวตนอย่างเป็นทางการของ Discord (discord.com) ในอีกสักครู่</p>
    <a class="fallback" href="${authorizeUrl}">ไปที่ Discord ตอนนี้</a>
  </div>
</body>
</html>`);
}
