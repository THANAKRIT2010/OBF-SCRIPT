# Lua/Luau VM-Based Obfuscator

A from-scratch VM-virtualization obfuscator for Lua 5.1 / Luau source. It does not
wrap, minify, or lightly disguise the input - it **compiles it to a custom
bytecode** for a **custom virtual machine**, then emits a single self-contained
`output.lua` that is a bytecode interpreter plus encrypted program data. The
original control flow, names, and literals are not present in the output.

This was built as an original implementation (register-based VM architecture
inspired by Lua's own public 5.1 bytecode design - a well-documented, MIT-licensed
reference - not by copying any commercial obfuscator's code).

## 1. Architecture

```
input.lua
  -> luaparse (lexer/parser, MIT-licensed, already a dependency of the web app)
  -> AST
  -> capture analysis        (which locals are closed over by nested functions)
  -> bytecode compiler        (AST -> registers + constants + custom instructions)
  -> per-build randomization  (opcode map, XOR/add keys, string keys, all seeded)
  -> serializer                (instructions -> transformed integer words,
                                 strings -> XOR byte arrays, numbers -> offset)
  -> Lua VM code generator    (dispatch table, closures, tables, environment,
                                 checksum, randomized identifiers)
  -> output.lua
```

`output.lua` is a plain Lua chunk. Running it runs a small interpreter that
decodes and executes the embedded program. No external runtime, no native
extension, no bit32/bitwise-operator dependency (works on Lua 5.1, Luau, 5.2+).

## 2. Project structure

This is a single Next.js project: the same `src/` engine powers the CLI, the
`/api/obfuscate` route, and the `bin/` tool — there is only one copy of the
obfuscator.

```
lua-vm-obfuscator-vercel-api/
  app/                    Next.js App Router (the web UI + API)
    page.tsx              main obfuscator UI (editor, settings, results)
    layout.tsx            root layout / SEO metadata
    globals.css           theme + animation styles
    api/
      route.ts            GET  /api            -> service info (JSON)
      obfuscate/route.ts  POST /api/obfuscate   -> calls src/index.js#obfuscate
  components/              Monaco code editor, animated background, UI primitives
  lib/
    utils.ts               small `cn()` classnames helper
    parser.ts              shared ParseError type for inline editor error markers
  bin/
    obfuscate.js          CLI entry point (`npx lua-vm-obfuscate ...`)
  src/                     <-- the actual obfuscation engine, used by both the
                           CLI and the web app's API route
    utils/
      rng.js              seeded PRNG (mulberry32) + helpers, so --seed builds
                           are reproducible and default builds are not
      names.js             random/confusable identifier generator, with a
                           hard-coded reserved list (keywords, stdlib, Roblox/
                           Luau globals) that is NEVER renamed
    bytecode/
      opcodes.js           the canonical instruction set (internal names only -
                           never appear in the output)
    compiler/
      capture.js            free-variable analysis: which locals need to be
                           heap-boxed for real (shared, mutable) closure semantics
      compiler.js           scopes, register/constant allocation, upvalue
                           resolution, emit/patch helpers
      expressions.js       expression codegen (literals, operators, tables,
                           calls, closures)
      statements.js         statement codegen (locals, assignment, if/while/
                           repeat/for, function decls, return/break)
    encoder/
      opmap.js              builds one random opcode<->number mapping and a set
                           of transform keys per build (or per --seed)
      serialize.js          turns compiled instructions/constants into the
                           transformed integers that get embedded
    vm/
      template.js            generates the actual output.lua text: bit-math,
                           decode routines, one handler per opcode, dispatch
                           table, call/closure/table machinery, checksum
    index.js               orchestrates the whole pipeline
  tests/
    cases/                 21 Lua programs covering the feature list below
  run_tests.sh / run_tests_levels.sh
```

## Web app & deployment

This repo is one Next.js project — `app/page.tsx` is the UI, and
`app/api/obfuscate/route.ts` is the API, both deployed together with a single
`vercel build` / `next build`. There's no separate `api/` folder anymore and
no `vercel.json` needed — Vercel auto-detects Next.js and builds/routes
everything (including the API routes) automatically.

```bash
npm install
npm run dev      # http://localhost:3000
```

To deploy: push this repo and import it on Vercel as-is (framework preset
"Next.js", Root Directory = repo root). The homepage (`/`) serves the web UI,
`GET /api` returns service info, and `POST /api/obfuscate` runs a build —
exactly the same request/response shape as before:

```bash
curl -X POST https://your-deployment.vercel.app/api/obfuscate \
  -H "Content-Type: application/json" \
  -d '{"code":"print(\"hello\")"}'
```

The CLI (`bin/obfuscate.js`) and test suite are unaffected — they import
`src/` directly and don't go through Next.js or the network at all.

## 3. Instruction set

Register-based, one function prototype per Lua function (closures = nested
prototypes + upvalue descriptors). 38 opcodes: `LOADK MOVE LOADBOOL LOADNIL
GETGLOBAL SETGLOBAL GETUPVAL SETUPVAL GETTABLE SETTABLE NEWTABLE SELF ADD SUB
MUL DIV MOD POW CONCAT UNM NOT LEN JMP EQ LT LE TEST CALL RETURN CLOSURE
VARARG SETLIST FORPREP FORLOOP TFORCALL TFORLOOP HALT`. These names/order are
purely internal (`src/bytecode/opcodes.js`) - see #4 for what actually gets
written out.

## 4. Bytecode format

Every instruction is 4 integers: `(op, a, b, c)`. Depending on the opcode, `b`
may hold a `bx` (constant/prototype index), an `sbx` (signed jump offset,
bias-encoded so it stays non-negative), or an RK operand (register **or**
constant, tagged by adding `0x40000000` for constants - the classic Lua trick).
Each prototype is `{numParams, isVararg, words, constants, subProtos, upvalDescriptors}`,
recursively nested for closures.

## 5. Encoding algorithm

Per build (or deterministically from `--seed`):
- **Opcode map**: the 38 canonical opcodes are shuffled onto random numbers in
  `[17, 4093]` - a fresh, non-sequential mapping every time.
- **Word transform**: every one of the 4 integers in every instruction is
  XORed with a random key, then added to a second random key mod 2^32
  (`enc = ((raw ^ xorKey) + addKey) mod 2^32`, inverted at runtime). All math
  is kept inside a bias-adjusted non-negative range specifically so it behaves
  identically whether computed in JS (build time) or Lua (run time) - a subtlety
  since JS bitwise ops are 32-bit signed and Lua's aren't.
- **Strings**: every string constant becomes a byte array, each byte XORed
  with a rolling key (`key_i = (strXorKey + i*strKeyStep) mod 256`), and is
  only decoded (and memoized) the first time the VM actually reads that
  constant - lazy string decoding.
- **Numbers**: stored as `value + offset`, subtracted back at read time
  (skippable at `--level=1` for speed).
- **Jump offsets**: bias-shifted so they're never negative going into the
  transform, then un-biased at decode.

## 6/7. VM dispatch

Opcodes are dispatched through a **table** keyed by the random encoded number
(`H[<random number>] = handler`), not a sequential if/elseif chain - so there
is no readable `if opcode==1 then ... elseif opcode==2` ladder in the output.
Every identifier involved (register table, decode functions, handler table,
etc.) is randomly generated per build; `--level=3` additionally wraps the
entry point in a build-time-true/runtime-checked numeric identity as a light
opaque predicate.

## 8. String protection

Covered above (#5) - byte-array + rolling XOR + lazy, memoized decoding.

## 9. Constant protection

Numeric constants are stored as `value + randomOffset` rather than as bare
literals (toggleable via `--level`/`--constants`); string constants go through
the same encryption as #8. Exact runtime values are preserved bit-for-bit.

## 10. Function protection

Every Lua function becomes a **prototype** (params, vararg flag, its own
instruction stream, its own constant pool, nested prototypes for any closures
it defines, and upvalue-capture descriptors) - never left as readable Lua
source. Closures are real: captured locals are compiled as heap cells so two
closures that share an upvalue actually observe each other's writes (verified
by a bank-account-style multi-closure test in `tests/cases/19_bankaccount.lua`).

## 11. Control-flow obfuscation

Implemented: opcode/word encryption removes any static mapping from "which
number does what", table-based dispatch, and (`--level=3`) an opaque
build-time-true predicate at the entry point. **Not yet implemented**: basic
block reordering, dead/junk blocks inside the instruction stream, and deeper
branch transformation - see Limitations.

## 12. Anti-tamper

A checksum over all instruction words (across every nested prototype) is
computed at build time and re-computed at VM start; on mismatch the script
raises a plain Lua `error()` and halts. No filesystem, network, process, or
OS-level action of any kind - toggleable via `--level`/`--anti-tamper`.

## 13. Environment / API compatibility

Global reads/writes go through Lua's own `_G` table, so `game`, `workspace`,
`script`, `task`, `Vector3`, `print`, `string.*`, etc. all resolve exactly as
they would for the un-obfuscated script, on Roblox/Luau or plain Lua alike.
No native bitwise operators or `bit32` dependency, so the generated VM itself
runs on Lua 5.1, Luau, and 5.2+ without modification.

## 14. Error handling

Lua-native function calls use `table.pack`, and results are shuttled through
plain Lua tables/`error()` - runtime errors from the original logic (e.g.
indexing nil) surface as ordinary Lua errors from inside the VM, not silently
swallowed.

## 15/16. CLI usage & seeding

```
node bin/obfuscate.js input.lua -o output.lua [--seed=42] [--level=1|2|3]
                        [--no-strings] [--no-confusable]
```
Omit `--seed` for a fresh random build every time (opcode map, keys, and
identifiers all differ); pass it for a byte-identical, reproducible build.

## Example

`tests/cases/19_bankaccount.lua` in, run `node bin/obfuscate.js tests/cases/19_bankaccount.lua -o out.lua --seed=1`,
then `lua out.lua` - prints `120`, identical to the un-obfuscated script,
from a file that contains no readable trace of `deposit`/`withdraw`/`balance`
or the original control flow.

## Testing

```
npm install
bash run_tests.sh          # 21 cases, single default build
bash run_tests_levels.sh   # same 21 cases at --level=1/2/3
```
All 21/21 pass at every level as of this writing, using a real Lua 5.4
interpreter to diff obfuscated output against the original.

## Honest limitations

- `goto`/labels: not supported (explicit compile-time error, not silent misbehavior).
- A `self` parameter captured by a closure *inside* a method body isn't boxed
  (rare pattern; `self` used normally within its own method is unaffected).
- `--level` currently only toggles: numeric-constant offsetting, the
  anti-tamper checksum, confusable identifiers, and the opaque-predicate
  wrapper. It does not yet change string encryption or add junk blocks.
- No basic-block reordering / dead-code insertion / opaque predicates *inside*
  the instruction stream yet - only at the VM entry point.
- Performance: interpreting bytecode in Lua, with a pure-Lua (no native
  bitwise op) decode step, costs roughly 1000-1500x versus native Lua in a
  microbenchmark (recursive fib). Fine for typical script/event-handler logic;
  not suitable for tight per-frame numeric loops without further work.
- This compiles a large, common subset of Lua 5.1/Luau syntax, not literally
  every corner of the grammar - anything the compiler can't handle raises a
  clear error at build time rather than producing silently-wrong output.
