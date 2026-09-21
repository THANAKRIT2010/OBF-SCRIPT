# Flexozy API

Deploy โฟลเดอร์นี้เป็น Vercel Project แยกสำหรับ `api.flexozy.online`.

ตั้ง Environment Variables:
```
API_ADMIN_KEY=change-this-secret
QUEST_PROVIDER_URL=https://your-authorized-provider.example/api
QUEST_PROVIDER_KEY=your-provider-key
```

Health: `/api/health`
Quests: `/api/quests`
Quest: `/api/quests/:id`
Progress: `POST /api/quests/:id`
Events: `POST /api/events`
