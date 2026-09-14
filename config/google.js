// config/google.js — endpoint คงที่ของ Google OAuth (แบบเดียวกับ config/discord.js)
module.exports = {
  AUTHORIZE_URL: "https://accounts.google.com/o/oauth2/v2/auth",
  TOKEN_URL: "https://oauth2.googleapis.com/token",
  USERINFO_URL: "https://www.googleapis.com/oauth2/v3/userinfo",
  OAUTH_SCOPES: "openid email profile",
};
