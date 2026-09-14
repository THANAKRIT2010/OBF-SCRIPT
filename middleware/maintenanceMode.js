// middleware/maintenanceMode.js — เช็คว่าเปิดโหมดปิดปรับปรุงเว็บอยู่ไหม ถ้าเปิดให้โชว์หน้า HTML ที่แอดมินใส่เองแทนเว็บจริง
// ทีมงาน/แอดมิน (ที่ login แล้ว) ยังเข้าเว็บจริงได้ตามปกติ เพื่อให้ปิดโหมดนี้เองได้จากหน้าแอดมิน
const { readDB } = require("../db");

// path ที่ต้องปล่อยผ่านเสมอ แม้เปิดโหมดปิดปรับปรุงอยู่ก็ตาม (ไม่งั้นจะปิดปรับปรุงตัวเองไม่ได้เลย)
const ALWAYS_ALLOWED_PREFIXES = ["/api/", "/login/", "/callback/", "/logout"];

async function maintenanceGate(req, res, next) {
  // เฉพาะ request ที่ต้องการหน้า HTML เท่านั้น (ไม่แตะ API/ไฟล์ static เช่น .css .js .png)
  if (req.method !== "GET" || !req.accepts("html")) return next();
  if (ALWAYS_ALLOWED_PREFIXES.some((p) => req.path.startsWith(p))) return next();
  if (/\.[a-zA-Z0-9]+$/.test(req.path)) return next(); // มีนามสกุลไฟล์ (css/js/png/...) ปล่อยผ่านเสมอ

  const db = await readDB();
  if (!db.settings.maintenance_enabled) return next();

  // ทีมงาน/แอดมินที่ login อยู่แล้ว ให้เข้าเว็บจริงได้ตามปกติ (เช็คจาก session ไม่ต้อง query ซ้ำ)
  const user = req.session.user;
  if (user && (user.is_admin || (user.permissions && user.permissions.length > 0))) return next();
  // เผื่อ session เก็บโปรไฟล์เก่าไว้ (ไม่มี permissions ติดมา) เช็คจาก db ให้ชัวร์อีกชั้นสำหรับ is_admin
  if (user && db.users[user.discord_id]?.is_admin) return next();

  const customHtml = db.settings.maintenance_html && db.settings.maintenance_html.trim();
  res.status(503).set("Retry-After", "3600").send(
    customHtml ||
      `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
      <title>ปิดปรับปรุงชั่วคราว</title>
      <style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#04050A;color:#F1F5F9;font-family:sans-serif;text-align:center;padding:20px}
      h1{font-size:22px;margin-bottom:8px}p{color:#94A3B8;font-size:13px}</style></head>
      <body><div><h1>⚙️ กำลังปิดปรับปรุงระบบ</h1><p>ขออภัยในความไม่สะดวก กรุณากลับมาใหม่อีกครั้งในภายหลัง</p></div></body></html>`
  );
}

module.exports = { maintenanceGate };
