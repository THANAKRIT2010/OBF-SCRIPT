// routes/store.routes.js
const express = require("express");
const router = express.Router();
const storeController = require("../controllers/store.controller");
const { requireAuth, requirePermission } = require("../middleware/requireAuth");

router.get("/api/store/products", storeController.listProducts);
router.get("/api/store/products/all", requirePermission("store"), storeController.listAllProducts);
router.post("/api/store/products", requirePermission("store"), storeController.createProduct);
router.put("/api/store/products/:id", requirePermission("store"), storeController.updateProduct);
router.delete("/api/store/products/:id", requirePermission("store"), storeController.deleteProduct);

router.post("/api/store/orders", requireAuth, storeController.createOrder);
router.get("/api/store/orders/mine", requireAuth, storeController.myOrders);
router.get("/api/store/orders", requirePermission("store"), storeController.listAllOrders);
router.put("/api/store/orders/:id", requirePermission("store"), storeController.updateOrderStatus);

module.exports = router;
