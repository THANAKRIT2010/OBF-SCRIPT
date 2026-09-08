This directory is a verbatim copy of the project's root `src/` folder —
the actual Lua VM/bytecode obfuscation engine.

It is duplicated here (instead of imported via a relative "../../../src"
path) so that `web/` can be deployed as its own, self-contained Next.js
project/Vercel app.

If you change anything under the root `src/` folder, re-sync it here with:

    rm -rf web/lib/engine
    cp -r src web/lib/engine

Do not hand-edit files in this folder — edit `src/` at the project root
and re-sync instead, or the standalone `/api/obfuscate` function and the
web app will drift apart.
