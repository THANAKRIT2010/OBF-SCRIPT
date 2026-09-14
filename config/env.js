// config/env.js — โหลด environment variables และรวมไว้ที่เดียว (ที่อื่นห้าม process.env ตรงๆ)
require("dotenv").config();

const ADMIN_DISCORD_IDS = (process.env.ADMIN_DISCORD_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// ตัด trailing slash ทิ้งกันกรณีตั้งค่าไม่ตรงกันแค่ / ท้าย URL (Discord เทียบ string เป๊ะๆ)
const trimTrailingSlash = (url) => (url ? url.replace(/\/+$/, "") : url);

const config = {
  NODE_ENV: process.env.NODE_ENV || "production",
  PORT: process.env.PORT || 3000,

  // เบอร์ TrueMoney Wallet ของร้าน — ใช้รับเงินผ่านการ "แลกซองอั่งเปา" ที่ลูกค้าส่งมา
  truemoneyPhone: process.env.TRUEMONEY_PHONE,

  // Resend — ใช้ส่งอีเมล OTP สำหรับสมัครสมาชิก/ลืมรหัสผ่าน (สมัครฟรีที่ resend.com)
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL, // ต้องเป็นอีเมลจากโดเมนที่ verify กับ Resend แล้ว เช่น no-reply@flexozy.xyz
  },
  FRONTEND_URL: trimTrailingSlash(process.env.FRONTEND_URL) || "http://localhost:3000",

  // โดเมนย่อยสำหรับเสิร์ฟลิงก์ raw ของ Vault โดยตรง เช่น https://api.flexozy.xyz/UYm7pHdr
  // ต้องเพิ่มโดเมนนี้เป็น "Domain" อีกอันในโปรเจ็กต์เดียวกัน (Vercel/host เดิม) แล้วชี้ DNS (CNAME) มาที่เดียวกับ flexozy.xyz
  API_HOST: (process.env.API_HOST || "api.flexozy.xyz").toLowerCase(),

  // ===== การป้องกันหน้าแอดมินขั้นสูง (ทั้งหมดเป็น "ทางเลือกเสริม" ไม่ตั้งค่าก็ยังใช้งานได้ปกติ) =====
  // 1) จำกัด IP ที่เข้าหน้าแอดมินได้ — ใส่ IP คั่นด้วย comma เช่น "1.2.3.4,5.6.7.8" ถ้าปล่อยว่างไว้ = ไม่จำกัด
  ADMIN_ALLOWED_IPS: (process.env.ADMIN_ALLOWED_IPS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  // 2) รหัส PIN ชั้นที่สองสำหรับเข้าหน้าแอดมิน (นอกเหนือจากล็อกอิน Discord + เป็นแอดมินอยู่แล้ว)
  // ตั้งค่าไว้แล้วแอดมินต้องกรอก PIN นี้ 1 ครั้ง/เซสชันก่อนเรียก API แอดมินได้ (ผ่าน POST /api/admin/verify-pin)
  ADMIN_PANEL_PIN: process.env.ADMIN_PANEL_PIN || "",
  SESSION_SECRET: process.env.SESSION_SECRET || "dev_secret_change_me",

  discord: {
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    redirectUri: trimTrailingSlash(process.env.DISCORD_REDIRECT_URI),
    botToken: process.env.DISCORD_BOT_TOKEN,
    guildId: process.env.DISCORD_GUILD_ID,
  },

  // Google เป็นแค่ "ทางเข้าเสริม" ผูกกับบัญชี Discord เดิมด้วยอีเมล ไม่ใช่ระบบบัญชีอิสระ
  // (ดูเหตุผลใน controllers/auth.controller.js -> handleGoogleCallback)
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: trimTrailingSlash(process.env.GOOGLE_REDIRECT_URI),
  },

  ADMIN_DISCORD_IDS,
};

// เตือนตั้งแต่ตอน start ถ้า env ตัวสำคัญขาดหาย จะได้ไม่ต้องมาไล่ debug ตอน login พัง
const requiredDiscordVars = {
  DISCORD_CLIENT_ID: config.discord.clientId,
  DISCORD_CLIENT_SECRET: config.discord.clientSecret,
  DISCORD_REDIRECT_URI: config.discord.redirectUri,
};
const missing = Object.entries(requiredDiscordVars)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length) {
  console.warn(
    `⚠️  ขาด environment variable: ${missing.join(", ")} — Discord login จะไม่ทำงานจนกว่าจะตั้งค่าให้ครบ`
  );
}
if (config.SESSION_SECRET === "dev_secret_change_me" && config.NODE_ENV === "production") {
  console.warn("⚠️  กำลังใช้ SESSION_SECRET ค่าเริ่มต้นบน production กรุณาตั้งค่าเป็นค่าสุ่มที่ปลอดภัย");
}

// *** สำคัญมาก (ความปลอดภัยแอดมิน) ***
// session ทั้งก้อน (รวม is_admin) ถูกเก็บอยู่ในตัวคุกกี้เอง (cookie-session) แล้วเซ็นด้วย SESSION_SECRET
// ถ้า SESSION_SECRET เป็นค่า default ที่รู้กันทั่วไป (หรือสั้น/เดาง่าย) ใครก็ปลอมคุกกี้ตัวเอง
// ให้มี is_admin:true ได้ทันทีโดยไม่ต้องเดารหัสผ่านใดๆ เลย — เท่ากับ "ประตูหลังเปิดโล่ง" ทั้งเว็บ
// จึงต้อง "ปฏิเสธการสตาร์ทเซิร์ฟเวอร์" ไปเลยถ้าเจอค่าที่ไม่ปลอดภัยตอนรันจริง (production) แทนที่จะแค่เตือนเฉยๆ
if (config.NODE_ENV === "production") {
  const secret = config.SESSION_SECRET || "";
  if (secret === "dev_secret_change_me" || secret.length < 32) {
    throw new Error(
      "SECURITY: SESSION_SECRET ไม่ปลอดภัยพอสำหรับ production (ต้องไม่ใช่ค่า default และยาวอย่างน้อย 32 ตัวอักษร) " +
        "— ตั้งค่า environment variable SESSION_SECRET เป็นค่าสุ่มที่ปลอดภัยก่อน (เช่นรันคำสั่ง: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\") " +
        "ไม่เช่นนั้นใครก็ปลอมคุกกี้เซสชันให้ตัวเองเป็นแอดมินได้ทันที"
    );
  }
}
if (!config.discord.botToken || !config.discord.guildId) {
  console.warn("ℹ️  ไม่ได้ตั้งค่า DISCORD_BOT_TOKEN/DISCORD_GUILD_ID — ฟีเจอร์ auto-join guild จะถูกข้าม");
}
if (!config.google.clientId || !config.google.clientSecret || !config.google.redirectUri) {
  console.warn("ℹ️  ไม่ได้ตั้งค่า GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI — ปุ่ม Login ด้วย Google จะไม่ทำงานจนกว่าจะตั้งค่า");
}
if (!config.resend.apiKey || !config.resend.fromEmail) {
  console.warn("ℹ️  ไม่ได้ตั้งค่า RESEND_API_KEY/RESEND_FROM_EMAIL — ระบบสมัครสมาชิก/ลืมรหัสผ่านด้วยอีเมลจะส่ง OTP ไม่ได้จนกว่าจะตั้งค่า");
}

module.exports = config;
