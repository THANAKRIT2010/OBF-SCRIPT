'use strict';
const fs      = require('fs');
const path    = require('path');
const express = require('express');

const ConfigPath = path.resolve(__dirname, '../config.json');
function LoadConfig() {
    try { return JSON.parse(fs.readFileSync(ConfigPath, 'utf8')); } catch (_) { return {}; }
}

// ── API สำหรับสั่งทำเควสให้ "บัญชีที่เคยกรอก Token ผ่านบอทไว้แล้วเท่านั้น" ──
// ไม่รับ Token ใหม่จากภายนอกโดยตรง — กันไม่ให้กลายเป็นช่องทางรับ Token คนอื่น
// เรียกได้แค่ด้วย API key ที่ตั้งไว้ใน config.json (ไม่ใช่รหัสผ่านเดียวกับแดชบอร์ด)
function startQuestAPI(BOT_STATUS, { runQuestForUserId, TokenStore }) {
    const cfg    = LoadConfig();
    const port   = parseInt(process.env.QUEST_API_PORT || cfg.QUEST_API_PORT || 3940);
    const apiKey = process.env.QUEST_API_KEY || cfg.QUEST_API_KEY;

    if (!apiKey) {
        console.warn('[QuestAPI] ⚠️  ยังไม่ได้ตั้ง QUEST_API_KEY ใน config.json — ปิดการใช้งาน API ไว้ก่อน');
        return;
    }

    const app = express();
    app.use(express.json());

    // ── ทุก route ต้องใส่ API key มาด้วยเสมอ (header: x-api-key) ──
    app.use((req, res, next) => {
        const key = req.headers['x-api-key'];
        if (key !== apiKey) return res.status(401).json({ error: 'unauthorized' });
        next();
    });

    // ── สั่งทำเควส — ต้องเป็น userId ที่มี Token บันทึกไว้แล้วเท่านั้น ──
    app.post('/api/quest/trigger', async (req, res) => {
        const { userId, requirePayment } = req.body || {};

        if (!userId) {
            return res.status(400).json({ error: 'missing_userId' });
        }
        if (!TokenStore.hasToken(userId)) {
            return res.status(404).json({
                error: 'no_saved_token',
                message: 'บัญชีนี้ยังไม่เคยกรอก Token ผ่านบอท (API นี้ไม่รับ Token ใหม่โดยตรง)'
            });
        }

        // ตอบกลับทันที ไม่รอผลลัพธ์ (การทำเควสใช้เวลา) — ผลลัพธ์จะถูก DM แจ้งเจ้าของบัญชีแทน
        res.json({ ok: true, message: 'triggered — ผลลัพธ์จะถูกส่งเข้า DM ของบัญชีนั้น' });

        runQuestForUserId(userId, { requirePayment: !!requirePayment }).catch(err => {
            console.error('[QuestAPI] trigger error:', err.message);
        });
    });

    // ── เช็คว่าบัญชีนี้มี Token บันทึกไว้กับระบบไหม ──
    app.get('/api/quest/status/:userId', (req, res) => {
        res.json({ hasToken: TokenStore.hasToken(req.params.userId) });
    });

    const server = app.listen(port, () => {
        console.log(`[QuestAPI] ✅ API เรียกออโต้เควสพร้อมใช้งานที่ http://localhost:${port}`);
    });
    server.on('error', (err) => {
        console.error(`[QuestAPI] เปิดพอร์ต ${port} ไม่สำเร็จ (บอทยังทำงานปกติ):`, err.message);
    });
}

module.exports = { startQuestAPI };
