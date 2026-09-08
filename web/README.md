# Flexozy VM — web frontend

A Next.js (App Router) UI for the `lua-vm-obfuscator` engine, styled after
Flexozy's product design. Every "Obfuscate" click POSTs to this app's own
`/api/obfuscate` route, which calls the **same** `obfuscate()` function used
by the root project's standalone `api/obfuscate.js` Vercel function — the
copy lives at `web/lib/engine` (see `web/lib/engine/README.txt`).

## Develop

```bash
cd web
npm install
npm run dev
```

## Deploy

This folder is a standalone Next.js app and can be deployed to Vercel on
its own (set the Vercel project's root directory to `web/`), independent
of the root project's `api/obfuscate.js` function.

## Structure

- `app/page.tsx` — main obfuscator UI (editor, settings, results)
- `app/api/obfuscate/route.ts` — API route wrapping the engine
- `lib/engine/` — copy of the root `src/` bytecode/VM compiler
- `components/` — Monaco code editor, animated background, shadcn-style UI primitives
