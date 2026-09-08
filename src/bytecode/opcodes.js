'use strict';

// This is the VM's *canonical* instruction set. These names/indices are only
// ever used inside the compiler while it builds a program - they never reach
// the generated output. Every build maps this list through a random
// permutation (see encoder/opmap.js) before it is written out, so the byte
// that means LOADK in one build means something else in the next.
//
// Design mirrors a classic register-based VM (registers + a per-function
// constant pool + upvalues), which is the standard architecture for this
// kind of bytecode interpreter.
const OPCODES = [
  'LOADK',      // A Bx    : R[A] = K[Bx]
  'LOADBOOL',   // A B     : R[A] = (B ~= 0)
  'LOADNIL',    // A B     : R[A..A+B] = nil
  'MOVE',       // A B     : R[A] = R[B]
  'GETGLOBAL',  // A Bx    : R[A] = ENV[K[Bx]]
  'SETGLOBAL',  // A Bx    : ENV[K[Bx]] = R[A]
  'GETUPVAL',   // A B     : R[A] = Upval[B]
  'SETUPVAL',   // A B     : Upval[B] = R[A]
  'GETTABLE',   // A B C   : R[A] = R[B][RK(C)]
  'SETTABLE',   // A B C   : R[A][RK(B)] = RK(C)
  'NEWTABLE',   // A       : R[A] = {}
  'SELF',       // A B C   : R[A+1] = R[B]; R[A] = R[B][RK(C)]
  'ADD',        // A B C   : R[A] = RK(B) + RK(C)
  'SUB',        // A B C
  'MUL',        // A B C
  'DIV',        // A B C
  'MOD',        // A B C
  'POW',        // A B C
  'CONCAT',     // A B C   : R[A] = R[B] .. .. .. R[C]
  'UNM',        // A B     : R[A] = -R[B]
  'NOT',        // A B     : R[A] = not R[B]
  'LEN',        // A B     : R[A] = #R[B]
  'JMP',        // sBx     : pc += sBx
  'EQ',         // A B C   : if (RK(B) == RK(C)) ~= (A~=0) then pc++
  'LT',         // A B C   : if (RK(B) <  RK(C)) ~= (A~=0) then pc++
  'LE',         // A B C   : if (RK(B) <= RK(C)) ~= (A~=0) then pc++
  'TEST',       // A C     : if not (bool(R[A]) == (C~=0)) then pc++
  'CALL',       // A B C   : R[A..] = R[A](R[A+1 .. A+B-1])  (B=0 => to top; C-1 results, 0 => all)
  'RETURN',     // A B     : return R[A .. A+B-2] (B=0 => to top)
  'CLOSURE',    // A Bx    : R[A] = make-closure(proto[Bx])
  'VARARG',     // A B     : R[A..] = ...  (B-1 values, 0 => all)
  'SETLIST',    // A B C   : R[A][B], R[A][B+1], .. = R[C], R[C+1], .. up to `top`
  'FORPREP',    // A sBx   : prepares numeric for, jumps to FORLOOP
  'FORLOOP',    // A sBx   : numeric for step + branch
  'TFORCALL',   // A C     : calls iterator, fills R[A+3..A+2+C]
  'TFORLOOP',   // A sBx   : generic for branch
  'HALT',       // -       : stop the dispatch loop (used for anti-tamper trap)
];

const OPCODE_INDEX = Object.fromEntries(OPCODES.map((name, i) => [name, i]));

module.exports = { OPCODES, OPCODE_INDEX };
