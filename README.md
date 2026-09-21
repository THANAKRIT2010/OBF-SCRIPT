# Flexozy

Single-root Vercel project.

## Domains

- https://flexozy.online/ = website / API documentation
- https://api.flexozy.online/api/v1 = API gateway

Both domains can point to the same Vercel project.

## Vercel Environment Variables

FLEXOZY_API_KEY=your-secret-key
QUEST_PROVIDER_URL=https://your-provider.example/api
QUEST_PROVIDER_KEY=your-provider-key

## Bot

```js
const API_URL = "https://api.flexozy.online/api/v1";
const API_KEY = "YOUR_FLEXOZY_API_KEY";

const response = await fetch(`${API_URL}/quests`, {
  headers: {
    "x-api-key": API_KEY
  }
});

const data = await response.json();
```

The bot does not need to know the provider URL or provider key.

## Deploy

Upload the contents of this ZIP directly to the root of the GitHub repository.

Do not put the project inside another Flexozy folder.

Vercel:
1. Import the GitHub repository.
2. Framework Preset: Next.js (auto-detected).
3. Root Directory: `./`
4. Add the environment variables above.
5. Deploy.
6. Add `flexozy.online` and `api.flexozy.online` as domains to the same Vercel project.
