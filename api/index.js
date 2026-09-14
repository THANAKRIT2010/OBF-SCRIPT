// api/index.js — จุดเข้า (entry point) สำหรับ Vercel serverless โดยเฉพาะ
// ต่างจาก server.js (ใช้รันตอน dev ในเครื่อง / บน Wispbyte) ตรงที่ไฟล์นี้:
//   1. ไม่เรียก app.listen() — Vercel จัดการเปิด/ปิด connection ให้เองต่อ request
//   2. ไม่เรียก presenceService.start() — Discord Gateway เป็น WebSocket ที่ต้องค้างการเชื่อมต่อไว้ตลอด
//      ซึ่ง serverless function รันแบบสั้นๆ ต่อ request เท่านั้น ค้าง connection แบบนี้ไม่ได้
//      (ฟีเจอร์ "สถานะออนไลน์/กำลังเล่นเกม" จะไม่ทำงานตอนรันบน Vercel — ส่วนอื่นของเว็บไม่กระทบ)
module.exports = require("../app");
