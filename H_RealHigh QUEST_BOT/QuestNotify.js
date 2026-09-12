'use strict';
const fs   = require('fs');
const path = require('path');
const BOT_STATUS   = require('../index');
const QuestHandler = require('../H_RealHigh_QUEST');
const moment = require('moment-timezone');
const TokenStore = require('../H_RealHigh utils/TokenStore');

const LoadDataUpdate = () => {
    const p = path.resolve(__dirname, '../H_RealHigh UpDate_Setting/LoadData.json');
    return JSON.parse(fs.readFileSync(p, 'utf8'));
};

// ── seen quest IDs (persistent) ──
const SEEN_PATH = path.join(__dirname, '../H_RealHigh QUEST_BOT_SRC/seen_quests.json');

function loadSeen() {
    try {
        if (fs.existsSync(SEEN_PATH)) return new Set(JSON.parse(fs.readFileSync(SEEN_PATH, 'utf8')));
    } catch (_) {}
    return new Set();
}

function saveSeen(set) {
    try { fs.writeFileSync(SEEN_PATH, JSON.stringify([...set])); } catch (_) {}
}

// ── seen quest IDs แยกรายบัญชี (สำหรับ DM ส่วนตัว — แต่ละคนเห็นเควสไม่เหมือนกัน) ──
const SEEN_PER_USER_PATH = path.join(__dirname, '../H_RealHigh QUEST_BOT_SRC/seen_quests_per_user.json');

function loadSeenPerUser() {
    try { return JSON.parse(fs.readFileSync(SEEN_PER_USER_PATH, 'utf8')); } catch (_) { return {}; }
}
function saveSeenPerUser(db) {
    try { fs.writeFileSync(SEEN_PER_USER_PATH, JSON.stringify(db)); } catch (_) {}
}

// ── ส่ง CV2 ผ่าน REST โดยตรง ──
async function sendCV2(channelId, components) {
    await BOT_STATUS.rest.post(`/channels/${channelId}/messages`, {
        body: { flags: 1 << 15, components }
    });
}

// ── แปลง quest data ──
function getQuestInfo(q) {
    const taskCfg = q.config?.task_config || q.config?.task_config_v2
        || q.config?.taskConfig || q.config?.taskConfigV2;
    const keys     = taskCfg?.tasks ? Object.keys(taskCfg.tasks) : [];
    const videoKey = keys.find(k => k.includes('VIDEO'));
    const taskKey  = videoKey || keys.find(k => taskCfg?.tasks?.[k]?.target) || keys[0];
    const target   = taskKey ? taskCfg?.tasks?.[taskKey]?.target : null;

    let typeLabel, typeEmoji;
    if (taskKey?.includes('STREAM'))        { typeLabel = 'Stream';   typeEmoji = '📡'; }
    else if (taskKey?.includes('ACTIVITY')) { typeLabel = 'Activity'; typeEmoji = '🕹️'; }
    else if (videoKey)                      { typeLabel = 'ดูวิดีโอ'; typeEmoji = '📹'; }
    else                                    { typeLabel = 'เล่นเกม';  typeEmoji = '🎮'; }

    const minutes   = target ? Math.ceil(target / 60) : null;
    const timeStr   = minutes ? `${minutes} นาที` : '?';

    const rewards   = q.config?.rewards || [];
    const orb       = rewards.find(r => (r.type || '').toUpperCase() === 'ORBS') || rewards[0];
    const rewardStr = orb ? `${orb.amount} Orbs` : '?';

    const exp      = q.config?.expires_at ? new Date(q.config.expires_at) : null;
    const daysLeft = exp ? Math.max(0, Math.ceil((exp - Date.now()) / 86400000)) : '?';

    const name = q.config?.messages?.quest_name
        || q.config?.application?.name
        || `เควส ${q.id}`;

    const enrolled = !!q.user_status?.enrolled_at;

    return { name, typeLabel, typeEmoji, timeStr, rewardStr, daysLeft, enrolled };
}

// ── ตรวจว่า targeted_content มีข้อมูลจริง (ไม่ใช่แค่ null / {} / []) ──
function hasRealTargetedContent(tc) {
    if (tc == null) return false;
    if (Array.isArray(tc)) return tc.length > 0;
    if (typeof tc === 'object') return Object.keys(tc).length > 0;
    return true;
}

// ── กรองเควสที่ทำได้ (ไม่รวม ACTIVITY เพราะทำไม่ได้จริง) ──
function isDoable(q) {
    if (hasRealTargetedContent(q.targeted_content)) return false;
    const taskCfg = q.config?.task_config || q.config?.task_config_v2
        || q.config?.taskConfig || q.config?.taskConfigV2;
    if (!taskCfg?.tasks) return false;
    const taskKeys = Object.keys(taskCfg.tasks);
    // ❌ กรอง ACTIVITY ออก — heartbeat ไม่รองรับ ลูกค้าเสียเงินฟรี
    const hasActivity = taskKeys.some(k => k.includes('ACTIVITY'));
    if (hasActivity) return false;
    return taskKeys.some(k => taskCfg.tasks[k]?.target > 0);
}

function filterActive(list) {
    const now = new Date();
    return (list || []).filter(q =>
        q.id !== '1412491570820812933' &&
        !q.preview &&
        !q.user_status?.completed_at &&
        q.config?.expires_at &&
        new Date(q.config.expires_at) > now &&
        isDoable(q)
    );
}

// ── รวมเควสทุกตัวที่ยังไม่หมดอายุ/ทำแล้ว เพื่อ track seen ────────────
// (รวมถึงเควสที่ทำไม่ได้ด้วย ไม่งั้นเด้งแจ้งเตือนซ้ำทุก interval)
function filterAllCurrent(list) {
    const now = new Date();
    return (list || []).filter(q =>
        !q.preview &&
        !q.user_status?.completed_at &&
        q.config?.expires_at &&
        new Date(q.config.expires_at) > now
    );
}

// ── build CV2 components ──
function buildNotifyCV2(newOnes, detectedAt) {
    const inner = [];

    // ── Header ──
    inner.push({
        type: 9,
        components: [
            {
                type: 10,
                content: `## 📢　พบเควสใหม่ ${newOnes.length} รายการ`
            }
        ],
        accessory: {
            type: 11,
            media: { url: 'https://s13.gifyu.com/images/bllUW.png' }
        }
    });
    inner.push({
        type: 10,
        content: `> 🕐　ตรวจพบเมื่อ **${detectedAt}** น. (ICT)\n> 🔔　เควสด้านล่างพร้อมทำได้ทันที`
    });

    // ── Quest cards ──
    for (let i = 0; i < newOnes.length; i++) {
        const q    = newOnes[i];
        const info = getQuestInfo(q);

        const statusBadge = info.enrolled ? '`✅ รับแล้ว`' : '`➕ ยังไม่รับ`';
        const urgency     = info.daysLeft !== '?' && info.daysLeft <= 2
            ? `⚠️ **ใกล้หมดอายุ!** เหลือ **${info.daysLeft}** วัน`
            : `⌛ หมดเขตอีก **${info.daysLeft}** วัน`;

        inner.push({ type: 14 });
        inner.push({
            type: 10,
            content: [
                `### ${info.typeEmoji}　${i + 1}. ${info.name}`,
                `🚀　**ประเภท:** \`${info.typeLabel}\`　|　⏱️　**เวลา:** \`${info.timeStr}\``,
                `🌿　**รางวัล:** \`${info.rewardStr}\`　|　${urgency}`,
                `📋　**สถานะ:** ${statusBadge}`
            ].join('\n')
        });
    }

    // ── Footer ──
    inner.push({ type: 14 });
    inner.push({
        type: 10,
        content: `-# Flexozy　•　Quest Notify System`
    });
    inner.push({
        type: 12,
        items: [
            { media: { url: 'https://cdn.discordapp.com/attachments/1518288627002642543/1534069264070475887/79A65444-3AF9-4BE9-BBA5-64D8B1B41DBA.gif?ex=6a72c8d6&is=6a717756&hm=7a71c83c570414a40e4c8b3e383dc80f1415fe04d411f702461f8ec80872be18&' } }
        ]
    });

    return [{
        type: 17,
        components: inner
    }];
}

// ── ตรวจ + แจ้ง DM ส่วนตัวให้บัญชีเดียว (ใช้ Token ของบัญชีนั้นเอง ไม่ใช่ monitor) ──
async function notifyUserPersonally(userId) {
    const token = TokenStore.getToken(userId);
    if (!token) return null;

    let raw;
    try {
        raw = await QuestHandler.fetchQuests(token);
    } catch (e) {
        // Token อาจหมดอายุ/ถูกแบนจาก Discord แล้ว — ไม่ต้องลบทิ้งตรงนี้ (ให้ flow ทำเควสจริงเป็นคนจัดการ)
        console.error(`[QuestNotify] fetchQuests ล้มเหลวสำหรับบัญชี ${userId}:`, e.message);
        return null;
    }

    const allQuests  = Array.isArray(raw) ? raw : (raw?.quests || []);
    const active     = filterActive(allQuests);
    const allCurrent = filterAllCurrent(allQuests);

    const perUserSeenDb = loadSeenPerUser();
    const seenSet = new Set(perUserSeenDb[userId] || []);

    // เควสใหม่ "สำหรับบัญชีนี้โดยเฉพาะ" — แต่ละบัญชีเห็นเควสไม่เหมือนกัน
    const newOnes = active.filter(q => !seenSet.has(q.id));

    allCurrent.forEach(q => seenSet.add(q.id));
    perUserSeenDb[userId] = [...seenSet];
    saveSeenPerUser(perUserSeenDb);

    if (!newOnes.length) return false;

    const detectedAt = moment().tz('Asia/Bangkok').format('HH:mm:ss');
    const cv2body     = buildNotifyCV2(newOnes, detectedAt);

    try {
        const user = await BOT_STATUS.users.fetch(userId);
        await user.send({ flags: 1 << 15, components: cv2body });
        return true;
    } catch (e) {
        return false;
    }
}

// ── ฟังก์ชันหลัก: ดึง + แจ้งเตือน ──
async function checkAndNotify() {
    const cfg = LoadDataUpdate();
    const token     = process.env.NOTIFY_MONITOR_TOKEN || cfg?.NOTIFY_MONITOR_TOKEN;
    const channelId = cfg?.NOTIFY_QUEST_CHANNEL;

    // ── ① ประกาศในช่องกลาง (ใช้บัญชี Monitor) ──
    if (token && channelId) {
        try {
            await BOT_STATUS.channels.fetch(channelId);

            const seen = loadSeen();
            const raw  = await QuestHandler.fetchQuests(token);

            const allQuests  = Array.isArray(raw) ? raw : (raw?.quests || []);
            const active     = filterActive(allQuests);
            const allCurrent = filterAllCurrent(allQuests);

            const newOnes = active.filter(q => !seen.has(q.id));
            allCurrent.forEach(q => seen.add(q.id));
            saveSeen(seen);

            if (newOnes.length) {
                const detectedAt = moment().tz('Asia/Bangkok').format('HH:mm:ss');
                const cv2body    = buildNotifyCV2(newOnes, detectedAt);
                await sendCV2(channelId, cv2body);
                console.log(`\x1b[32m[QuestNotify] ✅ ประกาศในช่อง ${newOnes.length} เควสใหม่\x1b[0m`);
            }
        } catch (e) {
            console.error('[QuestNotify] ประกาศช่องกลางล้มเหลว:', e.message);
        }
    }

    // ── ② DM ส่วนตัว — เช็คเควสของแต่ละบัญชีเอง ไม่ใช่ใช้ลิสต์เดียวกันหมดทุกคน ──
    const BanList = require('../H_RealHigh utils/BanList');
    const userIds = TokenStore.listUserIds().filter(id => !BanList.isBanned(id));
    let dmOk = 0, dmFail = 0, dmNone = 0;
    for (const userId of userIds) {
        const result = await notifyUserPersonally(userId);
        if (result === true) dmOk++;
        else if (result === false) dmFail++;
        else dmNone++; // ไม่มีเควสใหม่สำหรับบัญชีนี้ หรือดึงข้อมูลไม่สำเร็จ
        await new Promise(r => setTimeout(r, 500)); // เว้นช่วงกัน rate limit (ยิง API ต่อบัญชีจริง)
    }
    if (userIds.length) {
        console.log(`\x1b[36m[QuestNotify] 📩 DM ส่วนตัว: ส่งสำเร็จ ${dmOk} / ไม่มีเควสใหม่หรือผิดพลาด ${dmNone + dmFail}\x1b[0m`);
    }
}

// ── export เป็น discord.js event handler ──
module.exports = {
    name: 'ready',
    once: true,
    async execute() {
        const cfg         = LoadDataUpdate();
        const intervalMin = parseInt(cfg?.NOTIFY_INTERVAL_MIN || '30');

        console.log(`\x1b[36m[QuestNotify] ⏰ ตรวจเควสใหม่ทุก ${intervalMin} นาที\x1b[0m`);

        await checkAndNotify().catch(e => console.error('[QuestNotify] init check error:', e.message));

        setInterval(() => {
            checkAndNotify().catch(e => console.error('[QuestNotify] interval error:', e.message));
        }, intervalMin * 60 * 1000);
    }
};
