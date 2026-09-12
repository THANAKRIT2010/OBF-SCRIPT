// GET /api/auth/callback?code=...&state=...
//
// รองรับ state ที่บอทสร้างแบบ:
// { u, g, r, t }
// และชื่อเต็ม:
// { userId, guildId, roleId, issuedAt }
//
// state ต้องเป็น base64/base64url ของ JSON

const STATE_MAX_AGE_MS = 5 * 60 * 1000;

export default async function handler(req, res) {
  const { code, state, error } = req.query;

  if (error) {
    return sendResult(res, false, "คุณยกเลิกการยืนยันตัวตน");
  }

  if (!code || !state || typeof state !== "string") {
    return sendResult(res, false, "ลิงก์ไม่ถูกต้อง");
  }

  let parsedState;
  try {
    parsedState = decodeState(state);
  } catch (err) {
    console.error("Invalid OAuth state:", err);
    return sendResult(res, false, "ลิงก์ไม่ถูกต้อง");
  }

  const expectedUserId = String(
    parsedState.u ?? parsedState.userId ?? parsedState.user_id ?? ""
  );
  const guildId = String(
    parsedState.g ?? parsedState.guildId ?? parsedState.guild_id ?? ""
  );
  const roleId = String(
    parsedState.r ?? parsedState.roleId ?? parsedState.role_id ?? ""
  );

  let issuedAt = Number(
    parsedState.t ?? parsedState.issuedAt ?? parsedState.issued_at ?? 0
  );

  // รองรับทั้ง milliseconds และ Unix seconds
  if (issuedAt > 0 && issuedAt < 100000000000) {
    issuedAt *= 1000;
  }

  if (!expectedUserId || !guildId || !roleId || !issuedAt) {
    return sendResult(res, false, "ลิงก์ไม่ถูกต้อง");
  }

  if (Date.now() - issuedAt > STATE_MAX_AGE_MS) {
    return sendResult(
      res,
      false,
      "ลิงก์หมดอายุ กรุณากดปุ่มยืนยันตัวตนใหม่อีกครั้ง"
    );
  }

  if (Date.now() - issuedAt < -60 * 1000) {
    return sendResult(res, false, "ลิงก์ไม่ถูกต้อง");
  }

  const {
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    DISCORD_REDIRECT_URI,
    DISCORD_BOT_TOKEN,
  } = process.env;

  if (
    !DISCORD_CLIENT_ID ||
    !DISCORD_CLIENT_SECRET ||
    !DISCORD_REDIRECT_URI ||
    !DISCORD_BOT_TOKEN
  ) {
    console.error("OAuth env vars are incomplete");
    return sendResult(res, false, "ระบบ OAuth ยังตั้งค่าไม่ครบ");
  }

  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const detail = await tokenRes.text().catch(() => "");
      console.error("Discord token exchange failed:", tokenRes.status, detail);
      return sendResult(res, false, "ไม่สามารถยืนยันตัวตนกับ Discord ได้");
    }

    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;

    if (!accessToken) {
      return sendResult(res, false, "ไม่สามารถยืนยันตัวตนกับ Discord ได้");
    }

    const meRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!meRes.ok) {
      return sendResult(res, false, "ไม่สามารถดึงข้อมูลผู้ใช้ได้");
    }

    const me = await meRes.json();

    if (String(me.id) !== expectedUserId) {
      return sendResult(
        res,
        false,
        "บัญชี Discord ที่ล็อกอินไม่ตรงกับผู้ที่กดปุ่มยืนยันตัวตน"
      );
    }

    const memberRes = await fetch(
      `https://discord.com/api/guilds/${encodeURIComponent(guildId)}/members/${encodeURIComponent(me.id)}`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
      }
    );

    if (memberRes.status === 404) {
      return sendResult(res, false, "คุณยังไม่ได้อยู่ในเซิร์ฟเวอร์นี้");
    }

    if (!memberRes.ok) {
      const detail = await memberRes.text().catch(() => "");
      console.error("Guild member check failed:", memberRes.status, detail);
      return sendResult(
        res,
        false,
        "ไม่สามารถตรวจสอบสมาชิกภาพได้ ลองใหม่อีกครั้ง"
      );
    }

    const addRoleRes = await fetch(
      `https://discord.com/api/guilds/${encodeURIComponent(guildId)}/members/${encodeURIComponent(me.id)}/roles/${encodeURIComponent(roleId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
      }
    );

    if (!addRoleRes.ok && addRoleRes.status !== 204) {
      const detail = await addRoleRes.text().catch(() => "");
      console.error("Add role failed:", addRoleRes.status, detail);
      return sendResult(
        res,
        false,
        "ยืนยันตัวตนสำเร็จ แต่ใส่ยศไม่สำเร็จ (ตรวจสอบ Manage Roles และลำดับยศของบอท)"
      );
    }

    return sendResult(res, true, "ยืนยันตัวตนสำเร็จ", me.username);
  } catch (err) {
    console.error("OAuth callback error:", err);
    return sendResult(res, false, "เกิดข้อผิดพลาดที่ไม่คาดคิด");
  }
}

function decodeState(value) {
  // base64url -> base64
  let raw = String(value).replace(/-/g, "+").replace(/_/g, "/");
  while (raw.length % 4) raw += "=";

  const json = Buffer.from(raw, "base64").toString("utf8");
  const parsed = JSON.parse(json);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("state is not an object");
  }

  return parsed;
}

function sendResult(res, success, message, username) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${success ? "ยืนยันตัวตนสำเร็จ" : "ยืนยันตัวตนไม่สำเร็จ"}</title>
<style>
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#111318;color:#f4f5f7}
body{min-height:100vh;display:grid;place-items:center;padding:24px}
.card{width:min(420px,100%);background:#191c22;border:1px solid #292e37;border-radius:22px;padding:34px;text-align:center;box-shadow:0 20px 70px rgba(0,0,0,.35)}
.icon{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;margin:0 auto 18px;border:2px solid ${success ? "#3ddc97" : "#ff6262"};color:${success ? "#3ddc97" : "#ff6262"};font-size:30px}
h1{font-size:21px;margin:0 0 10px}
p{color:#9da3af;font-size:14px;line-height:1.7;margin:0}
.user{margin-top:20px;padding-top:18px;border-top:1px dashed #343943;color:#e5e7eb;font-size:13px}
</style>
</head>
<body>
<div class="card">
  <div class="icon">${success ? "✓" : "×"}</div>
  <h1>${success ? "ยืนยันตัวตนสำเร็จ" : "ยืนยันตัวตนไม่สำเร็จ"}</h1>
  <p>${escapeHtml(message)}</p>
  ${username ? `<div class="user">Discord: <b>${escapeHtml(username)}</b></div>` : ""}
</div>
</body>
</html>`);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
