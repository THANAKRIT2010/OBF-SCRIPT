// middleware/upload.js — ตั้งค่า multer สำหรับอัปโหลดรูปภาพจากเครื่อง (ใช้กับ popup ต้อนรับ / พาร์ทเนอร์ / โลโก้ ฯลฯ)
// *** สำคัญ: เปลี่ยนจาก diskStorage เป็น memoryStorage ***
// เหตุผล: Vercel serverless เขียนไฟล์ลง public/uploads ไม่ได้ (read-only filesystem)
// เก็บไฟล์ไว้ใน memory (buffer) ชั่วคราวแทน แล้วให้ controllers/upload.controller.js
// เป็นคนตัดสินใจว่าจะอัปโหลดต่อไปที่ Vercel Blob (บน Vercel) หรือเขียนลงดิสก์ตรงๆ (บน Wispbyte/เครื่อง dev)
const multer = require("multer");

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("invalid_file_type"));
    }
    cb(null, true);
  },
});

module.exports = upload;
