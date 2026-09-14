// utils/apiKey.js — สร้าง/แฮช API key สำหรับระบบ Slip Check API
// เก็บเฉพาะ "แฮช" ของคีย์ไว้ถาวรในฐานข้อมูล (ไม่เก็บ plain key ระยะยาว) เผื่อฐานข้อมูลรั่วจะไม่สามารถเอาคีย์เดิมกลับไปใช้ได้
// ผู้ใช้จะเห็น plain key แค่ "ครั้งเดียว" ตอนกดดูครั้งแรกหลังแอดมินอนุมัติ (ผ่าน apikey.controller.js:myKey)
const crypto = require("crypto");

function generateApiKey() {
  return "flx_" + crypto.randomBytes(24).toString("hex"); // นำหน้าด้วย flx_ ให้รู้ทันทีว่าเป็นคีย์ของ Flexozy
}

function hashApiKey(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

module.exports = { generateApiKey, hashApiKey };
