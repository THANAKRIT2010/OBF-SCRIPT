// services/discordService.js — จุดเดียวที่คุยกับ Discord API ทั้งหมด (OAuth exchange, fetch profile, join guild)
const axios = require("axios");
const crypto = require("crypto");
const { discord, FRONTEND_URL } = require("../config/env");
const { AUTHORIZE_URL, TOKEN_URL, API_BASE, OAUTH_SCOPES } = require("../config/discord");

// สร้าง URL สำหรับพาผู้ใช้ไป login ที่ Discord พร้อม state กัน CSRF
function buildAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: discord.clientId,
    redirect_uri: discord.redirectUri,
    response_type: "code",
    scope: OAUTH_SCOPES,
    state,
    prompt: "consent",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

function generateState() {
  return crypto.randomBytes(16).toString("hex");
}

// แลก authorization code เป็น access_token
async function exchangeCodeForToken(code) {
  const res = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      client_id: discord.clientId,
      client_secret: discord.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: discord.redirectUri,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return res.data.access_token;
}

// ดึงข้อมูลผู้ใช้เต็มๆ (สำหรับ avatar, avatar_decoration_data, banner, public_flags)
async function fetchDiscordUser(accessToken) {
  const res = await axios.get(`${API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data;
}

// ดึงข้อมูลผู้ใช้จาก Discord ID ตรงๆ ผ่าน Bot token (ไม่ต้องให้เจ้าตัว login เอง)
// ใช้ตอนแอดมินเพิ่มทีมงาน — กรอกแค่ ID แล้วระบบไปดึงชื่อ/รูปโปรไฟล์มาเอง
async function fetchDiscordUserById(discordId) {
  if (!discord.botToken) {
    throw new Error("missing_bot_token");
  }
  const res = await axios.get(`${API_BASE}/users/${discordId}`, {
    headers: { Authorization: `Bot ${discord.botToken}` },
    validateStatus: () => true,
    timeout: 8000,
  });
  if (res.status === 404) return null;
  if (res.status !== 200) {
    throw new Error(`discord_api_${res.status}`);
  }
  return res.data;
}

// เพิ่มผู้ใช้เข้าเซิร์ฟเวอร์ทันทีหลัง login (ต้องมี Bot อยู่ในเซิร์ฟเวอร์ + สิทธิ์ Create Instant Invite)
// คืนค่า true ถ้าสำเร็จ (หรืออยู่ในเซิร์ฟเวอร์อยู่แล้ว), false ถ้าพลาด (ไม่ throw กัน login ล้มทั้ง flow)
async function autoJoinGuild(discordUserId, userAccessToken) {
  if (!discord.botToken || !discord.guildId) return false;
  try {
    await axios.put(
      `${API_BASE}/guilds/${discord.guildId}/members/${discordUserId}`,
      { access_token: userAccessToken },
      { headers: { Authorization: `Bot ${discord.botToken}` } }
    );
    return true; // 201 = เพิ่มใหม่, 204 = อยู่แล้ว — axios ถือว่าสำเร็จทั้งคู่
  } catch (err) {
    console.error("Auto-join guild failed:", err.response?.data || err.message);
    return false;
  }
}

module.exports = {
  buildAuthorizeUrl,
  generateState,
  exchangeCodeForToken,
  fetchDiscordUser,
  fetchDiscordUserById,
  autoJoinGuild,
  FRONTEND_URL,
};
