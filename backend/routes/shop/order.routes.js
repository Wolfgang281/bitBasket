const { Router } = require("express");
const {
  createOrder,
  capturePayment,
  getOrders,
  getOrder,
} = require("../../controllers/shop/order.controller");
const router = Router();

router.post("/create", createOrder);
router.post("/capture/:id", capturePayment);
router.get("/list", getOrders);
router.get("/:id", getOrder);

module.exports = router;
