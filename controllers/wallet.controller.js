// controllers/wallet.controller.js — ยอดเงินในระบบของผู้ใช้ + เติมเงินผ่าน TrueMoney + ประวัติธุรกรรม
const { nanoid } = require("nanoid");
const { mutate, readDB } = require("../db");
const truemoneyService = require("../services/truemoneyService");
const { checkRateLimit, getClientIp } = require("../utils/rateLimit");

// GET /api/wallet — ดูยอดเงินตัวเอง
async function getWallet(req, res) {
  const db = await readDB();
  const user = db.users[req.session.user.discord_id];
  res.json({ balance: user?.balance || 0 });
}

// GET /api/wallet/transactions — ดูประวัติของตัวเอง (ล่าสุดก่อน)
async function myTransactions(req, res) {
  const db = await readDB();
  const list = db.wallet_transactions
    .filter((t) => t.user_id === req.session.user.discord_id)
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 100);
  res.json(list);
}

// POST /api/wallet/topup { link } — แลกซองอั่งเปา TrueMoney แล้วเติมยอดเข้ากระเป๋า
// จำกัดความถี่กันสแปมยิงลิงก์ซ้ำๆ (ลิงก์ที่แลกไปแล้วจะแลกซ้ำไม่ได้อยู่แล้วจาก TrueMoney เอง แต่กันการยิง API รัวๆ ไว้ด้วย)
async function topupTrueMoney(req, res) {
  const rl = await checkRateLimit(`wallet-topup:${getClientIp(req)}`, { limit: 10, windowSeconds: 300 });
  if (!rl.allowed) return res.status(429).json({ error: "too_many_requests", retry_after: rl.retryAfterSeconds });

  const { link } = req.body;
  if (!link || typeof link !== "string") return res.status(400).json({ error: "missing_link" });

  const redeemResult = await truemoneyService.redeemVoucher(link.trim());
  if (!redeemResult.success) {
    return res.status(400).json({ error: "redeem_failed", message: redeemResult.message });
  }
  const creditAmount = redeemResult.amount;

  const userId = req.session.user.discord_id;
  const voucherRef = truemoneyService.extractVoucherHash(link.trim());

  const mutateResult = await mutate((db) => {
    // กันแลกซองซ้ำจากฝั่งเราเองอีกชั้น (เผื่อ TrueMoney ตอบ SUCCESS ซ้ำ หรือมีคนยิงลิงก์เดิมมาซ้ำไม่พร้อมกัน)
    if (voucherRef && db.wallet_transactions.some((t) => t.type === "topup_truemoney" && t.ref === voucherRef)) {
      return { error: "already_redeemed" };
    }
    const user = db.users[userId];
    if (!user) return { error: "user_not_found" };
    user.balance = (user.balance || 0) + creditAmount;
    db.wallet_transactions.push({
      id: nanoid(10),
      user_id: userId,
      amount: creditAmount,
      type: "topup_truemoney",
      ref: voucherRef,
      created_at: Math.floor(Date.now() / 1000),
    });
    return { ok: true, balance: user.balance };
  });

  if (mutateResult.error === "already_redeemed") {
    return res.status(409).json({ error: "already_redeemed", message: "ซองอั่งเปานี้ถูกแลกไปแล้ว ใช้ซ้ำไม่ได้" });
  }
  if (mutateResult.error === "user_not_found") {
    return res.status(401).json({ error: "user_not_found", message: "ไม่พบบัญชีผู้ใช้ กรุณาเข้าสู่ระบบใหม่" });
  }

  res.json({ success: true, credited: creditAmount, balance: mutateResult.balance });
}

module.exports = { getWallet, myTransactions, topupTrueMoney };
