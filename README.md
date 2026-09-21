# Flexozy — Single Root Vercel Project

## Deploy to Vercel
1. Upload this folder/ZIP as one Vercel project. Do not set a Root Directory.
2. Deploy.
3. Add your custom domain `flexozy.online` to this project.
4. If you want the API on `api.flexozy.online`, add that domain to the same Vercel project.

## Routes
- `/` — website
- `/api/health` — API health
- `/api/quests` — list quests
- `/api/quests/:id` — get/update quest

## Environment Variables
- `API_ADMIN_KEY` — key required by API
- `QUEST_PROVIDER_URL` — real Quest provider base URL
- `QUEST_PROVIDER_KEY` — optional provider key
- `FLEXOZY_API_URL` — bot API URL
- `FLEXOZY_API_KEY` — bot API key
- `DISCORD_BOT_TOKEN` — bot token

## Important
Vercel runs the `api/` directory as serverless functions. The root `index.js` is the Discord bot entry for local/long-running hosting; it is not the Vercel API entry.
