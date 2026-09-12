# OBF-SCRIPT Web — Discord OAuth2

ระบบนี้แก้ flow ให้เป็น:

Discord ปุ่มยืนยันตัวตน
→ `/api/auth/login?state=...`
→ redirect ไป Discord OAuth2 ทันที
→ Authorize
→ `/api/auth/callback`
→ ตรวจ Discord user
→ ตรวจสมาชิกใน Guild
→ ให้ Role ด้วย Bot Token

## Environment

```env
DISCORD_CLIENT_ID=1499108630325366905
DISCORD_CLIENT_SECRET=...
DISCORD_REDIRECT_URI=https://flexozy.online/api/auth/callback
DISCORD_BOT_TOKEN=...
WEB_BASE_URL=https://flexozy.online
```

ใน Discord Developer Portal ต้องเพิ่ม Redirect URL ตรงตัว:

`https://flexozy.online/api/auth/callback`

## ติดตั้ง

```bat
npm install
```

## รัน

```bat
npm run dev
```

Production:

```bat
npm run build
npm start
```

## รูปแบบ state จากบอท

รองรับทั้ง:

```json
{"u":"USER_ID","g":"GUILD_ID","r":"ROLE_ID","t":1750000000000}
```

หรือ:

```json
{"userId":"USER_ID","guildId":"GUILD_ID","roleId":"ROLE_ID","issuedAt":1750000000000}
```

`issuedAt` รองรับทั้ง milliseconds และ Unix seconds

> Bot ต้องมี Manage Roles และ Role ของบอทต้องอยู่สูงกว่า Role ที่จะมอบให้
