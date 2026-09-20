# Flexozy API

Vercel-ready API gateway for authorized Quest/provider integrations.

## What works

- `GET /api/health`
- `GET /api/quests`
- `GET /api/quests/:id`
- `POST /api/events`
- Bearer API-key authentication
- HMAC webhook signatures
- Webhook timeout handling
- Separate provider adapter
- Demo provider data when no provider URL is configured

## Important

This project does not accept Discord user tokens and does not automate Discord user accounts or fake Quest progress. To connect real Quest data, use an API/provider you are authorized to access and implement it in `lib/quest/provider.js`.

## Vercel

1. Upload this project to GitHub.
2. Import the repository into Vercel.
3. Keep the Root Directory at the project root.
4. Add environment variables from `.env.example`.
5. Deploy.

Example:

```bash
curl https://YOUR-DOMAIN.vercel.app/api/health

curl https://YOUR-DOMAIN.vercel.app/api/quests \
  -H "Authorization: Bearer YOUR_API_ADMIN_KEY"
```

## Event example

```json
{
  "event": "quest.available",
  "data": {
    "quest_id": "abc123"
  },
  "webhooks": [
    {
      "url": "https://your-bot.example.com/webhook",
      "secret": "shared-secret"
    }
  ]
}
```

The receiving bot gets `x-flexozy-signature`, an HMAC-SHA256 signature of the raw JSON body.

## Production storage

This starter keeps no persistent client/webhook database. For a multi-customer production service, add Postgres/Supabase/Neon (or another persistent database) for API keys, clients, webhooks, event logs and usage.
