// services/emailService.js — ส่งอีเมลผ่าน Resend (resend.com) ใช้สำหรับส่งรหัส OTP เท่านั้น
const axios = require("axios");
const { resend } = require("../config/env");

async function sendOtpEmail(toEmail, otp, purpose) {
  if (!resend.apiKey || !resend.fromEmail) {
    throw new Error("ยังไม่ได้ตั้งค่าระบบส่งอีเมล (RESEND_API_KEY/RESEND_FROM_EMAIL) — ติดต่อแอดมินให้ตั้งค่าก่อน");
  }
  const purposeText = purpose === "register" ? "ยืนยันการสมัครสมาชิก" : "รีเซ็ตรหัสผ่าน";
  const html = `
    <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px;background:#0F1420;color:#F1F5F9;border-radius:16px">
      <h2 style="margin:0 0 8px;font-size:18px">Flexozy</h2>
      <p style="color:#94A3B8;font-size:13px;margin:0 0 20px">รหัส OTP สำหรับ${purposeText}ของคุณ</p>
      <div style="background:#151B2B;border:1px solid #232B3D;border-radius:12px;padding:18px;text-align:center;margin-bottom:16px">
        <span style="font-size:28px;font-weight:800;letter-spacing:6px;color:#818CF8">${otp}</span>
      </div>
      <p style="color:#64748B;font-size:11.5px;line-height:1.6">รหัสนี้จะหมดอายุภายใน 10 นาที หากคุณไม่ได้ทำรายการนี้ กรุณาเพิกเฉยต่ออีเมลฉบับนี้</p>
    </div>`;

  await axios.post(
    "https://api.resend.com/emails",
    { from: resend.fromEmail, to: toEmail, subject: `[Flexozy] รหัส OTP ${purposeText}: ${otp}`, html },
    { headers: { Authorization: `Bearer ${resend.apiKey}`, "Content-Type": "application/json" }, timeout: 10000 }
  );
}

module.exports = { sendOtpEmail };
