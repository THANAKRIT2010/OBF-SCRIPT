'use strict';

const RK_MASK = 0x40000000;

function encodeField(raw, opmap) {
  const x = (raw ^ opmap.xorKey) >>> 0;
  return (x + opmap.addKey) % 4294967296;
}

function rkRaw(rk) {
  return rk.k ? RK_MASK + rk.v : rk.v;
}

// Some instructions store bx/sbx directly in `bx`/`sbx` fields (plain
// register-less operands); others store RK-packed operands in b/c. This
// normalizes every instruction down to raw (op, a, b, c) integers, all
// non-negative, ready for the field transform.
function normalize(ins, opmap) {
  let a = ins.a || 0;
  let b = 0;
  let c = 0;
  if ('bx' in ins) {
    b = ins.bx;
  } else if ('sbx' in ins) {
    b = ins.sbx + opmap.jumpBias;
  } else {
    b = ins.b !== undefined ? (typeof ins.b === 'object' ? rkRaw(ins.b) : ins.b) : 0;
    c = ins.c !== undefined ? (typeof ins.c === 'object' ? rkRaw(ins.c) : ins.c) : 0;
  }
  return { a, b, c };
}

function serializeProto(proto, opmap, cfg) {
  const words = proto.instructions.map(ins => {
    const { a, b, c } = normalize(ins, opmap);
    const opRaw = opmap.encodeOf[ins.op];
    return [
      encodeField(opRaw, opmap),
      encodeField(a, opmap),
      encodeField(b, opmap),
      encodeField(c, opmap),
    ];
  });

  const constants = proto.constants.map(k => encodeConstant(k, opmap, cfg));
  const protos = proto.protos.map(p => serializeProto(p, opmap, cfg));

  return {
    numParams: proto.numParams,
    isVararg: proto.isVararg ? 1 : 0,
    words,
    constants,
    protos,
    upvals: proto.upvals.map(u => [u.fromLocal ? 1 : 0, u.index]),
  };
}

function encodeConstant(k, opmap, cfg) {
  if (k.type === 'number') {
    if (!cfg || cfg.constants !== false) {
      return { t: 0, v: k.value + opmap.numKeyOffset };
    }
    return { t: 2, v: k.value }; // t=2: stored raw, no arithmetic transform
  }
  // string -> byte array, each byte XORed with a rolling per-index key
  const bytes = Buffer.from(k.value, 'latin1');
  const out = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    const key = (opmap.strXorKey + i * opmap.strKeyStep) % 256;
    out[i] = bytes[i] ^ key;
  }
  return { t: 1, v: out };
}

module.exports = { serializeProto, encodeField, RK_MASK };
