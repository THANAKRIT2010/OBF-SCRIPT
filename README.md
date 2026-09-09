# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Deploy to Vercel

1. Push this repo to GitHub and import it on vercel.com.
2. Framework preset: **Other** (settings come from `vercel.json`).
3. Add these Environment Variables in Vercel (Project Settings → Environment Variables):
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET`
   - `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`
4. Deploy. Then add the Discord redirect URL
   `https://<your-vercel-domain>/api/public/auth/discord/callback`
   in the Discord Developer Portal.

The build targets Nitro's `vercel` preset automatically when `VERCEL=1`
(set by Vercel) or `NITRO_PRESET=vercel`; elsewhere it keeps the default target.
