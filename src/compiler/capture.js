'use strict';

// Walks the AST once to figure out which local variables are ever read or
// written by a *nested* function (a closure). Those locals get compiled as
// heap "cells" (1-field tables) instead of plain registers, so that when the
// closure and its enclosing function both mutate the variable, they see the
// same value - this is what gives us real Lua upvalue semantics (shared,
// mutable) instead of a capture-by-snapshot approximation.
//
// Returns a Set of AST local-declaration node identities (`scopeId:name`)
// that must be boxed. We identify a declared local by a synthetic id we
// stamp onto its declaring node ahead of time via `markDeclSites`.

let _uid = 0;
function nextUid() { return ++_uid; }

// Assigns a unique `$declId` to every place a local variable/param comes
// into existence, so later passes can refer to "this specific local"
// unambiguously (Lua allows shadowing, so name alone isn't enough).
function markDeclSites(chunk) {
  function markList(names) {
    for (const n of names) n.$declId = nextUid();
  }
  function visitFunctionParams(node) {
    markList(node.parameters.filter(p => p.type === 'Identifier'));
  }
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    switch (node.type) {
      case 'LocalStatement':
        markList(node.variables);
        (node.init || []).forEach(walk);
        return;
      case 'ForNumericStatement':
        node.variable.$declId = nextUid();
        walk(node.start); walk(node.end); walk(node.step);
        walk(node.body);
        return;
      case 'ForGenericStatement':
        markList(node.variables);
        (node.iterators || []).forEach(walk);
        walk(node.body);
        return;
      case 'FunctionDeclaration':
        visitFunctionParams(node);
        if (node.identifier && node.isLocal) node.identifier.$declId = nextUid();
        walk(node.body);
        return;
      case 'LocalFunctionDeclaration':
        walk(node.body);
        return;
    }
    for (const key in node) {
      if (key === 'parent' || key.startsWith('$')) continue;
      const v = node[key];
      if (v && typeof v === 'object') walk(v);
    }
  }
  walk(chunk);
}

// Returns Set<number declId> of locals that must be boxed.
function findCaptured(chunk) {
  const captured = new Set();

  // scopeStack: array of function-scopes; each is a Map<name, declId array (stack for shadowing)>
  function pushFuncScope(stack) { stack.push([new Map()]); }
  function pushBlockScope(funcScope) { funcScope.push(new Map()); }
  function popBlockScope(funcScope) { funcScope.pop(); }
  function declare(funcScope, ident) {
    if (!ident || ident.type !== 'Identifier') return;
    const block = funcScope[funcScope.length - 1];
    if (!block.has(ident.name)) block.set(ident.name, []);
    block.get(ident.name).push(ident.$declId);
  }
  function resolveInFunc(funcScope, name) {
    for (let i = funcScope.length - 1; i >= 0; i--) {
      const block = funcScope[i];
      if (block.has(name)) {
        const arr = block.get(name);
        return arr[arr.length - 1];
      }
    }
    return null;
  }

  // funcStack: stack of funcScope arrays, one per enclosing function level
  const funcStack = [];

  function currentFuncIndexOwning(name) {
    // search from innermost function outward; return [funcLevel, declId] or null
    for (let lvl = funcStack.length - 1; lvl >= 0; lvl--) {
      const id = resolveInFunc(funcStack[lvl], name);
      if (id != null) return [lvl, id];
    }
    return null;
  }

  function walkExprList(list) { (list || []).forEach(walk); }

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }

    switch (node.type) {
      case 'Identifier': {
        const found = currentFuncIndexOwning(node.name);
        if (found) {
          const [lvl, declId] = found;
          if (lvl !== funcStack.length - 1) captured.add(declId);
        }
        return;
      }
      case 'LocalStatement': {
        walkExprList(node.init);
        node.variables.forEach(v => declare(funcStack[funcStack.length - 1], v));
        return;
      }
      case 'AssignmentStatement': {
        walkExprList(node.init);
        node.variables.forEach(walk);
        return;
      }
      case 'FunctionDeclaration':
      case 'LocalFunctionDeclaration': {
        if (node.type === 'LocalFunctionDeclaration' || (node.type === 'FunctionDeclaration' && node.isLocal)) {
          declare(funcStack[funcStack.length - 1], node.identifier);
        } else if (node.type === 'FunctionDeclaration' && node.identifier) {
          walk(node.identifier); // could be a global or table member
        }
        pushFuncScope(funcStack);
        const fs = funcStack[funcStack.length - 1];
        node.parameters.forEach(p => { if (p.type === 'Identifier') declare(fs, p); });
        walk(node.body);
        funcStack.pop();
        return;
      }
      case 'ForNumericStatement': {
        walk(node.start); walk(node.end); walk(node.step);
        pushBlockScope(funcStack[funcStack.length - 1]);
        declare(funcStack[funcStack.length - 1], node.variable);
        walk(node.body);
        popBlockScope(funcStack[funcStack.length - 1]);
        return;
      }
      case 'ForGenericStatement': {
        walkExprList(node.iterators);
        pushBlockScope(funcStack[funcStack.length - 1]);
        node.variables.forEach(v => declare(funcStack[funcStack.length - 1], v));
        walk(node.body);
        popBlockScope(funcStack[funcStack.length - 1]);
        return;
      }
      case 'DoStatement':
      case 'WhileStatement':
      case 'RepeatStatement':
      case 'IfClause': case 'ElseifClause': case 'ElseClause': {
        pushBlockScope(funcStack[funcStack.length - 1]);
        for (const key in node) {
          if (key === 'type') continue;
          walk(node[key]);
        }
        popBlockScope(funcStack[funcStack.length - 1]);
        return;
      }
      default: {
        for (const key in node) {
          if (key.startsWith('$')) continue;
          walk(node[key]);
        }
      }
    }
  }

  pushFuncScope(funcStack); // top-level chunk is "function level 0"
  walk(chunk);
  return captured;
}

module.exports = { markDeclSites, findCaptured };
