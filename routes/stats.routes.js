// routes/stats.routes.js
const express = require("express");
const router = express.Router();
const statsController = require("../controllers/stats.controller");
const { requirePermission } = require("../middleware/requireAuth");

router.get("/api/stats", statsController.getStats);
router.get("/api/admin/stats/history", requirePermission("members"), statsController.getStatsHistory);

module.exports = router;
