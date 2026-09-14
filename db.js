// db.js — ที่เก็บข้อมูลจริงบน Vercel KV (Redis) แทนไฟล์ JSON เดิม
// **เหตุผลที่ย้าย**: Vercel serverless functions รันบน read-only filesystem เขียนไฟล์ (data/*.json) ไม่ได้เลย
// ต้องเปิดใช้งาน "Vercel KV" ก่อน: ไปที่โปรเจกต์บน vercel.com → แท็บ Storage → Create Database → เลือก KV
// จากนั้น Vercel จะผูก env vars (KV_REST_API_URL, KV_REST_API_TOKEN, ...) ให้อัตโนมัติ ไม่ต้องตั้งเอง
const { kv } = require("@vercel/kv");

// ค่าเริ่มต้นของแต่ละ collection (คอมเมนต์บอกโครงสร้างของแต่ละ record) — เหมือนเดิมทุกประการ ไม่เปลี่ยนโครงสร้างข้อมูล
const DEFAULTS = {
  scripts: [],   // { id, title, game, image, script, key_system, author, author_id, author_avatar, likes, liked_by: [], comments: [], created_at }
  users: {},     // discord_id -> full profile cache (avatar_decoration, banner, badges, ...)
  partners: [],  // { discord_id, username, avatar, description, discord_invite }
  team: [],      // { discord_id, username, handle, avatar, avatar_decoration, role, bio, order, added_at } — ชื่อ/รูปดึงจาก Discord ด้วย discord_id อัตโนมัติ
  roblox_sounds: [], // { id, name, original_name, is_custom_name, creator, thumbnail, verified, genre_id, added_by, added_by_name, added_at }
  vault: [],     // { code, title, script, password_hash, password_salt, owner_id, owner_name, views, created_at }
  webhooks: [],  // { id, name, url, events: ['all'] หรือ ['script_new','vault_new',...], created_at }
  reports: [],   // { id, type: 'script'|'vault'|'user', target_id, target_label, reason, reporter_id, reporter_name, status: 'open'|'resolved'|'dismissed', created_at }
  bans: [],      // { discord_id, username, reason, banned_by, banned_by_name, banned_at }
  admin_audit_log: [], // { id, actor_id, actor_name, method, path, status, ip, created_at } — เก็บย้อนหลังไว้ตรวจสอบว่าแอดมิน/ทีมงานคนไหนทำอะไรไปบ้าง
  favorites: {}, // discord_id -> [{ id, name, thumbnail, added_at }]  (รายการโปรด Roblox ID)
  // ===== ระบบร้านค้า =====
  products: [], // { id, title, description, image, price, stock, category, type: 'script'|'discord_service'|'other', active, created_at }
  orders: [],   // { id, buyer_id, buyer_name, product_id, product_title, price, status: 'paid'|'fulfilled'|'cancelled', created_at }
  wallet_transactions: [], // { id, user_id, amount, type: 'topup_truemoney'|'purchase'|'refund'|'redeem_code', ref, created_at }
  // ===== ระบบแลกโค้ด =====
  redeem_codes: [], // { code, reward_type: 'wallet'|'link'|'message', reward_value, max_uses, used_by: [discord_id...], active, created_by, created_at }
  // อีเมล (lowercase) -> discord_id — ใช้จับคู่ตอน login ด้วย Google ว่าตรงกับบัญชี Discord ไหนอยู่แล้วหรือไม่
  // สร้าง/อัปเดตทุกครั้งที่ login ด้วย Discord แล้วมีอีเมลยืนยันแล้วติดมาด้วย (ต้องขอ scope "email")
  email_links: {},
  daily_stats: {}, // 'YYYY-MM-DD' -> จำนวนคนเข้าเว็บ (นับ 1 ครั้ง/เซสชัน/วัน) ใช้ทำกราฟ วันนี้/รายเดือน/รายปี
  categories: [], // { id, title, subtitle, image, link, order }
  roblox_genres: [
    { id: "loud", title: "เพลงดัง", image: "", order: 1 },
    { id: "sweet", title: "เพลงเพราะ", image: "", order: 2 },
    { id: "soft", title: "เพลงเบา", image: "", order: 3 },
    { id: "sfx", title: "SFX", image: "", order: 4 },
  ], // { id, title, image, order }
  api_keys: [], // { id, user_id, user_name, key_hash, key_prefix, key_plain_pending, status: 'pending'|'approved'|'rejected'|'revoked', rate_limit_per_day, note, requested_at, approved_at, approved_by, approved_by_name, usage_count }
  slip_checks: [], // { id, api_key_id, qr_hash, qr_raw, amount, receiver_name, duplicate, created_at } — กันสลิปซ้ำ + log การใช้งาน
  settings: {    // ตั้งค่าเว็บที่แอดมินแก้ได้จากหน้า Admin
    site_name: "Flexozy",
    tagline: "ศูนย์รวมสคริปต์ Roblox ที่เชื่อถือได้",
    logo_url: "",
    discord_invite: "",
    hero_note: "",
    announcement_text: "", // ข้อความประกาศแบบเลื่อน (marquee) ใต้แถบเมนู — ว่างไว้ = ไม่แสดงแถบเลย
    // โหมดปิดปรับปรุงเว็บ — แอดมินใส่ HTML เองได้เต็มที่ (จะโชว์แทนหน้าเว็บจริงทั้งหมดเมื่อเปิดใช้งาน)
    maintenance_enabled: false,
    maintenance_html: "",
    loading_image: "/images/loading-bg.webp",
    loading_text: "กำลังโหลดหน้าเว็บ",
    popup_enabled: false,
    popup_image: "",
    popup_title: "แจก CODE ฟรี",
    popup_code: "WELCOME",
    popup_desc: "รับไปเลย เครดิตฟรีในเว็บไซต์",
    popup_button_text: "ดูเพิ่มเติม",
    popup_button_link: "",
  },
  stats: { total_views: 0 },
};

const COLLECTIONS = Object.keys(DEFAULTS);

// prefix กัน key ชนกับโปรเจกต์อื่นถ้า KV database เดียวกันถูกใช้ร่วมกันในอนาคต
const kvKey = (name) => `flexozy:${name}`;

// cache สั้นๆ ระดับ process (ใช้ได้เฉพาะตอน serverless instance ยัง warm อยู่) กันยิง KV ซ้ำถี่เกินไปในคำขอใกล้ๆ กัน
const cache = new Map(); // name -> { data, ts }
const CACHE_MS = 2000;

// อ่าน collection เดียว พร้อมสร้างค่าเริ่มต้นถ้ายังไม่มีใน KV / เติม field ที่ขาดหายหลังอัปเดตโค้ด
async function readCollection(name) {
  const cached = cache.get(name);
  if (cached && Date.now() - cached.ts < CACHE_MS) return JSON.parse(JSON.stringify(cached.data));

  let data = await kv.get(kvKey(name));
  if (data === null || data === undefined) {
    data = JSON.parse(JSON.stringify(DEFAULTS[name]));
    await kv.set(kvKey(name), data);
  } else if (!Array.isArray(DEFAULTS[name]) && typeof DEFAULTS[name] === "object") {
    // เติม field ที่ขาดหายสำหรับ object เดี่ยว เช่น settings/stats (กัน field ใหม่หายตอนอัปเดตโค้ด)
    let changed = false;
    for (const key of Object.keys(DEFAULTS[name])) {
      if (!(key in data)) { data[key] = DEFAULTS[name][key]; changed = true; }
    }
    if (changed) await kv.set(kvKey(name), data);
  }

  cache.set(name, { data, ts: Date.now() });
  return data;
}

async function writeCollection(name, data) {
  await kv.set(kvKey(name), data);
  cache.set(name, { data, ts: Date.now() });
}

// readDB() — คืนอ็อบเจ็กต์รวมทุก collection ไว้ใช้งานสะดวกในโค้ดฝั่ง controller (เหมือนเดิม แต่ตอนนี้เป็น async แล้ว)
async function readDB() {
  const entries = await Promise.all(
    COLLECTIONS.map(async (name) => [name, await readCollection(name)])
  );
  return Object.fromEntries(entries);
}

// เขียนกลับทุก collection จากอ็อบเจ็กต์รวม (ใช้ภายใน mutate เท่านั้น)
async function writeDB(data) {
  await Promise.all(
    COLLECTIONS.filter((name) => name in data).map((name) => writeCollection(name, data[name]))
  );
}

// mutate(fn) — อ่านข้อมูลรวมมาแก้ แล้วเขียนกลับให้อัตโนมัติ
// *** สำคัญ: ตอนนี้เป็น async แล้ว ทุกที่ที่เรียกต้องใส่ await mutate(...) ***
//
// *** แก้บั๊ก race condition ที่กระทบระบบเงิน/สต็อก/โค้ดโดยตรง ***
// เดิม mutate() ทำแค่ read -> แก้ -> write โดยไม่มีการล็อกใดๆ เลย บน Vercel serverless
// ถ้ามี 2 request มาพร้อมกัน (เช่น กดเติมเงิน/กดซื้อ/กดแลกโค้ดรัวๆ 2 ครั้งติดกัน หรือมีคนยิง API ซ้ำจงใจ)
// ทั้งสอง request จะอ่านข้อมูล "ก่อนแก้" ชุดเดียวกัน แล้วเขียนทับกันเอง (last write wins)
// ผลคือ: เติมเงิน/แลกโค้ด/ซื้อของ ได้เครดิตซ้ำสองเท่า หรือสต็อกไม่ถูกตัดจริง โดยที่ระบบตรวจไม่ทัน
// วิธีแก้: ใช้ Redis (Vercel KV) เป็นตัวล็อกแบบกระจาย (distributed lock) ด้วย SET ... NX PX
// บังคับให้ทุก mutate() ทำทีละอันจริงๆ (แม้จะยิงมาจากคนละ serverless instance ก็ตาม)
const LOCK_KEY = "flexozy:lock:mutate";
const LOCK_TTL_MS = 8000; // กันเคส process ตายกลางคันแล้วล็อกค้างตลอดไป
const LOCK_MAX_WAIT_MS = 6000;
const LOCK_RETRY_MS = 60;

async function acquireMutateLock() {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const deadline = Date.now() + LOCK_MAX_WAIT_MS;
  while (Date.now() < deadline) {
    // set(key, val, { nx: true, px: ttl }) = ตั้งค่าได้ก็ต่อเมื่อยังไม่มี key นี้อยู่ (กันคนอื่นล็อกซ้อน)
    const ok = await kv.set(LOCK_KEY, token, { nx: true, px: LOCK_TTL_MS });
    if (ok) return token;
    await new Promise((r) => setTimeout(r, LOCK_RETRY_MS));
  }
  throw new Error("mutate_lock_timeout: ระบบกำลังมีคนทำรายการเยอะ กรุณาลองใหม่อีกครั้ง");
}

async function releaseMutateLock(token) {
  try {
    // ปลดล็อกเฉพาะถ้ายังเป็นของเราเอง (กันไปลบล็อกของ request อื่นที่มาทีหลังโดยไม่ได้ตั้งใจ)
    const current = await kv.get(LOCK_KEY);
    if (current === token) await kv.del(LOCK_KEY);
  } catch (e) {
    console.error("releaseMutateLock error:", e.message);
  }
}

async function mutate(fn) {
  const token = await acquireMutateLock();
  try {
    // ต้องอ่านข้อมูลใหม่ "หลังได้ล็อกแล้ว" เท่านั้น (ไม่ใช้ cache ระดับ process) กันข้อมูลเก่าค้างจาก request อื่น
    cache.clear();
    const data = await readDB();
    const result = await fn(data);
    await writeDB(data);
    return result;
  } finally {
    await releaseMutateLock(token);
  }
}

module.exports = { readDB, writeDB, mutate, readCollection, writeCollection };
