// middleware/adminAudit.js — บันทึกย้อนหลังว่าแอดมิน/ทีมงานคนไหน ทำอะไร (endpoint ไหน) เมื่อไหร่ ผลลัพธ์เป็นยังไง
// ใช้เป็นชั้นป้องกัน "accountability" — ถ้ามีการเปลี่ยนแปลงข้อมูลผิดปกติ (เช่น แบนมั่ว/ลบของคนอื่น/เพิ่มเครดิตให้ตัวเอง)
// จะสืบย้อนกลับได้ว่าเกิดจากบัญชีไหน ไม่ใช่แค่เชื่อ log ฝั่ง Discord OAuth เพียงอย่างเดียว
// ดูผ่าน GET /api/admin/audit-log (ต้องเป็นแอดมินเต็มเท่านั้น)
const { nanoid } = require("nanoid");
const { mutate } = require("../db");
const { isCurrentAdmin } = require("./requireAuth");
const { getClientIp } = require("../utils/rateLimit");

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAX_LOG_ENTRIES = 1000;

function adminAudit(req, res, next) {
  res.on("finish", () => {
    try {
      const user = req.session && req.session.user;
      if (!user) return;
      if (!MUTATING_METHODS.has(req.method)) return;
      if (!req.path.startsWith("/api/")) return;
      // เฉพาะแอดมินเต็ม หรือทีมงานที่มีสิทธิ์บางอย่าง (คนทั่วไปแก้แค่ของตัวเองไม่ต้องบันทึก กันข้อมูล log บวมเกินจำเป็น)
      const isStaffish = isCurrentAdmin(user) || (Array.isArray(user.permissions) && user.permissions.length > 0);
      if (!isStaffish) return;

      const entry = {
        id: nanoid(10),
        actor_id: user.discord_id,
        actor_name: user.username,
        method: req.method,
        path: req.originalUrl.split("?")[0],
        status: res.statusCode,
        ip: getClientIp(req),
        created_at: Math.floor(Date.now() / 1000),
      };

      // ไม่ await ตรงนี้ (เพราะอยู่หลัง response ถูกส่งแล้ว) แต่ยังต้องดัก error กันหลุดเป็น unhandled rejection
      mutate((db) => {
        db.admin_audit_log.push(entry);
        if (db.admin_audit_log.length > MAX_LOG_ENTRIES) {
          db.admin_audit_log.splice(0, db.admin_audit_log.length - MAX_LOG_ENTRIES);
        }
      }).catch((e) => console.error("adminAudit log failed:", e.message));
    } catch (e) {
      console.error("adminAudit middleware error:", e.message);
    }
  });
  next();
}

module.exports = { adminAudit };
