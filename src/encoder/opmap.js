'use strict';

const { OPCODES } = require('../bytecode/opcodes');
const { shuffle, randInt } = require('../utils/rng');

// Builds a fresh, seed-derived mapping from canonical opcode index -> the
// arbitrary "encoded" number that will actually appear in the generated
// output, plus the numeric transform keys used to scramble every
// instruction word before it's written out. All of this is re-rolled every
// build (or deterministically derived from --seed).
function buildOpMap(rng) {
  const n = OPCODES.length;
  // encoded values are spread across a wide, non-contiguous range so they
  // don't look like a simple enum (1..n)
  const pool = [];
  const used = new Set();
  while (pool.length < n) {
    const v = randInt(rng, 17, 4093);
    if (used.has(v)) continue;
    used.add(v);
    pool.push(v);
  }
  const encoded = shuffle(rng, pool);
  const encodeOf = {};
  const decodeOf = {};
  OPCODES.forEach((name, i) => {
    encodeOf[i] = encoded[i];
    decodeOf[encoded[i]] = i;
  });

  return {
    encodeOf,          // canonical index -> encoded value
    decodeOf,          // encoded value -> canonical index
    xorKey: randInt(rng, 1, 0x3fffffff),
    addKey: randInt(rng, 1, 0x0fffffff),
    jumpBias: randInt(rng, 500000, 2000000),
    strXorKey: randInt(rng, 1, 250),
    strKeyStep: randInt(rng, 1, 30),
    numKeyOffset: randInt(rng, 1000, 999999),
  };
}

module.exports = { buildOpMap };
