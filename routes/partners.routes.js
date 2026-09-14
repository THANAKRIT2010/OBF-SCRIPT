// routes/partners.routes.js
const express = require("express");
const router = express.Router();
const partnersController = require("../controllers/partners.controller");
const { requirePermission } = require("../middleware/requireAuth");

router.get("/api/partners", partnersController.listPartners);
router.post("/api/partners", requirePermission("partners"), partnersController.addPartner);
router.put("/api/partners/:discord_id", requirePermission("partners"), partnersController.updatePartner);
router.delete("/api/partners/:discord_id", requirePermission("partners"), partnersController.removePartner);

module.exports = router;
