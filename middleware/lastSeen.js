// middleware/lastSeen.js — อัปเดตเวลา "เข้าเว็บล่าสุด" ของผู้ใช้ที่ login ไว้ ใช้โชว์ในหน้าแอดมิน > สมาชิก
// throttle ไว้ที่คนละ 60 วินาที กันเขียนไฟล์ถี่เกินไปทุก request
const { mutate } = require("../db");

const lastWrite = new Map(); // discord_id -> timestamp (ms) ที่เขียนลง db ครั้งล่าสุด
const THROTTLE_MS = 60_000;

async function trackLastSeen(req, res, next) {
  const user = req.session?.user;
  if (user) {
    const now = Date.now();
    const last = lastWrite.get(user.discord_id) || 0;
    if (now - last > THROTTLE_MS) {
      lastWrite.set(user.discord_id, now);
      await mutate((db) => {
        const existing = db.users[user.discord_id];
        db.users[user.discord_id] = {
          ...(existing || user),
          first_seen: existing?.first_seen || Math.floor(now / 1000),
          last_seen: Math.floor(now / 1000),
        };
      });
    }
  }
  next();
}

module.exports = { trackLastSeen };
