#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { obfuscate } = require('../src/index');

function parseArgs(argv) {
  const opts = { level: 2, strings: true, constants: true, vm: true, controlFlow: true, antiTamper: true };
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-o') { opts.out = argv[++i]; }
    else if (a.startsWith('--seed=')) opts.seed = a.slice(7);
    else if (a.startsWith('--level=')) opts.level = parseInt(a.slice(8), 10);
    else if (a === '--strings') opts.strings = true;
    else if (a === '--no-strings') opts.strings = false;
    else if (a === '--constants') opts.constants = true;
    else if (a === '--vm') opts.vm = true;
    else if (a === '--control-flow') opts.controlFlow = true;
    else if (a === '--anti-tamper') opts.antiTamper = true;
    else if (a === '--no-confusable') opts.confusable = false;
    else pos.push(a);
  }
  opts.input = pos[0];
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.input) {
    console.error('usage: obfuscate.js input.lua -o output.lua [--level=1|2|3] [--seed=x]');
    process.exit(1);
  }
  const source = fs.readFileSync(opts.input, 'utf8');
  const { code, seed } = obfuscate(source, opts);
  const outPath = opts.out || path.join(path.dirname(opts.input), 'output.lua');
  fs.writeFileSync(outPath, code, 'utf8');
  console.error(`wrote ${outPath} (seed=${seed})`);
}

main();
