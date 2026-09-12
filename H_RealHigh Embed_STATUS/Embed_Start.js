'use strict';
const fs   = require('fs');
const path = require('path');

const getDbPath = () => path.resolve(__dirname, '../H_RealHigh UpDate_Setting/LoadData.json');

// ── แยก REST client จาก BOT_STATUS ──
// ส่ง rest เข้ามาตรงๆ จาก index เพื่อ post CV2
// Command.js จะ import BOT_STATUS แล้วส่ง BOT_STATUS.rest เข้ามา

// ── ส่ง CV2 ผ่าน REST ──
async function sendMainMenuCV2(rest, channelId) {
    let db = {};
    try { db = JSON.parse(fs.readFileSync(getDbPath(), 'utf8')); } catch (_) {}

    // ── decode embed จาก Discohook link ──
    let title       = '<a:D:1540339822240075897>Flexozy';
    let description = '<a:D:1540344788656586902> บริการออโต้เควส\n<a:D:1540344788656586902> ONLINE 24/7 Flexozy';
    let bannerUrl   = 'https://media.discordapp.net/attachments/1536572954039816306/1543557947802517594/3b2415a0-6152-4a30-912d-df31e1b0f882.png?ex=6a954ddc&is=6a93fc5c&hm=ee5f4303afe0d8adaff0d3d1b03ea73b44574d24ff4488da8c034e0dfa385552&=&format=webp&quality=lossless&width=2048&height=683';
    let footerText  = 'By Flexozy.co.th ';

    try {
        const link = db.Link_Discohook || '';
        if (link.includes('?data=')) {
            const b64    = link.split('?data=')[1] + '===';
            const parsed = JSON.parse(Buffer.from(b64, 'base64url').toString('utf-8'));
            const emb    = parsed?.messages?.[0]?.data?.embeds?.[0];
            if (emb) {
                if (emb.title)       title       = emb.title;
                if (emb.description) description = emb.description;
                if (emb.image?.url)  bannerUrl   = emb.image.url;
                if (emb.footer?.text) footerText = emb.footer.text;
            }
        }
    } catch (_) {}

    // ── สร้าง CV2 components ──
    const inner = [];

    // ① Title + Description
    inner.push({
        type: 10, // Text Display
        content: `## ${title}\n${description}`
    });

    // ② Separator
    inner.push({ type: 14 });

    // ③ Banner / รูปภาพ (Media Gallery)
    if (bannerUrl) {
        inner.push({
            type: 12, // Media Gallery
            items: [{ media: { url: bannerUrl } }]
        });
    }

    // ④ Separator
    inner.push({ type: 14 });

    // ⑤ ปุ่มทำเควส
    inner.push({
        type: 1,  // Action Row
        components: [
            {
                type: 2,  // Button
                style: 3, // Success (green)
                custom_id: 'start_quest',
                label: '⋆ ทำเควส ⋆',
                emoji: {
                    id: '1540339822240075897',
                    name: 'emoji_name' // ⚠️ แก้ตรงนี้ให้ตรงกับชื่ออิโมจิจริง
                }
            },
            {
                type: 2,  // Button
                style: 4, // Danger (red)
                custom_id: 'quest_delete_saved',
                label: 'ลบ Token ของฉัน',
                emoji: { name: '🗑️' }
            }
        ]
    });

    // ⑧ Separator
    inner.push({ type: 14 });

    // ⑨ Footer text
    inner.push({
        type: 10,
        content: `-# ${footerText}`
    });

    // ── Container หลัก ──
    const body = {
        flags: 1 << 15,  // IS_COMPONENTS_V2
        components: [
            {
                type: 17,  // Container
                components: inner
            }
        ]
    };

    await rest.post(`/channels/${channelId}/messages`, { body });
}

// ── legacy compat: ยังเอาไว้ถ้ามีโค้ดเก่า import แล้วใช้ embed ──
// Command.js ใหม่จะเรียก sendMainMenuCV2 โดยตรงแทน
const Embed_Start  = () => null;
const Button_Start = () => [];

module.exports = { Embed_Start, Button_Start, sendMainMenuCV2 };