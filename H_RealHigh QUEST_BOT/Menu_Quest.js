const fs = require('fs');
const path = require('path');
const BOT_STATUS = require('../index');
const QuestHandler = require('../H_RealHigh_QUEST');
const { ClientQuest } = require('../H_RealHigh QUEST_BOT_SRC/client.js');
const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    MessageFlags, TextInputBuilder, TextInputStyle, ModalBuilder,
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    SectionBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder
} = require('discord.js');

const sharp = require('sharp');
const QRCode = require('qrcode');

const moment = require('moment-timezone');

const LoadDataUpdate = () => {
    const p = path.resolve(__dirname, '../H_RealHigh UpDate_Setting/LoadData.json');
    return JSON.parse(fs.readFileSync(p, 'utf8'));
};

function getRandomProxy() {
    let proxyList = [];
    try {
        const proxyPath1 = path.join(__dirname, '..', 'proxies.txt');
        const proxyPath2 = path.join(__dirname, '..', 'PROXY');
        const proxyPath = fs.existsSync(proxyPath1) ? proxyPath1 : (fs.existsSync(proxyPath2) ? proxyPath2 : null);
        if (proxyPath) {
            const proxyData = fs.readFileSync(proxyPath, 'utf8');
            proxyList = proxyData.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
        }
    } catch (e) {}
    if (proxyList.length === 0) return null;
    let proxyStr = proxyList[Math.floor(Math.random() * proxyList.length)];
    const parts = proxyStr.split(':');
    if (parts.length === 4 && !proxyStr.includes('://')) {
        return `http://${parts[2]}:${parts[3]}@${parts[0]}:${parts[1]}`;
    }
    return proxyStr.includes('://') ? proxyStr : `http://${proxyStr}`;
}

const { createQuestLog } = require('./QuestLog_CV2');
const TokenStore = require('../H_RealHigh utils/TokenStore');
const BanList = require('../H_RealHigh utils/BanList');
const { GetBalance, DeductBalance } = require('../H_RealHigh utils/Bank');

const QuestSession = new Map();
// ── จำว่าใครกด "ทำเควส" มาจากเมนูเติมเงิน (ต้องหักเงิน) vs เมนูปกติ (ฟรี) ──
const PendingPaid = new Set();

// ── V2 Container helper (ไม่ตั้งสี Container ตามที่ขอ) ──
function buildContainer(title, lines = [], opts = {}) {
    const container = new ContainerBuilder();

    if (opts.thumbnailUrl) {
        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
                .setThumbnailAccessory(t => t.setURL(opts.thumbnailUrl))
        );
    } else {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`));
    }

    if (lines.length) {
        container.addSeparatorComponents(new SeparatorBuilder());
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
    }

    if (opts.bannerUrl) {
        container.addSeparatorComponents(new SeparatorBuilder());
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(opts.bannerUrl))
        );
    }

    if (opts.footer) {
        container.addSeparatorComponents(new SeparatorBuilder());
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${opts.footer}`));
    }

    if (opts.buttonsRow) {
        container.addSeparatorComponents(new SeparatorBuilder());
        container.addActionRowComponents(opts.buttonsRow);
    }

    return container;
}

// ── ประกอบ payload สำหรับ interaction.reply / editReply / DM (Components V2) ──
function v2Payload(container, ephemeral = true) {
    return {
        components: [container],
        flags: ephemeral ? (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) : MessageFlags.IsComponentsV2
    };
}

// ── ชื่อ/รูปโปรไฟล์ของบัญชีที่ Token เป็นเจ้าของ (จาก /users/@me) ──
function formatAccountName(u) {
    if (!u) return 'Unknown';
    if (u.discriminator && u.discriminator !== '0') return `${u.username}#${u.discriminator}`;
    return u.global_name || u.username;
}
function accountAvatarUrl(u) {
    if (!u) return null;
    if (u.avatar) {
        const ext = u.avatar.startsWith('a_') ? 'gif' : 'png';
        return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${ext}?size=128`;
    }
    const idx = (u.discriminator && u.discriminator !== '0')
        ? Number(u.discriminator) % 5
        : Number((BigInt(u.id) >> 22n) % 6n);
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

// ── การ์ดแจ้งว่ากำลังทำเควสอยู่ (กันกดซ้ำ) ──
function buildBusyContainer() {
    return buildContainer('``⏳`` กำลังทำเควสอยู่', [
        '```บัญชีของคุณกำลังทำเควสอยู่ในขณะนี้\nกรุณารอให้เสร็จสิ้นก่อน แล้วค่อยเริ่มใหม่อีกครั้ง```'
    ]);
}

// ── การ์ดแจ้งว่าถูกระงับการใช้งาน ──
function buildBannedContainer(banInfo) {
    const reason = banInfo?.reason ? banInfo.reason : 'ไม่ระบุเหตุผล';
    return buildContainer('``🚫`` บัญชีของคุณถูกระงับการใช้งาน', [
        `\`\`\`คุณไม่สามารถใช้งานระบบทำเควสได้อีกต่อไป\nเหตุผล: ${reason}\nหากคิดว่าเป็นความผิดพลาด กรุณาติดต่อแอดมิน\`\`\``
    ]);
}

// ── รายการเควสที่เลือก ──
function calcSession(session) {
    const selectedNames = session.selected.map(i => {
        const q = session.quests[i];
        return `• ${q?.config?.messages?.quest_name || q?.config?.application?.name || q?.id || `เควส #${i + 1}`}`;
    }).join('\n');
    return { selectedNames };
}

// ── ตรวจว่า targeted_content มีข้อมูลจริง (ต้องซื้อ/รับตั๋วล่วงหน้า) ──
function hasRealTargetedContent(tc) {
    if (tc == null) return false;                                    // null / undefined → ไม่มี
    if (Array.isArray(tc)) return tc.length > 0;                     // [] → ไม่มี
    if (typeof tc === 'object') return Object.keys(tc).length > 0;   // {} → ไม่มี
    return true;                                                      // string/number → มี
}

// ── ตรวจว่าเควสมี task_config ที่รองรับและมี target จริง ──
function isQuestDoable(q) {
    if (hasRealTargetedContent(q.targeted_content)) return false; // ต้องการเงื่อนไขพิเศษ
    const taskCfg = q.config?.task_config || q.config?.task_config_v2
        || q.config?.taskConfig || q.config?.taskConfigV2;
    if (!taskCfg?.tasks) return false;                      // ไม่มี task_config
    const taskKeys = Object.keys(taskCfg.tasks);
    // ❌ ไม่รองรับเควสประเภท ACTIVITY — ทำไม่ได้จริง ลูกค้าจะเสียเงินฟรี
    if (taskKeys.some(k => k.includes('ACTIVITY'))) return false;
    return taskKeys.some(k => taskCfg.tasks[k]?.target > 0); // ต้องมี target > 0
}

// ── กรองเฉพาะเควสที่ทำได้จริง ──
function filterActiveQuests(questList) {
    const now = new Date();
    return questList.filter(q =>
        q.id !== '1412491570820812933' &&
        !q.preview &&
        !q.user_status?.completed_at &&
        q.config?.expires_at &&
        new Date(q.config.expires_at) > now &&
        isQuestDoable(q)                                    // ← กรองเควสที่ทำไม่ได้ออกทั้งหมด
    );
}

// ── นับเควสที่ถูกซ่อน (ทำไม่ได้) เพื่อแจ้งลูกค้า ──
function countHiddenQuests(questList) {
    const now = new Date();
    return questList.filter(q =>
        !q.preview &&
        !q.user_status?.completed_at &&
        q.config?.expires_at &&
        new Date(q.config.expires_at) > now &&
        !isQuestDoable(q)
    ).length;
}

// ── หาข้อมูล task จาก quest config ──
function getQuestTaskInfo(q) {
    const taskConfig = q.config?.task_config || q.config?.task_config_v2
        || q.config?.taskConfig || q.config?.taskConfigV2;
    if (!taskConfig?.tasks) return { type: 'UNKNOWN', timeStr: '?', emoji: '🎯' };

    const keys = Object.keys(taskConfig.tasks);
    const videoKey = keys.find(k => k.includes('VIDEO'));
    const taskKey  = videoKey || keys.find(k => taskConfig.tasks[k]?.target) || keys[0];
    const target   = taskConfig.tasks[taskKey]?.target;
    const isVideo  = !!videoKey;

    let typeLabel, emoji;
    if (taskKey?.includes('STREAM')) {
        typeLabel = 'Stream'; emoji = '📡';
    } else if (taskKey?.includes('ACTIVITY')) {
        typeLabel = 'Activity'; emoji = '🕹️';
    } else if (isVideo) {
        typeLabel = 'วิดีโอ'; emoji = '📹';
    } else {
        typeLabel = 'เล่นเกม'; emoji = '🎮';
    }

    const minutes = target ? Math.ceil(target / 60) : null;
    const timeStr = minutes ? `${minutes}นาที` : '?';
    return { type: typeLabel, timeStr, emoji };
}

// ── เปิด modal กรอก Token ──
async function showTokenModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('quest_modal_token')
        .setTitle('`🎯` กรอก Token สำหรับทำเควส')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('quest_token_value')
                    .setLabel('🔑 Discord Token')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('วางโทเค็นของคุณที่นี่...')
                    .setRequired(true)
                    .setMinLength(50)
            )
        );
    await interaction.showModal(modal);
}

// ── กดปุ่ม "ทำเควส" (ฟรี จากเมนูปกติ /start) ──
BOT_STATUS.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== 'start_quest') return;

    if (BanList.isBanned(interaction.user.id)) {
        return await interaction.reply(v2Payload(buildBannedContainer(BanList.getBanInfo(interaction.user.id))));
    }

    if (QuestSession.has(interaction.user.id)) {
        return await interaction.reply(v2Payload(buildBusyContainer()));
    }

    PendingPaid.delete(interaction.user.id); // ทางนี้ฟรีเสมอ ไม่ว่าจะเคยติดสถานะอะไรไว้ก่อนหน้า

    if (TokenStore.hasToken(interaction.user.id)) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('quest_use_saved').setLabel('ใช้ Token ที่บันทึกไว้').setEmoji('▶️').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('quest_new_token').setLabel('กรอก Token ใหม่').setEmoji('🔑').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('quest_delete_saved').setLabel('ลบ Token ที่บันทึกไว้').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
        );
        return await interaction.reply(v2Payload(buildContainer('``🔑`` พบ Token ที่บันทึกไว้', [
            '```คุณเคยบันทึก Token ไว้กับระบบแล้ว\nเลือกได้ว่าจะใช้ Token เดิม หรือกรอกใหม่```'
        ], { buttonsRow: row })));
    }

    await showTokenModal(interaction);
});

// ── กดปุ่ม "ทำเควส" (เวอร์ชันเติมเงิน จากเมนู /topup — ต้องหักยอดเงิน) ──
BOT_STATUS.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== 'start_quest_paid') return;

    if (BanList.isBanned(interaction.user.id)) {
        return await interaction.reply(v2Payload(buildBannedContainer(BanList.getBanInfo(interaction.user.id))));
    }

    if (QuestSession.has(interaction.user.id)) {
        return await interaction.reply(v2Payload(buildBusyContainer()));
    }

    PendingPaid.add(interaction.user.id); // ทางนี้ต้องหักเงิน — จะถูกอ่านตอน runFullFlow

    if (TokenStore.hasToken(interaction.user.id)) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('quest_use_saved').setLabel('ใช้ Token ที่บันทึกไว้').setEmoji('▶️').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('quest_new_token').setLabel('กรอก Token ใหม่').setEmoji('🔑').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('quest_delete_saved').setLabel('ลบ Token ที่บันทึกไว้').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
        );
        return await interaction.reply(v2Payload(buildContainer('``🔑`` พบ Token ที่บันทึกไว้', [
            '```คุณเคยบันทึก Token ไว้กับระบบแล้ว\nเลือกได้ว่าจะใช้ Token เดิม หรือกรอกใหม่```'
        ], { buttonsRow: row })));
    }

    await showTokenModal(interaction);
});

// ── กดปุ่ม "กรอก Token ใหม่" (จากหน้าเลือก Token ที่บันทึกไว้) ──
BOT_STATUS.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== 'quest_new_token') return;

    if (BanList.isBanned(interaction.user.id)) {
        return await interaction.reply(v2Payload(buildBannedContainer(BanList.getBanInfo(interaction.user.id))));
    }

    if (QuestSession.has(interaction.user.id)) {
        return await interaction.reply(v2Payload(buildBusyContainer()));
    }
    await showTokenModal(interaction);
});

// ── กดปุ่ม "ลบ Token ที่บันทึกไว้" ──
BOT_STATUS.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== 'quest_delete_saved') return;

    const removed = TokenStore.deleteToken(interaction.user.id);
    await interaction.reply(v2Payload(buildContainer(
        removed ? '``🗑️`` ลบ Token สำเร็จ' : '``ℹ️`` ไม่พบ Token ที่บันทึกไว้',
        [removed
            ? '```ลบ Token ที่บันทึกไว้กับระบบเรียบร้อยแล้ว\nครั้งหน้าต้องกรอก Token ใหม่ทุกครั้ง```'
            : '```คุณไม่มี Token ที่บันทึกไว้กับระบบตอนนี้```']
    )));
});

// ── กดปุ่ม "ใช้ Token ที่บันทึกไว้" (จากเมนู หรือจาก DM แจ้งเตือนเควสใหม่) ──
BOT_STATUS.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== 'quest_use_saved') return;

    if (BanList.isBanned(interaction.user.id)) {
        return await interaction.reply(v2Payload(buildBannedContainer(BanList.getBanInfo(interaction.user.id))));
    }

    if (QuestSession.has(interaction.user.id)) {
        return await interaction.reply(v2Payload(buildBusyContainer()));
    }

    const savedToken = TokenStore.getToken(interaction.user.id);
    if (!savedToken) {
        // ไม่มี Token บันทึกไว้ (หรือเครื่องถูกย้าย/คีย์เปลี่ยน) → ให้กรอกใหม่แทน
        return await showTokenModal(interaction);
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await runFullFlow(interaction, savedToken, { requirePayment: PendingPaid.has(interaction.user.id) });
});

// ── modal submit → validate + fetch quests ──
BOT_STATUS.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit() || interaction.customId !== 'quest_modal_token') return;

    const token = interaction.fields.getTextInputValue('quest_token_value').trim();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await runFullFlow(interaction, token, { isNewToken: true, requirePayment: PendingPaid.has(interaction.user.id) });
});

// ── ตรวจ Token → ดึงเควส → รัน (ใช้ร่วมกันทั้งกรอกใหม่ และใช้ Token ที่บันทึกไว้) ──
async function runFullFlow(interaction, token, { isNewToken = false, requirePayment = false } = {}) {
    PendingPaid.delete(interaction.user.id); // อ่านค่าไปใช้แล้ว เคลียร์ทิ้งกันค้าง

    // ── กันไว้อีกชั้น เผื่อมาจากทาง quest_use_saved/DM ──
    if (BanList.isBanned(interaction.user.id)) {
        return await interaction.editReply(v2Payload(buildBannedContainer(BanList.getBanInfo(interaction.user.id))));
    }

    // ── validate token ──
    let validation;
    try {
        validation = await QuestHandler.validateToken(token, getRandomProxy());
    } catch (err) {
        return await interaction.editReply(
            v2Payload(buildContainer('``❌`` เช็ค Token ล้มเหลว', [`\`\`\`${err.message}\`\`\``]))
        );
    }

    if (!validation.valid) {
        const errorMessages = {
            'TOKEN_EXPIRED': 'Token หมดอายุหรือไม่ถูกต้อง กรุณาล็อกอินใหม่และคัดลอก Token ใหม่',
            'TOKEN_BANNED': 'Token นี้ถูกแบนแล้ว ไม่สามารถใช้งานได้',
        };
        const detail = errorMessages[validation.error] || `Token ไม่ถูกต้อง (${validation.error})`;
        // ── Token เดิมที่บันทึกไว้ใช้ไม่ได้แล้ว → ลบทิ้งกันค้าง ──
        if (!isNewToken) TokenStore.deleteToken(interaction.user.id);
        return await interaction.editReply(
            v2Payload(buildContainer('``❌`` Token ไม่ถูกต้อง', [`\`\`\`${detail}\`\`\``]))
        );
    }

    const { user } = validation;

    // ── บันทึก Token ไว้ใช้ครั้งหน้า (เข้ารหัสไว้) ──
    if (isNewToken) TokenStore.saveToken(interaction.user.id, token);

    await interaction.editReply(
        v2Payload(buildContainer('``✅`` ตรวจสอบ Token สำเร็จ', [
            `\`👤\` **เข้าสู่ระบบด้วยบัญชี** : \`${formatAccountName(user)}\``,
            isNewToken
                ? `\`💾\` บันทึก Token ไว้แล้ว — ครั้งหน้ากด "ใช้ Token ที่บันทึกไว้" ได้เลย`
                : `\`💾\` ใช้ Token ที่บันทึกไว้`,
            `\`🔎\` กำลังดึงรายการเควส กรุณารอสักครู่...`
        ], { thumbnailUrl: accountAvatarUrl(user) }))
    );

    // ── fetch quests ──
    let rawData;
    let proxyUrl = getRandomProxy();
    try {
        rawData = await QuestHandler.fetchQuests(token, proxyUrl);
    } catch (err) {
        if (proxyUrl) {
            console.log(`[Proxy] ล้มเหลว (${err.message}) สลับไปใช้เน็ตเครื่องหลัก...`);
            try {
                rawData = await QuestHandler.fetchQuests(token, null);
                proxyUrl = null;
            } catch (fallbackErr) {
                return await interaction.editReply(
                    v2Payload(buildContainer('``❌`` ดึงรายการเควสไม่สำเร็จ', [`\`\`\`${fallbackErr.message}\`\`\``]))
                );
            }
        } else {
            return await interaction.editReply(
                v2Payload(buildContainer('``❌`` ดึงรายการเควสไม่สำเร็จ', [`\`\`\`${err.message}\`\`\``]))
            );
        }
    }

    const questList    = Array.isArray(rawData) ? rawData : (rawData?.quests || []);
    const activeQuests = filterActiveQuests(questList);
    const hiddenCount  = countHiddenQuests(questList);

    if (!activeQuests.length) {
        const hiddenNote = hiddenCount > 0
            ? `\n⚠️ ซ่อน ${hiddenCount} เควสที่ทำไม่ได้ (Activity/ต้องสั่งซื้อล่วงหน้า/รับตั๋ว/ไม่รองรับ)`
            : '';
        return await interaction.editReply(
            v2Payload(buildContainer('``📋`` ไม่พบเควสที่รอทำ', [
                `\`👤\` **บัญชี** : \`${formatAccountName(user)}\``,
                `\`\`\`ไม่พบเควสที่สามารถทำได้ในขณะนี้\n(เควส Preview หรือเควสที่หมดอายุ/ทำแล้ว จะไม่แสดงที่นี่)${hiddenNote}\`\`\``
            ], { thumbnailUrl: accountAvatarUrl(user) }))
        );
    }

    // ── คำนวณราคา + เช็ค/หักยอดเงิน (เฉพาะทางที่เข้ามาจากเมนูเติมเงิน /topup เท่านั้น) ──
    const cfgPrice       = LoadDataUpdate();
    const pricePerQuest  = parseFloat(cfgPrice?.QUEST_PRICE_EACH || '0');
    const priceAllCap    = cfgPrice?.QUEST_PRICE_ALL ? parseFloat(cfgPrice.QUEST_PRICE_ALL) : null;
    const rawTotal       = activeQuests.length * pricePerQuest;
    const totalPrice     = requirePayment
        ? ((priceAllCap !== null) ? Math.min(rawTotal, priceAllCap) : rawTotal)
        : 0; // ทาง /start (ฟรี) ไม่คิดราคาเลย ไม่ว่าจะตั้งราคาไว้เท่าไหร่

    if (totalPrice > 0) {
        const balance = GetBalance(interaction.user.id);
        if (balance < totalPrice) {
            const topupRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('topup_wallet').setLabel('เติมเงิน').setEmoji('🧧').setStyle(ButtonStyle.Success)
            );
            return await interaction.editReply({
                ...v2Payload(buildContainer('``❌`` ยอดเงินไม่เพียงพอ', [
                    `\`👤\` **บัญชี** : \`${formatAccountName(user)}\``,
                    `\`\`\`พบเควสที่ทำได้ ${activeQuests.length} รายการ\nยอดที่ต้องใช้ : ${totalPrice.toFixed(2)} บาท\nยอดคงเหลือ    : ${balance.toFixed(2)} บาท\`\`\``
                ], { thumbnailUrl: accountAvatarUrl(user), buttonsRow: topupRow }))
            });
        }
        const newBalance = DeductBalance(interaction.user.id, totalPrice);
        if (newBalance === null) {
            return await interaction.editReply(
                v2Payload(buildContainer('``❌`` เกิดข้อผิดพลาดในการหักยอดเงิน', ['```กรุณาลองใหม่อีกครั้ง หรือแจ้งแอดมิน```']))
            );
        }
    }

    // ── เลือกเควสทั้งหมดอัตโนมัติ แล้วเริ่มทำทันที ──
    QuestSession.set(interaction.user.id, {
        token,
        quests: activeQuests,
        selected: activeQuests.map((_, i) => i),
        proxyUrl,
        accountUser: user,
        totalPrice,
        page: 0
    });
    const session = QuestSession.get(interaction.user.id);

    const cfg                = LoadDataUpdate();
    const CHANNEL_QUEST_LOG  = cfg?.CHANNEL_QUEST_LOG;
    const BANNER_LOG         = cfg?.BANNER_URL || null;
    const selectedQuestNames = activeQuests.map(q => q?.config?.messages?.quest_name || q?.config?.application?.name || q?.id || 'เควส');
    const { selectedNames }  = calcSession(session);

    let questLog = null;
    if (CHANNEL_QUEST_LOG) {
        try {
            const channel = BOT_STATUS.channels.cache.get(CHANNEL_QUEST_LOG)
                || await BOT_STATUS.channels.fetch(CHANNEL_QUEST_LOG).catch(() => null);
            if (channel) {
                questLog = await createQuestLog(channel, {
                    username:   formatAccountName(user),
                    avatarUrl:  accountAvatarUrl(user),
                    questNames: selectedQuestNames,
                    questCount: session.selected.length,
                    bannerUrl:  BANNER_LOG,
                }).catch(() => null);
            }
        } catch (e) {}
    }

    try {
        await runQuests(interaction, session, questLog, selectedNames, BANNER_LOG);
    } finally {
        // ── ปลดล็อกเสมอ แม้ runQuests error ไม่งั้นบัญชีจะติดสถานะ "กำลังทำเควสอยู่" ค้าง ──
        QuestSession.delete(interaction.user.id);
    }
}

// ── ตรวจว่าเควสทำได้ไหม ──
function checkDoable(questData) {
    const taskCfg = questData.config?.task_config || questData.config?.task_config_v2
        || questData.config?.taskConfig || questData.config?.taskConfigV2;
    if (!taskCfg?.tasks) return { ok: false, reason: 'ไม่มี task_config (ประเภทไม่รองรับ)' };
    const hasTarget = Object.values(taskCfg.tasks).some(t => t?.target > 0);
    if (!hasTarget) return { ok: false, reason: 'ไม่มี target ในเควสนี้ (ทำไม่ได้)' };
    return { ok: true };
}

// ── run quests (parallel) ──
async function runQuests(interaction, session, questLog, selectedNames, bannerUrl) {
    const { token, quests, selected, accountUser, totalPrice } = session;
    const selectedQuests = selected.map(idx => quests[idx]).filter(Boolean);

    const accountName   = formatAccountName(accountUser);
    const accountAvatar = accountAvatarUrl(accountUser) || interaction.user.displayAvatarURL();
    const balanceLine = totalPrice > 0
        ? `\`💰\` **ตัดยอดเงิน** : ${totalPrice.toFixed(2)} บาท (คงเหลือ ${GetBalance(interaction.user.id).toFixed(2)} บาท)\n`
        : '';

    // ── สถานะการเชื่อมต่อ (login) แยกจากผลลัพธ์เควส — โชว์ชื่อบัญชีที่กำลังล็อกอินด้วย ──
    let connectionStatus = `🔄 กำลังล็อกอินเข้าบัญชี \`${accountName}\`...`;

    // ตรวจ doability ก่อนรัน
    let results = selectedQuests.map(q => {
        const questName = q.config?.messages?.quest_name || q.config?.application?.name || q.id;
        const { ok, reason } = checkDoable(q);
        if (!ok) return `⚠️ ${questName} : ทำไม่ได้ — ${reason}`;
        return `⏳ ${questName} : กำลังดำเนินการ...`;
    });

    const buildStatusContainer = (isFinished = false) => {
        const thTime = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' });
        const [date, time] = thTime.split(', ');
        const hasFailed  = results.some(r => r.startsWith('❌'));
        const hasSkipped = results.some(r => r.startsWith('⚠️'));
        const statusText = isFinished
            ? (hasFailed ? '❌ ทำเควสไม่สำเร็จบางรายการ' : hasSkipped ? '⚠️ เสร็จ (มีเควสที่ทำไม่ได้)' : '✅ ทำเควสเสร็จสมบูรณ์')
            : `⏳ กำลังทำพร้อมกัน ${results.filter(r => r.startsWith('⏳') || r.startsWith('🔄')).length} รายการ...`;
        const titleIcon = isFinished ? (hasFailed ? '❌' : '✅') : '⏳';
        const titleText = isFinished ? 'สรุปผลการทำเควส' : 'กำลังดำเนินการทำเควส';

        return buildContainer(`\`${titleIcon}\` ${titleText}`, [
            `\`👤\` **บัญชีที่ทำเควส** : \`${accountName}\``,
            `\`🔌\` **สถานะการเชื่อมต่อ** : ${connectionStatus}`,
            `\`💬\` **จำนวนเควส** : ${selected.length} รายการ\n${balanceLine}\`📊\` **ผลลัพธ์** :\n\`\`\`\n${results.join('\n')}\n\`\`\``,
            `\`🎮\` **สถานะ** :\n\`\`\`${statusText}\`\`\``
        ], {
            thumbnailUrl: accountAvatar,
            bannerUrl,
            footer: `[ 🕒 ] ${time} ${date.replace(/\//g, '-')} | Copyright © All Right Reserved`
        });
    };

    const updateUI = async (isFinished = false) => {
        // ── ephemeral reply ของลูกค้า ──
        await interaction.editReply(v2Payload(buildStatusContainer(isFinished))).catch(() => {});

        // ── log channel → CV2 ──
        if (questLog) {
            if (isFinished) {
                await questLog.finish(results).catch(() => {});
            } else {
                await questLog.update(results).catch(() => {});
            }
        }
    };

    await updateUI(false);   // แสดง "กำลังล็อกอิน..." ทันที
    console.log(`\n\x1b[90m──────────────────────────────────────────────────────────────────\x1b[0m`);
    console.log(`\x1b[36m[TRANSACTION]\x1b[0m ${interaction.user.tag} | จำนวน: \x1b[32m${selected.length}\x1b[0m รายการ (parallel)`);
    console.log(`\x1b[90m──────────────────────────────────────────────────────────────────\x1b[0m`);

    const client = new ClientQuest(token, session.proxyUrl);
    try {
        await client.connect();
        await client.waitForReady(8000);
        connectionStatus = `✅ ล็อกอินสำเร็จ : \`${accountName}\``;
        console.log('[ClientQuest] Gateway ready ✅');
        await updateUI(false);   // อัปเดตสถานะ "ล็อกอินสำเร็จ" ให้ลูกค้าเห็น

        await client.fetchQuests();
        const manager = client.questManager;

        // อัปเดต UI ทุก 10 วินาทีขณะรัน
        const uiInterval = setInterval(() => updateUI(false).catch(() => {}), 10000);

        // รันเควสทุกอันพร้อมกัน
        await Promise.allSettled(
            selectedQuests.map(async (questData, i) => {
                const questName = questData.config?.messages?.quest_name || questData.config?.application?.name || questData.id;

                // ข้ามถ้าทำไม่ได้ (ตรวจแล้วตั้งแต่ต้น)
                if (results[i].startsWith('⚠️')) return;

                try {
                    const quest = manager.get(questData.id);
                    if (!quest) {
                        results[i] = `❌ ${questName} : ไม่พบในระบบ (อาจทำแล้วหรือหมดอายุ)`;
                        return;
                    }
                    results[i] = `🔄 ${questName} : กำลังทำ...`;
                    await manager.doingQuest(quest);
                    results[i] = `✅ ${questName} : สำเร็จ`;
                    console.log(`\x1b[32m[DONE]\x1b[0m ${questName}`);
                } catch (err) {
                    results[i] = `❌ ${questName} : ${err.message}`;
                    console.error(`\x1b[31m[FAIL]\x1b[0m ${questName}:`, err.message);
                }
            })
        );

        clearInterval(uiInterval);
        try { client.websocketManager.destroy(); } catch (e) {}

    } catch (err) {
        connectionStatus = `❌ ล็อกอินไม่สำเร็จ : \`${accountName}\``;
        console.error('[CLIENT] connect/fetchQuests failed:', err.message);
        results = results.map((r, i) => {
            if (r.startsWith('⚠️')) return r; // คงไว้สำหรับเควสที่ทำไม่ได้
            const qn = selectedQuests[i]?.config?.messages?.quest_name
                || selectedQuests[i]?.config?.application?.name
                || selectedQuests[i]?.id || '?';
            return `❌ ${qn} : เชื่อมต่อ Discord ไม่สำเร็จ (${err.message})`;
        });
    }

    await updateUI(true);

    // DM สรุปผล
    try {
        await interaction.user.send(v2Payload(buildStatusContainer(true), false)).catch(() => {});
    } catch (e) {}

    console.log(`\x1b[90m──────────────────────────────────────────────────────────────────\x1b[0m\n`);
}

// ══════════════════════════════════════════════════════════════════
// ── เรียกทำเควสผ่าน API ภายใน (ไม่ใช้ Discord interaction) ──
// ทำงานได้เฉพาะบัญชีที่เคยกรอก Token ผ่านบอทแล้วเท่านั้น (มีอยู่ใน TokenStore)
// ไม่รับ Token ใหม่จากภายนอกโดยตรง — ป้องกันไม่ให้กลายเป็นช่องทางรับ Token คนอื่น
// ══════════════════════════════════════════════════════════════════
async function runQuestForUserId(userId, { requirePayment = false } = {}) {
    if (BanList.isBanned(userId)) return { ok: false, error: 'banned' };
    if (QuestSession.has(userId)) return { ok: false, error: 'busy' };

    const token = TokenStore.getToken(userId);
    if (!token) return { ok: false, error: 'no_saved_token' };

    let validation;
    try {
        validation = await QuestHandler.validateToken(token, getRandomProxy());
    } catch (err) {
        return { ok: false, error: 'validate_failed', message: err.message };
    }
    if (!validation.valid) {
        TokenStore.deleteToken(userId);
        return { ok: false, error: 'invalid_token' };
    }
    const { user } = validation;

    let rawData;
    try {
        rawData = await QuestHandler.fetchQuests(token, getRandomProxy());
    } catch (err) {
        return { ok: false, error: 'fetch_failed', message: err.message };
    }

    const questList = Array.isArray(rawData) ? rawData : (rawData?.quests || []);
    const activeQuests = filterActiveQuests(questList);
    if (!activeQuests.length) return { ok: true, ranQuests: 0, message: 'no active quests' };

    // ── ราคา (เฉพาะถ้าเรียกแบบ requirePayment) ──
    const cfgPrice      = LoadDataUpdate();
    const pricePerQuest = parseFloat(cfgPrice?.QUEST_PRICE_EACH || '0');
    const priceAllCap   = cfgPrice?.QUEST_PRICE_ALL ? parseFloat(cfgPrice.QUEST_PRICE_ALL) : null;
    const rawTotal      = activeQuests.length * pricePerQuest;
    const totalPrice    = requirePayment
        ? ((priceAllCap !== null) ? Math.min(rawTotal, priceAllCap) : rawTotal)
        : 0;

    if (totalPrice > 0) {
        const balance = GetBalance(userId);
        if (balance < totalPrice) return { ok: false, error: 'insufficient_balance', needed: totalPrice, balance };
        const newBalance = DeductBalance(userId, totalPrice);
        if (newBalance === null) return { ok: false, error: 'deduct_failed' };
    }

    QuestSession.set(userId, {
        token, quests: activeQuests, selected: activeQuests.map((_, i) => i),
        accountUser: user, totalPrice
    });

    let results = activeQuests.map(q => `⏳ ${q.config?.messages?.quest_name || q.config?.application?.name || q.id} : รอดำเนินการ`);
    const client = new ClientQuest(token, getRandomProxy());

    try {
        await client.connect();
        await client.waitForReady(8000);
        await client.fetchQuests();
        const manager = client.questManager;

        await Promise.allSettled(
            activeQuests.map(async (questData, i) => {
                const questName = questData.config?.messages?.quest_name || questData.config?.application?.name || questData.id;
                try {
                    const quest = manager.get(questData.id);
                    if (!quest) { results[i] = `❌ ${questName} : ไม่พบในระบบ`; return; }
                    await manager.doingQuest(quest);
                    results[i] = `✅ ${questName} : สำเร็จ`;
                } catch (err) {
                    results[i] = `❌ ${questName} : ${err.message}`;
                }
            })
        );
        try { client.websocketManager.destroy(); } catch (e) {}
    } catch (err) {
        results = results.map((r, i) => {
            const qn = activeQuests[i]?.config?.messages?.quest_name || activeQuests[i]?.id || '?';
            return `❌ ${qn} : เชื่อมต่อ Discord ไม่สำเร็จ (${err.message})`;
        });
    } finally {
        QuestSession.delete(userId);
    }

    // ── DM แจ้งผลให้เจ้าของบัญชี (เรียกผ่าน API ก็ยังแจ้งผลในดิสคอร์ดเหมือนเดิม) ──
    try {
        const discordUser = await BOT_STATUS.users.fetch(userId);
        await discordUser.send(v2Payload(
            buildContainer('``✅`` ทำเควสเสร็จสิ้น (เรียกผ่าน API)', [
                `\`👤\` **บัญชี** : \`${formatAccountName(user)}\``,
                totalPrice > 0 ? `\`💰\` **ตัดยอดเงิน** : ${totalPrice.toFixed(2)} บาท (คงเหลือ ${GetBalance(userId).toFixed(2)} บาท)` : '',
                `\`📊\` **ผลลัพธ์** :\n\`\`\`\n${results.join('\n')}\n\`\`\``
            ].filter(Boolean), { thumbnailUrl: accountAvatarUrl(user) }), false
        )).catch(() => {});
    } catch (e) {}

    return { ok: true, ranQuests: activeQuests.length, results };
}

module.exports = { QuestSession, runQuestForUserId };
