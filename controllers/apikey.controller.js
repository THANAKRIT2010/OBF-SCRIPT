// controllers/apikey.controller.js — ระบบขอ/อนุมัติ API key สำหรับ Slip Check API
const { nanoid } = require("nanoid");
const { readDB, mutate } = require("../db");
const { generateApiKey, hashApiKey } = require("../utils/apiKey");

function toPublicRow(k) {
  return {
    id: k.id,
    status: k.status,
    note: k.note,
    rate_limit_per_day: k.rate_limit_per_day,
    usage_count: k.usage_count || 0,
    requested_at: k.requested_at,
    approved_at: k.approved_at,
    key_prefix: k.key_prefix || null, // เช่น "flx_a1b2c3d4…" โชว์แค่บางส่วนพอให้จำได้ ไม่ใช่คีย์เต็ม
  };
}

// POST /api/apikey/request { note }
async function requestKey(req, res) {
  const userId = req.session.user.discord_id;
  const userName = req.session.user.username;
  const note = String(req.body?.note || "").slice(0, 300);

  const result = await mutate((db) => {
    const existing = db.api_keys.find((k) => k.user_id === userId && (k.status === "pending" || k.status === "approved"));
    if (existing) return { error: "already_requested", row: existing };
    const entry = {
      id: nanoid(10),
      user_id: userId,
      user_name: userName,
      key_hash: null,
      key_prefix: null,
      status: "pending",
      rate_limit_per_day: 0,
      note,
      requested_at: Math.floor(Date.now() / 1000),
      approved_at: null,
      approved_by: null,
      approved_by_name: null,
      usage_count: 0,
      revealed: false,
    };
    db.api_keys.push(entry);
    return { ok: true, row: entry };
  });

  if (result.error === "already_requested") {
    return res.status(409).json({ error: "already_requested", message: "คุณมีคำขอ/คีย์อยู่แล้ว ดูสถานะได้เลย", key: toPublicRow(result.row) });
  }
  res.status(201).json({ ok: true, key: toPublicRow(result.row) });
}

// GET /api/apikey/mine — ดูสถานะคำขอของตัวเอง (ถ้าเพิ่งอนุมัติและยังไม่เคยดู จะได้ plain key เต็มแค่ครั้งนี้ครั้งเดียว)
async function myKey(req, res) {
  const userId = req.session.user.discord_id;
  const db = await readDB();
  const row = [...db.api_keys].reverse().find((k) => k.user_id === userId);
  if (!row) return res.json({ key: null });

  if (row.status === "approved" && !row.revealed) {
    // เผยคีย์เต็มครั้งแรกที่ผู้ใช้มาดู แล้ว mark ว่าดูแล้วทันที (ครั้งต่อไปจะเห็นแค่ตัวย่อ)
    const revealResult = await mutate((d) => {
      const r = d.api_keys.find((k) => k.id === row.id);
      if (!r || r.revealed) return null;
      r.revealed = true;
      const plain = r._plain_once;
      delete r._plain_once;
      return plain;
    });
    const publicRow = toPublicRow(row);
    if (revealResult) publicRow.key_full = revealResult; // ส่ง plain key ให้ตอนนี้ครั้งเดียว
    return res.json({ key: publicRow });
  }
  res.json({ key: toPublicRow(row) });
}

// ===== Admin =====

// GET /api/admin/apikey/requests
async function adminList(req, res) {
  const db = await readDB();
  const list = [...db.api_keys].sort((a, b) => b.requested_at - a.requested_at).map((k) => ({
    id: k.id,
    user_id: k.user_id,
    user_name: k.user_name,
    status: k.status,
    note: k.note,
    rate_limit_per_day: k.rate_limit_per_day,
    usage_count: k.usage_count || 0,
    requested_at: k.requested_at,
    approved_at: k.approved_at,
    approved_by_name: k.approved_by_name,
    key_prefix: k.key_prefix,
  }));
  res.json(list);
}

// POST /api/admin/apikey/:id/approve { rate_limit_per_day }
async function adminApprove(req, res) {
  const { id } = req.params;
  const rateLimit = Math.max(1, Math.min(100000, parseInt(req.body?.rate_limit_per_day, 10) || 50));
  const plainKey = generateApiKey();
  const keyHash = hashApiKey(plainKey);

  const result = await mutate((db) => {
    const row = db.api_keys.find((k) => k.id === id);
    if (!row) return { error: "not_found" };
    row.status = "approved";
    row.key_hash = keyHash;
    row.key_prefix = plainKey.slice(0, 10) + "…";
    row.rate_limit_per_day = rateLimit;
    row.approved_at = Math.floor(Date.now() / 1000);
    row.approved_by = req.session.user.discord_id;
    row.approved_by_name = req.session.user.username;
    row.revealed = false;
    row._plain_once = plainKey; // เก็บชั่วคราวเพื่อให้เจ้าของคีย์ดูได้ครั้งแรก แล้วจะถูกลบทิ้งทันทีหลังดู (ดู myKey ด้านบน)
    return { ok: true };
  });

  if (result.error === "not_found") return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
}

// POST /api/admin/apikey/:id/reject
async function adminReject(req, res) {
  const { id } = req.params;
  const result = await mutate((db) => {
    const row = db.api_keys.find((k) => k.id === id);
    if (!row) return { error: "not_found" };
    row.status = "rejected";
    return { ok: true };
  });
  if (result.error === "not_found") return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
}

// POST /api/admin/apikey/:id/revoke — ปิดสิทธิ์คีย์ที่เคยอนุมัติไปแล้ว (ใช้เรียก API ต่อไม่ได้ทันที)
async function adminRevoke(req, res) {
  const { id } = req.params;
  const result = await mutate((db) => {
    const row = db.api_keys.find((k) => k.id === id);
    if (!row) return { error: "not_found" };
    row.status = "revoked";
    return { ok: true };
  });
  if (result.error === "not_found") return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
}

module.exports = { requestKey, myKey, adminList, adminApprove, adminReject, adminRevoke };
