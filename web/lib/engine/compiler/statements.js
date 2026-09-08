'use strict';

const { Compiler, FunctionState } = require('./compiler');
require('./expressions');

let selfDeclCounter = 0;

function keepsRegs(stmt) {
  return stmt.type === 'LocalStatement' || (stmt.type === 'FunctionDeclaration' && stmt.isLocal);
}

Compiler.prototype.compileBlock = function compileBlock(fs, statements, ownScope = true) {
  if (ownScope) this.pushScope(fs);
  const save = fs.freereg;
  for (const stmt of statements) {
    const before = fs.freereg;
    this.compileStatement(fs, stmt);
    if (!keepsRegs(stmt)) fs.freereg = before;
  }
  if (ownScope) {
    fs.freereg = save;
    this.popScope(fs);
  }
};

Compiler.prototype.compileStatement = function compileStatement(fs, stmt) {
  switch (stmt.type) {
    case 'LocalStatement': return this.stLocal(fs, stmt);
    case 'AssignmentStatement': return this.stAssign(fs, stmt);
    case 'CallStatement': {
      const base = fs.freereg;
      this.compileCall(fs, stmt.expression, base, 1); // discard results
      fs.freereg = base;
      return;
    }
    case 'IfStatement': return this.stIf(fs, stmt);
    case 'WhileStatement': return this.stWhile(fs, stmt);
    case 'RepeatStatement': return this.stRepeat(fs, stmt);
    case 'DoStatement': return this.compileBlock(fs, stmt.body);
    case 'ForNumericStatement': return this.stForNum(fs, stmt);
    case 'ForGenericStatement': return this.stForGeneric(fs, stmt);
    case 'FunctionDeclaration': return this.stFunctionDecl(fs, stmt);
    case 'LocalFunctionDeclaration': return this.stLocalFunctionDecl(fs, stmt);
    case 'ReturnStatement': return this.stReturn(fs, stmt);
    case 'BreakStatement': return this.stBreak(fs, stmt);
    case 'GotoStatement':
    case 'LabelStatement':
      throw new Error('goto/labels are not supported by this compiler yet');
    default:
      throw new Error('Unsupported statement: ' + stmt.type);
  }
};

Compiler.prototype.stLocal = function stLocal(fs, stmt) {
  const n = stmt.variables.length;
  const inits = stmt.init || [];
  if (n === 1 && inits.length <= 1) {
    const initReg = inits.length ? this.compileExprToReg(fs, inits[0]) : null;
    this.declareLocal(fs, stmt.variables[0], initReg);
    return;
  }
  // General case: evaluate all inits first (with proper multi-value tail handling),
  // THEN declare locals, so `local x, y = y, x` reads old values correctly.
  const base = fs.freereg;
  this.compileExprListToRegs(fs, inits, base, n);
  for (let i = 0; i < n; i++) {
    this.declareLocal(fs, stmt.variables[i], base + i);
  }
};

// Compiles a list of expressions so that exactly `want` values end up in
// consecutive registers starting at `base` (padding with nil, truncating
// extra, and correctly expanding a final call/vararg expression).
Compiler.prototype.compileExprListToRegs = function compileExprListToRegs(fs, exprs, base, want) {
  fs.freereg = base;
  if (exprs.length === 0) {
    for (let i = 0; i < want; i++) { this.emit(fs, 'LOADNIL', { a: base + i, b: 0 }); }
    fs.freereg = base + want;
    return;
  }
  for (let i = 0; i < exprs.length - 1; i++) {
    this.compileExprToReg(fs, exprs[i], base + i);
    fs.freereg = base + i + 1;
  }
  const lastIdx = exprs.length - 1;
  const last = exprs[lastIdx];
  const remaining = want - lastIdx;
  const isMulti = last.type === 'CallExpression' || last.type === 'TableCallExpression' ||
    last.type === 'StringCallExpression' || (last.type === 'VarargLiteral' && last.value === '...');
  if (remaining <= 0) {
    // more exprs than wanted slots: still evaluate for side effects, but only
    // exprs beyond `want` overflow - simplest correct handling: just compile
    // the rest into scratch registers above `want`.
    for (let i = Math.max(lastIdx, 0); i < exprs.length; i++) {
      this.compileExprToReg(fs, exprs[i], fs.freereg);
      fs.freereg++;
    }
    fs.freereg = base + want;
    return;
  }
  if (isMulti) {
    if (last.type === 'VarargLiteral') {
      this.emit(fs, 'VARARG', { a: base + lastIdx, b: remaining + 1 });
    } else {
      this.compileCall(fs, last, base + lastIdx, remaining + 1);
    }
  } else {
    this.compileExprToReg(fs, last, base + lastIdx);
    for (let i = lastIdx + 1; i < want; i++) {
      this.emit(fs, 'LOADNIL', { a: base + i, b: 0 });
    }
  }
  fs.freereg = base + want;
};

Compiler.prototype.stAssign = function stAssign(fs, stmt) {
  const n = stmt.variables.length;
  const base = fs.freereg;
  this.compileExprListToRegs(fs, stmt.init, base, n);
  for (let i = 0; i < n; i++) {
    this.assignTo(fs, stmt.variables[i], base + i);
  }
  fs.freereg = base;
};

Compiler.prototype.assignTo = function assignTo(fs, target, valueReg) {
  if (target.type === 'Identifier') {
    const res = this.resolveVar(fs, target.name);
    if (res.kind === 'local') {
      if (res.boxed) {
        this.emit(fs, 'SETTABLE', { a: res.reg, b: this.numK(fs, 1), c: this.reg(valueReg) });
      } else if (res.reg !== valueReg) {
        this.emit(fs, 'MOVE', { a: res.reg, b: valueReg });
      }
    } else if (res.kind === 'upval') {
      const tmp = fs.freereg;
      this.emit(fs, 'GETUPVAL', { a: tmp, b: res.idx });
      this.emit(fs, 'SETTABLE', { a: tmp, b: this.numK(fs, 1), c: this.reg(valueReg) });
    } else {
      this.emit(fs, 'SETGLOBAL', { a: valueReg, bx: this.strK(fs, target.name).v });
    }
    return;
  }
  if (target.type === 'MemberExpression') {
    const b = this.compileExprToReg(fs, target.base);
    const c = this.strK(fs, target.identifier.name);
    this.emit(fs, 'SETTABLE', { a: b, b: c, c: this.reg(valueReg) });
    return;
  }
  if (target.type === 'IndexExpression') {
    const b = this.compileExprToReg(fs, target.base);
    const c = this.compileExprRK(fs, target.index);
    this.emit(fs, 'SETTABLE', { a: b, b: c, c: this.reg(valueReg) });
    return;
  }
  throw new Error('Unsupported assignment target: ' + target.type);
};

Compiler.prototype.stIf = function stIf(fs, stmt) {
  const endJumps = [];
  const clauses = stmt.clauses;
  for (let i = 0; i < clauses.length; i++) {
    const cl = clauses[i];
    if (cl.type === 'ElseClause') {
      this.compileBlock(fs, cl.body);
      continue;
    }
    const jmpFalse = this.compileCondJumpFalse(fs, cl.condition);
    this.compileBlock(fs, cl.body);
    const hasMore = i < clauses.length - 1;
    if (hasMore) endJumps.push(this.emit(fs, 'JMP', {}));
    this.patchJumpHere(fs, jmpFalse);
  }
  for (const j of endJumps) this.patchJumpHere(fs, j);
};

Compiler.prototype.stWhile = function stWhile(fs, stmt) {
  const top = this.here(fs);
  const jmpFalse = this.compileCondJumpFalse(fs, stmt.condition);
  fs.loopStack.push({ breakJumps: [] });
  this.compileBlock(fs, stmt.body);
  this.emit(fs, 'JMP', { sbx: 0 });
  this.patchJumpTo(fs, this.here(fs) - 1, top);
  this.patchJumpHere(fs, jmpFalse);
  const loop = fs.loopStack.pop();
  for (const j of loop.breakJumps) this.patchJumpHere(fs, j);
};

Compiler.prototype.stRepeat = function stRepeat(fs, stmt) {
  const top = this.here(fs);
  fs.loopStack.push({ breakJumps: [] });
  // repeat's condition can see locals declared in the body, so compile the
  // body and condition in the SAME scope (no separate pushScope/popScope pair).
  this.pushScope(fs);
  const save = fs.freereg;
  for (const s of stmt.body) {
    const before = fs.freereg;
    this.compileStatement(fs, s);
    if (!keepsRegs(s)) fs.freereg = before;
  }
  const jmpFalse = this.compileCondJumpFalse(fs, stmt.condition);
  this.patchJumpTo(fs, jmpFalse, top); // condition false -> repeat
  fs.freereg = save;
  this.popScope(fs);
  const loop = fs.loopStack.pop();
  for (const j of loop.breakJumps) this.patchJumpHere(fs, j);
};

Compiler.prototype.stBreak = function stBreak(fs) {
  const loop = fs.loopStack[fs.loopStack.length - 1];
  if (!loop) throw new Error('break outside a loop');
  loop.breakJumps.push(this.emit(fs, 'JMP', {}));
};

Compiler.prototype.stForNum = function stForNum(fs, stmt) {
  this.pushScope(fs);
  const save = fs.freereg;
  const base = fs.freereg;
  this.compileExprToReg(fs, stmt.start, base);
  this.compileExprToReg(fs, stmt.end, base + 1);
  fs.freereg = base + 2;
  if (stmt.step) this.compileExprToReg(fs, stmt.step, base + 2);
  else this.emit(fs, 'LOADK', { a: base + 2, bx: this.numK(fs, 1).v });
  fs.freereg = base + 3;

  const prep = this.emit(fs, 'FORPREP', { a: base, sbx: 0 });
  const bodyStart = this.here(fs);
  this.pushScope(fs);
  const loopVarReg = fs.freereg++;
  this.emit(fs, 'MOVE', { a: loopVarReg, b: base });
  this.declareRaw(fs, stmt.variable, loopVarReg, false);
  if (this.capturedSet.has(stmt.variable.$declId)) {
    // re-declare boxed so closures inside the loop body capture a *fresh*
    // cell each iteration (matching Lua 5.2+/Luau per-iteration semantics).
    const box = fs.freereg++;
    this.emit(fs, 'NEWTABLE', { a: box });
    this.emit(fs, 'SETTABLE', { a: box, b: this.numK(fs, 1), c: this.reg(loopVarReg) });
    this.declareRaw(fs, stmt.variable, box, true);
  }
  fs.loopStack.push({ breakJumps: [] });
  this.compileBlock(fs, stmt.body);
  this.popScope(fs);
  fs.freereg = base + 3;
  this.patchJumpHere(fs, prep);
  const loopIns = this.emit(fs, 'FORLOOP', { a: base, sbx: 0 });
  this.patchJumpTo(fs, loopIns, bodyStart);
  const loop = fs.loopStack.pop();
  for (const j of loop.breakJumps) this.patchJumpHere(fs, j);
  fs.freereg = save;
  this.popScope(fs);
};

Compiler.prototype.stForGeneric = function stForGeneric(fs, stmt) {
  this.pushScope(fs);
  const save = fs.freereg;
  const base = fs.freereg;
  // base+0 = iterator func, base+1 = state, base+2 = control var
  this.compileExprListToRegs(fs, stmt.iterators, base, 3);
  fs.freereg = base + 3;

  const jmpToCall = this.emit(fs, 'JMP', {});
  const bodyStart = this.here(fs);
  this.pushScope(fs);
  const nvars = stmt.variables.length;
  const resultsBase = base + 3;
  fs.freereg = resultsBase + nvars;
  for (let i = 0; i < nvars; i++) {
    const v = stmt.variables[i];
    if (this.capturedSet.has(v.$declId)) {
      const box = fs.freereg++;
      this.emit(fs, 'NEWTABLE', { a: box });
      this.emit(fs, 'SETTABLE', { a: box, b: this.numK(fs, 1), c: this.reg(resultsBase + i) });
      this.declareRaw(fs, v, box, true);
    } else {
      this.declareRaw(fs, v, resultsBase + i, false);
    }
  }
  fs.loopStack.push({ breakJumps: [] });
  this.compileBlock(fs, stmt.body);
  this.popScope(fs);

  this.patchJumpHere(fs, jmpToCall);
  fs.freereg = resultsBase + nvars;
  this.emit(fs, 'TFORCALL', { a: base, c: nvars });
  const loopIns = this.emit(fs, 'TFORLOOP', { a: base + 2, sbx: 0 });
  this.patchJumpTo(fs, loopIns, bodyStart);
  const loop = fs.loopStack.pop();
  for (const j of loop.breakJumps) this.patchJumpHere(fs, j);
  fs.freereg = save;
  this.popScope(fs);
};

Compiler.prototype.stReturn = function stReturn(fs, stmt) {
  const args = stmt.arguments || [];
  if (args.length === 0) {
    this.emit(fs, 'RETURN', { a: fs.freereg, b: 1 });
    return;
  }
  const base = fs.freereg;
  const last = args[args.length - 1];
  const isMulti = last.type === 'CallExpression' || last.type === 'TableCallExpression' ||
    last.type === 'StringCallExpression' || (last.type === 'VarargLiteral' && last.value === '...');
  for (let i = 0; i < args.length - 1; i++) {
    this.compileExprToReg(fs, args[i], base + i);
    fs.freereg = base + i + 1;
  }
  if (isMulti) {
    if (last.type === 'VarargLiteral') {
      this.emit(fs, 'VARARG', { a: base + args.length - 1, b: 0 });
    } else {
      this.compileCall(fs, last, base + args.length - 1, 0);
    }
    this.emit(fs, 'RETURN', { a: base, b: 0 });
  } else {
    this.compileExprToReg(fs, last, base + args.length - 1);
    this.emit(fs, 'RETURN', { a: base, b: args.length + 1 });
  }
};

Compiler.prototype.stFunctionDecl = function stFunctionDecl(fs, stmt) {
  if (stmt.isLocal && stmt.identifier.type === 'Identifier') {
    // `local function f() ... end` - declare the name FIRST (with no
    // init) so the function body can call itself recursively, exactly
    // like a `local` variable would need to for a manual forward-decl.
    const reg = this.declareLocal(fs, stmt.identifier, null);
    const tmp = fs.freereg;
    fs.freereg++;
    this.compileFunctionBody(fs, stmt, tmp);
    this.assignTo(fs, stmt.identifier, tmp);
    fs.freereg = reg + 1;
    return;
  }
  const dest = fs.freereg;
  fs.freereg++;
  this.compileFunctionBody(fs, stmt, dest);
  this.assignTo(fs, stmt.identifier, dest);
  fs.freereg = dest;
};

Compiler.prototype.stLocalFunctionDecl = function stLocalFunctionDecl(fs, stmt) {
  const reg = this.declareLocal(fs, stmt.identifier, null);
  const tmp = fs.freereg;
  fs.freereg++;
  this.compileFunctionBody(fs, stmt, tmp);
  this.assignTo(fs, stmt.identifier, tmp);
  fs.freereg = reg + 1;
};

// Compiles a function AST node (FunctionDeclaration used as decl or expr) into
// a nested prototype and emits CLOSURE into `dest`.
Compiler.prototype.compileFunctionBody = function compileFunctionBody(outerFs, node, dest) {
  const fs = new FunctionState(outerFs);
  fs.isVararg = !!node.hasVarargs || (node.parameters.length > 0 && node.parameters[node.parameters.length - 1].type === 'VarargLiteral');
  let params = node.parameters.filter(p => p.type === 'Identifier');
  const isMethod = node.identifier && node.identifier.type === 'MemberExpression' && node.identifier.indexer === ':';
  if (isMethod) {
    const selfIdent = { type: 'Identifier', name: 'self', $declId: -(++selfDeclCounter) };
    params = [selfIdent, ...params];
  }
  fs.numParams = params.length;
  this.pushScope(fs);
  // Calling convention: CALL places argument i at register i of the new
  // frame, so those slots are reserved as-is; a captured param additionally
  // gets a box allocated *above* the raw argument slots (never reusing the
  // same register the raw value arrived in, so it can't be clobbered before
  // it's copied into the box).
  fs.freereg = params.length;
  for (let i = 0; i < params.length; i++) {
    const p = params[i];
    if (this.capturedSet.has(p.$declId)) {
      const box = fs.freereg++;
      this.emit(fs, 'NEWTABLE', { a: box });
      this.emit(fs, 'SETTABLE', { a: box, b: this.numK(fs, 1), c: this.reg(i) });
      this.declareRaw(fs, p, box, true);
    } else {
      this.declareRaw(fs, p, i, false);
    }
  }
  this.compileBlock(fs, node.body, false);
  this.emit(fs, 'RETURN', { a: fs.freereg, b: 1 });
  this.popScope(fs);
  const proto = this.finish(fs);
  const idx = outerFs.protos.length;
  outerFs.protos.push(proto);
  this.emit(outerFs, 'CLOSURE', { a: dest, bx: idx });
};

module.exports = {};
