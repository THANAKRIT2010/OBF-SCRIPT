// middleware/requireAuth.js — ใช้ครอบ route ที่ต้อง login ก่อนถึงเข้าได้
const { readDB } = require("../db");
const { ADMIN_DISCORD_IDS, ADMIN_ALLOWED_IPS, ADMIN_PANEL_PIN } = require("../config/env");
const { getClientIp } = require("../utils/rateLimit");

async function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "not_authenticated" });
  }
  next();
}

// requireAdmin — ใช้ครอบ route ที่แอดมินเต็ม (ADMIN_DISCORD_IDS) เท่านั้นเข้าได้
// *** สำคัญ: เช็คกับ ADMIN_DISCORD_IDS "สดๆ" ทุกครั้ง ไม่พึ่ง session.user.is_admin ที่ cache ไว้ตอน login อย่างเดียว ***
// เหตุผล: session เก็บในคุกกี้ (cookie-session) อยู่ได้นาน 7 วัน ถ้าแอดมินถูกถอดชื่อออกจาก ADMIN_DISCORD_IDS
// (เช่น ปลดสิทธิ์เพราะพนักงานลาออก/โดนแฮ็กบัญชี Discord) แต่ยังไม่ได้ logout เอง สิทธิ์แอดมินเดิมจะยังค้างอยู่ในคุกกี้
// จนกว่าจะหมดอายุ — เช็คสดจาก ENV ทุก request ปิดช่องโหว่นี้ทันทีที่ถอดชื่อออกจาก ENV แล้ว redeploy
function isCurrentAdmin(user) {
  return !!user && ADMIN_DISCORD_IDS.includes(user.discord_id);
}

async function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "not_authenticated" });
  }
  if (!isCurrentAdmin(req.session.user)) {
    return res.status(403).json({ error: "admin_only" });
  }
  // ชั้นเสริมที่ 1: จำกัด IP (ถ้าตั้งค่า ADMIN_ALLOWED_IPS ไว้)
  if (ADMIN_ALLOWED_IPS.length > 0 && !ADMIN_ALLOWED_IPS.includes(getClientIp(req))) {
    return res.status(403).json({ error: "ip_not_allowed", message: "IP นี้ไม่ได้รับอนุญาตให้เข้าหน้าแอดมิน" });
  }
  // ชั้นเสริมที่ 2: PIN รอง (ถ้าตั้งค่า ADMIN_PANEL_PIN ไว้) ต้องยืนยันผ่าน /api/admin/verify-pin ก่อน 1 ครั้ง/เซสชัน
  if (ADMIN_PANEL_PIN && !req.session.admin_pin_verified) {
    return res.status(403).json({ error: "pin_required", message: "กรุณายืนยันรหัส PIN เพิ่มเติมก่อนเข้าหน้าแอดมิน" });
  }
  next();
}

// hasPermission — เช็คสดจาก db.team ทุกครั้ง (ไม่พึ่ง session cache) เผื่อแอดมินเพิ่งเปลี่ยนสิทธิ์
// แอดมินเต็มผ่านเสมอ ไม่ต้องมีชื่ออยู่ในทีมงานก็ได้
async function hasPermission(user, permKey) {
  if (!user) return false;
  if (isCurrentAdmin(user)) return true;
  const db = await readDB();
  const member = db.team.find((m) => m.discord_id === user.discord_id);
  return !!member && Array.isArray(member.permissions) && member.permissions.includes(permKey);
}

// requirePermission(key) — ใช้ครอบ route ที่ต้องมีสิทธิ์ย่อยเฉพาะส่วน (หรือเป็นแอดมินเต็ม)
function requirePermission(permKey) {
  return async (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "not_authenticated" });
    }
    if (!(await hasPermission(req.session.user, permKey))) {
      return res.status(403).json({ error: "permission_denied", permission: permKey });
    }
    next();
  };
}

// requireStaff — ใช้ครอบ route ที่ทีมงานที่มีสิทธิ์ "อย่างใดอย่างหนึ่ง" ก็ใช้ได้ (เช่น อัปโหลดรูป)
async function requireStaff(req, res, next) {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: "not_authenticated" });
  if (isCurrentAdmin(user)) return next();
  const db = await readDB();
  const member = db.team.find((m) => m.discord_id === user.discord_id);
  if (member && Array.isArray(member.permissions) && member.permissions.length > 0) return next();
  return res.status(403).json({ error: "permission_denied" });
}

module.exports = requireAuth;
module.exports.requireAuth = requireAuth;
module.exports.requireAdmin = requireAdmin;
module.exports.hasPermission = hasPermission;
module.exports.requirePermission = requirePermission;
module.exports.requireStaff = requireStaff;
module.exports.isCurrentAdmin = isCurrentAdmin;
