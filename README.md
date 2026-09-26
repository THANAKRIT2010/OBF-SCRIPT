# Flexozy Verify-Follow

ระบบตรวจสอบว่าผู้ใช้กด "ติดตาม" ช่อง YouTube แล้วหรือยัง จากภาพ screenshot (OCR ผ่าน Google Cloud Vision)

```
.
├── api/
│   └── v1/
│       └── youtube.js     -> POST /api/v1/youtube
├── public/
│   └── verify.html        -> GET /verify.html
├── package.json
├── vercel.json
├── .env.example
└── .gitignore
```

## Deploy ขึ้น Vercel จริง

1. **ติดตั้ง dependency ในเครื่อง (ทดสอบก่อน push ก็ได้):**
   ```bash
   npm install
   ```

2. **Push ขึ้น Git** — ถ้ายังไม่มี repo:
   ```bash
   git init
   git add .
   git commit -m "add verify-follow system"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
   ถ้ามีโปรเจกต์ Flexozy เดิมอยู่แล้ว ให้ copy โฟลเดอร์ `api/v1/` และ `public/` เข้าไปรวมกับ repo เดิม แล้ว merge `package.json` (เพิ่ม dependency 2 ตัวนี้เข้าไปในของเดิม) แล้ว push ตามปกติ

3. **Import เข้า Vercel** (ข้ามได้ถ้าผูก repo กับ Vercel อยู่แล้ว):
   vercel.com → Add New → Project → เลือก repo → Deploy

4. **เปิด Google Cloud Vision API:**
   - console.cloud.google.com → เปิดโปรเจกต์ (ต้องผูก billing) → เปิดใช้ "Cloud Vision API"
   - Credentials → Create API key → คัดลอก key ไว้

5. **ตั้งค่า Environment Variable บน Vercel:**
   Project → Settings → Environment Variables →
   เพิ่ม `GOOGLE_VISION_API_KEY` = key จากข้อ 4 (เลือก Production + Preview)

6. **เพิ่ม Vercel KV** (กันภาพเดิมถูกส่งซ้ำ):
   Project → แท็บ Storage → Create Database → KV → ตั้งชื่อ → Connect เข้ากับโปรเจกต์นี้
   ระบบจะเติม `KV_REST_API_URL` / `KV_REST_API_TOKEN` ให้อัตโนมัติ

7. **Redeploy** ให้ env vars มีผล:
   แท็บ Deployments → ... ที่ deployment ล่าสุด → Redeploy

8. **ผูกโดเมน flexozy.online:**
   Settings → Domains → พิมพ์ `flexozy.online` → เพิ่ม → ตั้งค่า DNS ตามที่ Vercel ให้มา (A record หรือ CNAME) ที่ผู้ให้บริการโดเมน → รอ propagate

หลัง deploy เสร็จ:
- หน้าเว็บ: `https://flexozy.online/verify.html`
- API: `https://flexozy.online/api/v1/youtube`

## ทดสอบ API ตรงๆ

```bash
curl -X POST https://flexozy.online/api/v1/youtube \
  -F "image=@screenshot.png" \
  -F "channelHandle=Bafucknakubbro"
```

Response:
```json
{
  "ok": true,
  "following": true,
  "channelMatch": true,
  "reused": false,
  "rawTextPreview": "..."
}
```

## ข้อจำกัด

- เป็นการตรวจแบบ OCR/heuristic เท่านั้น — ปลอมภาพได้ถ้าตั้งใจจะโกงจริงๆ (Photoshop, inspect element ฯลฯ)
- `reused: true` กันได้แค่กรณีเอาไฟล์ภาพเดิม (byte เดียวกันเป๊ะ) มาส่งซ้ำ ไม่กันกรณี crop/แก้ไขแล้วส่งใหม่
- ถ้าต้องการความแม่นยำแบบโกงไม่ได้จริง ให้สลับไปใช้ YouTube OAuth + `subscriptions.list` แทนในอนาคต (เช็คตรงจาก Google ไม่ต้องพึ่งรูป) — บอกได้ถ้าอยากได้โค้ดชุดนั้นเพิ่ม
