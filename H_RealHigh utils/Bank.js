'use strict';
const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.resolve(__dirname, '../H_RealHigh Bank_Data');
const DATA_PATH = path.join(DATA_DIR, 'balance.json');

function load() {
    try { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); } catch (_) { return {}; }
}
function persist(db) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
}

function GetBalance(userId) {
    const db = load();
    return parseFloat(db[userId] || 0);
}

function AddBalance(userId, amount) {
    const db = load();
    const current = parseFloat(db[userId] || 0);
    const next = current + parseFloat(amount);
    db[userId] = next;
    persist(db);
    return next;
}

// ── หักเงิน — คืนค่า null ถ้ายอดไม่พอ ──
function DeductBalance(userId, amount) {
    const db = load();
    const current = parseFloat(db[userId] || 0);
    const amt = parseFloat(amount);
    if (current < amt) return null;
    const next = current - amt;
    db[userId] = next;
    persist(db);
    return next;
}

function SetBalance(userId, amount) {
    const db = load();
    db[userId] = parseFloat(amount);
    persist(db);
    return db[userId];
}

module.exports = { GetBalance, AddBalance, DeductBalance, SetBalance };
