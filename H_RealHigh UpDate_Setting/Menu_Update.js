const fs = require('fs');
const path = require('path');
const { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { buildContainer, v2Payload } = require('../H_RealHigh utils/V2Container');
const BanList = require('../H_RealHigh utils/BanList');

const LogData = () => {
    const ConfigPath = path.resolve(__dirname, '../config.json');
    return JSON.parse(fs.readFileSync(ConfigPath, 'utf8'));
};

const LoadDataUpdate = () => {
    const LoadDataPath = path.resolve(__dirname, './LoadData.json');
    return JSON.parse(fs.readFileSync(LoadDataPath, 'utf8'));
};

const Button_MenuUpdate = () => {
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('setting_channel')
                .setLabel('︲จัดการช่องต่างๆ︲')
                .setEmoji('🔗')
                .setStyle(ButtonStyle.Secondary)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('setting_discohook')
                .setLabel('🎨︲ตั้งค่า Discohook UI︲')
                .setStyle(ButtonStyle.Secondary)
        );

    const row4 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('setting_notify_quest')
                .setLabel('📢︲ตั้งค่าแจ้งเตือนเควสใหม่︲')
                .setEmoji('🔔')
                .setStyle(ButtonStyle.Danger)
        );

    const row5 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('setting_restart_channel')
                .setLabel('⏱️︲ตั้งค่าช่องแจ้งรีสตาร์ท︲')
                .setStyle(ButtonStyle.Secondary)
        );

    const row6 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('admin_restart_now')
                .setLabel('รีสตาร์ทบอทตอนนี้')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Danger)
        );

    const row7 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('setting_restart_interval')
                .setLabel('⏰︲ตั้งค่ารอบรีสตาร์ท︲')
                .setStyle(ButtonStyle.Secondary)
        );

    const row8 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('setting_ban_user')
                .setLabel('แบนผู้ใช้')
                .setEmoji('🚫')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('setting_unban_user')
                .setLabel('ปลดแบนผู้ใช้')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success)
        );

    const row9 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('setting_topup')
                .setLabel('ตั้งค่าการรับเงิน')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('setting_quest_price')
                .setLabel('ตั้งค่าราคาเควส')
                .setEmoji('🎯')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('setting_topup_channel')
                .setLabel('ตั้งค่าช่อง Log เติมเงิน')
                .setEmoji('🧧')
                .setStyle(ButtonStyle.Secondary)
        );

    return { row1, row3, row4, row5, row6, row7, row8, row9 };
};

const Select_MenuUpdate = () => {
    const select = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select_update')
                .setPlaceholder('|︲รีเฟชรดูการอัปเดตใหม่︲|')
                .addOptions({ label: '︲รีเฟชรเมนูอัปเดตใหม่︲', emoji: '🔄', value: 'remenu_update' })
        );
    return select;
};

// ── สร้าง Container ตั้งค่าหลังบ้าน (Components V2) ──
const Container_MenuUpdate = () => {
    const LoadUpdate = LoadDataUpdate();

    const channel_quest_log = LoadUpdate?.CHANNEL_QUEST_LOG     || 'รอเพิ่ม';
    const link_discohook    = (LoadUpdate?.Link_Discohook       || 'รอเพิ่ม').slice(0, 40);
    const notify_channel    = (LoadUpdate?.NOTIFY_QUEST_CHANNEL || 'รอเพิ่ม').slice(0, 18);
    const notify_token      = LoadUpdate?.NOTIFY_MONITOR_TOKEN  ? '✅ ตั้งค่าแล้ว' : '❌ ยังไม่ตั้ง';
    const notify_interval   = LoadUpdate?.NOTIFY_INTERVAL_MIN   || '30';
    const restart_channel   = (LoadUpdate?.CHANNEL_RESTART_LOG  || 'รอเพิ่ม').slice(0, 18);
    const restart_interval  = LoadUpdate?.RESTART_INTERVAL_MIN  || '120';
    const restart_warning   = LoadUpdate?.RESTART_WARNING_MIN   || '2';
    const banned_count      = Object.keys(BanList.listBanned()).length;
    const phone_wallet      = (LoadUpdate?.PHONE_TRUEWALLET      || 'รอเพิ่ม').slice(0, 13);
    const topup_channel     = (LoadUpdate?.CHANNEL_TOPUP_LOG     || 'รอเพิ่ม').slice(0, 18);
    const quest_price_each  = LoadUpdate?.QUEST_PRICE_EACH       || '0';
    const quest_price_all   = LoadUpdate?.QUEST_PRICE_ALL        || 'ไม่กำหนด (คิดตามจำนวนเควส)';

    const select = Select_MenuUpdate();
    const { row1, row3, row4, row5, row6, row7, row8, row9 } = Button_MenuUpdate();

    return buildContainer('``⚙️`` ตั้งค่าระบบหลังบ้าน', [
        `\`📋\` **ช่อง Log เควส** : \`${channel_quest_log}\``,
        `\`🔗\` **Link Discohook** : \`${link_discohook}\``,
        `\`📢\` **ช่องแจ้งเตือนเควสใหม่** : \`${notify_channel}\``,
        `\`🔑\` **Token เควส Monitor** : \`${notify_token}\``,
        `\`⏱️\` **ตรวจทุก** : \`${notify_interval} นาที\``,
        `\`🔄\` **ช่องแจ้งรีสตาร์ท** : \`${restart_channel}\``,
        `\`⏰\` **รอบรีสตาร์ทอัตโนมัติ** : ทุก \`${restart_interval}\` นาที (เตือนล่วงหน้า \`${restart_warning}\` นาที)`,
        `\`🚫\` **ผู้ใช้ที่ถูกแบน** : \`${banned_count}\` คน`,
        `\`📱\` **เบอร์รับเงินวอเลต** : \`${phone_wallet}\``,
        `\`🧧\` **ช่อง Log เติมเงิน** : \`${topup_channel}\``,
        `\`🎯\` **ราคาต่อเควส / ราคาทำทั้งหมด** : \`${quest_price_each}\` บาท / \`${quest_price_all}\` บาท`
    ], {
        imageUrl: 'https://img2.pic.in.th/pic/8617984945af94a5f32129eb7522f39a.png',
        rows: [select, row1, row3, row4, row5, row6, row7, row8, row9]
    });
};

module.exports = {
    name: 'interactionCreate',
    async execute(BOT_STATUS, interaction) {
        try {
            if (!interaction.isCommand() && !interaction.isStringSelectMenu()) return;

            if (interaction.commandName === 'setup') {
                const allowedUserIDs = LogData()?.AdminCommand;
                if (!allowedUserIDs.includes(interaction.user.id)) {
                    return await interaction.reply(v2Payload(
                        buildContainer('``❌`` คำสั่งสำหรับผู้ที่มีสิทธิ์เท่านั้น', [
                            '```คุณต้องได้รับอนุญาติก่อนถึงจะทำรายการนี้ได้```'
                        ])
                    ));
                }

                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                await interaction.editReply(v2Payload(Container_MenuUpdate()));

            } else if (interaction.customId === 'select_update') {
                const selectedValue = interaction.values[0];
                if (selectedValue === 'remenu_update') {
                    await interaction.update(v2Payload(Container_MenuUpdate()));
                }
            }
        } catch (error) {
            console.error('Unknown error Menu_Update.js', error);
        }
    }
};
