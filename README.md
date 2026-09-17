# PromptPay QR Generator

เว็บสร้าง PromptPay QR แบบกำหนดยอดเงิน เหมาะสำหรับนำไป Deploy บน Vercel

## รันในเครื่อง

ต้องมี Node.js 18 ขึ้นไป

```bash
npm install
npm run dev
```

เปิด http://localhost:3000

## Deploy บน Vercel

1. สร้าง repository ใหม่บน GitHub
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้
3. เข้า Vercel และเลือก Add New Project
4. Import repository จาก GitHub
5. Framework Preset: Next.js
6. กด Deploy

ไม่ต้องใส่ Environment Variables สำหรับเวอร์ชันนี้

## สำคัญ

ผู้ใช้ควรตรวจสอบชื่อผู้รับและยอดเงินในแอปธนาคารก่อนยืนยันการจ่ายเงินทุกครั้ง
เว็บนี้ไม่เก็บ PIN, OTP หรือรหัสผ่านธนาคาร
