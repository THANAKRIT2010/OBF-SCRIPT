// controllers/redeem.controller.js — ระบบโค้ดแลกรางวัล (เงินเข้ากระเป๋า / ลิงก์ / ข้อความลับ)
const { nanoid } = require("nanoid");
const { mutate, readDB } = require("../db");
const { checkRateLimit, getClientIp } = require("../utils/rateLimit");

function randomCode() {
  // รูปแบบอ่านง่าย พิมพ์ตามง่าย เช่น FLEX-7K2M9X
  return `FLEX-${nanoid(7).toUpperCase()}`;
}

// GET /api/redeem/codes — แอดมิน/ทีมงานที่มีสิทธิ์ "redeem" เห็นทั้งหมด
async function listCodes(req, res) {
  const db = await readDB();
  res.json([...db.redeem_codes].sort((a, b) => b.created_at - a.created_at));
}

// POST /api/redeem/codes — สร้างโค้ดใหม่
async function createCode(req, res) {
  const { code, reward_type, reward_value, max_uses } = req.body;
  if (!["wallet", "link", "message"].includes(reward_type)) {
    return res.status(400).json({ error: "invalid_reward_type" });
  }
  if (!reward_value || String(reward_value).trim() === "") {
    return res.status(400).json({ error: "missing_reward_value" });
  }
  if (reward_type === "wallet" && (isNaN(Number(reward_value)) || Number(reward_value) <= 0)) {
    return res.status(400).json({ error: "invalid_amount" });
  }
  const finalCode = (code && code.trim()) ? code.trim().toUpperCase() : randomCode();
  if (!/^[A-Z0-9-]{4,40}$/.test(finalCode)) {
    return res.status(400).json({ error: "invalid_code_format", message: "โค้ดใช้ได้เฉพาะตัวอักษร A-Z, ตัวเลข, และ - เท่านั้น" });
  }

  const result = await mutate((db) => {
    if (db.redeem_codes.some((c) => c.code === finalCode)) return { error: "duplicate_code" };
    const entry = {
      code: finalCode,
      reward_type,
      reward_value: reward_type === "wallet" ? Number(reward_value) : String(reward_value).slice(0, 2000),
      max_uses: max_uses ? Math.max(1, Number(max_uses)) : 1,
      used_by: [],
      active: true,
      created_by: req.session.user.discord_id,
      created_at: Math.floor(Date.now() / 1000),
    };
    db.redeem_codes.push(entry);
    return { entry };
  });
  if (result.error === "duplicate_code") return res.status(409).json({ error: "duplicate_code", message: "โค้ดนี้มีอยู่แล้ว" });
  res.status(201).json(result.entry);
}

// PUT /api/redeem/codes/:code — แก้ไข (เปิด/ปิดใช้งาน, เปลี่ยนจำนวนสิทธิ์)
async function updateCode(req, res) {
  const { code } = req.params;
  const updated = await mutate((db) => {
    const c = db.redeem_codes.find((c) => c.code === code);
    if (!c) return null;
    if (req.body.active !== undefined) c.active = !!req.body.active;
    if (req.body.max_uses !== undefined) c.max_uses = Math.max(1, Number(req.body.max_uses));
    return c;
  });
  if (!updated) return res.status(404).json({ error: "not_found" });
  res.json(updated);
}

// DELETE /api/redeem/codes/:code
async function deleteCode(req, res) {
  const { code } = req.params;
  const found = await mutate((db) => {
    const idx = db.redeem_codes.findIndex((c) => c.code === code);
    if (idx === -1) return false;
    db.redeem_codes.splice(idx, 1);
    return true;
  });
  if (!found) return res.status(404).json({ error: "not_found" });
  res.status(204).end();
}

// POST /api/redeem { code } — ผู้ใช้แลกโค้ด
async function redeemCode(req, res) {
  const rl = await checkRateLimit(`redeem:${getClientIp(req)}`, { limit: 15, windowSeconds: 300 });
  if (!rl.allowed) return res.status(429).json({ error: "too_many_requests", retry_after: rl.retryAfterSeconds });

  const raw = req.body.code;
  if (!raw || typeof raw !== "string") return res.status(400).json({ error: "missing_code" });
  const code = raw.trim().toUpperCase();
  const userId = req.session.user.discord_id;

  const result = await mutate((db) => {
    const entry = db.redeem_codes.find((c) => c.code === code);
    if (!entry) return { error: "not_found" };
    if (!entry.active) return { error: "inactive" };
    if (entry.used_by.includes(userId)) return { error: "already_used" };
    if (entry.used_by.length >= entry.max_uses) return { error: "exhausted" };

    entry.used_by.push(userId);

    if (entry.reward_type === "wallet") {
      const user = db.users[userId];
      user.balance = (user.balance || 0) + entry.reward_value;
      db.wallet_transactions.push({
        id: nanoid(10),
        user_id: userId,
        amount: entry.reward_value,
        type: "redeem_code",
        ref: code,
        created_at: Math.floor(Date.now() / 1000),
      });
      return { ok: true, reward_type: "wallet", amount: entry.reward_value, balance: user.balance };
    }

    return { ok: true, reward_type: entry.reward_type, value: entry.reward_value };
  });

  const errorMessages = {
    not_found: "ไม่พบโค้ดนี้ กรุณาตรวจสอบอีกครั้ง",
    inactive: "โค้ดนี้ถูกปิดใช้งานแล้ว",
    already_used: "คุณแลกโค้ดนี้ไปแล้ว ใช้ซ้ำไม่ได้",
    exhausted: "โค้ดนี้ถูกใช้ครบจำนวนสิทธิ์แล้ว",
  };
  if (result.error) return res.status(400).json({ error: result.error, message: errorMessages[result.error] });

  res.json(result);
}

module.exports = { listCodes, createCode, updateCode, deleteCode, redeemCode };
