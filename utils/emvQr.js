// utils/emvQr.js — ตัวอ่านโครงสร้าง EMVCo QR (มาตรฐานเดียวกับ PromptPay) แบบ best-effort
// รูปแบบ: tag (2 หลัก) + length (2 หลัก) + value (ยาวตาม length) วนไปเรื่อยๆ จนหมดสาย
// tag "54" = จำนวนเงิน (Transaction Amount) ตามสเปก EMVCo
//
// *** ข้อจำกัดสำคัญที่ต้องเข้าใจก่อนใช้ ***
// สลิปโอนเงินจากแอปธนาคารส่วนใหญ่ "ไม่ได้" เข้ารหัส QR เป็น EMVCo แบบนี้ตรงๆ
// หลายธนาคารจะฝัง QR เป็นลิงก์ตรวจสอบสลิปของธนาคารเอง (เช่น URL พร้อม token) แทน
// ถ้า parse แบบนี้ไม่เจอ tag 54 ก็คือ "อ่านจำนวนเงินจาก QR ไม่ได้" ไม่ใช่ error แต่เป็นข้อจำกัดของรูปแบบสลิปนั้นๆ
// การจะยืนยันยอดเงิน/ชื่อผู้รับได้แม่นยำ 100% ต้องเชื่อมกับ API ตรวจสอบสลิปของธนาคารหรือผู้ให้บริการที่เชื่อถือได้ (เช่น SlipOK, EasySlip)
function parseEmvAmount(qrData) {
  try {
    if (!/^\d{2}\d{2}/.test(qrData)) return null; // ไม่ใช่รูปแบบตัวเลข tag/length เลย ข้ามไปเลย
    let i = 0;
    while (i + 4 <= qrData.length) {
      const tag = qrData.slice(i, i + 2);
      const len = parseInt(qrData.slice(i + 2, i + 4), 10);
      if (Number.isNaN(len)) return null;
      const value = qrData.slice(i + 4, i + 4 + len);
      if (tag === "54" && value) {
        const amount = parseFloat(value);
        return Number.isFinite(amount) ? amount : null;
      }
      i += 4 + len;
      if (len === 0) break; // กัน infinite loop ถ้ารูปแบบผิดคาด
    }
    return null;
  } catch {
    return null;
  }
}

module.exports = { parseEmvAmount };
