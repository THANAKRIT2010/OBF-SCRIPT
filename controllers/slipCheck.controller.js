// controllers/slipCheck.controller.js — Slip Check API (เช็ค QR ซ้ำ + อ่านยอดเงินแบบ best-effort)
// เข้าถึงด้วย header: X-API-Key: flx_xxxxxxxx (ต้องเป็นคีย์ที่แอดมินอนุมัติแล้วเท่านั้น)
//
// *** สิ่งที่ endpoint นี้ "ยืนยันได้จริง" ***
// - อ่าน QR Code จากรูปสลิปได้หรือไม่
// - สลิปนี้เคยถูกส่งมาเช็คซ้ำหรือไม่ (กันเอาสลิปเดิมมาใช้ซ้ำ)
// - ถ้า QR เป็นรูปแบบ EMVCo (พบได้บ้างแล้วแต่ธนาคาร) จะอ่านยอดเงินที่ฝังอยู่ใน QR ได้
//
// *** สิ่งที่ endpoint นี้ "ยืนยันไม่ได้" (ต้องบอกผู้ใช้ API ให้ชัดเจน) ***
// - ไม่ได้เชื่อมกับธนาคารจริง จึงไม่สามารถยืนยัน 100% ว่าเงินถูกโอนเข้าบัญชีจริง
// - สลิปปลอมที่สร้าง QR เองแบบมี tag 54 (ยอดเงิน) ที่ถูกต้องตามฟอร์แมต จะผ่านการอ่านค่าได้เหมือนสลิปจริง
// - ชื่อผู้รับส่วนใหญ่ "อ่านไม่ได้" จาก QR เพราะไม่ได้เข้ารหัสไว้ในสลิปส่วนใหญ่
// ถ้าต้องการยืนยันกับธนาคารจริง 100% ต้องเชื่อมต่อ API ของธนาคารหรือผู้ให้บริการตรวจสลิป (เช่น SlipOK, EasySlip) เพิ่มเติม
const sharp = require("sharp");
const jsQR = require("jsqr");
const crypto = require("crypto");
const { nanoid } = require("nanoid");
const { readDB, mutate } = require("../db");
const { hashApiKey } = require("../utils/apiKey");
const { parseEmvAmount } = require("../utils/emvQr");
const { checkRateLimit } = require("../utils/rateLimit");

function hashQr(qrData) {
  return crypto.createHash("sha256").update(qrData).digest("hex");
}

async function readQrFromImage(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const qr = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  return qr ? qr.data : null;
}

// POST /api/slip-check  (multipart/form-data, field name "file")  header: X-API-Key
async function checkSlip(req, res) {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    return res.status(401).json({ success: false, error: "missing_api_key", message: "ต้องแนบ header X-API-Key มาด้วย" });
  }

  const db = await readDB();
  const keyHash = hashApiKey(String(apiKey));
  const keyRow = db.api_keys.find((k) => k.key_hash === keyHash);

  if (!keyRow || keyRow.status !== "approved") {
    return res.status(401).json({ success: false, error: "invalid_api_key", message: "API key ไม่ถูกต้อง หรือยังไม่ได้รับอนุมัติ/ถูกระงับแล้ว" });
  }

  const today = new Date().toISOString().slice(0, 10);
  const rl = await checkRateLimit(`slipcheck:${keyRow.id}:${today}`, { limit: keyRow.rate_limit_per_day, windowSeconds: 86400 });
  if (!rl.allowed) {
    return res.status(429).json({ success: false, error: "rate_limit_exceeded", message: `ใช้ครบโควตา ${keyRow.rate_limit_per_day} ครั้ง/วันแล้ว`, retry_after: rl.retryAfterSeconds });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, error: "missing_file", message: "กรุณาแนบไฟล์รูปสลิปมาในฟิลด์ชื่อ file" });
  }

  let qrData;
  try {
    qrData = await readQrFromImage(req.file.buffer);
  } catch (e) {
    return res.status(400).json({ success: false, error: "invalid_image", message: "อ่านไฟล์รูปไม่ได้ กรุณาส่งไฟล์ภาพที่ถูกต้อง (jpg/png)" });
  }

  if (!qrData) {
    return res.json({ success: true, qr_found: false, error: "ไม่พบ QR Code ในรูปสลิปนี้" });
  }

  const qrHash = hashQr(qrData);
  const duplicate = db.slip_checks.some((s) => s.qr_hash === qrHash);
  const amount = parseEmvAmount(qrData);

  await mutate((d) => {
    d.slip_checks.push({
      id: nanoid(10),
      api_key_id: keyRow.id,
      qr_hash: qrHash,
      qr_raw: qrData.slice(0, 500),
      amount,
      duplicate,
      created_at: Math.floor(Date.now() / 1000),
    });
    const k = d.api_keys.find((x) => x.id === keyRow.id);
    if (k) k.usage_count = (k.usage_count || 0) + 1;
  });

  res.json({
    success: true,
    qr_found: true,
    duplicate,
    amount, // best-effort จาก QR เท่านั้น ไม่ใช่ยอดที่ยืนยันกับธนาคารจริง — เป็น null ถ้าอ่านไม่ได้
    receiver_name: null, // ส่วนใหญ่อ่านจาก QR ไม่ได้ (ดูหมายเหตุด้านบนของไฟล์นี้)
    qr_raw: qrData,
    bank_verified: false,
    note: "ผลลัพธ์นี้มาจากการอ่าน QR Code ในรูปเท่านั้น ไม่ได้เชื่อมต่อกับธนาคารจริง จึงไม่สามารถยืนยัน 100% ว่ามีการโอนเงินเกิดขึ้นจริง แนะนำให้ตรวจสอบยอดเงินในบัญชีจริงเพิ่มเติมสำหรับรายการที่มูลค่าสูง",
  });
}

module.exports = { checkSlip };
