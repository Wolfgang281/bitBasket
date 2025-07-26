const { Router } = require("express");
const {
  fetchAllOrders,
  fetchOrder,
  updateOrderStatus,
} = require("../../controllers/admin/order.controller");
const router = Router();

router.get("/all", fetchAllOrders);
router.get("/:id", fetchOrder);
router.patch("/update/:id", updateOrderStatus);

module.exports = router;
