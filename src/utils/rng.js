'use strict';

// mulberry32 - small, fast, deterministic 32-bit PRNG.
// Given the same seed it always produces the same sequence, which is what
// lets `--seed` builds be reproducible while a random seed makes every
// default build's opcode map / identifiers / keys different.
function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(str) {
  // FNV-1a style string -> 32bit int, so users can pass --seed=anything
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function randInt(rng, min, max) {
  // inclusive min, inclusive max
  return Math.floor(rng() * (max - min + 1)) + min;
}

function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

module.exports = { makeRng, seedFromString, randInt, shuffle, pick };
