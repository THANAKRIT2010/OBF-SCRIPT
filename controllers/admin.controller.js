// controllers/admin.controller.js — PIN ชั้นที่สองสำหรับเข้าหน้าแอดมิน + ดู audit log
const { readDB } = require("../db");
const { ADMIN_PANEL_PIN } = require("../config/env");
const { checkRateLimit, getClientIp } = require("../utils/rateLimit");
const { isCurrentAdmin } = require("../middleware/requireAuth");

// POST /api/admin/verify-pin { pin } — ต้อง login และเป็นแอดมินอยู่แล้ว (requireAuth ครอบไว้)
// จำกัดจำนวนครั้งที่ลองผิดได้อย่างเข้มงวด กัน brute-force เดา PIN (ถึงจะสั้นก็ตาม)
async function verifyPin(req, res) {
  if (!isCurrentAdmin(req.session.user)) {
    return res.status(403).json({ error: "admin_only" });
  }
  if (!ADMIN_PANEL_PIN) {
    return res.status(400).json({ error: "pin_not_configured", message: "เว็บนี้ยังไม่ได้เปิดใช้ PIN ชั้นที่สอง" });
  }
  const rl = await checkRateLimit(`admin-pin:${getClientIp(req)}:${req.session.user?.discord_id}`, {
    limit: 5,
    windowSeconds: 900,
  });
  if (!rl.allowed) {
    return res.status(429).json({ error: "too_many_requests", retry_after: rl.retryAfterSeconds });
  }

  const { pin } = req.body;
  if (!pin || String(pin) !== String(ADMIN_PANEL_PIN)) {
    return res.status(401).json({ error: "wrong_pin", message: "PIN ไม่ถูกต้อง" });
  }
  req.session.admin_pin_verified = true;
  res.json({ ok: true });
}

// GET /api/admin/audit-log — ดูย้อนหลังว่าแอดมิน/ทีมงานคนไหนทำอะไรไปบ้าง (requireAdmin เท่านั้น)
async function getAuditLog(req, res) {
  const db = await readDB();
  const list = [...db.admin_audit_log].sort((a, b) => b.created_at - a.created_at).slice(0, 300);
  res.json(list);
}

module.exports = { verifyPin, getAuditLog };
