const fs = require('fs');
const path = require('path');
const {
    Client,
    GatewayIntentBits,
    ApplicationCommandType,
    Partials,
    ActivityType,
    Routes
} = require('discord.js');

const { DefaultWebSocketManagerOptions } = require('@discordjs/ws');

DefaultWebSocketManagerOptions.identifyProperties = {
    ...DefaultWebSocketManagerOptions.identifyProperties,
    browser: 'Discord VR',
};

console.log(
    '[DEBUG] identifyProperties:',
    DefaultWebSocketManagerOptions.identifyProperties
);

const LogData = () => {
    const ConfigPath = path.resolve(__dirname, './config.json');
    return JSON.parse(
        fs.readFileSync(ConfigPath, 'utf8')
    );
};

const BOT_STATUS = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
    ],

    partials: [
        Partials.Channel,
        Partials.Message
    ],

    ws: {
        properties: {
            os: "Windows",
            browser: "Discord VR",
            device: "Discord VR"
        }
    }
});

BOT_STATUS.setMaxListeners(100);

module.exports = BOT_STATUS;

const folders = [
    'H_RealHigh BOT_STATUS',
    'H_RealHigh UpDate_Setting',
    'H_RealHigh QUEST_BOT',
    'H_RealHigh BANK_TOPUP',
];

function loadEventHandlers(folderName) {
    const folderPath = path.join(__dirname, folderName);

    if (!fs.existsSync(folderPath)) {
        console.warn(
            `[WARN] โฟลเดอร์ไม่พบ: ${folderName}`
        );
        return;
    }

    const files = fs
        .readdirSync(folderPath)
        .filter(f => f.endsWith('.js'));

    for (const file of files) {
        try {
            const event = require(
                path.join(folderPath, file)
            );

            if (event.once) {
                BOT_STATUS.once(
                    event.name,
                    (...args) => {
                        event.execute(
                            BOT_STATUS,
                            ...args
                        );
                    }
                );
            } else if (event.name) {
                BOT_STATUS.on(
                    event.name,
                    (...args) => {
                        event.execute(
                            BOT_STATUS,
                            ...args
                        );
                    }
                );
            }

        } catch (err) {
            console.error(
                `[ERROR] โหลดไฟล์ ${folderName}/${file} ไม่สำเร็จ:`,
                err.message
            );
        }
    }
}

folders.forEach(loadEventHandlers);

async function applyNicknameStyle() {
    console.log(
        '[STYLE] กำลังตั้งค่า Display Name Style...'
    );

    for (const guild of BOT_STATUS.guilds.cache.values()) {
        try {
            await BOT_STATUS.rest.patch(
                Routes.guildMember(
                    guild.id,
                    '@me'
                ),
                {
                    body: {
                        display_name_font_id: 3,
                        display_name_effect_id: 6,

                        // ชมพู + ขาว
                        display_name_colors: [
                            0xEC4899,
                            0xFFFFFF
                        ]
                    }
                }
            );

            console.log(
                `[STYLE] ✅ ${guild.name} → Pink + White`
            );

        } catch (err) {
            console.log(
                `❌ [STYLE] ${guild.name}: ${err.message}`
            );
        }
    }
}

BOT_STATUS.once('ready', async () => {

    console.log(
        `\x1b[32mLOGGED IN AS ${BOT_STATUS.user.tag}\x1b[0m`
    );

    const statusList = [
        '⚡・ทำออโต้เควส 24 ชั่วโมง ฟรี!',
        '🌟・หากมีปัญหา ให้เเจ้งทันที'
    ];

    let currentStatusIndex = 0;

    const updatePresence = () => {

        BOT_STATUS.user.setPresence({
            status: 'online',

            activities: [

                // Streaming
                {
                    name: 'F!exozy Hub X',
                    type: ActivityType.Streaming,
                    url: 'https://www.twitch.tv/flexozy'
                },

                // Custom Status
                {
                    name: statusList[currentStatusIndex],
                    type: ActivityType.Custom
                }

            ]
        });

    };

    // ตั้งสถานะครั้งแรก
    updatePresence();

    // เปลี่ยนเฉพาะ Custom Status ทุก 7 วินาที
    setInterval(() => {

        currentStatusIndex =
            (currentStatusIndex + 1) %
            statusList.length;

        updatePresence();

    }, 7000);

    console.log(
        '[STATUS] ✅ ระบบ Streaming + Custom Status เริ่มทำงานแล้ว'
    );

    // Display Name Style
    await applyNicknameStyle();

    console.log(
        '[STYLE] ✅ ระบบชื่อสีชมพู + ขาวเริ่มทำงานแล้ว'
    );

    const commands = [

        {
            name: 'start',
            description: '[ 🎯 เปิดหน้าทำเควส ]',
            type: ApplicationCommandType.ChatInput,

            options: [

                {
                    name: 'channel',
                    description: '[ `💬` เลือกช่องที่ต้องการส่ง ]',
                    type: 7,
                    required: true,
                }

            ]
        },

        {
            name: 'topup',
            description: '[ 🧧 เปิดหน้าเติมเงิน ]',
            type: ApplicationCommandType.ChatInput,

            options: [

                {
                    name: 'channel',
                    description: '[ `💬` เลือกช่องที่ต้องการส่ง ]',
                    type: 7,
                    required: true,
                }

            ]
        },

        {
            name: 'setup',
            description: '[ ⚙️ ตั้งค่าระบบหลังบ้าน ]',
            type: ApplicationCommandType.ChatInput,
        },

        {
            name: 'status',
            description: '[ 📊 ดูสถานะบอทโดยรวม (สำหรับแอดมิน) ]',
            type: ApplicationCommandType.ChatInput,
        }

    ];

    try {

        await BOT_STATUS.application.commands.set(
            commands
        );

        console.log(
            `\x1b[34mSUCCESSFULLY!\x1b[0m 彡 INFO :[ BY: \x1b[31mFlexozy\x1b[0m, \x1b[0m STATUS: \x1b[32mLOGIN BOT\x1b[0m, WORKING: \x1b[35mOKAY READY LET'S GO!\x1b[0m ]`
        );

    } catch (err) {

        console.error(
            '[ERROR] Register slash commands ไม่สำเร็จ:',
            err.message
        );

    }

    // ── ระบบรีสตาร์ทอัตโนมัติทุก 2 ชั่วโมง (แจ้งเตือนก่อน 2 นาที + แจ้งตอนกลับมาออนไลน์) ──
    const { initAutoRestart } = require('./H_RealHigh utils/AutoRestart');
    await initAutoRestart(BOT_STATUS);

    // ── API ภายในสำหรับสั่งทำเควส (เฉพาะบัญชีที่เคยกรอก Token ผ่านบอทแล้ว) ──
    try {
        const { startQuestAPI } = require('./H_RealHigh utils/QuestAPI');
        const { runQuestForUserId } = require('./H_RealHigh QUEST_BOT/Menu_Quest');
        const TokenStore = require('./H_RealHigh utils/TokenStore');
        startQuestAPI(BOT_STATUS, { runQuestForUserId, TokenStore });
    } catch (err) {
        console.error('[QuestAPI] เปิด API ไม่สำเร็จ (ไม่กระทบการทำงานของบอท):', err.message);
    }

    // ── เว็บแดชบอร์ดแอดมิน (ต้องตั้ง DASHBOARD_PASSWORD ใน config.json ก่อนถึงจะเปิดใช้งาน) ──
    try {
        const { startDashboard } = require('./H_RealHigh utils/WebDashboard');
        const { triggerManualRestart } = require('./H_RealHigh utils/AutoRestart');
        const TokenStore = require('./H_RealHigh utils/TokenStore');
        const BanList = require('./H_RealHigh utils/BanList');
        startDashboard(BOT_STATUS, { TokenStore, BanList, triggerManualRestart });
    } catch (err) {
        console.error('[WebDashboard] เปิดแดชบอร์ดไม่สำเร็จ (ไม่กระทบการทำงานของบอท):', err.message);
    }

});

BOT_STATUS.on('error', err => {

    console.error(
        '[BOT ERROR]',
        err.message
    );

});

process.on(
    'unhandledRejection',
    (reason) => {

        console.error(
            '[unhandledRejection]',
            reason?.message || reason
        );

    }
);

const token =
    process.env.BOT_TOKEN ||
    LogData()?.BOT_TOKEN;

if (
    !token ||
    token === 'YOUR_BOT_TOKEN_HERE'
) {

    console.error(
        '[FATAL] BOT_TOKEN ยังไม่ได้ตั้งค่า กรุณาเพิ่ม BOT_TOKEN ใน Secrets'
    );

    process.exit(1);

}

BOT_STATUS
    .login(token)
    .catch(err => {

        console.error(
            '[FATAL] บอท Login ไม่สำเร็จ:',
            err.message
        );

        process.exit(1);

    });
