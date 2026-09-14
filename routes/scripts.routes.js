// routes/scripts.routes.js
const express = require("express");
const router = express.Router();
const scriptsController = require("../controllers/scripts.controller");
const requireAuth = require("../middleware/requireAuth");

router.get("/api/scripts", scriptsController.listScripts);
router.post("/api/scripts/user_add", requireAuth, scriptsController.addScript);
router.patch("/api/scripts/:id", requireAuth, scriptsController.updateScript);
router.delete("/api/scripts/:id", requireAuth, scriptsController.deleteScript);
router.post("/api/scripts/:id/like", requireAuth, scriptsController.likeScript);
router.post("/api/scripts/:id/comment", requireAuth, scriptsController.commentScript);

module.exports = router;
