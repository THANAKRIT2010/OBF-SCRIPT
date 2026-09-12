// GET /api/auth/callback?code=...&state=...
//
// ขั้นตอน:
// 1. ตรวจ state (หมดอายุ 5 นาที, decode user/guild/role ที่บอทผูกไว้)
// 2. แลก code -> access_token (ใช้ครั้งเดียว)
// 3. เรียก /users/@me ด้วย access_token เพื่อยืนยันว่าเป็นคนที่กดปุ่มจริง
// 4. ทิ้ง access_token ทันที (ไม่เขียนลง DB/Redis/ที่ไหนเลย)
// 5. ใช้ "บอท token" (ของแอปเราเอง ไม่ใช่ของผู้ใช้) เรียก API ใส่ role ให้ user ใน guild
// 6. แสดงผลสำเร็จ/ล้มเหลว

const STATE_MAX_AGE_MS = 5 * 60 * 1000; // 5 นาที

export default async function handler(req, res) {
  const { code, state, error } = req.query;

  if (error) {
    return sendResult(res, false, "คุณยกเลิกการยืนยันตัวตน");
  }
  if (!code || !state) {
    return sendResult(res, false, "ลิงก์ไม่ถูกต้อง");
  }

  let parsedState;
  try {
    parsedState = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch {
    return sendResult(res, false, "ลิงก์ไม่ถูกต้อง");
  }

  const { u: expectedUserId, g: guildId, r: roleId, t: issuedAt } = parsedState;
  if (!expectedUserId || !guildId || !roleId || !issuedAt) {
    return sendResult(res, false, "ลิงก์ไม่ถูกต้อง");
  }
  if (Date.now() - issuedAt > STATE_MAX_AGE_MS) {
    return sendResult(res, false, "ลิงก์หมดอายุ กรุณากดปุ่มยืนยันตัวตนใหม่อีกครั้ง");
  }

  const {
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    DISCORD_REDIRECT_URI,
    DISCORD_BOT_TOKEN,
  } = process.env;

  try {
    // --- แลก code เป็น access token (ใช้ชั่วคราวในเมมโมรีของ request นี้เท่านั้น) ---
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      return sendResult(res, false, "ไม่สามารถยืนยันตัวตนกับ Discord ได้");
    }

    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;

    // --- ดึงตัวตนผู้ใช้จริงจาก token (ครั้งเดียว, ไม่บันทึก) ---
    const meRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!meRes.ok) {
      return sendResult(res, false, "ไม่สามารถดึงข้อมูลผู้ใช้ได้");
    }
    const me = await meRes.json();

    // access token ใช้เสร็จแล้ว หมดหน้าที่ตรงนี้ -> ไม่ถูกอ้างอิงอีกเลยหลังจากนี้
    // (ไม่มีตัวแปร/การเขียนใดๆ เก็บ accessToken ต่อ)

    // --- กันสวมรอย: user ที่ authorize ต้องตรงกับคนที่กดปุ่มในดิสคอร์ด ---
    if (me.id !== expectedUserId) {
      return sendResult(
        res,
        false,
        "บัญชี Discord ที่ล็อกอินไม่ตรงกับผู้ที่กดปุ่มยืนยันตัวตน"
      );
    }

    // --- เช็คว่าผู้ใช้อยู่ใน guild จริงหรือไม่ ผ่านบอท token ---
    const memberRes = await fetch(
      `https://discord.com/api/guilds/${guildId}/members/${me.id}`,
      { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }
    );

    if (memberRes.status === 404) {
      return sendResult(res, false, "คุณยังไม่ได้อยู่ในเซิร์ฟเวอร์นี้");
    }
    if (!memberRes.ok) {
      return sendResult(res, false, "ไม่สามารถตรวจสอบสมาชิกภาพได้ ลองใหม่อีกครั้ง");
    }

    // --- ใส่ role ให้ ด้วยบอท token (ไม่ใช่ token ของผู้ใช้) ---
    const addRoleRes = await fetch(
      `https://discord.com/api/guilds/${guildId}/members/${me.id}/roles/${roleId}`,
      {
        method: "PUT",
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      }
    );

    if (!addRoleRes.ok && addRoleRes.status !== 204) {
      return sendResult(
        res,
        false,
        "ยืนยันตัวตนสำเร็จ แต่ใส่ยศไม่สำเร็จ (บอทอาจไม่มีสิทธิ์ Manage Roles หรือยศบอทอยู่ต่ำกว่ายศที่จะให้)"
      );
    }

    return sendResult(res, true, "ยืนยันตัวตนสำเร็จ", me.username);
  } catch (err) {
    console.error("OAuth callback error:", err);
    return sendResult(res, false, "เกิดข้อผิดพลาดที่ไม่คาดคิด");
  }
}

// ---------- หน้าผลลัพธ์ ----------
// ดีไซน์แบบ "บัตรผ่านสมาชิก" มีเส้นปรุคั่นระหว่างส่วนตราประทับกับรายละเอียด
function sendResult(res, success, message, username) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${success ? "ยืนยันตัวตนสำเร็จ" : "ยืนยันตัวตนไม่สำเร็จ"}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #14141f;
    --bg-glow: #1c1e3a;
    --panel: #1c1e2b;
    --panel-border: #2c2f42;
    --text: #f2f1f7;
    --text-dim: #9a9bb0;
    --ok: #3ecf8e;
    --ok-dim: #1f4d3c;
    --fail: #ff6b6b;
    --fail-dim: #4d2222;
    --accent: #ffb454;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    min-height: 100vh;
    font-family: "Noto Sans Thai", system-ui, sans-serif;
    background:
      radial-gradient(60% 50% at 50% 0%, var(--bg-glow) 0%, transparent 70%),
      var(--bg);
    color: var(--text);
  }
  body {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .pass {
    width: 100%;
    max-width: 380px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 20px;
    overflow: hidden;
    opacity: 0;
    transform: translateY(10px) scale(0.98);
    animation: rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  @media (prefers-reduced-motion: reduce) {
    .pass { animation: none; opacity: 1; transform: none; }
  }
  @keyframes rise {
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .pass-top {
    padding: 40px 32px 28px;
    text-align: center;
  }
  .seal {
    width: 64px;
    height: 64px;
    margin: 0 auto 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${success ? "var(--ok-dim)" : "var(--fail-dim)"};
    border: 2px solid ${success ? "var(--ok)" : "var(--fail)"};
  }
  .seal svg { width: 28px; height: 28px; }
  h1 {
    font-size: 19px;
    font-weight: 700;
    margin: 0 0 8px;
    letter-spacing: 0.01em;
  }
  p.message {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-dim);
    margin: 0;
  }
  .perforation {
    position: relative;
    height: 0;
    border-top: 1.5px dashed var(--panel-border);
    margin: 0 24px;
  }
  .perforation::before, .perforation::after {
    content: "";
    position: absolute;
    top: -10px;
    width: 20px;
    height: 20px;
    background: var(--bg);
    border-radius: 50%;
  }
  .perforation::before { left: -34px; }
  .perforation::after { right: -34px; }
  .pass-bottom {
    padding: 24px 32px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text-dim);
  }
  .pass-bottom .value {
    color: var(--text);
    font-weight: 600;
  }
  .status-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    background: ${success ? "var(--ok-dim)" : "var(--fail-dim)"};
    color: ${success ? "var(--ok)" : "var(--fail)"};
  }
  .dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: currentColor;
  }
</style>
</head>
<body>
  <div class="pass">
    <div class="pass-top">
      <div class="seal">
        ${success
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="var(--ok)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="var(--fail)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
        }
      </div>
      <h1>${success ? "ยืนยันตัวตนสำเร็จ" : "ยืนยันตัวตนไม่สำเร็จ"}</h1>
      <p class="message">${escapeHtml(message)}</p>
    </div>
    <div class="perforation"></div>
    <div class="pass-bottom">
      <span class="label">${username ? `บัญชี ${escapeHtml(username)}` : "สถานะ"}</span>
      <span class="status-tag"><span class="dot"></span>${success ? "ผ่านการยืนยัน" : "ไม่ผ่าน"}</span>
    </div>
  </div>
</body>
</html>`);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
