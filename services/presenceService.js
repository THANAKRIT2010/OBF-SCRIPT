// services/presenceService.js — ต่อ Discord Gateway (WebSocket) เพื่อดึงสถานะออนไลน์/กำลังเล่นเกมอะไรอยู่ ของทีมงาน
// ต้องใช้ Bot token ที่เปิด "Presence Intent" และ "Server Members Intent" ในหน้า Discord Developer Portal
// (Bot > Privileged Gateway Intents) ไว้ด้วย ไม่งั้น Gateway จะปฏิเสธการเชื่อมต่อ
// ถ้าไม่ได้ตั้งค่า Bot token/Guild ID ไว้ ระบบจะข้ามฟีเจอร์นี้ไปเฉยๆ ไม่กระทบส่วนอื่นของเว็บ
const { Client, GatewayIntentBits } = require("discord.js");
const { discord } = require("../config/env");

let client = null;
let ready = false;
const presenceCache = new Map(); // discord_id -> { status, activities: [{type,name,details,state}] }

const ACTIVITY_TYPE_LABELS = {
  0: "กำลังเล่น",
  1: "กำลังสตรีม",
  2: "กำลังฟัง",
  3: "กำลังดู",
  4: "สถานะ",
  5: "กำลังแข่ง",
};

function cacheFromPresence(presence) {
  if (!presence || !presence.userId) return;
  const activities = (presence.activities || []).map((a) => ({
    type: a.type,
    type_label: ACTIVITY_TYPE_LABELS[a.type] || "กำลังทำ",
    name: a.name || "",
    details: a.details || null,
    state: a.state || null,
  }));
  presenceCache.set(presence.userId, { status: presence.status || "offline", activities });
}

function start() {
  if (!discord.botToken || !discord.guildId) return;

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMembers,
    ],
  });

  client.once("ready", async () => {
    ready = true;
    console.log(`✅ Presence service เชื่อมต่อ Discord Gateway แล้ว (${client.user.tag})`);
    try {
      const guild = await client.guilds.fetch(discord.guildId);
      const members = await guild.members.fetch(); // ดึงสมาชิกทั้งหมดพร้อม presence ตอนเริ่มระบบ
      members.forEach((m) => cacheFromPresence(m.presence));
    } catch (err) {
      console.warn("⚠️  ดึงรายชื่อสมาชิกเซิร์ฟเวอร์เริ่มต้นไม่สำเร็จ:", err.message);
    }
  });

  client.on("presenceUpdate", (_old, presence) => {
    if (!presence || presence.guild?.id !== discord.guildId) return;
    cacheFromPresence(presence);
  });

  client.on("error", (err) => console.error("Presence gateway error:", err.message));
  client.on("shardError", (err) => console.error("Presence gateway shard error:", err.message));

  client.login(discord.botToken).catch((err) => {
    console.warn(
      "⚠️  เชื่อมต่อ Discord Gateway ไม่สำเร็จ (ฟีเจอร์ออนไลน์/กำลังเล่นเกมจะไม่ทำงาน) — ตรวจสอบว่าเปิด Presence Intent + Server Members Intent ในหน้า Discord Developer Portal แล้วหรือยัง:",
      err.message
    );
  });
}

// getPresence(discordId) — คืนสถานะล่าสุดที่แคชไว้ หรือ null ถ้าระบบยังไม่พร้อม/ไม่ได้ตั้งค่า
function getPresence(discordId) {
  if (!ready) return null;
  return presenceCache.get(discordId) || { status: "offline", activities: [] };
}

function isReady() {
  return ready;
}

function getClient() {
  return ready ? client : null;
}

module.exports = { start, getPresence, isReady, getClient };
