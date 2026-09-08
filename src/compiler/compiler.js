'use strict';

const { markDeclSites, findCaptured } = require('./capture');
const { OPCODE_INDEX } = require('../bytecode/opcodes');

const RK_MASK = 0x40000000; // tag bit: operand >= RK_MASK means "constant index", else "register index"

class FunctionState {
  constructor(parent) {
    this.parent = parent;
    this.instructions = [];
    this.constants = [];
    this.constMap = new Map();
    this.protos = [];
    this.upvals = [];          // {fromLocal:bool, index:int}
    this.upvalKey = new Map(); // declId (or "parentUpval:idx") -> our upval index, memoized
    this.scopes = [];          // stack of Map<name, declId[]>
    this.localInfo = new Map();// declId -> {reg, boxed}
    this.freereg = 0;
    this.numParams = 0;
    this.isVararg = false;
    this.loopStack = [];       // for break: array of {breakJumps: []}
  }
}

class Compiler {
  constructor(opts = {}) {
    this.opts = opts;
    this.capturedSet = new Set();
  }

  compileChunk(ast) {
    markDeclSites(ast);
    this.capturedSet = findCaptured(ast);
    const fs = new FunctionState(null);
    fs.isVararg = true;
    this.pushScope(fs);
    this.compileBlock(fs, ast.body);
    this.emit(fs, 'RETURN', { a: 0, b: 1 }); // implicit return with 0 values
    this.popScope(fs);
    return this.finish(fs);
  }

  finish(fs) {
    return {
      numParams: fs.numParams,
      isVararg: fs.isVararg,
      constants: fs.constants,
      instructions: fs.instructions,
      protos: fs.protos,
      upvals: fs.upvals,
      numRegs: fs.freereg,
    };
  }

  // ---------- scope / register helpers ----------

  pushScope(fs) { fs.scopes.push(new Map()); }
  popScope(fs) { fs.scopes.pop(); }

  declareRaw(fs, ident, reg, boxed) {
    const block = fs.scopes[fs.scopes.length - 1];
    if (!block.has(ident.name)) block.set(ident.name, []);
    block.get(ident.name).push(ident.$declId);
    fs.localInfo.set(ident.$declId, { reg, boxed });
  }

  // Declares `ident` as a new local. If initReg is given, its value seeds
  // the local (copied into the register, or boxed into a cell if this local
  // is captured by some nested closure per the capture analysis).
  declareLocal(fs, ident, initReg) {
    const reg = fs.freereg++;
    const boxed = this.capturedSet.has(ident.$declId);
    if (boxed) {
      this.emit(fs, 'NEWTABLE', { a: reg });
      if (initReg !== undefined && initReg !== null) {
        this.emit(fs, 'SETTABLE', { a: reg, b: this.numK(fs, 1), c: { k: false, v: initReg } });
      }
    } else if (initReg !== undefined && initReg !== null) {
      if (initReg !== reg) this.emit(fs, 'MOVE', { a: reg, b: initReg });
    } else {
      this.emit(fs, 'LOADNIL', { a: reg, b: 0 });
    }
    this.declareRaw(fs, ident, reg, boxed);
    return reg;
  }

  resolveLocalInFs(fs, name) {
    for (let i = fs.scopes.length - 1; i >= 0; i--) {
      const block = fs.scopes[i];
      if (block.has(name)) {
        const arr = block.get(name);
        const declId = arr[arr.length - 1];
        return { declId, info: fs.localInfo.get(declId) };
      }
    }
    return null;
  }

  // Resolves `name` as seen from function `fs`: local, upvalue (climbing
  // parents, adding upvalue slots as needed), or global.
  resolveVar(fs, name) {
    const local = this.resolveLocalInFs(fs, name);
    if (local) return { kind: 'local', reg: local.info.reg, boxed: local.info.boxed };
    if (!fs.parent) return { kind: 'global' };

    const parentRes = this.resolveVar(fs.parent, name);
    if (parentRes.kind === 'global') return parentRes;

    const memoKey = parentRes.kind === 'local' ? `L:${name}:${parentRes.reg}` : `U:${name}:${parentRes.idx}`;
    if (fs.upvalKey.has(memoKey)) {
      return { kind: 'upval', idx: fs.upvalKey.get(memoKey) };
    }
    const idx = fs.upvals.length;
    if (parentRes.kind === 'local') {
      fs.upvals.push({ fromLocal: true, index: parentRes.reg });
    } else {
      fs.upvals.push({ fromLocal: false, index: parentRes.idx });
    }
    fs.upvalKey.set(memoKey, idx);
    return { kind: 'upval', idx, boxed: true }; // captured vars are always boxed
  }

  // ---------- emission ----------

  emit(fs, op, fields) {
    const ins = Object.assign({ op: OPCODE_INDEX[op], opName: op }, fields);
    fs.instructions.push(ins);
    return fs.instructions.length - 1;
  }

  patchJumpHere(fs, jmpIdx) {
    fs.instructions[jmpIdx].sbx = fs.instructions.length - (jmpIdx + 1);
  }
  patchJumpTo(fs, jmpIdx, targetIdx) {
    fs.instructions[jmpIdx].sbx = targetIdx - (jmpIdx + 1);
  }
  here(fs) { return fs.instructions.length; }

  numK(fs, num) {
    const key = `n:${num}`;
    if (fs.constMap.has(key)) return { k: true, v: fs.constMap.get(key) };
    const idx = fs.constants.length;
    fs.constants.push({ type: 'number', value: num });
    fs.constMap.set(key, idx);
    return { k: true, v: idx };
  }
  strK(fs, str) {
    const key = `s:${str}`;
    if (fs.constMap.has(key)) return { k: true, v: fs.constMap.get(key) };
    const idx = fs.constants.length;
    fs.constants.push({ type: 'string', value: str });
    fs.constMap.set(key, idx);
    return { k: true, v: idx };
  }

  reg(r) { return { k: false, v: r }; }
}

module.exports = { Compiler, FunctionState, RK_MASK };
