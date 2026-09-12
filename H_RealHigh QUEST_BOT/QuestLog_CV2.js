'use strict';
/**
 * QuestLog_CV2.js  —  CV2 Quest Log Panel
 * ใช้ Discord timestamp <t:unix:R> นับถอยหลังเองโดยไม่ต้อง edit
 *
 * HOW TO USE
 * ──────────
 *  const { createQuestLog } = require('./QuestLog_CV2');
 *
 *  const questLog = await createQuestLog(channel, {
 *      username:   'exampleUser',
 *      avatarUrl:  'https://...png',
 *      questNames: ['FATAL FURY', 'EVE Online', ...],
 *      questCount: 13,
 *      bannerUrl:  BANNER_LOG || null,
 *  });
 *
 *  await questLog.update(results);   // ระหว่างรัน
 *  await questLog.finish(results);   // เสร็จแล้ว
 */

const moment = require('moment-timezone');

const GIF_SEP = 'https://cdn.discordapp.com/attachments/1256536015955296326/1341081987242266736/2478276E-41CA-4738-B961-66A84B918163.gif?ex=6a740bad&is=6a72ba2d&hm=82736dc2f55a7ac83caa47b6170e6297a1509065a96b38e8966d006d6fa218f8&';

// ─── REST helpers ────────────────────────────────────────────────────────────

async function sendCV2(channel, payload) {
    return channel.client.rest.post(`/channels/${channel.id}/messages`, { body: payload });
}
async function editCV2(channel, msgId, payload) {
    return channel.client.rest.patch(`/channels/${channel.id}/messages/${msgId}`, { body: payload }).catch(() => null);
}

// ─── Utils ───────────────────────────────────────────────────────────────────

function thaiStamp() {
    return moment().tz('Asia/Bangkok').format('DD-MM-YYYY HH:mm:ss');
}

/** Unix timestamp ในอนาคต (วินาที) สำหรับ Discord <t:T:R> */
function futureUnix(addSeconds) {
    return Math.floor(Date.now() / 1000) + addSeconds;
}

/** เฉลี่ย 3 นาที/เควส */
function estimateSec(count) { return count * 180; }

function resultIcon(line) {
    if (line.startsWith('✅')) return '✅';
    if (line.startsWith('❌')) return '❌';
    if (line.startsWith('⚠️')) return '⚠️';
    if (line.startsWith('🔄')) return '🔄';
    return '⏳';
}

function accentOf(results, isFinished) {
    if (!isFinished) return 0xFFCC00;                                        // เหลือง
    if (results.some(r => r.startsWith('❌'))) return 0xED4245;              // แดง
    if (results.some(r => r.startsWith('⚠️'))) return 0xFFA500;             // ส้ม
    return 0x57F287;                                                          // เขียว
}

function statusLabel(results, isFinished) {
    if (!isFinished) {
        const n = results.filter(r => r.startsWith('⏳') || r.startsWith('🔄')).length;
        return `⏳  กำลังทำอยู่ ${n} รายการ`;
    }
    if (results.some(r => r.startsWith('❌'))) return '❌  ล้มเหลวบางรายการ';
    if (results.some(r => r.startsWith('⚠️'))) return '⚠️  เสร็จแล้ว (มีรายการข้าม)';
    return '✅  สำเร็จทุกรายการ!';
}

// ─── Builder ─────────────────────────────────────────────────────────────────

function buildPayload(opts) {
    const { username, avatarUrl, questNames, results, questCount,
            bannerUrl, isFinished, deadlineUnix, startedStamp } = opts;

    const done  = results.filter(r => r.startsWith('✅')).length;
    const fail  = results.filter(r => r.startsWith('❌')).length;
    const warn  = results.filter(r => r.startsWith('⚠️')).length;
    const actv  = results.filter(r => r.startsWith('⏳') || r.startsWith('🔄')).length;
    const total = done + fail + warn;
    const pct   = Math.round((total / Math.max(questCount, 1)) * 100);
    const filled = Math.round(pct / 10);
    const bar   = '█'.repeat(filled) + '░'.repeat(10 - filled);

    // ── result lines ──────────────────────────────────────────────────────
    const lines = results.length > 0
        ? results.slice(0, 20).map(r => {
            const name = r.replace(/^[✅❌⚠️🔄⏳]\s*/, '').slice(0, 55);
            return `\`${resultIcon(r)}\`  ${name}`;
        })
        : questNames.slice(0, 20).map(n => `\`⏳\`  ${n.slice(0, 55)}`);

    if (results.length > 20)
        lines.push(`-# ... และอีก ${results.length - 20} รายการ`);

    // ── countdown line ────────────────────────────────────────────────────
    const cdLine = isFinished
        ? `\`✅\`  เสร็จสิ้นแล้ว`
        : `\`⏱️\`  เหลืออีกประมาณ  <t:${deadlineUnix}:R>`;

    // ── header ───────────────────────────────────────────────────────────
    const headerIcon = isFinished ? (fail > 0 ? '❌' : '✅') : '⏳';
    const headerText = isFinished ? 'สรุปผลการทำเควส' : 'กำลังดำเนินการทำเควส';

    const inner = [];

    // [ 1 ] Header + avatar
    inner.push({
        type: 9,
        components: [{
            type: 10,
            content: [
                `## \`${headerIcon}\`  ${headerText}`,
                `-# Flexozy  •  Quest Log  •  เริ่มเมื่อ ${startedStamp} (ICT)`,
            ].join('\n')
        }],
        accessory: {
            type: 11,
            media: { url: avatarUrl }
        }
    });

    // [ 2 ] Info
    inner.push({ type: 14 });
    inner.push({
        type: 10,
        content: [
            `\`👤\`  **บัญชีผู้ทำเควส**  \`${username}\``,
            `\`💬\`  **จำนวนเควส**  \`${questCount} รายการ\``,
        ].join('\n')
    });

    // [ 3 ] ชื่อเควสทั้งหมด
    inner.push({ type: 14 });
    inner.push({
        type: 10,
        content: [
            `\`✅\`  **ชื่อเควสที่เลือก**`,
            questNames.slice(0, 20).map(n => `> •  ${n.slice(0, 55)}`).join('\n'),
            questNames.length > 20 ? `-# ... และอีก ${questNames.length - 20} รายการ` : ''
        ].filter(Boolean).join('\n')
    });

    // [ 4 ] Progress
    inner.push({ type: 14 });
    inner.push({
        type: 10,
        content: [
            `\`📊\`  **ความคืบหน้า**  \`${total}/${questCount}\`  รายการ`,
            `\`\`\``,
            ` [${bar}]  ${pct}%`,
            ` ✅ ${done}   ❌ ${fail}   ⚠️ ${warn}   ⏳ ${actv}`,
            `\`\`\``,
            cdLine,
        ].join('\n')
    });

    // [ 4 ] Quest list
    inner.push({ type: 14 });
    inner.push({
        type: 10,
        content: [`\`📋\`  **ผลลัพธ์การทำรายการ**`, ...lines].join('\n')
    });

    // [ 5 ] Status
    inner.push({ type: 14 });
    inner.push({
        type: 10,
        content: `\`🏁\`  **สถานะ :**  \`${statusLabel(results, isFinished)}\``
    });

    // [ 6 ] GIF + Footer
    inner.push({ type: 14 });
    inner.push({
        type: 12,
        items: [{ media: { url: GIF_SEP } }]
    });
    inner.push({
        type: 10,
        content: `-# \`[ 🕒 ]\`  ${thaiStamp()}  |  Copyright © All Right Reserved`
    });

    // [ 7 ] Banner (optional)
    if (bannerUrl) {
        inner.push({
            type: 12,
            items: [{ media: { url: bannerUrl } }]
        });
    }

    return {
        flags: 1 << 15,
        components: [{ type: 17, components: inner }]
    };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function createQuestLog(channel, opts) {
    const { username, avatarUrl, questNames, questCount, bannerUrl = null } = opts;

    const startedStamp  = moment().tz('Asia/Bangkok').format('HH:mm:ss');
    const totalSec      = estimateSec(questCount);
    let   deadlineUnix  = futureUnix(totalSec);
    let   latestResults = [];
    let   isFinished    = false;
    let   msgId         = null;

    const mkPayload = (res, done) => buildPayload({
        username, avatarUrl, questNames, results: res, questCount,
        bannerUrl, isFinished: done, deadlineUnix, startedStamp
    });

    // ── ส่ง message แรก ──────────────────────────────────────────────────
    try {
        const raw = await sendCV2(channel, mkPayload([], false));
        msgId = raw?.id ?? null;
    } catch (e) {
        console.error('[QuestLog_CV2] send error:', e.message);
        return { update: async () => {}, finish: async () => {}, buildFinishPayload: () => ({}) };
    }

    // ── edit ทุก 10 วิ (อัปเดต result list + footer timestamp) ──────────
    // countdown ไม่ต้อง edit เพราะ Discord นับเอง <t:R>
    const ticker = setInterval(async () => {
        if (isFinished || !msgId) { clearInterval(ticker); return; }
        await editCV2(channel, msgId, mkPayload(latestResults, false));
    }, 10_000);

    return {
        async update(results = []) {
            latestResults = results;
            if (!msgId) return;
            // ปรับ deadline ตาม progress จริง
            const done = results.filter(r => r.startsWith('✅') || r.startsWith('❌') || r.startsWith('⚠️')).length;
            const pct  = done / Math.max(questCount, 1);
            deadlineUnix = futureUnix(Math.round(totalSec * (1 - pct)));
            await editCV2(channel, msgId, mkPayload(results, false));
        },

        async finish(results = []) {
            isFinished    = true;
            latestResults = results;
            clearInterval(ticker);
            if (!msgId) return;
            await editCV2(channel, msgId, mkPayload(results, true));
        },

        buildFinishPayload(results = []) {
            return mkPayload(results, true);
        },

        get messageId() { return msgId; }
    };
}

module.exports = { createQuestLog };
