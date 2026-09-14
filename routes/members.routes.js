// routes/members.routes.js
const express = require("express");
const router = express.Router();
const membersController = require("../controllers/members.controller");
const { requirePermission } = require("../middleware/requireAuth");

router.get("/api/admin/members", requirePermission("members"), membersController.listMembers);

module.exports = router;
