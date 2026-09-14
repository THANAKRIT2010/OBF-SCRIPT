// app.js — ประกอบ Express app ทั้งหมด (middleware + routes) แยกจาก server.js เพื่อให้ test ได้ง่าย
require("express-async-errors"); // patch express ให้ error จาก async route handler ที่ throw ถูกส่งเข้า error handler อัตโนมัติ (ไม่งั้น process จะค้าง/ล่ม)
const path = require("path");
const express = require("express");
const cookieSession = require("cookie-session"); // เก็บ session ไว้ใน cookie ที่เข้ารหัสแล้วโดยตรง แทนการเก็บในหน่วยความจำเซิร์ฟเวอร์
const cors = require("cors");
const helmet = require("helmet");
const { SESSION_SECRET, FRONTEND_URL, NODE_ENV, API_HOST } = require("./config/env");
const vaultController = require("./controllers/vault.controller");
const { trackSession } = require("./middleware/onlineTracker");
const { trackLastSeen } = require("./middleware/lastSeen");
const { enforceBan } = require("./middleware/enforceBan");
const { trackDailyVisit } = require("./middleware/dailyStats");
const { maintenanceGate } = require("./middleware/maintenanceMode");
const { adminAudit } = require("./middleware/adminAudit");
const { isCurrentAdmin } = require("./middleware/requireAuth");
const routes = require("./routes");

const app = express();

// Wispbyte/Wisp.uno และ Vercel รันหลัง reverse proxy (HTTPS ภายนอก -> HTTP ภายใน)
// ต้องตั้ง trust proxy เพื่อให้ req.secure / req.protocol อ่านค่าถูกต้อง
// และให้ cookie แบบ secure ทำงานได้เมื่อรันจริงบน production
app.set("trust proxy", 1);

// ============================================================
// Vault raw-link subdomain: https://api.flexozy.xyz/CODE
// ต้องอยู่บนสุดของ middleware chain เพื่อ "แยกร่าง" โดเมนนี้ออกจากเว็บหลักโดยสมบูรณ์:
// ไม่ผ่าน session / CORS / โหมดปิดปรับปรุงเว็บ / static SPA ใดๆ ทั้งสิ้น
// รับเฉพาะ GET /:code (โค้ด vault) เท่านั้น เส้นทางอื่นตอบ 404 หมด ลดพื้นที่โจมตีให้เหลือน้อยที่สุด
// (ค่าเดิม https://flexozy.xyz/raw/vault/CODE ยังใช้งานได้ตามปกติ เพื่อไม่ให้ลิงก์เก่าที่แชร์ไปแล้วพัง)
app.use((req, res, next) => {
  const host = String(req.hostname || "").toLowerCase();
  if (host !== API_HOST) return next();

  if (req.method !== "GET") {
    return res.status(404).type("text/plain").send("not_found");
  }
  const m = req.path.match(/^\/([A-Za-z0-9_-]{4,40})\/?$/);
  if (!m) {
    return res.status(200).type("text/plain").send("Flexozy Vault API");
  }
  req.params.code = m[1];
  return vaultController.rawView(req, res, next);
});

app.use(cors({ origin: FRONTEND_URL, credentials: true }));

// เฮดเดอร์ความปลอดภัยพื้นฐาน (กัน clickjacking, MIME sniffing, บังคับ HTTPS ฯลฯ)
// ปิด CSP/crossOriginResourcePolicy ไว้ก่อน เพราะหน้าเว็บโหลด Tailwind/FontAwesome จาก CDN ภายนอก
// และมี inline <script> จำนวนมาก การเปิด CSP ตรงๆ โดยไม่ไล่ปรับ allowlist ให้ครบจะทำเว็บพังทันที
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(express.json());

// *** สำคัญ: ย้ายจาก express-session (MemoryStore) มาเป็น cookie-session ***
// เหตุผล: บน Vercel serverless แต่ละ request อาจถูกรันบน instance คนละตัวกัน ทำให้ session
// ที่เก็บไว้ในหน่วยความจำของ instance เดิมหายไป (login ไม่ติด/state หาย) cookie-session แก้ปัญหานี้
// โดยเก็บข้อมูล session ทั้งหมดไว้ในตัวคุกกี้เอง (เซ็นด้วย SESSION_SECRET กันปลอมแปลง) ไม่ต้องพึ่ง storage ฝั่งเซิร์ฟเวอร์เลย
app.use(
  cookieSession({
    name: "session",
    keys: [SESSION_SECRET],
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 วัน
    httpOnly: true,
    sameSite: "lax",
    secure: NODE_ENV === "production", // เปิด secure cookie อัตโนมัติเมื่อรันบน HTTPS จริง (production)
  })
);

// cookie-session ไม่มี req.sessionID ให้ในตัว (ต่างจาก express-session) — เติมให้เองแบบง่ายๆ
// เพื่อให้ middleware/onlineTracker.js (นับผู้ใช้ออนไลน์) ยังทำงานได้เหมือนเดิมโดยไม่ต้องแก้ไฟล์นั้น
app.use((req, res, next) => {
  if (req.session && !req.session._sid) {
    req.session._sid = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  req.sessionID = req.session?._sid;
  next();
});

app.use(trackSession);
app.use(trackLastSeen);
app.use(enforceBan);
app.use(trackDailyVisit);
app.use(maintenanceGate);
app.use(adminAudit); // บันทึก log การกระทำของแอดมิน/ทีมงานทุกครั้งที่มีการแก้ไขข้อมูลผ่าน API

// ============================================================
// หน้าแอดมิน (/admin) — แยกไฟล์จริงออกจาก index.html โดยสมบูรณ์ (ไม่มี # ไม่มี .html)
// ไฟล์จริงเก็บไว้นอกโฟลเดอร์ public/ (อยู่ที่ views/admin.html) เพื่อไม่ให้ express.static
// เสิร์ฟไฟล์นี้ตรงๆ ได้แม้แต่ทางอ้อม — ทุก request ต้องผ่าน route ที่เช็คสิทธิ์นี้เท่านั้น
// คนที่ไม่ได้ login หรือ login แล้วแต่ไม่ใช่แอดมิน/ทีมงาน จะได้ 404 ธรรมดา (ไม่ใช่ 403)
// เพื่อไม่ให้รู้ด้วยซ้ำว่าเส้นทางนี้มีอยู่จริง ป้องกันการสแกนหาหน้าแอดมิน
// รองรับ /admin/:subtab ด้วย (เช่น /admin/settings) เพื่อให้ deep-link ไปแท็บย่อยตรงๆ ได้โดยไม่ต้องใช้ # เลย
app.get(["/admin", "/admin/:subtab"], (req, res) => {
  const user = req.session.user;
  const isAllowed = !!user && (isCurrentAdmin(user) || (Array.isArray(user.permissions) && user.permissions.length > 0));
  if (!isAllowed) {
    return res.status(404).type("text/plain").send("not_found");
  }
  res.sendFile(path.join(__dirname, "views", "admin.html"));
});
// ลิงก์เก่าที่เคยแชร์เป็น /admin.html ให้เด้งไปหน้าใหม่แบบไม่มี .html แทน (กันลิงก์ที่แชร์ไปแล้วพัง)
app.get("/admin.html", (req, res) => res.redirect(301, "/admin"));

// หน้า login (/login) — ไม่มี .html เช่นกัน หมายเหตุ: /login/discord และ /login/google เป็น API คนละเส้นทาง อยู่แล้วใน routes/auth.routes.js
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/login.html", (req, res) => res.redirect(301, "/login"));

// ใช้ __dirname กัน static path ผิดเพี้ยนตอนรันจาก working directory อื่น (เช่นบน Wispbyte)
// *** ต้องอยู่หลัง maintenanceGate เสมอ — ไม่งั้น express.static จะดักหน้า "/" (index.html) ไปเสิร์ฟเองก่อนถึง middleware ตรวจปิดปรับปรุงเว็บ ***
app.use(express.static(path.join(__dirname, "public")));
app.use(routes);

// SPA fallback — เว็บนี้เป็น single-page app ใช้ path จริงล้วนๆ (ไม่มี # ไม่มี .html) เช่น /scripts, /store,
// /vault, /vault/:code, /roblox, /team, /partners — ฝั่ง client (main.js) อ่าน location.pathname เพื่อเลือกหน้าที่จะแสดงเอง
// ถ้า path ไม่ใช่ /api, /login, /callback, /logout ให้ส่ง index.html กลับไปเสมอ
// (กัน error ตอนกด refresh หรือแชร์ลิงก์ตรงไปหน้าเหล่านี้ — /admin ถูกดักไปแล้วด้านบน จึงไม่มาถึงตรงนี้)
app.get(/^(?!\/api\/|\/login\/|\/callback\/|\/logout).*/, (req, res, next) => {
  if (req.method !== "GET") return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 404 handler สำหรับ API ที่ไม่มีจริง (ช่วย debug route ผิด path)
app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.originalUrl });
});

// error handler กลาง — ดัก error ที่หลุดมาจาก route/middleware ใดๆ (รวมถึง async ที่ throw ผ่าน express-async-errors)
// กันไม่ให้ process ล่มเงียบๆ และส่ง response กลับไปให้ client รู้ว่าเกิดอะไรขึ้นแทนที่จะค้าง
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "internal_error", message: NODE_ENV === "production" ? undefined : err.message });
});

module.exports = app;
