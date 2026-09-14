// middleware/enforceBan.js — เตะผู้ใช้ที่โดนแบนออกทันที แม้ session เดิมจะยัง login ค้างอยู่ก็ตาม
const { readDB } = require("../db");

async function enforceBan(req, res, next) {
  const user = req.session?.user;
  if (user) {
    const db = await readDB();
    const banned = db.bans.find((b) => b.discord_id === user.discord_id);
    if (banned) {
      req.session = null; // cookie-session: ล้าง session ด้วยการตั้งเป็น null
      res.status(403).json({ error: "banned", reason: banned.reason });
      return;
    }
  }
  next();
}

module.exports = { enforceBan };
