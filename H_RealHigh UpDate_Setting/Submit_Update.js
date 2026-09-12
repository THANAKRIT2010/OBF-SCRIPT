const fs = require('fs');
const path = require('path');
const { buildContainer, v2Payload } = require('../H_RealHigh utils/V2Container');
const BanList = require('../H_RealHigh utils/BanList');

const UpdatePath = path.resolve(__dirname, './LoadData.json');

const LoadUpdate = () => {
    let DATA_BASE = JSON.parse(fs.readFileSync(UpdatePath));
    if (!DATA_BASE) DATA_BASE = {};
    return DATA_BASE;
};

const SaveUpdate = (DATA_BASE) => {
    fs.writeFileSync(UpdatePath, JSON.stringify(DATA_BASE, null, 2));
};

module.exports = {
    name: 'interactionCreate',
    async execute(client, interaction) {
        try {
            if (!interaction.isModalSubmit()) return;

            const DATA_BASE = LoadUpdate();

            if (interaction.customId === 'setting_discohook_modal') {
                const link_discohook = interaction.fields.getTextInputValue('discohook_link_input').trim();
                DATA_BASE['Link_Discohook'] = link_discohook;
                SaveUpdate(DATA_BASE);
                await interaction.reply(v2Payload(
                    buildContainer('``✅`` บันทึก Link Discohook สำเร็จ')
                ));
            }

            else if (interaction.customId === 'setting_notify_quest_modal') {
                const notify_token    = interaction.fields.getTextInputValue('notify_token_input').trim();
                const notify_interval = interaction.fields.getTextInputValue('notify_interval_input').trim();

                if (notify_interval && isNaN(parseInt(notify_interval))) {
                    return await interaction.reply(v2Payload(
                        buildContainer('``❌`` เวลา interval ต้องเป็นตัวเลขเท่านั้น')
                    ));
                }

                if (notify_token)    DATA_BASE['NOTIFY_MONITOR_TOKEN'] = notify_token;
                if (notify_interval) DATA_BASE['NOTIFY_INTERVAL_MIN']  = notify_interval;
                SaveUpdate(DATA_BASE);

                await interaction.reply(v2Payload(
                    buildContainer('``✅`` บันทึกการตั้งค่าแจ้งเตือนเควสสำเร็จ', [
                        `\`🔑\` **Token** : \`${notify_token ? '✅ ตั้งค่าแล้ว' : '❌ ยังไม่ตั้ง'}\``,
                        `\`⏱️\` **ตรวจทุก** : \`${notify_interval || DATA_BASE['NOTIFY_INTERVAL_MIN']} นาที\``,
                        '⚠️ **รีสตาร์ทบอทเพื่อให้ interval ใหม่มีผล**'
                    ])
                ));
            }

            else if (interaction.customId === 'setting_restart_interval_modal') {
                const restart_interval = interaction.fields.getTextInputValue('restart_interval_input').trim();
                const restart_warning  = interaction.fields.getTextInputValue('restart_warning_input').trim();

                if (restart_interval && isNaN(parseInt(restart_interval))) {
                    return await interaction.reply(v2Payload(
                        buildContainer('``❌`` รอบรีสตาร์ทต้องเป็นตัวเลขเท่านั้น')
                    ));
                }
                if (restart_warning && isNaN(parseInt(restart_warning))) {
                    return await interaction.reply(v2Payload(
                        buildContainer('``❌`` เวลาแจ้งเตือนล่วงหน้าต้องเป็นตัวเลขเท่านั้น')
                    ));
                }
                if (restart_interval && parseInt(restart_interval) < 5) {
                    return await interaction.reply(v2Payload(
                        buildContainer('``❌`` รอบรีสตาร์ทต้องไม่ต่ำกว่า 5 นาที')
                    ));
                }

                if (restart_interval) DATA_BASE['RESTART_INTERVAL_MIN'] = restart_interval;
                if (restart_warning)  DATA_BASE['RESTART_WARNING_MIN']  = restart_warning;
                SaveUpdate(DATA_BASE);

                await interaction.reply(v2Payload(
                    buildContainer('``✅`` บันทึกรอบรีสตาร์ทสำเร็จ', [
                        `\`⏰\` **รีสตาร์ททุก** : \`${DATA_BASE['RESTART_INTERVAL_MIN'] || '120'}\` นาที`,
                        `\`🔔\` **เตือนล่วงหน้า** : \`${DATA_BASE['RESTART_WARNING_MIN'] || '2'}\` นาที`,
                        '⚠️ **ค่าใหม่จะมีผลตั้งแต่รอบถัดไปที่บอทรีสตาร์ท (ยังไม่กระทบรอบที่กำลังนับอยู่)**'
                    ])
                ));
            }

            else if (interaction.customId === 'setting_ban_user_modal') {
                const userId = interaction.fields.getTextInputValue('ban_user_id_input').trim();
                const reason = interaction.fields.getTextInputValue('ban_reason_input').trim();

                if (!/^\d{15,25}$/.test(userId)) {
                    return await interaction.reply(v2Payload(
                        buildContainer('``❌`` User ID ไม่ถูกต้อง', ['```กรุณากรอกเฉพาะตัวเลข Discord User ID เท่านั้น```'])
                    ));
                }

                BanList.banUser(userId, reason, interaction.user.id);

                await interaction.reply(v2Payload(
                    buildContainer('``🚫`` แบนผู้ใช้สำเร็จ', [
                        `\`👤\` **User ID** : \`${userId}\``,
                        `\`📝\` **เหตุผล** : \`${reason || 'ไม่ระบุ'}\``,
                        '```ผู้ใช้นี้จะกดใช้งานระบบทำเควสไม่ได้อีกจนกว่าจะถูกปลดแบน```'
                    ])
                ));
            }

            else if (interaction.customId === 'setting_unban_user_modal') {
                const userId = interaction.fields.getTextInputValue('unban_user_id_input').trim();

                if (!/^\d{15,25}$/.test(userId)) {
                    return await interaction.reply(v2Payload(
                        buildContainer('``❌`` User ID ไม่ถูกต้อง', ['```กรุณากรอกเฉพาะตัวเลข Discord User ID เท่านั้น```'])
                    ));
                }

                const removed = BanList.unbanUser(userId);

                await interaction.reply(v2Payload(
                    buildContainer(
                        removed ? '``✅`` ปลดแบนสำเร็จ' : '``ℹ️`` ไม่พบผู้ใช้นี้ในรายชื่อแบน',
                        [`\`👤\` **User ID** : \`${userId}\``]
                    )
                ));
            }

            else if (interaction.customId === 'setting_topup_modal') {
                const wallet = interaction.fields.getTextInputValue('wallet_input').trim();
                DATA_BASE['PHONE_TRUEWALLET'] = wallet;
                SaveUpdate(DATA_BASE);
                await interaction.reply(v2Payload(
                    buildContainer('``✅`` บันทึกเบอร์รับเงินสำเร็จ', [`\`📱\` **เบอร์รับเงิน** : \`${wallet}\``])
                ));
            }

            else if (interaction.customId === 'setting_quest_price_modal') {
                const priceEach = interaction.fields.getTextInputValue('quest_price_each_input').trim();
                const priceAll  = interaction.fields.getTextInputValue('quest_price_all_input').trim();

                if (priceEach && isNaN(parseFloat(priceEach))) {
                    return await interaction.reply(v2Payload(
                        buildContainer('``❌`` ราคาต่อเควสต้องเป็นตัวเลขเท่านั้น')
                    ));
                }
                if (priceAll && isNaN(parseFloat(priceAll))) {
                    return await interaction.reply(v2Payload(
                        buildContainer('``❌`` ราคาสูงสุดต่อรอบต้องเป็นตัวเลขเท่านั้น')
                    ));
                }

                DATA_BASE['QUEST_PRICE_EACH'] = priceEach || '0';
                if (priceAll) DATA_BASE['QUEST_PRICE_ALL'] = priceAll;
                else delete DATA_BASE['QUEST_PRICE_ALL'];
                SaveUpdate(DATA_BASE);

                await interaction.reply(v2Payload(
                    buildContainer('``✅`` บันทึกราคาเควสสำเร็จ', [
                        `\`💰\` **ราคาต่อเควส** : \`${DATA_BASE['QUEST_PRICE_EACH']}\` บาท`,
                        `\`💎\` **ราคาสูงสุดต่อรอบ** : \`${DATA_BASE['QUEST_PRICE_ALL'] || 'ไม่กำหนด'}\` บาท`
                    ])
                ));
            }

        } catch (error) {
            console.error('Unexpected error Submit_Update.js', error);
        }
    }
};
