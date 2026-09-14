// routes/wallet.routes.js
const express = require("express");
const router = express.Router();
const walletController = require("../controllers/wallet.controller");
const { requireAuth } = require("../middleware/requireAuth");

router.get("/api/wallet", requireAuth, walletController.getWallet);
router.get("/api/wallet/transactions", requireAuth, walletController.myTransactions);
router.post("/api/wallet/topup", requireAuth, walletController.topupTrueMoney);

module.exports = router;
