const { Router } = require("express");
const { addProductReview, getProductReviews } = require("../../controllers/shop/review.controller");
const router = Router();

router.post("/add", addProductReview);
router.get("/:id", getProductReviews);

module.exports = router;
