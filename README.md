# Flexozy

ร้านขาย สคริปต์ / โปรแกรม / คีย์ลิขสิทธิ์ พร้อมระบบหลังบ้านครบ:

- 🎨 ธีมสี/ดีไซน์ glassmorphism โทนน้ำเงิน (#92bbff) แบบเดียวกับตัวอย่างที่ให้มา
- 🔐 ล็อกอินด้วย Discord (แสดงชื่อ, รูปโปรไฟล์, แบนเนอร์)
- 🛠️ Admin panel: เพิ่ม/แก้ไข/ลบสินค้า, อัปโหลดไฟล์, ใส่ลิงก์, จัดการคำสั่งซื้อ
- 🔑 ระบบ License Key ที่ตั้งอายุได้ พร้อม API ตรวจสอบคีย์แบบ real-time
- 📦 ประวัติคำสั่งซื้อของลูกค้า

---

## 1. สิ่งที่ต้องเตรียมก่อน deploy

| อะไร | เอาไปทำอะไร | หาได้ที่ไหน |
|---|---|---|
| ฐานข้อมูล Postgres | เก็บสินค้า/ออเดอร์/คีย์/ผู้ใช้ | [Vercel Postgres](https://vercel.com/storage/postgres) หรือ [Neon](https://neon.tech) (ฟรี) |
| Discord App (Client ID/Secret) | ระบบ login ด้วย Discord | [discord.com/developers/applications](https://discord.com/developers/applications) |
| Discord User ID ของคุณ | กำหนดสิทธิ์ admin | เปิด Developer Mode ใน Discord แล้วคลิกขวาที่โปรไฟล์ตัวเอง > Copy User ID |
| Vercel Blob token (ถ้าจะอัปโหลดไฟล์) | เก็บไฟล์สินค้าที่อัปโหลด | เปิดใช้ "Blob" integration ในโปรเจกต์ Vercel |

## 2. ตั้งค่า Discord App

1. ไปที่ https://discord.com/developers/applications → New Application → ตั้งชื่อ "Flexozy"
2. เมนู **OAuth2 → General**: คัดลอก **Client ID** และ **Client Secret**
3. เมนู **OAuth2 → Redirects**: เพิ่ม
   - `http://localhost:3000/api/auth/callback/discord` (ตอน dev)
   - `https://your-domain.vercel.app/api/auth/callback/discord` (ตอน production)
4. ถ้าอยากได้โลโก้/ไอคอนแอปเป็น Flexozy ก็อัปโหลดที่หน้า General ได้เลย

## 3. รันในเครื่องตัวเอง (local dev)

```bash
npm install
cp .env.example .env       # แล้วกรอกค่าให้ครบ
npx prisma db push         # สร้างตารางในฐานข้อมูล
npm run dev
```

เปิด http://localhost:3000 — ล็อกอินด้วย Discord ของคุณ (ที่ใส่ ID ไว้ใน `ADMIN_DISCORD_IDS`) แล้วจะเห็นเมนู "จัดการระบบ" ปรากฏขึ้นในหน้าเว็บ ไปที่ `/admin/products` เพื่อเพิ่มสินค้าชิ้นแรก

## 4. Deploy บน Vercel

1. Push โปรเจกต์นี้ขึ้น GitHub repo
2. ไปที่ [vercel.com/new](https://vercel.com/new) แล้ว import repo นี้
3. ในหน้า **Environment Variables** ใส่ค่าตาม `.env.example` ให้ครบ (`NEXTAUTH_URL` ให้ใส่เป็นโดเมนจริง เช่น `https://flexozy.online`)
4. กด **Deploy**
5. หลัง deploy เสร็จ ไปที่ Vercel project → **Storage** → เพิ่ม **Postgres** (หรือเชื่อม Neon) แล้วรัน migration:
   ```bash
   npx prisma db push
   ```
   (รันจากเครื่องตัวเองโดยตั้ง `DATABASE_URL` เป็นของ production ชั่วคราว หรือใช้ Vercel CLI: `vercel env pull` ก่อนรันคำสั่งนี้)
6. ถ้าจะใช้ "อัปโหลดไฟล์": ไปที่ Vercel project → **Storage → Blob → Create**, ระบบจะเพิ่ม `BLOB_READ_WRITE_TOKEN` ให้อัตโนมัติ

## 5. วิธีใช้ API ตรวจสอบคีย์ (ที่สคริปต์/โปรแกรมของคุณจะเรียก)

```
GET https://your-domain.vercel.app/api/v1/key/FLEXOZY-XXXX-XXXX-XXXX-XXXX
GET https://your-domain.vercel.app/V1/key/FLEXOZY-XXXX-XXXX-XXXX-XXXX   (path แบบเดียวกับที่ขอไว้ก็ใช้ได้ ผ่าน rewrite)
```

ตัวอย่าง response:

```json
{ "valid": true, "product": "Flexozy Script Pro", "expiresAt": "2026-10-26T00:00:00.000Z" }
```

ถ้าคีย์หมดอายุ / ถูกเพิกถอน / ไม่พบ จะได้ `{ "valid": false, "reason": "expired" }` กลับมาพร้อม HTTP status 403/404

ใส่ `?hwid=รหัสเครื่อง` ต่อท้ายได้ ถ้าต้องการล็อกคีย์ให้ใช้ได้แค่เครื่องแรกที่เช็ค (hardware lock)

## 6. เรื่องสำคัญที่ต้องรู้ก่อนเปิดขายจริง

- **ยังไม่ได้ต่อระบบชำระเงินจริง** ตอนนี้ปุ่ม "ซื้อทันที" จะสร้างออเดอร์และส่งมอบสินค้าทันทีเพื่อให้เห็น flow ทั้งหมด (ไฟล์ `app/api/checkout/route.ts`) — ก่อนเปิดขายจริงต้องเปลี่ยนให้ไปสร้าง payment (เช่น Stripe, Omise, พร้อมเพย์) ก่อน แล้วค่อยส่งมอบสินค้าเมื่อ webhook ยืนยันว่าจ่ายเงินแล้ว
- Rate-limit และ CAPTCHA ยังไม่ได้ใส่ในหน้า checkout — ถ้ากลัวโดนบอทสั่งซื้อรัว ๆ ควรเพิ่ม
- โดเมนที่คุณพิมพ์มา (`api.flexozy.online`) ต้องไปตั้งค่า DNS ชี้มาที่ Vercel เอง (Vercel → Settings → Domains)

## โครงสร้างโปรเจกต์

```
app/
  page.tsx                 หน้าแรก (รายการสินค้า)
  product/[slug]/          หน้ารายละเอียดสินค้า + ปุ่มซื้อ
  profile/                 โปรไฟล์ Discord (รูป, แบนเนอร์)
  orders/                  ประวัติคำสั่งซื้อของลูกค้า
  admin/                   หน้าจัดการระบบ (เฉพาะ admin)
  api/
    v1/key/[code]/         API ตรวจสอบคีย์ (public)
    checkout/               สร้างออเดอร์ + ออกคีย์/ไฟล์/ลิงก์
    admin/products/         CRUD สินค้า (admin only)
    admin/orders/           ดู/แก้สถานะออเดอร์ (admin only)
    upload/                 อัปโหลดไฟล์ขึ้น Vercel Blob (admin only)
prisma/schema.prisma        โครงสร้างฐานข้อมูลทั้งหมด
lib/                        prisma client, next-auth config, keygen, admin guard
```
