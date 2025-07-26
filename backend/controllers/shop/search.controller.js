const expressAsyncHandler = require("express-async-handler");
const productCollection = require("../../models/product.model");
const ApiResponse = require("../../utils/ApiResponse.utils");
const ErrorHandler = require("../../utils/ErrorHandler.utils");

const searchProducts = expressAsyncHandler(async (req, res, next) => {
  const { keyword } = req.params;
  if (!keyword || typeof keyword !== "string")
    return next(new ErrorHandler("keyword is required and must be a string format", 400));

  const regEx = new RegExp(keyword, "i");
  const searchQuery = {
    $or: [
      { title: { $regex: regEx } },
      { description: { $regex: regEx } },
      { category: { $regex: regEx } },
      { brand: { $regex: regEx } },
    ],
  };

  const products = await productCollection.find(searchQuery);
  if (products.length === 0) {
    return next(new ErrorHandler("No products found", 404));
  }

  new ApiResponse(true, "Products fetched successfully", products, 200).send(res);
});

module.exports = { searchProducts };
