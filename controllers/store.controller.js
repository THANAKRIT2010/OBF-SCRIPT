// controllers/store.controller.js — สินค้าในร้าน + สั่งซื้อด้วยยอดเงินในกระเป๋า (ตัดจากยอด TrueMoney ที่เติมไว้)
const { nanoid } = require("nanoid");
const { mutate, readDB } = require("../db");
const { notifyEvent } = require("../services/notifyService");

// GET /api/store/products — public, เห็นเฉพาะสินค้าที่เปิดขาย (active)
async function listProducts(req, res) {
  const db = await readDB();
  res.json(db.products.filter((p) => p.active !== false));
}

// GET /api/store/products/all — แอดมิน/ทีมงานเห็นทุกสินค้ารวมที่ปิดขาย/ของหมด
async function listAllProducts(req, res) {
  const db = await readDB();
  res.json(db.products);
}

// POST /api/store/products — สร้างสินค้าใหม่ (ต้องมีสิทธิ์จัดการร้านค้า)
async function createProduct(req, res) {
  const { title, description, image, price, stock, category, type } = req.body;
  if (!title || price == null) return res.status(400).json({ error: "missing_fields" });
  if (Number(price) < 0 || Number(stock) < 0) return res.status(400).json({ error: "invalid_number" });

  const product = {
    id: nanoid(10),
    title: String(title).slice(0, 100),
    description: String(description || "").slice(0, 500),
    image: image || "",
    price: Number(price),
    stock: stock == null ? null : Number(stock),
    category: category || "อื่นๆ",
    type: ["script", "discord_service", "other"].includes(type) ? type : "other",
    active: true,
    created_at: Math.floor(Date.now() / 1000),
  };
  await mutate((db) => db.products.push(product));
  res.status(201).json(product);
}

// PUT /api/store/products/:id
async function updateProduct(req, res) {
  const { id } = req.params;
  const updated = await mutate((db) => {
    const p = db.products.find((p) => p.id === id);
    if (!p) return null;
    const { title, description, image, price, stock, category, type, active } = req.body;
    if (title !== undefined) p.title = String(title).slice(0, 100);
    if (description !== undefined) p.description = String(description).slice(0, 500);
    if (image !== undefined) p.image = image;
    if (price !== undefined) p.price = Number(price);
    if (stock !== undefined) p.stock = stock === null ? null : Number(stock);
    if (category !== undefined) p.category = category;
    if (type !== undefined && ["script", "discord_service", "other"].includes(type)) p.type = type;
    if (active !== undefined) p.active = !!active;
    return p;
  });
  if (!updated) return res.status(404).json({ error: "not_found" });
  res.json(updated);
}

// DELETE /api/store/products/:id
async function deleteProduct(req, res) {
  const { id } = req.params;
  const found = await mutate((db) => {
    const idx = db.products.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    db.products.splice(idx, 1);
    return true;
  });
  if (!found) return res.status(404).json({ error: "not_found" });
  res.status(204).end();
}

// POST /api/store/orders { product_id } — ซื้อด้วยยอดเงินในกระเป๋า ตัดสต็อกทันที
async function createOrder(req, res) {
  const { product_id } = req.body;
  if (!product_id) return res.status(400).json({ error: "missing_product_id" });
  const buyer = req.session.user;

  const result = await mutate((db) => {
    const product = db.products.find((p) => p.id === product_id && p.active !== false);
    if (!product) return { error: "product_not_found" };
    if (product.stock !== null && product.stock <= 0) return { error: "out_of_stock" };

    const user = db.users[buyer.discord_id];
    if (!user) return { error: "user_not_found" };
    const balance = user.balance || 0;
    if (balance < product.price) return { error: "insufficient_balance", need: product.price - balance };

    user.balance = balance - product.price;
    if (product.stock !== null) product.stock -= 1;

    const order = {
      id: nanoid(10),
      buyer_id: buyer.discord_id,
      buyer_name: buyer.username,
      product_id: product.id,
      product_title: product.title,
      price: product.price,
      status: "paid",
      created_at: Math.floor(Date.now() / 1000),
    };
    db.orders.push(order);
    db.wallet_transactions.push({
      id: nanoid(10),
      user_id: buyer.discord_id,
      amount: -product.price,
      type: "purchase",
      ref: order.id,
      created_at: order.created_at,
    });
    return { order };
  });

  if (result.error === "product_not_found") return res.status(404).json({ error: result.error });
  if (result.error === "user_not_found")
    return res.status(401).json({ error: result.error, message: "ไม่พบบัญชีผู้ใช้ กรุณาเข้าสู่ระบบใหม่" });
  if (result.error === "out_of_stock") return res.status(400).json({ error: result.error, message: "สินค้าหมดสต็อก" });
  if (result.error === "insufficient_balance")
    return res.status(400).json({ error: result.error, message: `ยอดเงินไม่พอ ขาดอีก ${result.need} บาท` });

  notifyEvent("order_new", {
    title: "🛒 มีคำสั่งซื้อใหม่",
    description: `${result.order.buyer_name} ซื้อ "${result.order.product_title}" — ${result.order.price} บาท`,
  }).catch((e) => console.error("notifyEvent failed:", e.message));

  res.status(201).json(result.order);
}

// GET /api/store/orders/mine
async function myOrders(req, res) {
  const db = await readDB();
  const list = db.orders
    .filter((o) => o.buyer_id === req.session.user.discord_id)
    .sort((a, b) => b.created_at - a.created_at);
  res.json(list);
}

// GET /api/store/orders — แอดมิน/ทีมงานดูออเดอร์ทั้งหมด
async function listAllOrders(req, res) {
  const db = await readDB();
  res.json([...db.orders].sort((a, b) => b.created_at - a.created_at));
}

// PUT /api/store/orders/:id — แอดมินอัปเดตสถานะ (fulfilled/cancelled)
async function updateOrderStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!["paid", "fulfilled", "cancelled"].includes(status)) return res.status(400).json({ error: "invalid_status" });

  const updated = await mutate((db) => {
    const order = db.orders.find((o) => o.id === id);
    if (!order) return null;
    if (status === "cancelled" && order.status !== "cancelled") {
      const buyer = db.users[order.buyer_id];
      if (buyer) buyer.balance = (buyer.balance || 0) + order.price;
      const product = db.products.find((p) => p.id === order.product_id);
      if (product && product.stock !== null) product.stock += 1;
      db.wallet_transactions.push({
        id: nanoid(10),
        user_id: order.buyer_id,
        amount: order.price,
        type: "refund",
        ref: order.id,
        created_at: Math.floor(Date.now() / 1000),
      });
    }
    order.status = status;
    return order;
  });
  if (!updated) return res.status(404).json({ error: "not_found" });
  res.json(updated);
}

module.exports = {
  listProducts,
  listAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  createOrder,
  myOrders,
  listAllOrders,
  updateOrderStatus,
};
