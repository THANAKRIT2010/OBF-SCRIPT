// routes/upload.routes.js
const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const uploadController = require("../controllers/upload.controller");
const { requireStaff } = require("../middleware/requireAuth");

// POST /api/upload — ทีมงานที่มีสิทธิ์อย่างน้อย 1 อย่าง (หรือแอดมินเต็ม), แนบไฟล์ field ชื่อ "image"
router.post("/api/upload", requireStaff, upload.single("image"), uploadController.uploadImage);

// จับ error จาก multer (ไฟล์ใหญ่เกิน / ชนิดไฟล์ไม่ถูกต้อง) ให้ตอบเป็น JSON แทนที่จะ crash
router.use("/api/upload", (err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message === "invalid_file_type" ? "invalid_file_type" : "upload_failed" });
  next();
});

module.exports = router;
