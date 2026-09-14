// controllers/team.controller.js — จัดการรายชื่อทีมงาน/แอดมินที่โชว์หน้า "ทีมงาน"
// แอดมินกรอกแค่ Discord ID + ตำแหน่ง ระบบจะดึงชื่อ/รูปโปรไฟล์จาก Discord มาเองอัตโนมัติ
const { mutate, readDB } = require("../db");
const { buildProfile } = require("../utils/discordCdn");
const discordService = require("../services/discordService");
const presenceService = require("../services/presenceService");
const { PERMISSION_KEYS } = require("../utils/permissions");

function cleanPermissions(input) {
  if (!Array.isArray(input)) return undefined;
  return input.filter((p) => PERMISSION_KEYS.includes(p));
}

// GET /api/team — public, เรียงตาม order แล้วตามเวลาเพิ่ม พร้อมสถานะออนไลน์/กำลังเล่นเกมสดจาก Discord
async function listTeam(req, res) {
  const db = await readDB();
  const team = db.team
    .slice()
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.added_at - b.added_at)
    .map((m) => ({
      ...m,
      permissions: m.permissions || [],
      discord_profile_url: `https://discord.com/users/${m.discord_id}`,
      presence: presenceService.getPresence(m.discord_id),
    }));
  res.json(team);
}

// ดึงโปรไฟล์จาก Discord ด้วย ID แล้วแปลงเป็นรูปแบบที่ใช้ในระบบทีมงาน
async function fetchTeamProfile(discordId) {
  const discordUser = await discordService.fetchDiscordUserById(discordId);
  if (!discordUser) return null;
  const profile = buildProfile(discordUser);
  // แคชโปรไฟล์ไว้ใช้กับ /api/profile/:id (การ์ดโปรไฟล์) ด้วยเลย
  await mutate((db) => {
    db.users[profile.discord_id] = profile;
  });
  return profile;
}

// POST /api/team — แอดมินเท่านั้น กรอกแค่ discord_id + role (bio/order/permissions ไม่บังคับ) ชื่อ/รูปดึงจาก Discord อัตโนมัติ
async function addMember(req, res) {
  const { discord_id, role, bio, order, permissions } = req.body;
  if (!discord_id || !role) {
    return res.status(400).json({ error: "missing_fields" });
  }
  const cleanId = String(discord_id).trim();
  if (!/^\d{5,25}$/.test(cleanId)) {
    return res.status(400).json({ error: "invalid_discord_id" });
  }

  const db = await readDB();
  if (db.team.some((m) => m.discord_id === cleanId)) {
    return res.status(409).json({ error: "already_in_team" });
  }

  let profile;
  try {
    profile = await fetchTeamProfile(cleanId);
  } catch (err) {
    console.error("Fetch Discord profile failed:", err.message);
    return res.status(502).json({ error: "discord_unreachable" });
  }
  if (!profile) return res.status(404).json({ error: "discord_user_not_found" });

  const member = {
    discord_id: cleanId,
    username: profile.username,
    handle: profile.handle,
    avatar: profile.avatar,
    avatar_decoration: profile.avatar_decoration,
    role: String(role).slice(0, 40), // เช่น "ผู้ก่อตั้ง", "แอดมิน", "ผู้ดูแล", "นักพัฒนา"
    bio: bio ? String(bio).slice(0, 200) : "",
    order: Number.isFinite(Number(order)) ? Number(order) : 999,
    permissions: cleanPermissions(permissions) || [], // สิทธิ์ย่อยที่จัดการหลังบ้านได้ เช่น ['scripts','roblox']
    added_at: Math.floor(Date.now() / 1000),
  };

  const result = await mutate((db2) => {
    if (db2.team.some((m) => m.discord_id === member.discord_id)) {
      return { ok: false, code: 409 };
    }
    db2.team.push(member);
    return { ok: true };
  });

  if (!result.ok) return res.status(result.code).json({ error: "already_in_team" });
  res.status(201).json(member);
}

// PATCH /api/team/:discord_id — แอดมินเท่านั้น แก้ role/bio/order/permissions ได้ (ชื่อ/รูปมาจาก Discord เสมอ ใช้ refresh แทน)
async function updateMember(req, res) {
  const { role, bio, order, permissions } = req.body;
  const result = await mutate((db) => {
    const m = db.team.find((m) => m.discord_id === req.params.discord_id);
    if (!m) return null;
    if (role !== undefined) m.role = String(role).slice(0, 40);
    if (bio !== undefined) m.bio = String(bio).slice(0, 200);
    if (order !== undefined && Number.isFinite(Number(order))) m.order = Number(order);
    const cleaned = cleanPermissions(permissions);
    if (cleaned !== undefined) m.permissions = cleaned;
    return m;
  });
  if (!result) return res.status(404).json({ error: "not_found" });
  res.json(result);
}

// POST /api/team/:discord_id/refresh — แอดมินเท่านั้น ดึงชื่อ/รูปล่าสุดจาก Discord มาอัปเดตทับของเดิม
async function refreshMember(req, res) {
  const discordId = req.params.discord_id;
  const db = await readDB();
  if (!db.team.some((m) => m.discord_id === discordId)) {
    return res.status(404).json({ error: "not_found" });
  }

  let profile;
  try {
    profile = await fetchTeamProfile(discordId);
  } catch (err) {
    console.error("Refresh Discord profile failed:", err.message);
    return res.status(502).json({ error: "discord_unreachable" });
  }
  if (!profile) return res.status(404).json({ error: "discord_user_not_found" });

  const result = await mutate((db2) => {
    const m = db2.team.find((m) => m.discord_id === discordId);
    if (!m) return null;
    m.username = profile.username;
    m.handle = profile.handle;
    m.avatar = profile.avatar;
    m.avatar_decoration = profile.avatar_decoration;
    return m;
  });
  if (!result) return res.status(404).json({ error: "not_found" });
  res.json(result);
}

// DELETE /api/team/:discord_id — แอดมินเท่านั้น
async function removeMember(req, res) {
  await mutate((db) => {
    db.team = db.team.filter((m) => m.discord_id !== req.params.discord_id);
  });
  res.status(204).end();
}

module.exports = { listTeam, addMember, updateMember, refreshMember, removeMember };
