// utils/discordCdn.js — แปลง user object ของ Discord ให้เป็น URL รูปภาพ / badge ที่ frontend ใช้ได้เลย
const { CDN_BASE } = require("../config/discord");
const { ADMIN_DISCORD_IDS } = require("../config/env");

function avatarUrl(user) {
  if (!user.avatar) {
    const idx =
      user.discriminator && user.discriminator !== "0"
        ? Number(user.discriminator) % 5
        : Number(BigInt(user.id) >> 22n) % 6;
    return `${CDN_BASE}/embed/avatars/${idx}.png`;
  }
  const ext = user.avatar.startsWith("a_") ? "gif" : "png";
  return `${CDN_BASE}/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
}

function avatarDecorationUrl(user) {
  if (!user.avatar_decoration_data?.asset) return null;
  return `${CDN_BASE}/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=256`;
}

function bannerUrl(user) {
  if (!user.banner) return null;
  const ext = user.banner.startsWith("a_") ? "gif" : "png";
  return `${CDN_BASE}/banners/${user.id}/${user.banner}.${ext}?size=600`;
}

// public_flags bitfield -> รายชื่อ badge ที่อ่านง่าย (subset ที่พบบ่อยที่สุด)
const FLAG_BADGES = [
  [1 << 0, "Discord Staff"],
  [1 << 1, "Partnered Server Owner"],
  [1 << 2, "HypeSquad Events"],
  [1 << 3, "Bug Hunter Level 1"],
  [1 << 6, "HypeSquad Bravery"],
  [1 << 7, "HypeSquad Brilliance"],
  [1 << 8, "HypeSquad Balance"],
  [1 << 9, "Early Supporter"],
  [1 << 14, "Bug Hunter Level 2"],
  [1 << 16, "Early Verified Bot Developer"],
  [1 << 17, "Discord Certified Moderator"],
  [1 << 22, "Active Developer"],
];
function decodeBadges(publicFlags = 0) {
  return FLAG_BADGES.filter(([bit]) => (publicFlags & bit) !== 0).map(([, name]) => name);
}

// รวม field ทั้งหมดที่ frontend ต้องใช้แสดงโปรไฟล์ ให้เป็น object เดียว
function buildProfile(discordUser) {
  return {
    discord_id: discordUser.id,
    username: discordUser.global_name || discordUser.username,
    handle: discordUser.username,
    avatar: avatarUrl(discordUser),
    avatar_decoration: avatarDecorationUrl(discordUser),
    banner: bannerUrl(discordUser),
    accent_color: discordUser.accent_color || null,
    badges: decodeBadges(discordUser.public_flags),
    is_admin: ADMIN_DISCORD_IDS.includes(discordUser.id),
    discord_profile_url: `https://discord.com/users/${discordUser.id}`, // ลิงก์เปิดหน้าโปรไฟล์/ไบโอจริงบน Discord
    // email มีได้ก็ต่อเมื่อขอ scope "email" ตอน login และผู้ใช้มีอีเมลยืนยันแล้วกับ Discord เท่านั้น (อาจเป็น undefined)
    email: discordUser.verified ? discordUser.email || null : null,
  };
}

module.exports = { avatarUrl, avatarDecorationUrl, bannerUrl, decodeBadges, buildProfile };
