'use strict';
const fs   = require('fs');
const path = require('path');
const BOT_STATUS = require('../index');
const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags
} = require('discord.js');
const { buildContainer, v2Payload } = require('../H_RealHigh utils/V2Container');
const { GetBalance, AddBalance } = require('../H_RealHigh utils/Bank');
const { AUNGPAO_API_WALLET } = require('./WalletAungPaoAPI');

const LoadDataUpdate = () => {
    const p = path.resolve(__dirname, '../H_RealHigh UpDate_Setting/LoadData.json');
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return {}; }
};

// ── log การเติมเงินไปช่องแยกต่างหาก (CHANNEL_TOPUP_LOG) ──
async function logTopup(interaction, amount, newBalance) {
    try {
        const channelId = LoadDataUpdate()?.CHANNEL_TOPUP_LOG;
        if (!channelId) return;
        const channel = BOT_STATUS.channels.cache.get(channelId)
            || await BOT_STATUS.channels.fetch(channelId).catch(() => null);
        if (!channel) return;
        const container = buildContainer('``🧧`` มีการเติมเงินเข้าสู่ระบบ', [
            `\`👤\` **ผู้ใช้** : <@${interaction.user.id}> (\`${interaction.user.tag}\`)`,
            `\`💰\` **จำนวนที่เติม** : \`${amount.toFixed(2)}\` บาท`,
            `\`💳\` **ยอดคงเหลือหลังเติม** : \`${newBalance.toFixed(2)}\` บาท`
        ]);
        await channel.send(v2Payload(container, false));
    } catch (e) {
        console.error('[Topup_Menu] log error:', e.message);
    }
}

// ── ส่งเมนูเติมเงินแบบถาวรลงช่อง (ใช้กับคำสั่ง /topup) ──
async function sendTopupMenuCV2(rest, channelId) {
    const body = {
        flags: 1 << 15, // IS_COMPONENTS_V2
        components: [
            {
                type: 17, // Container
                components: [
                    { type: 10, content: '## ``🧧`` เมนูทำเควส (เติมเงิน)' },
                    { type: 14 },
                    { type: 10, content: '```ทำเควสแบบต้องเติมเงิน — กดทำเควสได้เลย ระบบจะหักยอดเงินตามราคาที่ตั้งไว้\nถ้ายอดไม่พอ เติมเงินผ่านซองอั่งเปา TrueMoney ได้จากปุ่มด้านล่าง```' },
                    { type: 14 },
                    {
                        type: 1,
                        components: [
                            { type: 2, style: 3, custom_id: 'start_quest_paid', label: 'ทำเควส', emoji: { name: '🎯' } },
                            { type: 2, style: 4, custom_id: 'topup_wallet', label: 'เติมเงิน', emoji: { name: '🧧' } },
                            { type: 2, style: 2, custom_id: 'check_balance', label: 'เช็คยอดเงิน', emoji: { name: '💳' } }
                        ]
                    }
                ]
            }
        ]
    };
    await rest.post(`/channels/${channelId}/messages`, { body });
}

// ── ปุ่ม "เติมเงิน" → เปิด modal กรอกลิงก์ซองอั่งเปา ──
BOT_STATUS.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== 'topup_wallet') return;

    const modal = new ModalBuilder()
        .setCustomId('topup_wallet_modal')
        .setTitle('🧧 เติมเงินผ่านซองอั่งเปา')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('voucher_link_input')
                    .setLabel('[ 🧧 ลิงก์ซองอั่งเปา TrueMoney ]')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('https://gift.truemoney.com/campaign/?v=...')
                    .setRequired(true)
            )
        );
    await interaction.showModal(modal);
});

// ── modal submit → เปิดซอง + เติมเงินเข้าระบบ ──
BOT_STATUS.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit() || interaction.customId !== 'topup_wallet_modal') return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const link = interaction.fields.getTextInputValue('voucher_link_input').trim();
    const cfg  = LoadDataUpdate();
    const receiverPhone = cfg?.PHONE_TRUEWALLET;

    const result = await AUNGPAO_API_WALLET(link, receiverPhone);

    if (!result.ok) {
        return await interaction.editReply(v2Payload(
            buildContainer('``❌`` เติมเงินไม่สำเร็จ', [`\`\`\`${result.message}\`\`\``])
        ));
    }

    const newBalance = AddBalance(interaction.user.id, result.amount);
    await logTopup(interaction, result.amount, newBalance);

    await interaction.editReply(v2Payload(
        buildContainer('``✅`` เติมเงินสำเร็จ', [
            `\`💰\` **จำนวนที่เติม** : \`${result.amount.toFixed(2)}\` บาท`,
            `\`💳\` **ยอดเงินคงเหลือ** : \`${newBalance.toFixed(2)}\` บาท`
        ])
    ));
});

// ── ปุ่ม "เช็คยอดเงิน" ──
BOT_STATUS.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== 'check_balance') return;

    const balance = GetBalance(interaction.user.id);
    await interaction.reply(v2Payload(
        buildContainer('``💳`` ยอดเงินคงเหลือ', [
            `\`💰\` **ยอดเงินของคุณ** : \`${balance.toFixed(2)}\` บาท`
        ])
    ));
});

module.exports = { sendTopupMenuCV2 };
