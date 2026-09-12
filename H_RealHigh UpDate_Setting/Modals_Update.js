const fs = require('fs');
const path = require('path');
const { TextInputBuilder, ActionRowBuilder, ModalBuilder, TextInputStyle, ChannelSelectMenuBuilder, MessageFlags, ChannelType } = require('discord.js');
const { buildContainer, v2Payload } = require('../H_RealHigh utils/V2Container');
const { triggerManualRestart } = require('../H_RealHigh utils/AutoRestart');
const BanList = require('../H_RealHigh utils/BanList');

const LoadDataUpdate = () => {
    const LoadDataPath = path.resolve(__dirname, './LoadData.json');
    return JSON.parse(fs.readFileSync(LoadDataPath, 'utf8'));
};

const SaveUpdate = (data) => {
    const p = path.resolve(__dirname, './LoadData.json');
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
};

module.exports = {
    name: 'interactionCreate',
    async execute(client, interaction) {
        try {

            // ── ปุ่ม ──
            if (interaction.isButton()) {
                const LoadUpdate = LoadDataUpdate();

                // ── ตั้งค่าช่องต่างๆ (ChannelSelect) ──
                if (interaction.customId === 'setting_channel') {
                    const row = new ActionRowBuilder().addComponents(
                        new ChannelSelectMenuBuilder()
                            .setCustomId('select_quest_log_channel')
                            .setPlaceholder('🎯 เลือกช่อง Log เควส')
                            .addChannelTypes(ChannelType.GuildText)
                    );
                    return await interaction.reply(v2Payload(
                        buildContainer('``🔗`` ตั้งค่าช่องต่างๆ', ['```เลือกช่อง Log เควส```'], { rows: [row] })
                    ));
                }

                // ── ตั้งค่า Discohook (TextInput) ──
                if (interaction.customId === 'setting_discohook') {
                    const link_discohook = LoadUpdate?.Link_Discohook || '';
                    const modal = new ModalBuilder()
                        .setCustomId('setting_discohook_modal')
                        .setTitle('`🎨` ตั้งค่า Discohook UI')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('discohook_link_input')
                                    .setLabel('[ 🔗 Link Discohook ]')
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setPlaceholder('https://discohook.org/?data=...')
                                    .setRequired(true)
                                    .setValue(link_discohook)
                            )
                        );
                    return await interaction.showModal(modal);
                }

                // ── ตั้งค่าแจ้งเตือนเควส — step 1: เลือกช่อง (ChannelSelect) ──
                if (interaction.customId === 'setting_notify_quest') {
                    const row = new ActionRowBuilder().addComponents(
                        new ChannelSelectMenuBuilder()
                            .setCustomId('select_notify_quest_channel')
                            .setPlaceholder('📢 เลือกช่องแจ้งเตือนเควสใหม่')
                            .addChannelTypes(ChannelType.GuildText)
                    );
                    return await interaction.reply(v2Payload(
                        buildContainer('``📢`` ตั้งค่าแจ้งเตือนเควสใหม่', ['```เลือกช่องแจ้งเตือนเควสใหม่ก่อน```'], { rows: [row] })
                    ));
                }

                // ── ตั้งค่าช่องแจ้งรีสตาร์ท (ChannelSelect) ──
                if (interaction.customId === 'setting_restart_channel') {
                    const row = new ActionRowBuilder().addComponents(
                        new ChannelSelectMenuBuilder()
                            .setCustomId('select_restart_channel')
                            .setPlaceholder('🔄 เลือกช่องแจ้งรีสตาร์ท')
                            .addChannelTypes(ChannelType.GuildText)
                    );
                    return await interaction.reply(v2Payload(
                        buildContainer('``🔄`` ตั้งค่าช่องแจ้งรีสตาร์ท', ['```เลือกช่องที่จะให้บอทแจ้งก่อน/หลังรีสตาร์ทอัตโนมัติ```'], { rows: [row] })
                    ));
                }

                // ── แอดมินกดรีสตาร์ทบอทเดี๋ยวนี้ ──
                if (interaction.customId === 'admin_restart_now') {
                    await interaction.reply(v2Payload(
                        buildContainer('``🔄`` กำลังรีสตาร์ทบอท', [
                            '```บอทกำลังจะรีสตาร์ทเดี๋ยวนี้ตามคำสั่งของคุณ กรุณารอสักครู่แล้วลองใช้งานใหม่```'
                        ])
                    ));
                    return await triggerManualRestart(client);
                }

                // ── ตั้งค่ารอบรีสตาร์ทอัตโนมัติ (TextInput) ──
                if (interaction.customId === 'setting_restart_interval') {
                    const modal = new ModalBuilder()
                        .setCustomId('setting_restart_interval_modal')
                        .setTitle('⏰ ตั้งค่ารอบรีสตาร์ท')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('restart_interval_input')
                                    .setLabel('[ ⏰ รีสตาร์ททุกกี่นาที (ขั้นต่ำ 5) ]')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('120 = ทุก 2 ชั่วโมง')
                                    .setRequired(false)
                                    .setValue(LoadUpdate?.RESTART_INTERVAL_MIN || '120')
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('restart_warning_input')
                                    .setLabel('[ 🔔 เตือนล่วงหน้ากี่นาทีก่อนรีสตาร์ท ]')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('2')
                                    .setRequired(false)
                                    .setValue(LoadUpdate?.RESTART_WARNING_MIN || '2')
                            )
                        );
                    return await interaction.showModal(modal);
                }

                // ── แบนผู้ใช้ (TextInput) ──
                if (interaction.customId === 'setting_ban_user') {
                    const modal = new ModalBuilder()
                        .setCustomId('setting_ban_user_modal')
                        .setTitle('🚫 แบนผู้ใช้')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('ban_user_id_input')
                                    .setLabel('[ 🆔 Discord User ID ที่ต้องการแบน ]')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('เช่น 123456789012345678')
                                    .setRequired(true)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('ban_reason_input')
                                    .setLabel('[ 📝 เหตุผล (ไม่บังคับ) ]')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('เช่น สแปม / ใช้ผิดวัตถุประสงค์')
                                    .setRequired(false)
                            )
                        );
                    return await interaction.showModal(modal);
                }

                // ── ปลดแบนผู้ใช้ (TextInput) ──
                if (interaction.customId === 'setting_unban_user') {
                    const modal = new ModalBuilder()
                        .setCustomId('setting_unban_user_modal')
                        .setTitle('✅ ปลดแบนผู้ใช้')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('unban_user_id_input')
                                    .setLabel('[ 🆔 Discord User ID ที่ต้องการปลดแบน ]')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('เช่น 123456789012345678')
                                    .setRequired(true)
                            )
                        );
                    return await interaction.showModal(modal);
                }

                // ── ตั้งค่าเบอร์รับเงินวอเลต (TextInput) ──
                if (interaction.customId === 'setting_topup') {
                    const modal = new ModalBuilder()
                        .setCustomId('setting_topup_modal')
                        .setTitle('📝 ตั้งค่าการรับเงินวอเลต')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('wallet_input')
                                    .setLabel('[ 🧧 เบอร์รับเงินทรูมันนี่วอเลต ]')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('064XXXXXXX')
                                    .setRequired(true)
                                    .setValue(LoadUpdate?.PHONE_TRUEWALLET || '')
                            )
                        );
                    return await interaction.showModal(modal);
                }

                // ── ตั้งค่าราคาเควส (TextInput) ──
                if (interaction.customId === 'setting_quest_price') {
                    const modal = new ModalBuilder()
                        .setCustomId('setting_quest_price_modal')
                        .setTitle('🎯 ตั้งค่าราคาทำเควส')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('quest_price_each_input')
                                    .setLabel('[ 💰 ราคาต่อ 1 เควส (บาท) ]')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('เช่น 5 (ใส่ 0 ถ้าอยากให้ทำเควสฟรี)')
                                    .setRequired(true)
                                    .setValue(LoadUpdate?.QUEST_PRICE_EACH || '0')
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('quest_price_all_input')
                                    .setLabel('[ 💎 ราคาสูงสุดต่อรอบ (ไม่บังคับ) ]')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('เว้นว่างได้ ถ้าไม่ต้องการเพดานราคา')
                                    .setRequired(false)
                                    .setValue(LoadUpdate?.QUEST_PRICE_ALL || '')
                            )
                        );
                    return await interaction.showModal(modal);
                }

                // ── ตั้งค่าช่อง Log เติมเงิน (ChannelSelect) ──
                if (interaction.customId === 'setting_topup_channel') {
                    const row = new ActionRowBuilder().addComponents(
                        new ChannelSelectMenuBuilder()
                            .setCustomId('select_topup_channel')
                            .setPlaceholder('🧧 เลือกช่อง Log เติมเงิน')
                            .addChannelTypes(ChannelType.GuildText)
                    );
                    return await interaction.reply(v2Payload(
                        buildContainer('``🧧`` ตั้งค่าช่อง Log เติมเงิน', ['```เลือกช่องที่จะแสดงรายการเติมเงินทุกครั้ง (แยกจากช่อง Log เควส)```'], { rows: [row] })
                    ));
                }
            }

            // ── ChannelSelect: ช่อง Log เควส ──
            if (interaction.isChannelSelectMenu() && interaction.customId === 'select_quest_log_channel') {
                const db = LoadDataUpdate();
                db['CHANNEL_QUEST_LOG'] = interaction.values[0];
                SaveUpdate(db);
                return await interaction.reply(v2Payload(
                    buildContainer('``✅`` บันทึกช่อง Log เควสสำเร็จ', [`<#${interaction.values[0]}>`])
                ));
            }

            // ── ChannelSelect: ช่องแจ้งรีสตาร์ท ──
            if (interaction.isChannelSelectMenu() && interaction.customId === 'select_restart_channel') {
                const db = LoadDataUpdate();
                db['CHANNEL_RESTART_LOG'] = interaction.values[0];
                SaveUpdate(db);
                return await interaction.reply(v2Payload(
                    buildContainer('``✅`` บันทึกช่องแจ้งรีสตาร์ทสำเร็จ', [`<#${interaction.values[0]}>`])
                ));
            }

            // ── ChannelSelect: ช่อง Log เติมเงิน ──
            if (interaction.isChannelSelectMenu() && interaction.customId === 'select_topup_channel') {
                const db = LoadDataUpdate();
                db['CHANNEL_TOPUP_LOG'] = interaction.values[0];
                SaveUpdate(db);
                return await interaction.reply(v2Payload(
                    buildContainer('``✅`` บันทึกช่อง Log เติมเงินสำเร็จ', [`<#${interaction.values[0]}>`])
                ));
            }

            // ── ChannelSelect: ช่องแจ้งเตือนเควส — step 2: token + interval ──
            if (interaction.isChannelSelectMenu() && interaction.customId === 'select_notify_quest_channel') {
                const db = LoadDataUpdate();
                db['NOTIFY_QUEST_CHANNEL'] = interaction.values[0];
                SaveUpdate(db);

                const modal = new ModalBuilder()
                    .setCustomId('setting_notify_quest_modal')
                    .setTitle('📢 Token และ Interval')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('notify_token_input')
                                .setLabel('[ 🔑 Discord User Token ]')
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder('วาง Token ที่ใช้ตรวจเควสที่นี่...')
                                .setRequired(false)
                                .setValue(db?.NOTIFY_MONITOR_TOKEN || '')
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('notify_interval_input')
                                .setLabel('[ ⏱️ ตรวจทุกกี่นาที (ค่าเริ่มต้น 30) ]')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('30')
                                .setRequired(false)
                                .setValue(db?.NOTIFY_INTERVAL_MIN || '30')
                        )
                    );
                return await interaction.showModal(modal);
            }

        } catch (error) {
            console.error('Error handling interaction Modals_Update.js:', error);
        }
    }
};
