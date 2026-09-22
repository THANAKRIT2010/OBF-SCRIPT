# miay.online — Vercel static build

## Deploy
1. Upload this folder to GitHub.
2. Import the repository into Vercel.
3. Framework Preset: Other.
4. Root Directory: `.`.
5. Build Command: leave empty.
6. Output Directory: leave empty.
7. Deploy.

## What was fixed
- Removed the PHP manifest dependency and converted it to `manifest.json`.
- Added Vercel routing for the extensionless pages used by the site.
- Added `/user/login/` and `/user/register/` fallback routes that open the existing auth modal.
- Added `shop.html` as the static storefront page.
- Kept the original CSS/JS/assets.

## Important
The original site contains a PHP authentication endpoint:
`/user/auth-api.php`

Vercel static hosting does not execute PHP. The login/register modal can still open, but actual account authentication requires a separate API/backend (for example Node.js/serverless functions + a database). This build does not fake authentication or store passwords in the browser.
