// controllers/members.controller.js — ภาพรวมสมาชิกทั้งหมดที่เคย login เข้าเว็บ ให้แอดมินดูใน Admin > สมาชิก
const { readDB } = require("../db");
const { countOnline } = require("../middleware/onlineTracker");
const presenceService = require("../services/presenceService");

// GET /api/admin/members — ต้องมีสิทธิ์ 'members' (หรือแอดมินเต็ม)
async function listMembers(req, res) {
  const db = await readDB();
  const members = Object.values(db.users)
    .map((u) => ({
      discord_id: u.discord_id,
      username: u.username,
      handle: u.handle,
      avatar: u.avatar,
      avatar_decoration: u.avatar_decoration,
      badges: u.badges || [],
      is_admin: !!u.is_admin,
      first_seen: u.first_seen || null,
      last_seen: u.last_seen || null,
      presence: presenceService.getPresence(u.discord_id),
    }))
    .sort((a, b) => (b.last_seen || 0) - (a.last_seen || 0));

  res.json({
    total_members: members.length,
    online_now: countOnline(),
    members,
  });
}

module.exports = { listMembers };
