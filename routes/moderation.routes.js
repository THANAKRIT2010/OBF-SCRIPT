// routes/moderation.routes.js
const express = require("express");
const router = express.Router();
const moderationController = require("../controllers/moderation.controller");
const { requireAuth, requirePermission } = require("../middleware/requireAuth");

router.post("/api/reports", requireAuth, moderationController.createReport);
router.get("/api/admin/reports", requirePermission("moderation"), moderationController.listReports);
router.patch("/api/admin/reports/:id", requirePermission("moderation"), moderationController.updateReport);
router.delete("/api/admin/reports/:id", requirePermission("moderation"), moderationController.removeReport);

router.get("/api/admin/bans", requirePermission("moderation"), moderationController.listBans);
router.post("/api/admin/bans", requirePermission("moderation"), moderationController.banUser);
router.delete("/api/admin/bans/:discord_id", requirePermission("moderation"), moderationController.unbanUser);

module.exports = router;
