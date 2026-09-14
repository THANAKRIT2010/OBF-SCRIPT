const fs = require("fs");
const os = require("os");
const path = require("path");
const axios = require("axios");
const { mutate, readDB } = require("../db");
const { notifyEvent } = require("../services/notifyService");

const AUDIO_ASSET_TYPE_ID = 3;
const REQUEST_HEADERS = { "User-Agent": "Roblox/WinInet", Accept: "application/json" };

// *** สำคัญ: แก้บั๊ก "ฟังเพลงไม่ได้หลังผ่านไปสักพัก" ***
// เดิมแคชไฟล์เสียงไว้ที่ os.tmpdir() (/tmp) บน Vercel ซึ่งเป็นดิสก์ชั่วคราวของแต่ละ instance เท่านั้น
// พอ serverless function เกิด cold start ใหม่ (มักเกิดหลังไม่มีคนเข้าเว็บสักพัก) ไฟล์ใน /tmp จะหายหมด
// ทำให้เพลงที่เคยฟังได้ กลับฟังไม่ได้อีกเมื่อ instance เปลี่ยน ทั้งที่โค้ดคิดว่ายังแคชอยู่
// แก้โดยย้ายไปเก็บถาวรที่ Vercel Blob แทน (ต้องเปิดใช้งาน Blob storage เหมือนที่ใช้กับระบบอัปโหลดรูป)
const AUDIO_DIR = path.join(__dirname, "..", "public", "audio"); // ใช้เฉพาะตอนรัน local/Wispbyte (มีดิสก์ถาวรจริง)
if (!process.env.VERCEL && !fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

function extractId(input) {
  const s = String(input || "").trim();
  const match = s.match(/(\d{5,})/);
  return match ? match[1] : null;
}

function localAudioPath(assetId) {
  return path.join(AUDIO_DIR, `${assetId}.mp3`);
}

async function resolveAssetLocations(assetId) {
  try {
    const res = await axios.get(`https://assetdelivery.roblox.com/v2/assetId/${assetId}`, {
      headers: REQUEST_HEADERS, timeout: 10000, validateStatus: () => true,
    });
    if (res.status === 200 && Array.isArray(res.data?.locations)) {
      return res.data.locations.map((l) => l.location).filter(Boolean);
    }
  } catch (_) {}
  return [];
}

async function downloadToBuffer(url) {
  const upstream = await axios.get(url, {
    headers: REQUEST_HEADERS, responseType: "arraybuffer", timeout: 25000, maxRedirects: 5, validateStatus: (s) => s === 200,
  });
  return Buffer.from(upstream.data);
}

// เช็คว่ามีไฟล์เสียงนี้แคชไว้ถาวรแล้วหรือยัง คืน URL ที่เล่นได้ตรงๆ ถ้ามี ไม่งั้นคืน null
async function findCachedAudioUrl(assetId) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { head } = require("@vercel/blob");
    try {
      const info = await head(blobPathnameFor(assetId));
      return info.url;
    } catch {
      return null; // ยังไม่เคยแคช
    }
  }
  const localPath = localAudioPath(assetId);
  return fs.existsSync(localPath) ? `/audio/${assetId}.mp3` : null;
}

function blobPathnameFor(assetId) {
  return `audio/${assetId}.mp3`;
}

// ดาวน์โหลดไฟล์เสียงมาเก็บถาวรครั้งเดียว จากนั้นเล่นจากที่เก็บไว้ตลอด (ไม่ยิงไปหา Roblox ซ้ำ)
// เพราะลองหลายช่องทาง (v2 location resolver ก่อน แล้วค่อย fallback ไป v1) กว่าจะยอมแพ้
// คืนค่า URL ที่เล่นได้ถ้าสำเร็จ, null ถ้าล้มเหลวทุกช่องทาง
async function downloadAndCacheAudio(assetId) {
  const candidates = [...(await resolveAssetLocations(assetId)), `https://assetdelivery.roblox.com/v1/asset/?id=${assetId}`];

  for (const url of candidates) {
    try {
      const buffer = await downloadToBuffer(url);
      if (!buffer || buffer.length === 0) continue;

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { put } = require("@vercel/blob");
        const blob = await put(blobPathnameFor(assetId), buffer, {
          access: "public",
          contentType: "audio/mpeg",
          addRandomSuffix: false, // กัน URL เปลี่ยนทุกครั้งที่อัปโหลดซ้ำ ให้เช็คไฟล์เดิมด้วย head() ได้แน่นอน
        });
        return blob.url;
      }

      const dest = localAudioPath(assetId);
      fs.writeFileSync(dest, buffer);
      return `/audio/${assetId}.mp3`;
    } catch (_) {
      // ลองช่องทางถัดไป
    }
  }
  return null;
}

async function getAssetInfo(assetId) {
  try {
    const res = await axios.get(`https://economy.roblox.com/v2/assets/${assetId}/details`, {
      headers: REQUEST_HEADERS, timeout: 8000, validateStatus: () => true,
    });
    const d = res.data;
    if (res.status === 200 && d && d.Name) {
      return { found: true, name: d.Name, creator: d.Creator?.Name || "ไม่ทราบผู้สร้าง", assetTypeId: d.AssetTypeId };
    }
  } catch (_) {}

  try {
    const res2 = await axios.get(`https://catalog.roblox.com/v1/catalog/items/${assetId}/details?itemType=Asset`, {
      headers: REQUEST_HEADERS, timeout: 8000, validateStatus: () => true,
    });
    const d = res2.data;
    if (res2.status === 200 && d && d.name) {
      return { found: true, name: d.name, creator: d.creatorName || "ไม่ทราบผู้สร้าง", assetTypeId: d.assetType?.id };
    }
  } catch (_) {}

  return { found: false };
}

// เช็คว่าแคชไว้แล้วหรือยัง ถ้ายังค่อยดาวน์โหลด — คืน true/false (ใช้แทนการเรียก downloadAndCacheAudio ตรงๆ ทุกจุด กันโหลดซ้ำโดยไม่จำเป็น)
async function ensureAudioCached(assetId) {
  const existing = await findCachedAudioUrl(assetId);
  if (existing) return true;
  const url = await downloadAndCacheAudio(assetId);
  return !!url;
}

async function fetchRobloxAssetInfo(assetId) {
  const info = await getAssetInfo(assetId);
  if (!info.found) return { found: false };

  const isAudio = info.assetTypeId === AUDIO_ASSET_TYPE_ID;
  const usable = isAudio ? await ensureAudioCached(assetId) : false;

  let thumbnail = null;
  try {
    const thumbRes = await axios.get("https://thumbnails.roblox.com/v1/assets", {
      params: { assetIds: assetId, size: "150x150", format: "Png" },
      headers: REQUEST_HEADERS, timeout: 6000, validateStatus: () => true,
    });
    thumbnail = thumbRes.data?.data?.[0]?.imageUrl || null;
  } catch (_) {
    thumbnail = null;
  }

  return { found: true, id: String(assetId), name: info.name, creator: info.creator, is_audio: isAudio, usable, thumbnail };
}

async function checkRobloxId(req, res) {
  const assetId = extractId(req.params.id);
  if (!assetId) return res.status(400).json({ error: "invalid_id" });

  try {
    const info = await fetchRobloxAssetInfo(assetId);
    if (!info.found) return res.status(404).json({ error: "not_found" });
    res.json(info);
  } catch (err) {
    res.status(502).json({ error: "roblox_unreachable" });
  }
}

async function listCatalog(req, res) {
  const db = await readDB();
  const list = db.roblox_sounds
    .slice()
    .sort((a, b) => b.added_at - a.added_at)
    .map((s) => ({ ...s, playable: s.cached !== false }));
  res.json(list);
}

// POST /api/roblox/:id/retry-cache — ลองดาวน์โหลดเสียงที่เล่นไม่ได้ใหม่อีกครั้ง (เผื่อ Roblox แก้ปัญหาฝั่งเขาแล้ว)
async function retryCache(req, res) {
  const assetId = extractId(req.params.id);
  if (!assetId) return res.status(400).json({ error: "invalid_id" });
  const ok = await ensureAudioCached(assetId);
  await mutate((db) => {
    const s = db.roblox_sounds.find((s) => s.id === assetId);
    if (s) s.cached = ok;
  });
  res.json({ playable: ok });
}

async function addToCatalog(req, res) {
  const assetId = extractId(req.body.id);
  if (!assetId) return res.status(400).json({ error: "invalid_id" });

  let info;
  try {
    info = await fetchRobloxAssetInfo(assetId);
  } catch (err) {
    return res.status(502).json({ error: "roblox_unreachable" });
  }
  if (!info.found) return res.status(404).json({ error: "not_found" });
  if (!info.is_audio) return res.status(422).json({ error: "not_audio_asset" });

  const customName = req.body.name ? String(req.body.name).trim().slice(0, 80) : "";
  const genreId = req.body.genre_id ? String(req.body.genre_id) : "";

  const entry = {
    id: info.id,
    name: customName || info.name,
    original_name: info.name,
    is_custom_name: Boolean(customName),
    creator: info.creator,
    thumbnail: info.thumbnail,
    verified: true,
    cached: info.usable,
    genre_id: genreId,
    added_by: req.session.user.discord_id,
    added_by_name: req.session.user.username,
    added_at: Math.floor(Date.now() / 1000),
  };

  const result = await mutate((db) => {
    if (db.roblox_sounds.some((s) => s.id === entry.id)) return { ok: false, code: 409 };
    db.roblox_sounds.push(entry);
    return { ok: true };
  });

  if (!result.ok) return res.status(result.code).json({ error: "already_in_catalog" });
  res.status(201).json(entry);
}

async function removeFromCatalog(req, res) {
  const assetId = req.params.id;
  await mutate((db) => {
    db.roblox_sounds = db.roblox_sounds.filter((s) => s.id !== assetId);
  });
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { head, del } = require("@vercel/blob");
      const info = await head(blobPathnameFor(assetId));
      await del(info.url);
    } catch (_) { /* ไม่มีไฟล์แคชอยู่แล้วก็ไม่เป็นไร */ }
  } else {
    const localPath = localAudioPath(assetId);
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  }
  res.status(204).end();
}

// PATCH /api/roblox/:id — แก้ไขชื่อเพลง/หมวดหมู่ที่เพิ่มไว้แล้ว
async function updateCatalogEntry(req, res) {
  const { name, genre_id } = req.body;
  const result = await mutate((db) => {
    const s = db.roblox_sounds.find((s) => s.id === req.params.id);
    if (!s) return null;
    if (name !== undefined && String(name).trim()) {
      s.name = String(name).trim().slice(0, 80);
      s.is_custom_name = true;
    }
    if (genre_id !== undefined) s.genre_id = String(genre_id);
    return s;
  });
  if (!result) return res.status(404).json({ error: "not_found" });
  res.json(result);
}

async function listGenres(req, res) {
  const db = await readDB();
  res.json(db.roblox_genres.slice().sort((a, b) => (a.order ?? 999) - (b.order ?? 999)));
}

async function addGenre(req, res) {
  const { title, image, order } = req.body;
  if (!title || !String(title).trim()) return res.status(400).json({ error: "missing_title" });
  const genre = {
    id: String(title).trim().toLowerCase().replace(/[^a-z0-9ก-๙]+/gi, "-").slice(0, 40) || `genre-${Date.now()}`,
    title: String(title).slice(0, 40),
    image: image || "",
    order: Number.isFinite(Number(order)) ? Number(order) : 999,
  };
  const result = await mutate((db) => {
    if (db.roblox_genres.some((g) => g.id === genre.id)) return { ok: false };
    db.roblox_genres.push(genre);
    return { ok: true };
  });
  if (!result.ok) return res.status(409).json({ error: "already_exists" });
  res.status(201).json(genre);
}

async function updateGenre(req, res) {
  const { title, image, order } = req.body;
  const result = await mutate((db) => {
    const g = db.roblox_genres.find((g) => g.id === req.params.id);
    if (!g) return null;
    if (title !== undefined) g.title = String(title).slice(0, 40);
    if (image !== undefined) g.image = image;
    if (order !== undefined && Number.isFinite(Number(order))) g.order = Number(order);
    return g;
  });
  if (!result) return res.status(404).json({ error: "not_found" });
  res.json(result);
}

async function removeGenre(req, res) {
  await mutate((db) => {
    db.roblox_genres = db.roblox_genres.filter((g) => g.id !== req.params.id);
    db.roblox_sounds.forEach((s) => { if (s.genre_id === req.params.id) s.genre_id = ""; });
  });
  res.status(204).end();
}

async function streamAudio(req, res) {
  const assetId = extractId(req.params.id);
  if (!assetId) return res.status(400).json({ error: "invalid_id" });

  const cachedUrl = await findCachedAudioUrl(assetId);
  if (cachedUrl) {
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.redirect(302, cachedUrl);
  }

  const newUrl = await downloadAndCacheAudio(assetId);
  if (newUrl) {
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.redirect(302, newUrl);
  }

  res.status(502).json({ error: "roblox_unreachable" });
}

async function listMyFavorites(req, res) {
  const db = await readDB();
  res.json(db.favorites[req.session.user.discord_id] || []);
}

async function toggleFavorite(req, res) {
  const { id, name, thumbnail } = req.body;
  if (!id) return res.status(400).json({ error: "missing_id" });
  const userId = req.session.user.discord_id;

  const result = await mutate((db) => {
    if (!db.favorites[userId]) db.favorites[userId] = [];
    const list = db.favorites[userId];
    const idx = list.findIndex((f) => f.id === String(id));
    if (idx !== -1) {
      list.splice(idx, 1);
      return { favorited: false, list };
    }
    list.unshift({ id: String(id), name: name || "", thumbnail: thumbnail || "", added_at: Math.floor(Date.now() / 1000) });
    return { favorited: true, list };
  });
  res.json(result);
}

async function trackCopy(req, res) {
  const { id, name } = req.body;
  const user = req.session.user;
  notifyEvent("roblox_copied", {
    title: "📋 มีคนคัดลอก Roblox ID",
    description: name ? `${name} (ID: ${id})` : `ID: ${id}`,
    fields: [{ name: "คัดลอกโดย", value: user ? user.username : "ผู้เยี่ยมชม (ยังไม่ login)" }],
  }).catch((e) => console.error("notifyEvent failed:", e.message));
  res.status(204).end();
}

module.exports = { checkRobloxId, listCatalog, addToCatalog, removeFromCatalog, updateCatalogEntry, streamAudio, listMyFavorites, toggleFavorite, trackCopy, retryCache, listGenres, addGenre, updateGenre, removeGenre };
