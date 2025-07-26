const featureCollection = require("../../models/feature.model");
const expressAsyncHandler = require("express-async-handler");
const ErrorHandler = require("../../utils/ErrorHandler.utils");
const ApiResponse = require("../../utils/ApiResponse.utils");

const addFeatureImage = expressAsyncHandler(async (req, res) => {
  const { image } = req.body;
  const feature = await featureCollection.create({ image });
  new ApiResponse(true, "Feature added successfully", feature, 201).send(res);
});

const fetchAllFeatures = expressAsyncHandler(async (req, res) => {
  const features = await featureCollection.find();
  if (features.length === 0) return next(new ErrorHandler("No features found", 404));
  new ApiResponse(true, "Features fetched successfully", features, 200).send(res);
});

module.exports = { addFeatureImage, fetchAllFeatures };
