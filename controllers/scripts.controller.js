// controllers/scripts.controller.js — เพิ่ม/ลบ/ไลก์/คอมเมนต์สคริปต์
const { nanoid } = require("nanoid");
const { mutate, readDB } = require("../db");
const { hasPermission } = require("../middleware/requireAuth");
const { notifyEvent } = require("../services/notifyService");

// GET /api/scripts — ดึงรายการทั้งหมด พร้อมเสริมข้อมูลโปรไฟล์ผู้เขียนล่าสุด (avatar decoration, banner, badge)
async function listScripts(req, res) {
  const db = await mutate((d) => {
    d.stats.total_views = (d.stats.total_views || 0) + 1;
    return d;
  });

  const enriched = db.scripts
    .slice()
    .sort((a, b) => b.created_at - a.created_at)
    .map((s) => {
      const profile = db.users[s.author_id];
      return {
        ...s,
        author_avatar: profile?.avatar || s.author_avatar,
        author_avatar_decoration: profile?.avatar_decoration || null,
        author_banner: profile?.banner || null,
        author_badges: profile?.badges || [],
      };
    });
  res.json(enriched);
}

// POST /api/scripts/user_add — ต้อง login
async function addScript(req, res) {
  const { title, game, image, script, key_system } = req.body;
  if (!title || !game || !script) {
    return res.status(400).json({ error: "missing_fields" });
  }
  const user = req.session.user;

  const newScript = {
    id: nanoid(10),
    title: String(title).slice(0, 120),
    game: String(game).slice(0, 60),
    image: image || "",
    script: String(script).slice(0, 50_000),
    key_system: !!key_system,
    author: user.username,
    author_id: user.discord_id,
    author_avatar: user.avatar,
    likes: 0,
    liked_by: [],
    comments: [],
    created_at: Math.floor(Date.now() / 1000),
  };

  await mutate((db) => db.scripts.push(newScript));

  notifyEvent("script_new", {
    title: "📜 มีสคริปต์ใหม่ถูกโพสต์",
    description: newScript.title,
    fields: [
      { name: "เกม", value: newScript.game, inline: true },
      { name: "ผู้โพสต์", value: newScript.author, inline: true },
    ],
  }).catch((e) => console.error("notifyEvent failed:", e.message));

  res.status(201).json(newScript);
}

// PATCH /api/scripts/:id — เจ้าของสคริปต์หรือแอดมินเท่านั้น แก้ได้ทุก field
async function updateScript(req, res) {
  const user = req.session.user;
  const { title, game, image, script, key_system } = req.body;

  const result = await mutate(async (db) => {
    const s = db.scripts.find((s) => s.id === req.params.id);
    if (!s) return { ok: false, code: 404 };
    if (s.author_id !== user.discord_id && !(await hasPermission(user, "scripts"))) {
      return { ok: false, code: 403 };
    }
    if (title !== undefined) s.title = String(title).slice(0, 120);
    if (game !== undefined) s.game = String(game).slice(0, 60);
    if (image !== undefined) s.image = image;
    if (script !== undefined) s.script = String(script).slice(0, 50_000);
    if (key_system !== undefined) s.key_system = !!key_system;
    return { ok: true, script: s };
  });

  if (!result.ok) return res.status(result.code).json({ error: "cannot_update" });
  res.json(result.script);
}

// DELETE /api/scripts/:id — เจ้าของสคริปต์หรือแอดมินเท่านั้น
async function deleteScript(req, res) {
  const user = req.session.user;
  const result = await mutate(async (db) => {
    const idx = db.scripts.findIndex((s) => s.id === req.params.id);
    if (idx === -1) return { ok: false, code: 404 };
    const s = db.scripts[idx];
    if (s.author_id !== user.discord_id && !(await hasPermission(user, "scripts"))) {
      return { ok: false, code: 403 };
    }
    db.scripts.splice(idx, 1);
    return { ok: true };
  });
  if (!result.ok) return res.status(result.code).json({ error: "cannot_delete" });
  res.status(204).end();
}

// POST /api/scripts/:id/like — กันไลก์ซ้ำด้วย discord_id จริง (ไม่ใช่แค่ localStorage ฝั่ง client)
async function likeScript(req, res) {
  const user = req.session.user;
  const result = await mutate((db) => {
    const s = db.scripts.find((s) => s.id === req.params.id);
    if (!s) return null;
    s.liked_by = s.liked_by || [];
    if (s.liked_by.includes(user.discord_id)) {
      return { likes: s.likes, already: true };
    }
    s.liked_by.push(user.discord_id);
    s.likes = (s.likes || 0) + 1;
    return { likes: s.likes, already: false };
  });
  if (!result) return res.status(404).json({ error: "not_found" });
  res.json({ success: true, ...result });
}

// POST /api/scripts/:id/comment
async function commentScript(req, res) {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: "empty_message" });
  const user = req.session.user;

  const comments = await mutate((db) => {
    const s = db.scripts.find((s) => s.id === req.params.id);
    if (!s) return null;
    s.comments = s.comments || [];
    s.comments.push({
      id: nanoid(8),
      author: user.username,
      author_id: user.discord_id,
      avatar: user.avatar,
      message: String(message).slice(0, 500),
      created_at: Math.floor(Date.now() / 1000),
    });
    return s.comments;
  });
  if (!comments) return res.status(404).json({ error: "not_found" });
  res.json({ success: true, comments });
}

module.exports = { listScripts, addScript, updateScript, deleteScript, likeScript, commentScript };
