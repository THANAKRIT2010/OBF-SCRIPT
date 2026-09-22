# Miay / Belzebub Shop — Vercel

Static Vercel-ready build.

## Deploy
1. Import this folder into Vercel.
2. Framework Preset: Other
3. Build Command: leave empty
4. Output Directory: leave empty
5. Deploy.

## Changes
- Fixed CSS/JS asset filenames so `/shop` loads its styles and scripts.
- Added Vercel rewrites for clean URLs.
- Removed the old `protect.js` anti-devtools script that replaced the page with `⛔ ไม่อนุญาต` when browser dimensions changed. This prevents false positives on Vercel/mobile/DevTools.
- PHP backend/auth is not included; static pages remain available.
