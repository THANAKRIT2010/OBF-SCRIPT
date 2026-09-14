// controllers/vault.controller.js — วางโค้ด -> แปลงเป็นลิงก์ของเรา ตั้งรหัสผ่านได้
// รหัสผ่านเก็บแบบ hash (scrypt) ไม่เก็บ plain text และตัวสคริปต์จะไม่ถูกส่งออกไปจนกว่าจะปลดล็อกถูกต้อง
const { nanoid } = require("nanoid");
const { mutate, readDB } = require("../db");
const { hasPermission } = require("../middleware/requireAuth");
const { checkRateLimit, getClientIp } = require("../utils/rateLimit");
const { hashPassword, verifyPassword } = require("../utils/password");
const { API_HOST } = require("../config/env");
const { isCurrentAdmin } = require("../middleware/requireAuth");

// สร้างลิงก์ raw รูปแบบใหม่ https://api.flexozy.xyz/CODE (แทน https://flexozy.xyz/raw/vault/CODE เดิม)
function buildRawUrl(code) {
  return `https://${API_HOST}/${code}`;
}

function toPublicMeta(v) {
  return {
    code: v.code,
    title: v.title,
    image: v.image || "",
    has_password: !!v.password_hash,
    owner_name: v.owner_name,
    views: v.views,
    created_at: v.created_at,
    raw_url: buildRawUrl(v.code),
  };
}

// POST /api/vault — ต้อง login, สร้างลิงก์ใหม่จากโค้ดที่วาง
async function createVaultLink(req, res) {
  const { title, script, password, image } = req.body;
  if (!script || !String(script).trim()) {
    return res.status(400).json({ error: "empty_script" });
  }

  const user = req.session.user;
  let password_hash = null;
  let password_salt = null;
  if (password && String(password).trim()) {
    const { salt, hash } = hashPassword(String(password).trim());
    password_hash = hash;
    password_salt = salt;
  }

  const entry = {
    code: nanoid(8),
    title: title ? String(title).slice(0, 120) : "สคริปต์ไม่มีชื่อ",
    image: image ? String(image).slice(0, 500) : "",
    script: String(script).slice(0, 200_000),
    password_hash,
    password_salt,
    owner_id: user.discord_id,
    owner_name: user.username,
    views: 0,
    created_at: Math.floor(Date.now() / 1000),
  };

  await mutate((db) => db.vault.push(entry));
  res.status(201).json({ code: entry.code, has_password: !!password_hash, raw_url: buildRawUrl(entry.code) });
}

// PUT /api/vault/:code — เจ้าของลิงก์ (หรือทีมงานที่มีสิทธิ์ 'vault') แก้ไขชื่อ/โค้ด/รหัสผ่านได้
async function updateVaultLink(req, res) {
  const user = req.session.user;
  const { title, script, password, remove_password, image } = req.body;

  const result = await mutate(async (db) => {
    const v = db.vault.find((v) => v.code === req.params.code);
    if (!v) return { ok: false, code: 404 };
    if (v.owner_id !== user.discord_id && !(await hasPermission(user, "vault"))) {
      return { ok: false, code: 403 };
    }
    if (title !== undefined) v.title = String(title).slice(0, 120);
    if (image !== undefined) v.image = String(image).slice(0, 500);
    if (script !== undefined) {
      if (!String(script).trim()) return { ok: false, code: 400, error: "empty_script" };
      v.script = String(script).slice(0, 200_000);
    }
    if (remove_password) {
      v.password_hash = null;
      v.password_salt = null;
    } else if (password && String(password).trim()) {
      const { salt, hash } = hashPassword(String(password).trim());
      v.password_hash = hash;
      v.password_salt = salt;
    }
    return { ok: true, entry: v };
  });

  if (!result.ok) return res.status(result.code).json({ error: result.error || "cannot_update" });
  res.json(toPublicMeta(result.entry));
}

// GET /api/vault/mine — ต้อง login, ดูลิงก์ของตัวเอง (ไม่โชว์เนื้อโค้ด)
async function listMine(req, res) {
  const db = await readDB();
  const mine = db.vault
    .filter((v) => v.owner_id === req.session.user.discord_id)
    .sort((a, b) => b.created_at - a.created_at)
    .map(toPublicMeta);
  res.json(mine);
}

// GET /api/vault — แอดมินเท่านั้น, ดูลิงก์ทั้งหมดในระบบ (ไม่โชว์เนื้อโค้ดจนกว่าจะกดดูรายอัน)
async function listAll(req, res) {
  const db = await readDB();
  const all = db.vault.slice().sort((a, b) => b.created_at - a.created_at).map(toPublicMeta);
  res.json(all);
}

// GET /api/vault/:code/meta — public, เช็คว่าลิงก์มีจริงไหม/ต้องใส่รหัสไหม โดยไม่เปิดเนื้อโค้ด
async function getMeta(req, res) {
  const db = await readDB();
  const v = db.vault.find((v) => v.code === req.params.code);
  if (!v) return res.status(404).json({ error: "not_found" });
  res.json(toPublicMeta(v));
}

// POST /api/vault/:code/unlock — public, ใส่รหัส (ถ้ามี) เพื่อดูโค้ดจริง
// จำกัด 8 ครั้ง/5 นาที ต่อ (IP + code) กันบอทเดารหัสผ่านรัวๆ หรือดึงโค้ดซ้ำเป็นสแปม
async function unlock(req, res) {
  const rl = await checkRateLimit(`vault-unlock:${getClientIp(req)}:${req.params.code}`, {
    limit: 8,
    windowSeconds: 300,
  });
  if (!rl.allowed) {
    return res.status(429).json({ error: "too_many_requests", retry_after: rl.retryAfterSeconds });
  }

  const db = await readDB();
  const v = db.vault.find((v) => v.code === req.params.code);
  if (!v) return res.status(404).json({ error: "not_found" });

  if (v.password_hash) {
    const { password } = req.body;
    if (!password || !verifyPassword(String(password), v.password_salt, v.password_hash)) {
      return res.status(401).json({ error: "wrong_password" });
    }
  }

  await mutate((db) => {
    const item = db.vault.find((item) => item.code === v.code);
    if (item) item.views = (item.views || 0) + 1;
  });

  res.json({ title: v.title, script: v.script });
}

// GET /api/vault/:code/admin-view — เจ้าของลิงก์ หรือทีมงานที่มีสิทธิ์ 'vault' เท่านั้น
// เจ้าของใช้ endpoint นี้เปิดดูโค้ดตัวเองได้เลยแม้ตั้งรหัสผ่านไว้ (ไม่ต้องกรอกรหัสตัวเอง) เพื่อไปแก้ไขต่อ
async function adminView(req, res) {
  const db = await readDB();
  const v = db.vault.find((v) => v.code === req.params.code);
  if (!v) return res.status(404).json({ error: "not_found" });
  const user = req.session.user;
  if (v.owner_id !== user.discord_id && !(await hasPermission(user, "vault"))) {
    return res.status(403).json({ error: "forbidden" });
  }
  res.json({ title: v.title, image: v.image || "", script: v.script, owner_name: v.owner_name, has_password: !!v.password_hash });
}

// DELETE /api/vault/:code — เจ้าของลิงก์หรือแอดมินเท่านั้น
async function removeVaultLink(req, res) {
  const user = req.session.user;
  const result = await mutate((db) => {
    const idx = db.vault.findIndex((v) => v.code === req.params.code);
    if (idx === -1) return { ok: false, code: 404 };
    if (db.vault[idx].owner_id !== user.discord_id && !isCurrentAdmin(user)) {
      return { ok: false, code: 403 };
    }
    db.vault.splice(idx, 1);
    return { ok: true };
  });
  if (!result.ok) return res.status(result.code).json({ error: "cannot_delete" });
  res.status(204).end();
}

// เช็คว่า request นี้มาจากตัวเกม Roblox เอง (ผ่าน game:HttpGet) หรือมาจากเบราว์เซอร์ปกติ
// อ้างอิงจาก User-Agent ที่ Roblox HttpService ส่งมา (เช่น "Roblox/WinInet", "RobloxStudio/WinInet")
// หมายเหตุ: User-Agent ปลอมแปลงได้ง่าย นี่ไม่ใช่การป้องกันความปลอดภัยที่แน่นหนา
// เป็นเพียงตัวกันคนทั่วไปที่เปิดลิงก์ raw ดูตรงๆ ผ่านเบราว์เซอร์เท่านั้น
function isGameClient(req) {
  const ua = String(req.headers["user-agent"] || "").toLowerCase();
  return ua.includes("roblox");
}

// GET /raw/vault/:code — เส้นทางจริงบนเซิร์ฟเวอร์ (ไม่ใช่ #hash) ตอบกลับเป็น text/plain ล้วนๆ
// ใช้ยิงตรงจาก loadstring(game:HttpGet("...")) ได้เลย เหมือนลิงก์ raw ของ GitHub
// ถ้าลิงก์มีรหัสผ่าน:
//   - Roblox client (loadstring/HttpGet) -> ข้ามการเช็ครหัสผ่าน รันได้ทันที
//   - เบราว์เซอร์ปกติ -> ต้องต่อ ?password=รหัสผ่าน ท้าย URL ให้ถูกต้อง ไม่งั้น 401
async function rawView(req, res) {
  const db = await readDB();
  const v = db.vault.find((v) => v.code === req.params.code);

  if (!v) {
    return res.status(404).type("text/plain").send("-- [Flexozy] ไม่พบลิงก์นี้ หรือถูกลบไปแล้ว");
  }

  if (v.password_hash && !isGameClient(req)) {
    // จำกัดเฉพาะกรณีต้องกรอกรหัสผ่าน (เบราว์เซอร์ทั่วไป) — ไม่จำกัด Roblox client เพื่อไม่ให้กระทบสคริปต์ที่โหลดถูกต้องอยู่แล้ว
    const rl = await checkRateLimit(`vault-rawview:${getClientIp(req)}:${req.params.code}`, {
      limit: 10,
      windowSeconds: 300,
    });
    if (!rl.allowed) {
      return res.status(429).type("text/plain").send("-- [Flexozy] ขอโทษด้วย ลองรัวเกินไป กรุณารอสักครู่แล้วลองใหม่");
    }

    const password = req.query.password;
    if (!password || !verifyPassword(String(password), v.password_salt, v.password_hash)) {
      return res
        .status(401)
        .type("text/plain")
        .send("ยามจะมองจ้องเธอครั้งใดพูดออกมาจากใจว่าเธอใช่เลย");
    }
  }

  await mutate((db2) => {
    const item = db2.vault.find((item) => item.code === v.code);
    if (item) item.views = (item.views || 0) + 1;
  });
  res.type("text/plain; charset=utf-8").send(v.script);
}

module.exports = { createVaultLink, listMine, listAll, getMeta, unlock, adminView, updateVaultLink, removeVaultLink, rawView };
