// routes/apikey.routes.js — ระบบขอ/อนุมัติ API key + endpoint เช็คสลิปจริง
const express = require("express");
const multer = require("multer");
const router = express.Router();
const apikeyController = require("../controllers/apikey.controller");
const slipCheckController = require("../controllers/slipCheck.controller");
const { requireAuth, requirePermission } = require("../middleware/requireAuth");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// ผู้ใช้ทั่วไป (ต้อง login)
router.post("/api/apikey/request", requireAuth, apikeyController.requestKey);
router.get("/api/apikey/mine", requireAuth, apikeyController.myKey);

// แอดมิน/ทีมงานที่มีสิทธิ์ apikeys
router.get("/api/admin/apikey/requests", requirePermission("apikeys"), apikeyController.adminList);
router.post("/api/admin/apikey/:id/approve", requirePermission("apikeys"), apikeyController.adminApprove);
router.post("/api/admin/apikey/:id/reject", requirePermission("apikeys"), apikeyController.adminReject);
router.post("/api/admin/apikey/:id/revoke", requirePermission("apikeys"), apikeyController.adminRevoke);

// Public API — auth ด้วย X-API-Key header เอง (ไม่ใช้ session/login ของเว็บ) สำหรับนักพัฒนาภายนอกที่ได้คีย์แล้ว
router.post("/api/slip-check", upload.single("file"), slipCheckController.checkSlip);

module.exports = router;
