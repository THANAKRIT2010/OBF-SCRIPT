// services/googleService.js — จุดเดียวที่คุยกับ Google OAuth ทั้งหมด (แบบเดียวกับ discordService.js)
const axios = require("axios");
const crypto = require("crypto");
const { google, FRONTEND_URL } = require("../config/env");
const { AUTHORIZE_URL, TOKEN_URL, USERINFO_URL, OAUTH_SCOPES } = require("../config/google");

function buildAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: google.clientId,
    redirect_uri: google.redirectUri,
    response_type: "code",
    scope: OAUTH_SCOPES,
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

function generateState() {
  return crypto.randomBytes(16).toString("hex");
}

async function exchangeCodeForToken(code) {
  const res = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      client_id: google.clientId,
      client_secret: google.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: google.redirectUri,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return res.data.access_token;
}

// คืน { email, email_verified, name, picture, sub (Google user id) }
async function fetchGoogleUser(accessToken) {
  const res = await axios.get(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data;
}

module.exports = { buildAuthorizeUrl, generateState, exchangeCodeForToken, fetchGoogleUser, FRONTEND_URL };
