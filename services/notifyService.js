const axios = require("axios");
const { readDB } = require("../db");
const presenceService = require("./presenceService");

const NOTIFY_EVENTS = [
  { key: "script_new", label: "มีสคริปต์ใหม่ถูกโพสต์", color: 0x2563eb },
  { key: "vault_new", label: "มีคนฝากสคริปต์ผ่าน Vault", color: 0x0ea5e9 },
  { key: "partner_new", label: "มีพาร์ทเนอร์ใหม่", color: 0x8b5cf6 },
  { key: "report_new", label: "มีรายงานเข้ามาใหม่", color: 0xf59e0b },
  { key: "user_banned", label: "มีการแบนผู้ใช้", color: 0xef4444 },
  { key: "member_new", label: "มีสมาชิกใหม่ล็อกอินเข้าเว็บครั้งแรก", color: 0x22c55e },
  { key: "roblox_copied", label: "มีคนคัดลอก Roblox ID", color: 0x38bdf8 },
];
const NOTIFY_EVENT_KEYS = NOTIFY_EVENTS.map((e) => e.key);

const IS_COMPONENTS_V2 = 1 << 15;

function buildComponentsV2({ title, description, fields, color }) {
  const lines = [`## ${title || "แจ้งเตือน"}`];
  if (description) lines.push(description);
  for (const f of fields || []) lines.push(`**${f.name}:** ${f.value}`);
  lines.push(`-# Flexozy • <t:${Math.floor(Date.now() / 1000)}:R>`);

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        accent_color: color ?? 0x2563eb,
        components: [{ type: 10, content: lines.join("\n") }],
      },
    ],
  };
}

async function notifyEvent(eventKey, { title, description, fields } = {}) {
  const db = await readDB();
  const eventDef = NOTIFY_EVENTS.find((e) => e.key === eventKey);
  const targets = db.webhooks.filter(
    (w) => Array.isArray(w.events) && (w.events.includes("all") || w.events.includes(eventKey))
  );
  if (!targets.length) return;

  const payload = buildComponentsV2({ title: title || eventDef?.label, description, fields, color: eventDef?.color });

  await Promise.allSettled(
    targets.map((w) =>
      axios.post(w.url, payload).catch((err) => {
        console.warn(`⚠️  ส่งแจ้งเตือนไป webhook "${w.name || w.id}" ไม่สำเร็จ:`, err.response?.status || err.message);
      })
    )
  );
}

async function sendDM(discordId, { title, description, fields, color }) {
  const client = presenceService.getClient();
  if (!client) return false;
  try {
    const user = await client.users.fetch(discordId);
    await user.send(buildComponentsV2({ title, description, fields, color }));
    return true;
  } catch (err) {
    console.warn(`⚠️  ส่ง DM หา ${discordId} ไม่สำเร็จ (อาจปิดรับ DM จากคนที่ไม่รู้จัก):`, err.message);
    return false;
  }
}

module.exports = { NOTIFY_EVENTS, NOTIFY_EVENT_KEYS, notifyEvent, sendDM };
