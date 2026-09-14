// routes/redeem.routes.js
const express = require("express");
const router = express.Router();
const redeemController = require("../controllers/redeem.controller");
const { requireAuth, requirePermission } = require("../middleware/requireAuth");

router.get("/api/redeem/codes", requirePermission("redeem"), redeemController.listCodes);
router.post("/api/redeem/codes", requirePermission("redeem"), redeemController.createCode);
router.put("/api/redeem/codes/:code", requirePermission("redeem"), redeemController.updateCode);
router.delete("/api/redeem/codes/:code", requirePermission("redeem"), redeemController.deleteCode);

router.post("/api/redeem", requireAuth, redeemController.redeemCode);

module.exports = router;
