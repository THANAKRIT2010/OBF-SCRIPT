'use strict';
const fs   = require('fs');
const path = require('path');
const { buildContainer, v2Payload } = require('./V2Container');

const FLAG_PATH = path.resolve(__dirname, './.restart_flag.json');

const LoadDataPath = path.resolve(__dirname, '../H_RealHigh UpDate_Setting/LoadData.json');
function LoadDataUpdate() {
    try { return JSON.parse(fs.readFileSync(LoadDataPath, 'utf8')); } catch (_) { return {}; }
}

// ── อ่านค่ารอบเวลาจาก LoadData.json (ตั้งได้ผ่านเมนู /setup) ──
function getIntervalMs() {
    const min = parseInt(LoadDataUpdate()?.RESTART_INTERVAL_MIN ?? '120'); // ค่าเริ่มต้น 120 นาที = 2 ชม.
    return Math.max(5, min) * 60 * 1000; // กันตั้งค่าต่ำเกินไปจนวนถี่เกิน (ขั้นต่ำ 5 นาที)
}
function getWarningMs() {
    const min = parseInt(LoadDataUpdate()?.RESTART_WARNING_MIN ?? '2'); // ค่าเริ่มต้นเตือนล่วงหน้า 2 นาที
    return Math.max(1, min) * 60 * 1000;
}

function markRestartPending() {
    try { fs.writeFileSync(FLAG_PATH, JSON.stringify({ pending: true, ts: Date.now() })); } catch (_) {}
}
function wasPendingRestart() {
    try { return JSON.parse(fs.readFileSync(FLAG_PATH, 'utf8'))?.pending === true; } catch (_) { return false; }
}
function clearRestartFlag() {
    try { fs.writeFileSync(FLAG_PATH, JSON.stringify({ pending: false })); } catch (_) {}
}

// ── ส่งแจ้งเตือนไปช่องที่ตั้งค่าไว้ (CHANNEL_RESTART_LOG) ──
async function sendRestartNotice(BOT_STATUS, title, lines) {
    try {
        const channelId = LoadDataUpdate()?.CHANNEL_RESTART_LOG;
        if (!channelId) return;
        const channel = BOT_STATUS.channels.cache.get(channelId)
            || await BOT_STATUS.channels.fetch(channelId).catch(() => null);
        if (!channel) return;
        await channel.send(v2Payload(buildContainer(title, lines), false));
    } catch (e) {
        console.error('[AutoRestart] ส่งแจ้งเตือนล้มเหลว:', e.message);
    }
}

// ── ตั้งรอบรีสตาร์ทอัตโนมัติ (เรียกครั้งเดียวตอนบอทพร้อมใช้งาน) ──
function scheduleAutoRestart(BOT_STATUS) {
    const intervalMs = getIntervalMs();
    const warningMs  = getWarningMs();
    const firstWarningDelay = Math.max(0, intervalMs - warningMs);
    const warningMin = Math.round(warningMs / 60000);
    const intervalHrLabel = (intervalMs / 3600000).toFixed(1).replace(/\.0$/, '');

    setTimeout(async () => {
        console.log(`[AutoRestart] แจ้งเตือนก่อนรีสตาร์ท ${warningMin} นาที...`);
        await sendRestartNotice(BOT_STATUS, `\`\`🔄\`\` บอทจะรีสตาร์ทในอีก ${warningMin} นาที`, [
            `\`\`\`ระบบจะรีสตาร์ทตัวเองอัตโนมัติเพื่อความเสถียร (ทุก ${intervalHrLabel} ชั่วโมง)\nระหว่างนี้ห้ามพักเควสค้างไว้ กรุณารอสักครู่\`\`\``
        ]);

        setTimeout(() => {
            markRestartPending();
            console.log('[AutoRestart] กำลังรีสตาร์ทตามกำหนดเวลา...');
            process.exit(0); // ตัว start.js (auto-restart loop) จะสั่ง node index.js ใหม่ให้เอง
        }, warningMs);

    }, firstWarningDelay);
}

// ── เรียกตอนบอท ready: เช็คว่าเพิ่งรีสตาร์ทมาไหม แล้วค่อยตั้งรอบใหม่ ──
async function initAutoRestart(BOT_STATUS) {
    if (wasPendingRestart()) {
        clearRestartFlag();
        console.log('[AutoRestart] กลับมาออนไลน์หลังรีสตาร์ทตามกำหนดเวลาแล้ว');
        await sendRestartNotice(BOT_STATUS, '``✅`` บอทกลับมาออนไลน์ปกติแล้ว', [
            '```รีสตาร์ทตามกำหนดเวลาเสร็จสมบูรณ์ ระบบทำงานเป็นปกติแล้ว```'
        ]);
    }
    scheduleAutoRestart(BOT_STATUS);
}

// ── ให้แอดมินกดรีสตาร์ททันทีจากเมนู /setup ──
async function triggerManualRestart(BOT_STATUS) {
    markRestartPending();
    await sendRestartNotice(BOT_STATUS, '``🔄`` แอดมินสั่งรีสตาร์ทบอท', [
        '```บอทกำลังจะรีสตาร์ทตามคำสั่งแอดมิน กรุณารอสักครู่...```'
    ]);
    setTimeout(() => {
        console.log('[AutoRestart] รีสตาร์ทตามคำสั่งแอดมิน...');
        process.exit(0);
    }, 1500); // เผื่อเวลาให้ reply/ข้อความแจ้งเตือนส่งเสร็จก่อนปิดตัว
}

module.exports = { initAutoRestart, triggerManualRestart };
