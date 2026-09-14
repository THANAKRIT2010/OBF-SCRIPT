// routes/settings.routes.js
const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");
const { requirePermission } = require("../middleware/requireAuth");

router.get("/api/settings", settingsController.getSettings);
router.put("/api/settings", requirePermission("settings"), settingsController.updateSettings);

module.exports = router;
