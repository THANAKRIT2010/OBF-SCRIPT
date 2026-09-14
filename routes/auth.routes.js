// routes/auth.routes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

router.get("/login/discord", authController.loginWithDiscord);
router.get("/api/auth/discord/login", authController.loginWithDiscord);

// Path หลักที่ระบบใช้ + path สำรอง เผื่อ Discord Developer Portal ตั้ง Redirect URI
// ไว้เป็นแบบ /api/auth/discord/callback (ให้ตรงกับ DISCORD_REDIRECT_URI ที่ตั้งไว้จริง)
router.get("/callback/discord", authController.handleCallback);
router.get("/api/auth/discord/callback", authController.handleCallback);

// Google — ใช้เป็นทางลัดเข้าบัญชี Discord เดิมที่อีเมลตรงกันเท่านั้น (ดูรายละเอียดใน controller)
router.get("/login/google", authController.loginWithGoogle);
router.get("/api/auth/google/callback", authController.handleGoogleCallback);

// สมัครสมาชิกด้วยอีเมล/รหัสผ่าน — คู่ขนานกับ Discord/Google OAuth
const localAuthController = require("../controllers/localAuth.controller");
router.post("/api/auth/register", localAuthController.register);
router.post("/api/auth/login", localAuthController.login);
router.post("/api/auth/forgot-password", localAuthController.forgotPassword);
router.post("/api/auth/reset-password", localAuthController.resetPassword);

router.get("/logout", authController.logout);
router.get("/api/me", authController.me);
router.get("/api/profile/:discord_id", authController.getProfile);

module.exports = router;
