// routes/index.js — รวมทุก route module ไว้จุดเดียว server.js เรียกแค่ไฟล์นี้ไฟล์เดียว
const express = require("express");
const router = express.Router();

router.use(require("./auth.routes"));
router.use(require("./scripts.routes"));
router.use(require("./partners.routes"));
router.use(require("./stats.routes"));
router.use(require("./team.routes"));
router.use(require("./roblox.routes"));
router.use(require("./vault.routes"));
router.use(require("./settings.routes"));
router.use(require("./upload.routes"));
router.use(require("./members.routes"));
router.use(require("./webhooks.routes"));
router.use(require("./moderation.routes"));
router.use(require("./categories.routes"));
router.use(require("./store.routes"));
router.use(require("./wallet.routes"));
router.use(require("./redeem.routes"));
router.use(require("./admin.routes"));
router.use(require("./apikey.routes"));

module.exports = router;
