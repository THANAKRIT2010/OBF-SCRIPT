// routes/team.routes.js
const express = require("express");
const router = express.Router();
const teamController = require("../controllers/team.controller");
const { requireAdmin } = require("../middleware/requireAuth");

router.get("/api/team", teamController.listTeam);
router.post("/api/team", requireAdmin, teamController.addMember);
router.patch("/api/team/:discord_id", requireAdmin, teamController.updateMember);
router.post("/api/team/:discord_id/refresh", requireAdmin, teamController.refreshMember);
router.delete("/api/team/:discord_id", requireAdmin, teamController.removeMember);

module.exports = router;
