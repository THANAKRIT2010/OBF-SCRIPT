// routes/webhooks.routes.js
const express = require("express");
const router = express.Router();
const webhooksController = require("../controllers/webhooks.controller");
const { requirePermission } = require("../middleware/requireAuth");

router.get("/api/admin/webhooks", requirePermission("webhooks"), webhooksController.listWebhooks);
router.post("/api/admin/webhooks", requirePermission("webhooks"), webhooksController.addWebhook);
router.patch("/api/admin/webhooks/:id", requirePermission("webhooks"), webhooksController.updateWebhook);
router.delete("/api/admin/webhooks/:id", requirePermission("webhooks"), webhooksController.removeWebhook);
router.post("/api/admin/webhooks/:id/test", requirePermission("webhooks"), webhooksController.testWebhook);

module.exports = router;
