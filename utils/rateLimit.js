// utils/rateLimit.js — จำกัดจำนวนครั้งที่ทำ action หนึ่งๆ ได้ต่อช่วงเวลา (sliding-window แบบง่าย)
// ใช้ Redis (ตัวเดียวกับ db.js) เก็บตัวนับ กันสแปม/brute-force เช่น เดารหัสผ่าน vault
const { kv } = require("@vercel/kv");

// key ควรรวม "สิ่งที่จำกัด" (เช่น IP) + "action" (เช่น vault code) เพื่อแยกโควตาแต่ละคู่ออกจากกัน
// คืนค่า { allowed: boolean, remaining: number, retryAfterSeconds: number }
async function checkRateLimit(key, { limit = 8, windowSeconds = 300 } = {}) {
  const redisKey = `ratelimit:${key}`;
  try {
    const count = await kv.incr(redisKey);
    if (count === 1) {
      // ตั้งค่าหมดอายุแค่ครั้งแรกที่สร้าง key (กัน reset เวลานับใหม่ทุกครั้งที่ยิงซ้ำ)
      await kv.expire(redisKey, windowSeconds);
    }
    if (count > limit) {
      const ttl = await kv.ttl(redisKey);
      return { allowed: false, remaining: 0, retryAfterSeconds: ttl > 0 ? ttl : windowSeconds };
    }
    return { allowed: true, remaining: limit - count, retryAfterSeconds: 0 };
  } catch (err) {
    // ถ้า Redis ล่ม/ยังไม่ตั้งค่า — ปล่อยผ่านไปก่อน (ไม่ทำให้ฟีเจอร์หลักพังเพราะ rate limit เสีย)
    console.error("Rate limit check failed (allowing request through):", err.message);
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }
}

// ดึง IP จริงของผู้ใช้ (Vercel/รีเวิร์สพร็อกซีส่งมาใน x-forwarded-for)
function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

module.exports = { checkRateLimit, getClientIp };
