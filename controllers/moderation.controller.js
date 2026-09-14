// controllers/moderation.controller.js — ระบบรายงาน + แบนผู้ใช้ (โครงสร้าง V2)
const { nanoid } = require("nanoid");
const { mutate, readDB } = require("../db");
const { notifyEvent, sendDM } = require("../services/notifyService");

const REPORT_TYPES = ["script", "vault", "user"];

// POST /api/reports — ผู้ใช้ที่ login แล้วรายงานได้ (สคริปต์ / ลิงก์ vault / ผู้ใช้)
async function createReport(req, res) {
  const { type, target_id, target_label, reason } = req.body;
  if (!REPORT_TYPES.includes(type) || !target_id || !reason || !String(reason).trim()) {
    return res.status(400).json({ error: "missing_fields" });
  }
  const user = req.session.user;
  const report = {
    id: nanoid(10),
    type,
    target_id: String(target_id).slice(0, 100),
    target_label: target_label ? String(target_label).slice(0, 150) : "",
    reason: String(reason).slice(0, 500),
    reporter_id: user.discord_id,
    reporter_name: user.username,
    status: "open",
    created_at: Math.floor(Date.now() / 1000),
  };
  await mutate((db) => db.reports.push(report));

  notifyEvent("report_new", {
    title: "🚩 มีรายงานเข้ามาใหม่",
    description: report.reason,
    fields: [
      { name: "ประเภท", value: type, inline: true },
      { name: "เป้าหมาย", value: report.target_label || report.target_id, inline: true },
      { name: "ผู้รายงาน", value: report.reporter_name, inline: true },
    ],
  }).catch((e) => console.error("notifyEvent failed:", e.message));

  res.status(201).json(report);
}

// GET /api/admin/reports — ต้องมีสิทธิ์ 'moderation'
async function listReports(req, res) {
  const db = await readDB();
  const reports = db.reports.slice().sort((a, b) => b.created_at - a.created_at);
  res.json(reports);
}

// PATCH /api/admin/reports/:id — เปลี่ยนสถานะ (resolved/dismissed)
async function updateReport(req, res) {
  const { status } = req.body;
  if (!["open", "resolved", "dismissed"].includes(status)) {
    return res.status(400).json({ error: "invalid_status" });
  }
  const result = await mutate((db) => {
    const r = db.reports.find((r) => r.id === req.params.id);
    if (!r) return null;
    r.status = status;
    return r;
  });
  if (!result) return res.status(404).json({ error: "not_found" });
  res.json(result);
}

// DELETE /api/admin/reports/:id
async function removeReport(req, res) {
  await mutate((db) => {
    db.reports = db.reports.filter((r) => r.id !== req.params.id);
  });
  res.status(204).end();
}

// GET /api/admin/bans
async function listBans(req, res) {
  const db = await readDB();
  res.json(db.bans.slice().sort((a, b) => b.banned_at - a.banned_at));
}

// POST /api/admin/bans — แบนผู้ใช้ + แจ้งเตือน webhook + ส่ง DM หาคนโดนแบน
async function banUser(req, res) {
  const { discord_id, reason } = req.body;
  if (!discord_id || !reason || !String(reason).trim()) {
    return res.status(400).json({ error: "missing_fields" });
  }
  const admin = req.session.user;
  const db = await readDB();
  if (db.bans.some((b) => b.discord_id === discord_id)) {
    return res.status(409).json({ error: "already_banned" });
  }
  const profile = db.users[discord_id];
  const ban = {
    discord_id,
    username: profile?.username || discord_id,
    reason: String(reason).slice(0, 300),
    banned_by: admin.discord_id,
    banned_by_name: admin.username,
    banned_at: Math.floor(Date.now() / 1000),
  };
  await mutate((db2) => db2.bans.push(ban));

  notifyEvent("user_banned", {
    title: "⛔ มีการแบนผู้ใช้",
    description: `**${ban.username}** ถูกแบนโดย ${admin.username}`,
    fields: [{ name: "เหตุผล", value: ban.reason }],
  }).catch((e) => console.error("notifyEvent failed:", e.message));

  sendDM(discord_id, {
    title: "⛔ บัญชีของคุณถูกระงับการใช้งาน",
    description: `เหตุผล: ${ban.reason}`,
    color: 0xef4444,
    fields: [{ name: "หากคิดว่าเป็นความผิดพลาด", value: "สามารถติดต่อทีมงานได้" }],
  }).catch((e) => console.error("sendDM failed:", e.message));

  res.status(201).json(ban);
}

// DELETE /api/admin/bans/:discord_id — ปลดแบน
async function unbanUser(req, res) {
  await mutate((db) => {
    db.bans = db.bans.filter((b) => b.discord_id !== req.params.discord_id);
  });
  res.status(204).end();
}

module.exports = { createReport, listReports, updateReport, removeReport, listBans, banUser, unbanUser };
