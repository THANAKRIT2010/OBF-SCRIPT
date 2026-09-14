// utils/password.js — hash/verify รหัสผ่านแบบ scrypt (ใช้ร่วมกันทั้ง Vault และระบบสมัครสมาชิก)
const crypto = require("crypto");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const check = crypto.scryptSync(password || "", salt, 64).toString("hex");
  // ใช้ timingSafeEqual กัน timing attack
  const a = Buffer.from(check, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { hashPassword, verifyPassword };
