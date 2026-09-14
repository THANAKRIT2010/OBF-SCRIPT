// routes/vault.routes.js
const express = require("express");
const router = express.Router();
const vaultController = require("../controllers/vault.controller");
const { requireAuth, requirePermission } = require("../middleware/requireAuth");

router.post("/api/vault", requireAuth, vaultController.createVaultLink);
router.get("/api/vault/mine", requireAuth, vaultController.listMine);
router.get("/api/vault", requirePermission("vault"), vaultController.listAll);

router.get("/api/vault/:code/meta", vaultController.getMeta);
router.post("/api/vault/:code/unlock", vaultController.unlock);
router.get("/api/vault/:code/admin-view", requireAuth, vaultController.adminView);
router.put("/api/vault/:code", requireAuth, vaultController.updateVaultLink);
router.delete("/api/vault/:code", requireAuth, vaultController.removeVaultLink);

// เส้นทาง raw จริงบนเซิร์ฟเวอร์ (ไม่ใช่ #hash) ใช้กับ loadstring(game:HttpGet(...)) ได้โดยตรง
router.get("/raw/vault/:code", vaultController.rawView);

module.exports = router;
