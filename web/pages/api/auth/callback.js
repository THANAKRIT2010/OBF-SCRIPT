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

    return sendResult(res, true, `ยืนยันตัวตนสำเร็จ! ยินดีต้อนรับ ${me.username}`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    return sendResult(res, false, "เกิดข้อผิดพลาดที่ไม่คาดคิด");
  }
}

function sendResult(res, success, message) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8" />
<title>${success ? "ยืนยันตัวตนสำเร็จ" : "ยืนยันตัวตนไม่สำเร็จ"}</title>
<style>
  body { font-family: system-ui, sans-serif; background:#1e1f22; color:#fff;
         height:100vh; margin:0; display:flex; align-items:center; justify-content:center; }
  .card { background:#2b2d31; padding:40px; border-radius:12px; text-align:center; max-width:420px; }
  .icon { font-size:48px; margin-bottom:12px; }
  h1 { font-size:18px; margin:0 0 8px; }
  p { color:#b5bac1; font-size:14px; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? "✅" : "❌"}</div>
    <h1>${success ? "ยืนยันตัวตนสำเร็จ" : "ยืนยันตัวตนไม่สำเร็จ"}</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
