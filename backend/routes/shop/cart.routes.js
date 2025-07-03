const { Router } = require("express");
const {
  addToCart,
  fetchCartItems,
  updateCartItems,
} = require("../../controllers/shop/cart.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const router = Router();

router.post("/add", authenticate, addToCart);
router.get("/get", authenticate, fetchCartItems);
router.patch("/update", authenticate, updateCartItems);
router.delete("/delete/:productId", authenticate, updateCartItems);

module.exports = router;
