const express = require("express");
const router = express.Router();
const robloxController = require("../controllers/roblox.controller");
const { requireAuth, requirePermission } = require("../middleware/requireAuth");

router.get("/api/roblox/check/:id", robloxController.checkRobloxId);
router.get("/api/roblox/audio/:id", robloxController.streamAudio);
router.get("/api/roblox/genres", robloxController.listGenres);
router.post("/api/roblox/genres", requirePermission("roblox"), robloxController.addGenre);
router.patch("/api/roblox/genres/:id", requirePermission("roblox"), robloxController.updateGenre);
router.delete("/api/roblox/genres/:id", requirePermission("roblox"), robloxController.removeGenre);
router.get("/api/roblox", robloxController.listCatalog);
router.post("/api/roblox", requirePermission("roblox"), robloxController.addToCatalog);
router.patch("/api/roblox/:id", requirePermission("roblox"), robloxController.updateCatalogEntry);
router.delete("/api/roblox/:id", requirePermission("roblox"), robloxController.removeFromCatalog);
router.post("/api/roblox/:id/retry-cache", requirePermission("roblox"), robloxController.retryCache);

router.get("/api/favorites/mine", requireAuth, robloxController.listMyFavorites);
router.post("/api/favorites/toggle", requireAuth, robloxController.toggleFavorite);
router.post("/api/roblox/track-copy", robloxController.trackCopy);

module.exports = router;
