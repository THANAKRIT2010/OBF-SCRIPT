'use strict';

const luaparse = require('luaparse');
const { Compiler } = require('./compiler/compiler');
require('./compiler/statements');
const { buildOpMap } = require('./encoder/opmap');
const { serializeProto } = require('./encoder/serialize');
const { generateVM } = require('./vm/template');
const { makeRng, seedFromString } = require('./utils/rng');

function levelDefaults(level) {
  if (level <= 1) return { constants: false, antiTamper: false, confusable: false, opaque: false };
  if (level >= 3) return { constants: true, antiTamper: true, confusable: true, opaque: true };
  return { constants: true, antiTamper: true, confusable: true, opaque: false };
}

function obfuscate(source, opts = {}) {
  const seed = opts.seed !== undefined
    ? (typeof opts.seed === 'number' ? opts.seed >>> 0 : seedFromString(String(opts.seed)))
    : (Math.random() * 4294967296) >>> 0;
  const rng = makeRng(seed);
  const lvl = levelDefaults(opts.level || 2);
  const cfg = {
    constants: opts.constants !== undefined ? opts.constants : lvl.constants,
    antiTamper: opts.antiTamper !== undefined ? opts.antiTamper : lvl.antiTamper,
    confusable: opts.confusable !== undefined ? opts.confusable : lvl.confusable,
    opaque: opts.opaque !== undefined ? opts.opaque : lvl.opaque,
    strings: opts.strings !== false,
  };

  const ast = luaparse.parse(source, {
    luaVersion: '5.1',
    comments: false,
    scope: false,
    encodingMode: 'pseudo-latin1',
  });

  const compiler = new Compiler(opts);
  const program = compiler.compileChunk(ast);

  const opmap = buildOpMap(rng);
  const serialized = serializeProto(program, opmap, cfg);

  const outSource = generateVM(serialized, opmap, {
    rng,
    confusable: cfg.confusable,
    antiTamper: cfg.antiTamper,
    opaque: cfg.opaque,
    numbersEncoded: cfg.constants,
  });

  return { code: outSource, seed, config: cfg };
}

module.exports = { obfuscate };
