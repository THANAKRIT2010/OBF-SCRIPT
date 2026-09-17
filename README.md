# PromptPay QR Generator — Vercel

เวอร์ชันแก้ไขสำหรับ PromptPay QR แบบกำหนดยอดเงิน

## สิ่งที่แก้

- ใช้ PromptPay AID `A000000677010111`
- เบอร์ไทย `08xxxxxxxx` ถูกแปลงเป็นรูปแบบ `0066xxxxxxxxx`
- ใช้ Tag 29 / sub-tag 01 สำหรับเบอร์มือถือ
- ใช้ Tag 54 สำหรับยอดเงิน
- ใช้ Point of Initiation Method `12` เมื่อกำหนดยอด
- คำนวณ CRC-16/CCITT-FALSE โดยรวม `6304` ก่อน checksum
- ไม่มี Root Directory ชื่อ `web`

## รันในเครื่อง

ต้องมี Node.js 18+

```bash
npm install
npm run dev
```

เปิด http://localhost:3000

## Deploy Vercel

โครงสร้างใน GitHub ต้องเป็น:

```text
app/
package.json
.gitignore
README.md
```

ใน Vercel:
- Framework Preset: Next.js
- Root Directory: `.` หรือปล่อยว่าง
- Build Command: `npm run build`
- Output Directory: ค่าเริ่มต้นของ Next.js
- ไม่ต้องตั้ง Environment Variables

## สำคัญ

ก่อนใช้รับเงินจริง ให้สแกนทดสอบด้วย K PLUS หรือแอปธนาคารอื่นและตรวจสอบชื่อผู้รับ/ยอดเงินทุกครั้ง

QR นี้เป็น PromptPay transfer QR สำหรับ PromptPay ID ไม่ใช่ KShop merchant QR หรือ Bill Payment QR
