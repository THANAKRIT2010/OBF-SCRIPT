'use strict';

const { randInt } = require('./rng');

// Roblox / Luau + stock Lua globals and keywords that must NEVER be renamed,
// since the source program may depend on them existing in the environment.
const RESERVED = new Set([
  // keywords
  'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function',
  'goto', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return',
  'then', 'true', 'until', 'while',
  // stock lua / luau libs
  'print', 'type', 'typeof', 'tostring', 'tonumber', 'pairs', 'ipairs',
  'next', 'select', 'unpack', 'rawget', 'rawset', 'rawequal', 'rawlen',
  'setmetatable', 'getmetatable', 'pcall', 'xpcall', 'error', 'assert',
  'require', 'loadstring', 'load', 'collectgarbage', 'newproxy',
  'string', 'table', 'math', 'os', 'io', 'coroutine', 'bit32', 'utf8',
  'debug', '_G', '_VERSION',
  // roblox / luau globals
  'game', 'workspace', 'script', 'shared', 'plugin', 'Players',
  'ReplicatedStorage', 'ServerStorage', 'ServerScriptService',
  'StarterGui', 'StarterPack', 'StarterPlayer', 'Lighting', 'Instance',
  'Vector2', 'Vector3', 'Vector2int16', 'Vector3int16', 'CFrame', 'UDim',
  'UDim2', 'Color3', 'BrickColor', 'Ray', 'Region3', 'Region3int16',
  'Enum', 'EnumItem', 'task', 'wait', 'spawn', 'delay', 'tick', 'time',
  'DebuggerManager', 'elapsedTime', 'PhysicalProperties', 'Random',
  'NumberSequence', 'NumberSequenceKeypoint', 'ColorSequence',
  'ColorSequenceKeypoint', 'NumberRange', 'Rect', 'Faces', 'Axes',
  'PathWaypoint', 'DockWidgetPluginGuiInfo', 'TweenInfo', 'coroutine',
  'utf8', 'buffer', 'warn',
]);

const ALPHABET_START = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_';
const ALPHABET_REST = ALPHABET_START + '0123456789';

class NameGenerator {
  constructor(rng, opts = {}) {
    this.rng = rng;
    this.used = new Set(RESERVED);
    // Confusable style: mostly l/I/1 and O/0 look-alikes, like real obfuscators do,
    // but stay valid Lua identifiers.
    this.confusable = opts.confusable !== false;
    this.confusablePool = 'Il1O0';
  }

  _rawName(minLen, maxLen) {
    const len = randInt(this.rng, minLen, maxLen);
    let s = ALPHABET_START[Math.floor(this.rng() * ALPHABET_START.length)];
    for (let i = 1; i < len; i++) {
      s += ALPHABET_REST[Math.floor(this.rng() * ALPHABET_REST.length)];
    }
    return s;
  }

  _confusableName(minLen, maxLen) {
    const len = randInt(this.rng, minLen, maxLen);
    const chars = ['I', 'l', 'O'];
    let s = chars[Math.floor(this.rng() * chars.length)];
    for (let i = 1; i < len; i++) {
      const r = this.rng();
      if (r < 0.55) {
        s += this.confusablePool[Math.floor(this.rng() * this.confusablePool.length)];
      } else {
        s += ALPHABET_REST[Math.floor(this.rng() * ALPHABET_REST.length)];
      }
    }
    return s;
  }

  next(kind = 'var') {
    let name;
    let tries = 0;
    do {
      name = this.confusable && this.rng() < 0.4
        ? this._confusableName(3, 9)
        : this._rawName(2, 7);
      tries++;
    } while (this.used.has(name) && tries < 1000);
    this.used.add(name);
    return name;
  }
}

module.exports = { NameGenerator, RESERVED };
