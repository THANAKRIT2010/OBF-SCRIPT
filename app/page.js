"use client";

import { useState } from "react";
import QRCode from "qrcode";

function tlv(tag, value) {
  return tag + String(value.length).padStart(2, "0") + value;
}

// CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF
function crc16ccitt(data) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(data)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x8000)
        ? ((crc << 1) ^ 0x1021)
        : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function getTarget(input) {
  const digits = input.replace(/\D/g, "");

  // Thai mobile number: 08xxxxxxxx / 09xxxxxxxx / 06xxxxxxxx
  if (/^0[689]\d{8}$/.test(digits)) {
    return {
      type: "01",
      value: "0066" + digits.slice(1)
    };
  }

  // International Thai mobile format: 668xxxxxxxx
  if (/^66[689]\d{8}$/.test(digits)) {
    return {
      type: "01",
      value: "00" + digits
    };
  }

  // National ID / Tax ID
  if (/^\d{13}$/.test(digits)) {
    return {
      type: "02",
      value: digits
    };
  }

  throw new Error("กรุณากรอกเบอร์ PromptPay 10 หลัก หรือเลขบัตรประชาชน 13 หลัก");
}

function makePromptPayPayload(promptPay, amount) {
  const target = getTarget(promptPay);
  const numericAmount = Number(String(amount).replace(/,/g, ""));

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("กรุณากรอกจำนวนเงินที่มากกว่า 0 บาท");
  }

  if (numericAmount > 999999999.99) {
    throw new Error("จำนวนเงินสูงเกินไป");
  }

  // PromptPay merchant-presented QR:
  // 00 = payload format
  // 01 = 12 (dynamic / fixed amount)
  // 29 = PromptPay credit transfer
  // 53 = THB
  // 54 = amount
  // 58 = TH
  const merchantAccount =
    tlv("00", "A000000677010111") +
    tlv(target.type, target.value);

  let payload =
    tlv("00", "01") +
    tlv("01", "12") +
    tlv("29", merchantAccount) +
    tlv("53", "764") +
    tlv("54", numericAmount.toFixed(2)) +
    tlv("58", "TH");

  // CRC is calculated over the complete payload + Tag 63 + length 04
  payload += "6304";
  payload += crc16ccitt(payload);

  return payload;
}

export default function Home() {
  const [promptPay, setPromptPay] = useState("");
  const [amount, setAmount] = useState("");
  const [qr, setQr] = useState("");
  const [payload, setPayload] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function generateQR() {
    setError("");
    setQr("");
    setPayload("");
    setBusy(true);

    try {
      const value = makePromptPayPayload(promptPay, amount);

      const dataUrl = await QRCode.toDataURL(value, {
        type: "image/png",
        width: 440,
        margin: 4,
        errorCorrectionLevel: "M",
      });

      setPayload(value);
      setQr(dataUrl);
    } catch (err) {
      setError(err?.message || "สร้าง QR ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  function downloadQR() {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `promptpay-${Number(amount).toFixed(2)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function copyPayload() {
    if (!payload) return;
    await navigator.clipboard.writeText(payload);
    alert("คัดลอกข้อมูล QR แล้ว");
  }

  return (
    <main className="page">
      <section className="card">
        <div className="badge">PROMPTPAY QR</div>
        <h1>สร้าง QR รับเงิน</h1>
        <p className="subtitle">
          กรอก PromptPay และยอดเงินเพื่อสร้าง QR แบบกำหนดยอด
        </p>

        <label htmlFor="promptpay">เบอร์ PromptPay / เลขบัตรประชาชน</label>
        <input
          id="promptpay"
          inputMode="numeric"
          autoComplete="off"
          value={promptPay}
          onChange={(e) => setPromptPay(e.target.value)}
          placeholder="เช่น 0812345678"
        />

        <label htmlFor="amount">จำนวนเงิน (บาท)</label>
        <input
          id="amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="เช่น 100.00"
        />

        <button className="primary" onClick={generateQR} disabled={busy}>
          {busy ? "กำลังสร้าง..." : "สร้าง QR"}
        </button>

        {error && <div className="error">{error}</div>}

        {qr && (
          <div className="result">
            <img className="qr" src={qr} alt="PromptPay QR Code" />
            <div className="amount">{Number(amount).toFixed(2)} บาท</div>

            <div className="actions">
              <button onClick={downloadQR}>ดาวน์โหลด QR</button>
              <button onClick={copyPayload}>คัดลอก Payload</button>
            </div>

            <p className="warning">
              ทดสอบด้วยแอปธนาคารก่อนใช้งานจริง และตรวจสอบชื่อผู้รับกับยอดเงิน
              ทุกครั้งก่อนกดยืนยันการโอน
            </p>
          </div>
        )}

        <p className="footer">
          เว็บนี้สร้างข้อมูล QR จากข้อมูลที่คุณกรอกในเบราว์เซอร์
          ไม่ขอ PIN, OTP หรือรหัสผ่านธนาคาร
        </p>
      </section>
    </main>
  );
}
