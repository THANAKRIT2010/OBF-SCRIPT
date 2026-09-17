"use client";

import { useState } from "react";
import QRCode from "qrcode";

function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function tlv(id, value) {
  return id + String(value.length).padStart(2, "0") + value;
}

function normalizePromptPay(input) {
  const digits = input.replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) return "0066" + digits.slice(1);
  if (/^66\d{9}$/.test(digits)) return "00" + digits;
  if (/^\d{13}$/.test(digits)) return digits;
  return null;
}

function createPromptPayPayload(promptPay, amount) {
  const target = normalizePromptPay(promptPay);
  if (!target) throw new Error("กรุณากรอกเบอร์ PromptPay 10 หลัก หรือเลขบัตรประชาชน 13 หลัก");

  const amountNumber = Number(amount);
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    throw new Error("กรุณากรอกจำนวนเงินที่มากกว่า 0");
  }

  const merchantAccount =
    tlv("00", "A000000677010111") +
    tlv(target.length === 13 ? "02" : "01", target);

  let payload =
    tlv("00", "01") +
    tlv("01", "12") +
    tlv("29", merchantAccount) +
    tlv("53", "764") +
    tlv("54", amountNumber.toFixed(2)) +
    tlv("58", "TH") +
    tlv("63", "0000");

  payload = payload.slice(0, -4) + crc16(payload);
  return payload;
}

export default function QRGenerator() {
  const [promptPay, setPromptPay] = useState("");
  const [amount, setAmount] = useState("");
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate() {
    setError("");
    setQr("");
    setCopied(false);

    try {
      const payload = createPromptPayPayload(promptPay, amount);
      const dataUrl = await QRCode.toDataURL(payload, {
        width: 420,
        margin: 2,
        errorCorrectionLevel: "M",
      });
      setQr(dataUrl);
    } catch (e) {
      setError(e.message || "สร้าง QR ไม่สำเร็จ");
    }
  }

  function downloadQR() {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `promptpay-${Number(amount).toFixed(2)}.png`;
    a.click();
  }

  async function copyPayload() {
    try {
      const payload = createPromptPayPayload(promptPay, amount);
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setError(e.message || "คัดลอกไม่สำเร็จ");
    }
  }

  return (
    <main className="page">
      <section className="card">
        <div className="brand">PromptPay QR</div>
        <h1>สร้าง QR รับเงิน</h1>
        <p className="subtitle">กรอก PromptPay และยอดเงิน แล้วสร้าง QR ได้ทันที</p>

        <label>เบอร์ PromptPay</label>
        <input
          inputMode="numeric"
          value={promptPay}
          onChange={(e) => setPromptPay(e.target.value)}
          placeholder="เช่น 0812345678"
          maxLength={13}
        />

        <label>จำนวนเงิน (บาท)</label>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="เช่น 100.00"
        />

        <button className="primary" onClick={generate}>
          สร้าง QR
        </button>

        {error && <div className="error">{error}</div>}

        {qr && (
          <div className="result">
            <img className="qr" src={qr} alt="PromptPay QR Code" />
            <div className="amount">{Number(amount).toFixed(2)} บาท</div>
            <div className="actions">
              <button onClick={downloadQR}>ดาวน์โหลด QR</button>
              <button onClick={copyPayload}>
                {copied ? "คัดลอกแล้ว" : "คัดลอกข้อมูล QR"}
              </button>
            </div>
            <p className="note">
              ตรวจสอบชื่อผู้รับและยอดเงินในแอปธนาคารก่อนยืนยันการโอนทุกครั้ง
            </p>
          </div>
        )}

        <div className="footer">
          QR นี้สร้างจากข้อมูลที่กรอกในหน้านี้ และเว็บไซต์ไม่ได้ขอ PIN, OTP หรือรหัสผ่านธนาคาร
        </div>
      </section>
    </main>
  );
}
