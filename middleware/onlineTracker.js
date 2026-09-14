// middleware/onlineTracker.js — นับผู้ใช้ที่ active ในเว็บช่วง 60 วินาทีล่าสุด จาก session ID
const activeSessions = new Map(); // sessionID -> timestamp ล่าสุดที่เห็น

function trackSession(req, res, next) {
  activeSessions.set(req.sessionID, Date.now());
  next();
}

function countOnline() {
  const now = Date.now();
  let count = 0;
  for (const [sid, ts] of activeSessions) {
    if (now - ts < 60_000) count++;
    else activeSessions.delete(sid);
  }
  return Math.max(count, 1);
}

module.exports = { trackSession, countOnline };
