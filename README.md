# Flexozy — Fixed Deploy Package

แพ็กนี้แก้ปัญหา 404 สำหรับหน้า `flexozy.online` โดยให้หน้าเว็บอยู่ที่ root ของโปรเจกต์โดยตรง

## 1) Deploy เว็บไซต์ `flexozy.online`

ให้ Import โปรเจกต์โฟลเดอร์นี้ทั้งชุดเข้า Vercel แล้ว **ไม่ต้องตั้ง Root Directory เป็น `web`**

ไฟล์หน้าเว็บอยู่ที่ root:
- `index.html`
- `style.css`
- `app.js`
- `vercel.json`

จากนั้นผูก Domain:
- `flexozy.online`
- `www.flexozy.online`

## 2) Deploy API `api.flexozy.online`

สร้าง Vercel Project อีกตัว แล้วเลือกโฟลเดอร์ `api-project` เป็น Root Directory (หรือ Import โฟลเดอร์นี้โดยตรง)

Environment Variables:
```
API_ADMIN_KEY=ตั้งคีย์ของคุณ
QUEST_PROVIDER_URL=https://your-authorized-provider.example/api
QUEST_PROVIDER_KEY=คีย์ของ Provider ถ้ามี
```

ผูก Domain `api.flexozy.online`

## 3) ทดสอบ

เว็บไซต์:
`https://flexozy.online/`

API health:
`https://api.flexozy.online/api/health`

ถ้าเว็บไซต์ยังขึ้น 404 หลัง Deploy ให้ตรวจว่า Domain ถูกผูกกับ Project เว็บไซต์ตัวนี้ ไม่ใช่ Project API ตัวเก่า และ Redeploy ล่าสุดอีกครั้ง

> หมายเหตุ: API นี้ออกแบบให้เชื่อมกับ authorized provider เท่านั้น ไม่ได้ใช้ Discord user token หรือ private-account automation
