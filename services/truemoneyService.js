// services/truemoneyService.js — แลก "ซองอั่งเปา" TrueMoney Wallet ที่ลูกค้าส่งลิงก์มาให้
// วิธีนี้เป็นวิธีที่เว็บ/ชุมชนขนาดเล็กในไทยใช้กันทั่วไปเพื่อรับเงินโดยไม่ต้องสมัคร merchant account
// หลักการ: ลูกค้าเปิดแอป TrueMoney -> ส่ง "ซองอั่งเปา" ตามยอดที่จะเติม -> ได้ลิงก์ gift.truemoney.com/campaign/?v=xxxx
// เราเอาลิงก์นั้นมา "แลก" (redeem) เข้าเบอร์ TrueMoney ของร้านเอง ระบบจะตรวจสอบยอดจริงจาก TrueMoney โดยตรง
// ป้องกันการแจ้งยอดเท็จ เพราะถ้าซองถูกแลกไปแล้ว (โดยเราเองหรือคนอื่น) จะแลกซ้ำไม่ได้
const axios = require("axios");
const { truemoneyPhone } = require("../config/env");

function extractVoucherHash(link) {
  try {
    const url = new URL(link);
    const v = url.searchParams.get("v");
    return v || null;
  } catch {
    // เผื่อผู้ใช้วางมาแค่ตัว hash ตรงๆ ไม่ใช่ลิงก์เต็ม
    return /^[a-zA-Z0-9]{15,40}$/.test(link) ? link : null;
  }
}

// redeemVoucher(link) -> { success, amount, message }
async function redeemVoucher(link) {
  if (!truemoneyPhone) {
    throw new Error("ยังไม่ได้ตั้งค่า TRUEMONEY_PHONE — ติดต่อแอดมินให้ตั้งค่าเบอร์รับเงินก่อน");
  }
  const voucherHash = extractVoucherHash(link);
  if (!voucherHash) {
    return { success: false, message: "ลิงก์ซองอั่งเปาไม่ถูกต้อง กรุณาคัดลอกลิงก์เต็มจากแอป TrueMoney" };
  }

  try {
    const res = await axios.post(
      `https://gift.truemoney.com/campaign/vouchers/${voucherHash}/redeem`,
      { mobile: truemoneyPhone, voucher_hash: voucherHash },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );
    const data = res.data;
    if (data?.status?.code === "SUCCESS") {
      const amount = parseFloat(data.data.my_ticket.amount_baht);
      return { success: true, amount, message: "แลกซองสำเร็จ" };
    }
    // รหัส error ที่ TrueMoney ส่งกลับมาบ่อยๆ แปลเป็นข้อความที่เข้าใจง่าย
    const code = data?.status?.code;
    const knownErrors = {
      VOUCHER_NOT_FOUND: "ไม่พบซองอั่งเปานี้ กรุณาตรวจสอบลิงก์อีกครั้ง",
      VOUCHER_OUT_OF_STOCK: "ซองนี้ถูกแลกไปแล้ว ใช้ซ้ำไม่ได้",
      VOUCHER_EXPIRED: "ซองนี้หมดอายุแล้ว",
      TARGET_USER_NOT_FOUND: "เบอร์ปลายทางของร้านไม่ถูกต้อง กรุณาติดต่อแอดมิน",
    };
    return { success: false, message: knownErrors[code] || `แลกซองไม่สำเร็จ (${code || "unknown_error"})` };
  } catch (err) {
    console.error("TrueMoney redeem error:", err.response?.data || err.message);
    return { success: false, message: "เชื่อมต่อ TrueMoney ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}

module.exports = { redeemVoucher, extractVoucherHash };
