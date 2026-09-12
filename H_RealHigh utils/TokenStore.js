'use strict';
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const DATA_DIR  = path.resolve(__dirname, '../H_RealHigh Token_Data');
const DATA_PATH = path.join(DATA_DIR, 'tokens.json');

// ── คีย์เข้ารหัส: มาจาก BOT_TOKEN ในเครื่องนี้เอง (ไม่ต้องตั้งค่าเพิ่ม) ──
function getKey() {
    const cfgPath = path.resolve(__dirname, '../config.json');
    let botToken = 'fallback-key';
    try { botToken = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))?.BOT_TOKEN || botToken; } catch (_) {}
    return crypto.createHash('sha256').update(String(botToken)).digest();
}

function load() {
    try { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); } catch (_) { return {}; }
}
function persist(db) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
}

function encrypt(text) {
    const key    = getKey();
    const iv     = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc    = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag    = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
}
function decrypt(data) {
    const key       = getKey();
    const buf       = Buffer.from(data, 'base64');
    const iv        = buf.subarray(0, 12);
    const tag       = buf.subarray(12, 28);
    const enc       = buf.subarray(28);
    const decipher  = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

function saveToken(userId, token) {
    const db = load();
    db[userId] = { token: encrypt(token), savedAt: Date.now() };
    persist(db);
}

function getToken(userId) {
    const db  = load();
    const rec = db[userId];
    if (!rec) return null;
    try { return decrypt(rec.token); } catch (_) { return null; }
}

function hasToken(userId) {
    return !!load()[userId];
}

function deleteToken(userId) {
    const db = load();
    if (!db[userId]) return false;
    delete db[userId];
    persist(db);
    return true;
}

// ── รายชื่อผู้ใช้ทั้งหมดที่มี Token บันทึกไว้ (ใช้กับระบบแจ้งเตือนเควสใหม่) ──
function listUserIds() {
    return Object.keys(load());
}

module.exports = { saveToken, getToken, hasToken, deleteToken, listUserIds };
