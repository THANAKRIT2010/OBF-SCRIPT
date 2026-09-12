'use strict';
const fs           = require('fs');
const path         = require('path');
const express      = require('express');
const cookieParser = require('cookie-parser');
const crypto       = require('crypto');

const LoadDataPath = path.resolve(__dirname, '../H_RealHigh UpDate_Setting/LoadData.json');
const ConfigPath   = path.resolve(__dirname, '../config.json');

function LoadDataUpdate() {
    try { return JSON.parse(fs.readFileSync(LoadDataPath, 'utf8')); } catch (_) { return {}; }
}
function SaveDataUpdate(db) {
    fs.writeFileSync(LoadDataPath, JSON.stringify(db, null, 2));
}
function LoadConfig() {
    try { return JSON.parse(fs.readFileSync(ConfigPath, 'utf8')); } catch (_) { return {}; }
}

const EDITABLE_KEYS = [
    'CHANNEL_QUEST_LOG', 'Link_Discohook', 'NOTIFY_QUEST_CHANNEL',
    'NOTIFY_MONITOR_TOKEN', 'NOTIFY_INTERVAL_MIN', 'CHANNEL_RESTART_LOG',
    'RESTART_INTERVAL_MIN', 'RESTART_WARNING_MIN',
    'PHONE_TRUEWALLET', 'CHANNEL_TOPUP_LOG', 'QUEST_PRICE_EACH', 'QUEST_PRICE_ALL'
];

const activeSessions = new Set();

function requireAuthPage(req, res, next) {
    const sid = req.cookies?.dashboard_sid;
    if (sid && activeSessions.has(sid)) return next();
    return res.redirect('/login');
}
function requireAuthApi(req, res, next) {
    const sid = req.cookies?.dashboard_sid;
    if (sid && activeSessions.has(sid)) return next();
    return res.status(401).json({ error: 'unauthorized' });
}
function requireAuthReverse(req, res, next) {
    const sid = req.cookies?.dashboard_sid;
    if (sid && activeSessions.has(sid)) return res.redirect('/');
    next();
}

function startDashboard(BOT_STATUS, { TokenStore, BanList, triggerManualRestart } = {}) {
    const cfg  = LoadConfig();
    const port = parseInt(process.env.DASHBOARD_PORT || cfg.DASHBOARD_PORT || 3939);
    const pass = process.env.DASHBOARD_PASSWORD || cfg.DASHBOARD_PASSWORD;

    if (!pass) {
        console.warn('[WebDashboard] ⚠️  ยังไม่ได้ตั้ง DASHBOARD_PASSWORD ใน config.json — ปิดการใช้งานแดชบอร์ดไว้ก่อน');
        return;
    }

    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, 'dashboard-public')));

    app.post('/api/login', (req, res) => {
        const { password } = req.body || {};
        if (password !== pass) return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
        const sid = crypto.randomBytes(24).toString('hex');
        activeSessions.add(sid);
        res.cookie('dashboard_sid', sid, { httpOnly: true, maxAge: 12 * 60 * 60 * 1000 });
        res.json({ ok: true });
    });

    app.post('/api/logout', (req, res) => {
        const sid = req.cookies?.dashboard_sid;
        if (sid) activeSessions.delete(sid);
        res.clearCookie('dashboard_sid');
        res.json({ ok: true });
    });

    app.use('/api', (req, res, next) => {
        if (req.path === '/login') return next();
        return requireAuthApi(req, res, next);
    });

    app.get('/api/status', (req, res) => {
        const savedTokenCount = TokenStore ? TokenStore.listUserIds().length : 0;
        const bannedCount     = BanList ? Object.keys(BanList.listBanned()).length : 0;
        res.json({
            online: !!BOT_STATUS?.user,
            tag: BOT_STATUS?.user?.tag || null,
            uptimeSec: Math.floor(process.uptime()),
            guildCount: BOT_STATUS?.guilds?.cache?.size || 0,
            wsPing: BOT_STATUS?.ws?.ping ?? null,
            savedTokenCount,
            bannedCount
        });
    });

    app.get('/api/settings', (req, res) => {
        const db = LoadDataUpdate();
        const safe = {};
        for (const key of EDITABLE_KEYS) safe[key] = db[key] ?? '';
        res.json(safe);
    });

    app.post('/api/settings', (req, res) => {
        const db = LoadDataUpdate();
        const body = req.body || {};
        for (const key of EDITABLE_KEYS) {
            if (Object.prototype.hasOwnProperty.call(body, key)) {
                db[key] = String(body[key]);
            }
        }
        SaveDataUpdate(db);
        res.json({ ok: true });
    });

    app.get('/api/bans', (req, res) => {
        if (!BanList) return res.json({});
        res.json(BanList.listBanned());
    });

    app.post('/api/bans', (req, res) => {
        if (!BanList) return res.status(501).json({ error: 'not_supported' });
        const { userId, reason } = req.body || {};
        if (!userId || !/^\d{15,25}$/.test(String(userId))) {
            return res.status(400).json({ error: 'invalid_userId' });
        }
        BanList.banUser(String(userId), reason || '', 'dashboard');
        res.json({ ok: true });
    });

    app.delete('/api/bans/:userId', (req, res) => {
        if (!BanList) return res.status(501).json({ error: 'not_supported' });
        const removed = BanList.unbanUser(req.params.userId);
        res.json({ ok: removed });
    });

    app.post('/api/restart', async (req, res) => {
        res.json({ ok: true, message: 'กำลังรีสตาร์ท...' });
        if (typeof triggerManualRestart === 'function') {
            await triggerManualRestart(BOT_STATUS);
        }
    });

    app.get('/login', requireAuthReverse, (req, res) => {
        res.sendFile(path.join(__dirname, 'dashboard-public', 'login.html'));
    });
    app.get('/', requireAuthPage, (req, res) => {
        res.sendFile(path.join(__dirname, 'dashboard-public', 'index.html'));
    });

    const server = app.listen(port, () => {
        console.log(`[WebDashboard] ✅ แดชบอร์ดแอดมินพร้อมใช้งานที่ http://localhost:${port}`);
    });
    server.on('error', (err) => {
        console.error(`[WebDashboard] เปิดพอร์ต ${port} ไม่สำเร็จ (บอทยังทำงานปกติ):`, err.message);
    });

    return app;
}

module.exports = { startDashboard };
