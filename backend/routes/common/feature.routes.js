const { Router } = require("express");
const {
  addFeatureImage,
  fetchAllFeatures,
} = require("../../controllers/common/feature.controller");
const router = Router();

router.post("/add", addFeatureImage);
router.get("/all", fetchAllFeatures);

module.exports = router;
