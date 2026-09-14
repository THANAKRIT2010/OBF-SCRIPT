const express = require("express");
const router = express.Router();
const categoriesController = require("../controllers/categories.controller");
const { requirePermission } = require("../middleware/requireAuth");

router.get("/api/categories", categoriesController.listCategories);
router.post("/api/categories", requirePermission("categories"), categoriesController.addCategory);
router.patch("/api/categories/:id", requirePermission("categories"), categoriesController.updateCategory);
router.delete("/api/categories/:id", requirePermission("categories"), categoriesController.removeCategory);

module.exports = router;
