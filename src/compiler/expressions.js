'use strict';

const { Compiler, FunctionState } = require('./compiler');

const ARITH_OP = { '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV', '%': 'MOD', '^': 'POW' };
const REL_OP = { '==': 'EQ', '~=': 'EQ', '<': 'LT', '<=': 'LE', '>': 'LT', '>=': 'LE' };

// Reserves a fresh temp register and compiles `node`'s single value into it.
// If `into` is given, compiles directly into that register instead (used
// when the target register is already decided, e.g. filling call args).
// Either way, any scratch registers needed *inside* this expression (for
// sub-expressions like `t.x`'s base, or `a..b`'s parts) are allocated
// strictly above `dest` so they can never alias/clobber it while it's still
// being computed - this matters because `dest` itself is very often equal
// to the current top-of-stack register when this is called.
Compiler.prototype.compileExprToReg = function compileExprToReg(fs, node, into) {
  const dest = into !== undefined ? into : fs.freereg;
  const saved = fs.freereg;
  if (fs.freereg < dest + 1) fs.freereg = dest + 1;
  this.compileExprInto(fs, node, dest);
  fs.freereg = into !== undefined ? saved : dest + 1;
  return dest;
};

// Returns an RK operand descriptor {k,v}: constants and plain-register
// locals are referenced directly (no instruction emitted); everything else
// is evaluated into a fresh temp register first.
Compiler.prototype.compileExprRK = function compileExprRK(fs, node) {
  switch (node.type) {
    case 'NumericLiteral':
      return this.numK(fs, node.value);
    case 'StringLiteral':
      return this.strK(fs, this.stringValue(node));
    case 'Identifier': {
      const res = this.resolveVar(fs, node.name);
      if (res.kind === 'local' && !res.boxed) return this.reg(res.reg);
      break;
    }
  }
  const r = this.compileExprToReg(fs, node);
  return this.reg(r);
};

Compiler.prototype.stringValue = function stringValue(node) {
  // luaparse already unescapes into node.value for StringLiteral
  return node.value;
};

// Compiles `node`'s single resulting value directly into register `dest`.
Compiler.prototype.compileExprInto = function compileExprInto(fs, node, dest) {
  switch (node.type) {
    case 'NumericLiteral': {
      const k = this.numK(fs, node.value);
      this.emit(fs, 'LOADK', { a: dest, bx: k.v });
      return;
    }
    case 'StringLiteral': {
      const k = this.strK(fs, this.stringValue(node));
      this.emit(fs, 'LOADK', { a: dest, bx: k.v });
      return;
    }
    case 'BooleanLiteral':
      this.emit(fs, 'LOADBOOL', { a: dest, b: node.value ? 1 : 0 });
      return;
    case 'NilLiteral':
      this.emit(fs, 'LOADNIL', { a: dest, b: 0 });
      return;
    case 'VarargLiteral': {
      if (node.value === '...') {
        this.emit(fs, 'VARARG', { a: dest, b: 2 }); // want exactly 1 result
        return;
      }
      throw new Error('Unsupported literal: ' + node.value);
    }
    case 'Identifier': {
      const res = this.resolveVar(fs, node.name);
      if (res.kind === 'local') {
        if (res.boxed) {
          this.emit(fs, 'GETTABLE', { a: dest, b: res.reg, c: this.numK(fs, 1) });
        } else if (res.reg !== dest) {
          this.emit(fs, 'MOVE', { a: dest, b: res.reg });
        }
      } else if (res.kind === 'upval') {
        this.emit(fs, 'GETUPVAL', { a: dest, b: res.idx });
        this.emit(fs, 'GETTABLE', { a: dest, b: dest, c: this.numK(fs, 1) });
      } else {
        this.emit(fs, 'GETGLOBAL', { a: dest, bx: this.strK(fs, node.name).v });
      }
      return;
    }
    case 'LogicalExpression': {
      this.compileExprInto(fs, node.left, dest);
      const wantTruthy = node.operator === 'and' ? 1 : 0;
      this.emit(fs, 'TEST', { a: dest, c: wantTruthy });
      const jmp = this.emit(fs, 'JMP', {});
      this.compileExprInto(fs, node.right, dest);
      this.patchJumpHere(fs, jmp);
      return;
    }
    case 'BinaryExpression': {
      if (node.operator in ARITH_OP) {
        const b = this.compileExprRK(fs, node.left);
        const c = this.compileExprRK(fs, node.right);
        this.emit(fs, ARITH_OP[node.operator], { a: dest, b, c });
        return;
      }
      if (node.operator === '..') {
        this.compileConcat(fs, node, dest);
        return;
      }
      if (node.operator in REL_OP) {
        this.compileRelIntoBool(fs, node, dest);
        return;
      }
      throw new Error('Unsupported binary operator: ' + node.operator);
    }
    case 'UnaryExpression': {
      if (node.operator === '-') {
        const b = this.compileExprToReg(fs, node.argument);
        this.emit(fs, 'UNM', { a: dest, b });
      } else if (node.operator === 'not') {
        const b = this.compileExprToReg(fs, node.argument);
        this.emit(fs, 'NOT', { a: dest, b });
      } else if (node.operator === '#') {
        const b = this.compileExprToReg(fs, node.argument);
        this.emit(fs, 'LEN', { a: dest, b });
      } else {
        throw new Error('Unsupported unary operator: ' + node.operator);
      }
      return;
    }
    case 'TableConstructorExpression':
      this.compileTableConstructor(fs, node, dest);
      return;
    case 'IndexExpression': {
      const b = this.compileExprToReg(fs, node.base);
      const c = this.compileExprRK(fs, node.index);
      this.emit(fs, 'GETTABLE', { a: dest, b, c });
      return;
    }
    case 'MemberExpression': {
      const b = this.compileExprToReg(fs, node.base);
      const c = this.strK(fs, node.identifier.name);
      this.emit(fs, 'GETTABLE', { a: dest, b, c });
      return;
    }
    case 'CallExpression':
    case 'TableCallExpression':
    case 'StringCallExpression': {
      this.compileCall(fs, node, dest, 2); // want exactly 1 result
      return;
    }
    case 'FunctionDeclaration': {
      this.compileFunctionBody(fs, node, dest);
      return;
    }
    default:
      throw new Error('Unsupported expression node: ' + node.type);
  }
};

Compiler.prototype.compileConcat = function compileConcat(fs, node, dest) {
  // Flatten a chain of `..` into one CONCAT over consecutive registers,
  // matching Lua's usual compilation (right-associative operator, but
  // compiled as one run of registers for efficiency).
  const parts = [];
  (function flatten(n) {
    if (n.type === 'BinaryExpression' && n.operator === '..') {
      flatten(n.left);
      flatten(n.right);
    } else {
      parts.push(n);
    }
  })(node);
  const base = fs.freereg;
  for (const p of parts) {
    this.compileExprToReg(fs, p, fs.freereg);
    fs.freereg++;
  }
  const end = fs.freereg - 1;
  this.emit(fs, 'CONCAT', { a: dest, b: base, c: end });
  fs.freereg = Math.max(base, dest + 1); // reclaim temps, keep dest alive
};

// Produces an actual `true`/`false` value (not just a conditional jump) at `dest`.
Compiler.prototype.compileRelIntoBool = function compileRelIntoBool(fs, node, dest) {
  const jmpFalse = this.compileCondJumpFalse(fs, node);
  this.emit(fs, 'LOADBOOL', { a: dest, b: 1 });
  const jmpEnd = this.emit(fs, 'JMP', {});
  this.patchJumpHere(fs, jmpFalse);
  this.emit(fs, 'LOADBOOL', { a: dest, b: 0 });
  this.patchJumpHere(fs, jmpEnd);
};

// Emits code that jumps to a not-yet-known target when `node` is falsy,
// returning the JMP instruction index so the caller can patch it with
// patchJumpHere/patchJumpTo once the target location is known.
Compiler.prototype.compileCondJumpFalse = function compileCondJumpFalse(fs, node) {
  if (node.type === 'BinaryExpression' && node.operator in REL_OP) {
    const op = REL_OP[node.operator];
    const negate = node.operator === '~=';
    const swap = node.operator === '>' || node.operator === '>=';
    const left = swap ? node.right : node.left;
    const right = swap ? node.left : node.right;
    const save = fs.freereg;
    const b = this.compileExprRK(fs, left);
    const c = this.compileExprRK(fs, right);
    // skip-next-if-result==wantTrue ; wantTrue=0 means "skip (continue) when false"
    const wantTrue = negate ? 0 : 1;
    this.emit(fs, op, { a: wantTrue, b, c });
    const jmp = this.emit(fs, 'JMP', {});
    fs.freereg = save;
    return jmp;
  }
  if (node.type === 'UnaryExpression' && node.operator === 'not') {
    return this.compileCondJumpTrue(fs, node.argument);
  }
  if (node.type === 'LogicalExpression' && node.operator === 'and') {
    // both must be true to continue; if either false, jump to false-target.
    // We can't know the false target for the *first* test yet without a
    // second pass, so materialize into a register instead (simpler, still correct).
  }
  const save = fs.freereg;
  const r = this.compileExprToReg(fs, node);
  this.emit(fs, 'TEST', { a: r, c: 1 }); // skip (continue) when truthy
  const jmp = this.emit(fs, 'JMP', {});
  fs.freereg = save;
  return jmp;
};

Compiler.prototype.compileCondJumpTrue = function compileCondJumpTrue(fs, node) {
  if (node.type === 'BinaryExpression' && node.operator in REL_OP) {
    const op = REL_OP[node.operator];
    const negate = node.operator === '~=';
    const swap = node.operator === '>' || node.operator === '>=';
    const left = swap ? node.right : node.left;
    const right = swap ? node.left : node.right;
    const save = fs.freereg;
    const b = this.compileExprRK(fs, left);
    const c = this.compileExprRK(fs, right);
    const wantTrue = negate ? 1 : 0; // skip (continue) when NOT-equal-to-desired => here we want skip when false
    this.emit(fs, op, { a: wantTrue, b, c });
    const jmp = this.emit(fs, 'JMP', {});
    fs.freereg = save;
    return jmp;
  }
  const save = fs.freereg;
  const r = this.compileExprToReg(fs, node);
  this.emit(fs, 'TEST', { a: r, c: 0 }); // skip (continue) when falsy
  const jmp = this.emit(fs, 'JMP', {});
  fs.freereg = save;
  return jmp;
};

Compiler.prototype.compileTableConstructor = function compileTableConstructor(fs, node, dest) {
  this.emit(fs, 'NEWTABLE', { a: dest });
  let arrayIndex = 1;
  const fields = node.fields;
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (f.type === 'TableKey') {
      const key = this.compileExprRK(fs, f.key);
      const val = this.compileExprRK(fs, f.value);
      this.emit(fs, 'SETTABLE', { a: dest, b: key, c: val });
    } else if (f.type === 'TableKeyString') {
      const key = this.strK(fs, f.key.name);
      const val = this.compileExprRK(fs, f.value);
      this.emit(fs, 'SETTABLE', { a: dest, b: key, c: val });
    } else { // TableValue
      const isLast = i === fields.length - 1;
      const isMulti = isLast && (f.value.type === 'CallExpression' || f.value.type === 'TableCallExpression' ||
        f.value.type === 'StringCallExpression' || (f.value.type === 'VarargLiteral' && f.value.value === '...'));
      if (isMulti) {
        const base = fs.freereg;
        if (f.value.type === 'VarargLiteral') {
          this.emit(fs, 'VARARG', { a: base, b: 0 });
        } else {
          this.compileCall(fs, f.value, base, 0);
        }
        this.emit(fs, 'SETLIST', { a: dest, b: arrayIndex, c: base });
      } else {
        const val = this.compileExprRK(fs, f.value);
        this.emit(fs, 'SETTABLE', { a: dest, b: this.numK(fs, arrayIndex), c: val });
        arrayIndex++;
      }
    }
  }
};

// Compiles a call/method-call. `wantB` follows the CALL-C convention:
// 0 = all results (kept on stack from `dest` up), 1 = zero results, N = N-1 results.
Compiler.prototype.compileCall = function compileCall(fs, node, dest, wantC) {
  const save = fs.freereg;
  let funcReg;
  let argStart;
  let args;
  let selfArg = null;

  if (node.type === 'TableCallExpression') {
    funcReg = this.compileExprToReg(fs, node.base, dest);
    fs.freereg = Math.max(fs.freereg, dest + 1);
    args = [node.arguments]; // single TableConstructorExpression
  } else if (node.type === 'StringCallExpression') {
    funcReg = this.compileExprToReg(fs, node.base, dest);
    fs.freereg = Math.max(fs.freereg, dest + 1);
    args = [node.argument];
  } else {
    if (node.base.type === 'MemberExpression' && node.base.indexer === ':') {
      // Method call: the function MUST end up exactly at `dest` (callers in
      // multi-result contexts rely on that), so reserve dest for it first
      // and evaluate the object into a register above it - SELF then copies
      // the object down into dest+1 itself.
      funcReg = dest;
      if (fs.freereg < funcReg + 1) fs.freereg = funcReg + 1;
      const objReg = this.compileExprToReg(fs, node.base.base);
      fs.freereg = funcReg + 1;
      selfArg = objReg;
      this.emit(fs, 'SELF', { a: funcReg, b: objReg, c: this.strK(fs, node.base.identifier.name) });
    } else {
      funcReg = this.compileExprToReg(fs, node.base, dest);
      fs.freereg = Math.max(fs.freereg, dest + 1);
    }
    args = node.arguments;
  }

  argStart = fs.freereg;
  if (selfArg !== null) {
    // SELF already places obj at funcReg+1
    fs.freereg = funcReg + 2;
    argStart = fs.freereg;
  }

  let variadicTail = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const isLast = i === args.length - 1;
    const isMulti = isLast && (a.type === 'CallExpression' || a.type === 'TableCallExpression' ||
      a.type === 'StringCallExpression' || (a.type === 'VarargLiteral' && a.value === '...'));
    if (isMulti) {
      variadicTail = true;
      if (a.type === 'VarargLiteral') {
        this.emit(fs, 'VARARG', { a: fs.freereg, b: 0 });
      } else {
        this.compileCall(fs, a, fs.freereg, 0);
      }
    } else {
      this.compileExprToReg(fs, a, fs.freereg);
      fs.freereg++;
    }
  }

  const nFixed = (fs.freereg - funcReg - 1);
  const b = variadicTail ? 0 : nFixed + 1;
  this.emit(fs, 'CALL', { a: funcReg, b, c: wantC });

  fs.freereg = save;
  if (wantC !== 1) {
    // result(s) land starting at funcReg; move first result into dest if it differs
    if (wantC === 2 && funcReg !== dest) {
      this.emit(fs, 'MOVE', { a: dest, b: funcReg });
    } else if (wantC === 0 || wantC > 2) {
      // caller wants results starting exactly at `dest` (used for multi-value contexts)
      if (funcReg !== dest) {
        const n = wantC === 0 ? null : wantC - 1;
        if (n === null) {
          // unknown count (all results) - shift down via MOVE loop is unsafe (unknown count at compile time);
          // require callers needing 'all results' to pass dest === funcReg.
          throw new Error('internal: variable-result call must target its own base register');
        }
        for (let i = 0; i < n; i++) this.emit(fs, 'MOVE', { a: dest + i, b: funcReg + i });
      }
    }
  }
  fs.freereg = Math.max(fs.freereg, dest + (wantC === 0 ? 0 : Math.max(1, wantC - 1)));
};

module.exports = {};
