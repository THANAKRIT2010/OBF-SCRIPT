// controllers/settings.controller.js — ตั้งค่าเว็บไซต์ที่แอดมินปรับได้ (ไม่ต้องแก้โค้ด/redeploy)
const { mutate, readDB } = require("../db");

// key ทั่วไป จำกัดความยาว 500 ตัวอักษร
const EDITABLE_KEYS = [
  "site_name",
  "tagline",
  "logo_url",
  "discord_invite",
  "hero_note",
  "announcement_text", // *** แก้บั๊ก: เดิมขาดจาก whitelist นี้ ทำให้กดบันทึกป้ายประกาศแบบเลื่อนจากหน้าแอดมินไม่ได้ผลเลย ***
  "loading_image",
  "loading_text",
  "popup_image",
  "popup_title",
  "popup_code",
  "popup_desc",
  "popup_button_text",
  "popup_button_link",
];
// key ที่เป็น HTML/ข้อความยาวๆ ต้องการ limit สูงกว่าปกติมาก (เช่นหน้าปิดปรับปรุงทั้งหน้า)
const LONG_TEXT_KEYS = { maintenance_html: 50_000 };
const BOOLEAN_KEYS = ["popup_enabled", "maintenance_enabled"];

// GET /api/settings — public, frontend ใช้ตอนโหลดหน้าเว็บ
async function getSettings(req, res) {
  const db = await readDB();
  res.json(db.settings);
}

// PUT /api/settings — แอดมินเท่านั้น
async function updateSettings(req, res) {
  const updates = {};
  for (const key of EDITABLE_KEYS) {
    if (req.body[key] !== undefined) {
      updates[key] = String(req.body[key]).slice(0, 500);
    }
  }
  for (const [key, maxLen] of Object.entries(LONG_TEXT_KEYS)) {
    if (req.body[key] !== undefined) {
      updates[key] = String(req.body[key]).slice(0, maxLen);
    }
  }
  for (const key of BOOLEAN_KEYS) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key] === true || req.body[key] === "true" || req.body[key] === "1";
    }
  }
  const settings = await mutate((db) => {
    Object.assign(db.settings, updates);
    return db.settings;
  });
  res.json(settings);
}

module.exports = { getSettings, updateSettings };
