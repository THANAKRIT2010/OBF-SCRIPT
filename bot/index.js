// ============================================================
// Discord Verify Bot
// - โพสต์ปุ่ม "ยืนยันตัวตน" ด้วยคำสั่ง /setup-verify
// - เมื่อผู้ใช้กดปุ่ม บอทจะตอบกลับ (เฉพาะผู้กดเห็น) เป็นลิงก์ไปหน้าเว็บ
//   ลิงก์นี้ผูก user id + guild id ไว้ใน state เพื่อกันคนอื่นสวมรอย
// - บอทไม่เก็บ Discord OAuth token ของผู้ใช้เลย ไม่มี "vault"
// ============================================================

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  REST,
  Routes,
} = require("discord.js");
require("dotenv").config();

const {
  DISCORD_BOT_TOKEN,
  DISCORD_CLIENT_ID,
  WEB_BASE_URL, // เช่น https://verify.yourdomain.com
} = process.env;

if (!DISCORD_BOT_TOKEN || !DISCORD_CLIENT_ID || !WEB_BASE_URL) {
  console.error(
    "Missing env vars: DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, WEB_BASE_URL"
  );
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ---------- Slash command: /setup-verify ----------
const commands = [
  new SlashCommandBuilder()
    .setName("setup-verify")
    .setDescription("โพสต์ข้อความปุ่มยืนยันตัวตนในช่องนี้")
    .addRoleOption((opt) =>
      opt
        .setName("role")
        .setDescription("ยศที่จะให้เมื่อยืนยันตัวตนสำเร็จ")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .toJSON(),
];

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(DISCORD_BOT_TOKEN);
  await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
    body: commands,
  });
  console.log("Slash commands registered.");
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  try {
    // --- /setup-verify ---
    if (interaction.isChatInputCommand() && interaction.commandName === "setup-verify") {
      const role = interaction.options.getRole("role");

      const embed = new EmbedBuilder()
        .setTitle("ยืนยันตัวตน")
        .setDescription(
          "กดปุ่มด้านล่างเพื่อยืนยันตัวตนผ่าน Discord\n" +
            "ระบบจะตรวจสอบว่าคุณอยู่ในเซิร์ฟเวอร์นี้จริง แล้วมอบยศให้อัตโนมัติ"
        )
        .setColor(0x5865f2);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`verify:${role.id}`)
          .setLabel("ยืนยันตัวตน")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("✅")
      );

      await interaction.reply({ embeds: [embed], components: [row] });
      return;
    }

    // --- ปุ่ม "ยืนยันตัวตน" ---
    if (interaction.isButton() && interaction.customId.startsWith("verify:")) {
      const roleId = interaction.customId.split(":")[1];
      const guildId = interaction.guildId;
      const userId = interaction.user.id;

      // state ผูก user+guild+role เพื่อกัน callback ถูกใช้แทนคนอื่น (กัน CSRF/สวมรอย)
      const state = Buffer.from(
        JSON.stringify({ u: userId, g: guildId, r: roleId, t: Date.now() })
      ).toString("base64url");

      const url = `${WEB_BASE_URL}/api/auth/login?state=${state}`;

      await interaction.reply({
        content: `กดลิงก์นี้เพื่อยืนยันตัวตน (ใช้ได้ 5 นาที):\n${url}`,
        ephemeral: true,
      });
      return;
    }
  } catch (err) {
    console.error("Interaction error:", err);
    if (interaction.isRepliable()) {
      await interaction
        .reply({ content: "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง", ephemeral: true })
        .catch(() => {});
    }
  }
});

(async () => {
  await registerCommands();
  await client.login(DISCORD_BOT_TOKEN);
})();
