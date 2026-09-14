// routes/admin.routes.js — PIN ชั้นที่สอง + audit log สำหรับหน้าแอดมิน
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { requireAuth, requireAdmin } = require("../middleware/requireAuth");

// verify-pin ต้อง login + เป็นแอดมินอยู่แล้ว แต่ "ห้าม" ผ่าน requireAdmin เต็มรูปแบบ
// (เพราะ requireAdmin เองก็เช็ค admin_pin_verified อยู่ — ถ้าครอบด้วย requireAdmin จะกลายเป็น
//  ต้องยืนยัน PIN ก่อนถึงจะยืนยัน PIN ได้ วนไม่จบ) จึงครอบแค่ requireAuth แล้วเช็ค is_admin ในตัว controller เอง
router.post("/api/admin/verify-pin", requireAuth, adminController.verifyPin);

router.get("/api/admin/audit-log", requireAdmin, adminController.getAuditLog);

module.exports = router;
