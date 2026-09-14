// utils/otp.js — สร้าง/เก็บ/ตรวจรหัส OTP ผ่าน Redis (ตัวเดียวกับ db.js) หมดอายุอัตโนมัติ ไม่ต้องลบเอง
const { kv } = require("@vercel/kv");

const OTP_TTL_SECONDS = 10 * 60; // 10 นาที

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 หลัก
}

function otpKey(purpose, email) {
  return `otp:${purpose}:${email.toLowerCase()}`;
}

async function issueOtp(purpose, email) {
  const otp = generateOtp();
  await kv.set(otpKey(purpose, email), otp, { ex: OTP_TTL_SECONDS });
  return otp;
}

// ตรวจ OTP — ถ้าถูกต้องจะลบทิ้งทันที (ใช้ได้ครั้งเดียว กันเดาซ้ำ)
async function verifyAndConsumeOtp(purpose, email, submittedOtp) {
  const key = otpKey(purpose, email);
  const stored = await kv.get(key);
  if (!stored || String(stored) !== String(submittedOtp)) return false;
  await kv.del(key);
  return true;
}

module.exports = { issueOtp, verifyAndConsumeOtp, OTP_TTL_SECONDS };
