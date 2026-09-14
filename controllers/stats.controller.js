// controllers/stats.controller.js — สถิติ online / views / จำนวนสคริปต์ + กราฟย้อนหลัง
const { readDB } = require("../db");
const { countOnline } = require("../middleware/onlineTracker");
const { todayKey } = require("../middleware/dailyStats");

// GET /api/stats
async function getStats(req, res) {
  const db = await readDB();
  res.json({
    online_users: countOnline(),
    total_views: db.stats.total_views || 0,
    total_scripts: db.scripts.length,
    total_members: Object.keys(db.users).length,
  });
}

// GET /api/admin/stats/history — ต้องมีสิทธิ์ 'members', ใช้ทำกราฟวันนี้/รายเดือน/รายปีในหน้า Admin
async function getStatsHistory(req, res) {
  const db = await readDB();
  const daily = db.daily_stats || {};

  // 30 วันล่าสุด เรียงจากเก่าไปใหม่ (เติม 0 ให้วันที่ไม่มีข้อมูล กันกราฟขาดช่วง)
  const dailySeries = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailySeries.push({ date: key, count: daily[key] || 0 });
  }

  // รวมเป็นรายเดือน (12 เดือนล่าสุด) และรายปี จากข้อมูลรายวันทั้งหมดที่มี
  const monthlyMap = {}, yearlyMap = {};
  for (const [dateKey, count] of Object.entries(daily)) {
    const month = dateKey.slice(0, 7); // YYYY-MM
    const year = dateKey.slice(0, 4); // YYYY
    monthlyMap[month] = (monthlyMap[month] || 0) + count;
    yearlyMap[year] = (yearlyMap[year] || 0) + count;
  }
  const monthlySeries = Object.entries(monthlyMap).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, count]) => ({ month, count }));
  const yearlySeries = Object.entries(yearlyMap).sort(([a], [b]) => a.localeCompare(b)).map(([year, count]) => ({ year, count }));

  res.json({
    today: daily[todayKey()] || 0,
    daily: dailySeries,
    monthly: monthlySeries,
    yearly: yearlySeries,
  });
}

module.exports = { getStats, getStatsHistory };
