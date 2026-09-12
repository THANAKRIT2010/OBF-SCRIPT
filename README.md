# Discord Verification (Vercel)

A real, safe "verify to get a role" system:

1. Member clicks **Verify with Discord**.
2. They log in through Discord's real OAuth2 screen (never your site — Discord's own domain).
3. Your app reads their Discord user ID only (`identify` scope — no password, no email needed).
4. Your bot grants them a role via the official Discord API, if they're already a member of your server.

No fake "security check" pages, no token theft — everything goes through Discord's documented OAuth2 and Bot APIs.

## 1. Create the Discord Application

1. Go to https://discord.com/developers/applications → **New Application**.
2. In **OAuth2 → General**, copy the **Client ID** and **Client Secret**.
3. In **OAuth2 → General → Redirects**, add:
   `https://YOUR-VERCEL-DOMAIN.vercel.app/api/callback`
   (you'll get the real domain after your first Vercel deploy — you can add it after and redeploy).
4. Go to **Bot** tab → **Add Bot** → copy the **Bot Token** (keep it secret).
5. Under **Bot → Privileged Gateway Intents**, you don't need any intents for this flow.
6. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`
   - Bot permissions: `Manage Roles`
   - Open the generated URL and invite the bot to your server.
7. **Important:** In your server, drag the bot's role **above** the role you want it to grant (Server Settings → Roles). Discord bots can only assign roles ranked below their own highest role.

## 2. Get your Server ID and Role ID

Enable Developer Mode: User Settings → Advanced → Developer Mode.

- Right-click your server icon → **Copy Server ID** → `DISCORD_GUILD_ID`
- Right-click the target role in Server Settings → Roles → **Copy Role ID** → `DISCORD_ROLE_ID`

## 3. Deploy to Vercel

```bash
npm install -g vercel
cd discord-verify
vercel
```

Or push this folder to a GitHub repo and import it at https://vercel.com/new.

## 4. Set environment variables in Vercel

In your Vercel project → **Settings → Environment Variables**, add all the values from `.env.example`:

| Variable | Value |
|---|---|
| `DISCORD_CLIENT_ID` | from step 1 |
| `DISCORD_CLIENT_SECRET` | from step 1 |
| `NEXT_PUBLIC_DISCORD_CLIENT_ID` | same as `DISCORD_CLIENT_ID` |
| `NEXT_PUBLIC_DISCORD_REDIRECT_URI` | `https://YOUR-DOMAIN.vercel.app/api/callback` |
| `DISCORD_REDIRECT_URI` | same as above |
| `DISCORD_BOT_TOKEN` | from step 1 |
| `DISCORD_GUILD_ID` | from step 2 |
| `DISCORD_ROLE_ID` | from step 2 |

Redeploy after adding env vars (Vercel → Deployments → ⋯ → Redeploy).

## 5. Wire it into Discord

Post an embed in your server (e.g. with your own bot or a tool like Carl-bot) with a button/link pointing to:

```
https://YOUR-DOMAIN.vercel.app/
```

That's the whole flow — no bot code needs to run 24/7 for this to work, since the role grant happens inside the Vercel serverless function itself.

## Notes

- If a user hasn't joined the server yet, they'll see a friendly error telling them to join first, then come back and verify.
- The bot needs **Manage Roles** permission and must sit above the target role in the role list, or the API call will silently fail with a 403.
- Never commit your real `.env` file — only `.env.example` should be in version control.
