// controllers/localAuth.controller.js — ระบบสมัครสมาชิกด้วยอีเมล/รหัสผ่าน (คู่ขนานกับ Discord/Google OAuth)
// *** สำคัญ: ใช้ discord_id field เดิมเป็น "รหัสบัญชี" เหมือน Discord/Google เพื่อให้ทุกระบบเดิม
// (สคริปต์, ทีมงาน, แบน, กระเป๋าเงิน, favorites ฯลฯ) ทำงานร่วมกับบัญชีอีเมลได้โดยไม่ต้องแก้โค้ดที่อื่นเลย
// เพียงแค่ค่า id ที่ใส่เป็น "local_xxxxx" แทนที่จะเป็นเลข Discord จริง
const { nanoid } = require("nanoid");
const { mutate, readDB } = require("../db");
const { hashPassword, verifyPassword } = require("../utils/password");
const { issueOtp, verifyAndConsumeOtp } = require("../utils/otp");
const { sendOtpEmail } = require("../services/emailService");
const { checkRateLimit, getClientIp } = require("../utils/rateLimit");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function avatarFor(username) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=6366F1&color=fff&bold=true`;
}

async function register(req, res) {
  const rl = await checkRateLimit(`register:${getClientIp(req)}`, { limit: 5, windowSeconds: 600 });
  if (!rl.allowed) return res.status(429).json({ error: "too_many_requests", retry_after: rl.retryAfterSeconds });

  const { username, email, password } = req.body;
  if (!username || String(username).trim().length < 3 || String(username).trim().length > 20) {
    return res.status(400).json({ error: "invalid_username", message: "ชื่อผู้ใช้ต้องมีความยาว 3-20 ตัวอักษร" });
  }
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: "invalid_email", message: "อีเมลไม่ถูกต้อง" });
  }
  if (!password || String(password).length < 8) {
    return res.status(400).json({ error: "weak_password", message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
  }
  const normalizedEmail = String(email).trim().toLowerCase();

  const result = await mutate((db) => {
    if (db.email_links[normalizedEmail]) return { error: "email_taken" };
    const { salt, hash } = hashPassword(password);
    const id = `local_${nanoid(16)}`;
    const profile = {
      discord_id: id,
      username: String(username).trim(),
      handle: String(username).trim().toLowerCase(),
      avatar: avatarFor(username),
      avatar_decoration: null,
      banner: null,
      accent_color: null,
      badges: [],
      is_admin: false,
      discord_profile_url: null,
      email: normalizedEmail,
      auth_provider: "local",
      password_hash: hash,
      password_salt: salt,
      first_seen: Math.floor(Date.now() / 1000),
      last_seen: Math.floor(Date.now() / 1000),
    };
    db.users[id] = profile;
    db.email_links[normalizedEmail] = id;
    return { profile };
  });

  if (result.error === "email_taken") {
    return res.status(409).json({ error: "email_taken", message: "อีเมลนี้มีบัญชีอยู่แล้ว ลอง login หรือกดลืมรหัสผ่านแทน" });
  }

  req.session.user = result.profile;
  res.status(201).json({ ok: true });
}

async function login(req, res) {
  const rl = await checkRateLimit(`local-login:${getClientIp(req)}`, { limit: 10, windowSeconds: 600 });
  if (!rl.allowed) return res.status(429).json({ error: "too_many_requests", retry_after: rl.retryAfterSeconds });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "missing_fields" });
  const normalizedEmail = String(email).trim().toLowerCase();

  const db = await readDB();
  const userId = db.email_links[normalizedEmail];
  const profile = userId ? db.users[userId] : null;

  const genericError = { error: "invalid_credentials", message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  if (!profile || profile.auth_provider !== "local" || !profile.password_hash) {
    return res.status(401).json(genericError);
  }
  if (!verifyPassword(password, profile.password_salt, profile.password_hash)) {
    return res.status(401).json(genericError);
  }

  const ban = db.bans.find((b) => b.discord_id === profile.discord_id);
  if (ban) return res.status(403).json({ error: "banned", message: `บัญชีนี้ถูกระงับการใช้งาน: ${ban.reason}` });

  await mutate((db2) => {
    const u = db2.users[profile.discord_id];
    if (u) u.last_seen = Math.floor(Date.now() / 1000);
  });

  req.session.user = profile;
  res.json({ ok: true });
}

async function forgotPassword(req, res) {
  const rl = await checkRateLimit(`forgot-pw:${getClientIp(req)}`, { limit: 5, windowSeconds: 600 });
  if (!rl.allowed) return res.status(429).json({ error: "too_many_requests", retry_after: rl.retryAfterSeconds });

  const { email } = req.body;
  if (!email || !isValidEmail(email)) return res.status(400).json({ error: "invalid_email" });
  const normalizedEmail = String(email).trim().toLowerCase();

  const db = await readDB();
  const userId = db.email_links[normalizedEmail];
  const profile = userId ? db.users[userId] : null;

  if (profile && profile.auth_provider === "local") {
    try {
      const otp = await issueOtp("reset", normalizedEmail);
      await sendOtpEmail(normalizedEmail, otp, "reset");
    } catch (err) {
      console.error("ส่ง OTP ไม่สำเร็จ:", err.message);
      return res.status(500).json({ error: "email_send_failed", message: err.message });
    }
  }
  res.json({ ok: true, message: "ถ้ามีบัญชีที่ใช้อีเมลนี้ ระบบได้ส่งรหัส OTP ไปให้แล้ว" });
}

async function resetPassword(req, res) {
  const rl = await checkRateLimit(`reset-pw:${getClientIp(req)}`, { limit: 8, windowSeconds: 600 });
  if (!rl.allowed) return res.status(429).json({ error: "too_many_requests", retry_after: rl.retryAfterSeconds });

  const { email, otp, new_password } = req.body;
  if (!email || !otp || !new_password) return res.status(400).json({ error: "missing_fields" });
  if (String(new_password).length < 8) return res.status(400).json({ error: "weak_password", message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
  const normalizedEmail = String(email).trim().toLowerCase();

  const validOtp = await verifyAndConsumeOtp("reset", normalizedEmail, otp);
  if (!validOtp) return res.status(400).json({ error: "invalid_otp", message: "รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว" });

  const result = await mutate((db) => {
    const userId = db.email_links[normalizedEmail];
    const profile = userId ? db.users[userId] : null;
    if (!profile || profile.auth_provider !== "local") return { error: "not_found" };
    const { salt, hash } = hashPassword(new_password);
    profile.password_salt = salt;
    profile.password_hash = hash;
    return { ok: true };
  });

  if (result.error) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true, message: "เปลี่ยนรหัสผ่านสำเร็จ กรุณา login ใหม่อีกครั้ง" });
}

module.exports = { register, login, forgotPassword, resetPassword };
