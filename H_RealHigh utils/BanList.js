'use strict';
const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.resolve(__dirname, '../H_RealHigh Token_Data');
const BAN_PATH  = path.join(DATA_DIR, 'banned.json');

function load() {
    try { return JSON.parse(fs.readFileSync(BAN_PATH, 'utf8')); } catch (_) { return {}; }
}
function persist(db) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(BAN_PATH, JSON.stringify(db, null, 2));
}

function banUser(userId, reason = '', bannedBy = null) {
    const db = load();
    db[userId] = { bannedAt: Date.now(), reason, bannedBy };
    persist(db);
}

function unbanUser(userId) {
    const db = load();
    if (!db[userId]) return false;
    delete db[userId];
    persist(db);
    return true;
}

function isBanned(userId) {
    return !!load()[userId];
}

function getBanInfo(userId) {
    return load()[userId] || null;
}

function listBanned() {
    return load();
}

module.exports = { banUser, unbanUser, isBanned, getBanInfo, listBanned };
