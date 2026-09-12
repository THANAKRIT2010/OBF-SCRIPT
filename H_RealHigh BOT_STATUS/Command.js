'use strict';
const fs   = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');
const { sendMainMenuCV2 } = require('../H_RealHigh Embed_STATUS/Embed_Start');
const { sendTopupMenuCV2 } = require('../H_RealHigh BANK_TOPUP/Topup_Menu');
const { buildContainer, v2Payload } = require('../H_RealHigh utils/V2Container');

const LogData = () => {
    const ConfigPath = path.resolve(__dirname, '../config.json');
    return JSON.parse(fs.readFileSync(ConfigPath, 'utf8'));
};

module.exports = {
    name: 'interactionCreate',
    async execute(BOT_STATUS, interaction) {
        try {
            if (!interaction.isCommand()) return;

            if (interaction.commandName === 'start') {
                const allowedUserIDs = LogData()?.AdminCommand || [];
                if (!allowedUserIDs.includes(interaction.user.id)) {
                    return await interaction.reply(v2Payload(
                        buildContainer('``❌`` คำสั่งสำหรับผู้ที่มีสิทธิ์เท่านั้น', [
                            '```คุณต้องได้รับอนุญาติก่อนถึงจะทำรายการนี้ได้```'
                        ])
                    ));
                }

                const channel = interaction.options.getChannel('channel');
                if (!channel) {
                    return await interaction.reply(v2Payload(
                        buildContainer('``❌`` ไม่พบช่องที่คุณเลือก', [
                            '```กรุณาระบุช่องใหม่อีกครั้ง```'
                        ])
                    ));
                }

                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                // ── ส่ง CV2 เมนูหลัก ──
                await sendMainMenuCV2(BOT_STATUS.rest, channel.id);

                await interaction.editReply(v2Payload(
                    buildContainer('``✅`` เปิดหน้าทำเควสแล้ว', [
                        `\`🎁\` **ช่องที่คุณเลือก** : ${channel}`
                    ])
                ));
            }

            if (interaction.commandName === 'topup') {
                const allowedUserIDs = LogData()?.AdminCommand || [];
                if (!allowedUserIDs.includes(interaction.user.id)) {
                    return await interaction.reply(v2Payload(
                        buildContainer('``❌`` คำสั่งสำหรับผู้ที่มีสิทธิ์เท่านั้น', [
                            '```คุณต้องได้รับอนุญาติก่อนถึงจะทำรายการนี้ได้```'
                        ])
                    ));
                }

                const channel = interaction.options.getChannel('channel');
                if (!channel) {
                    return await interaction.reply(v2Payload(
                        buildContainer('``❌`` ไม่พบช่องที่คุณเลือก', [
                            '```กรุณาระบุช่องใหม่อีกครั้ง```'
                        ])
                    ));
                }

                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                // ── ส่ง CV2 เมนูเติมเงิน ──
                await sendTopupMenuCV2(BOT_STATUS.rest, channel.id);

                await interaction.editReply(v2Payload(
                    buildContainer('``✅`` เปิดหน้าเติมเงินแล้ว', [
                        `\`🎁\` **ช่องที่คุณเลือก** : ${channel}`
                    ])
                ));
            }

        } catch (error) {
            console.error('[Command.js] Error:', error.message);
            try {
                const errMsg = { content: `\`\`❌\`\` เกิดข้อผิดพลาด: \`${error.message}\``, flags: MessageFlags.Ephemeral };
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply(errMsg);
                } else {
                    await interaction.reply(errMsg);
                }
            } catch (_) {}
        }
    }
};
