// middleware/dailyStats.js — นับจำนวนคนเข้าเว็บต่อวัน (1 ครั้ง/เซสชัน/วัน) ใช้ทำกราฟวันนี้/รายเดือน/รายปีในหน้า Admin
// หมายเหตุ: express.static ดัก path "/" (index.html) ไว้ตั้งแต่ก่อนถึง session middleware แล้ว
// ดังนั้น middleware นี้จะเจอเฉพาะ request ที่ static เสิร์ฟไม่ได้ (ส่วนใหญ่คือ /api/* ที่ client ยิงตอนโหลดหน้าเว็บจริงเสมอ เช่น /api/me, /api/settings)
// จึงนับจากทุก request ที่มาถึงจุดนี้ได้เลย ไม่ต้องกรอง path เพิ่ม
const { mutate } = require("../db");

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC พอสำหรับสถิติภาพรวม)
}

async function trackDailyVisit(req, res, next) {
  const today = todayKey();
  if (req.session && req.session.lastVisitDate !== today) {
    req.session.lastVisitDate = today;
    await mutate((db) => {
      db.daily_stats[today] = (db.daily_stats[today] || 0) + 1;
    });
  }
  next();
}

module.exports = { trackDailyVisit, todayKey };
