const expressAsyncHandler = require("express-async-handler");
const reviewCollection = require("../../models/review.model");
const orderCollection = require("../../models/order.model");
const productCollection = require("../../models/product.model");
const ErrorHandler = require("../../utils/ErrorHandler.utils");
const ApiResponse = require("../../utils/ApiResponse.utils");
const mongoose = require("mongoose");

const addProductReview = expressAsyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { productId, rating, comment, userName } = req.body;

  const order = await orderCollection.findOne({
    userId,
    orderStatus: "Placed",
    cartItems: {
      $elemMatch: {
        productId: new mongoose.Types.ObjectId(productId),
      },
    },
  });

  if (!order) {
    return next(new ErrorHandler("You have not ordered this product", 403));
  }

  const checkExistingReview = await reviewCollection.findOne({
    userId,
    productId,
  });
  if (checkExistingReview) {
    return next(new ErrorHandler("You have already reviewed this product", 400));
  }

  const product = await productCollection.findById(productId);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  const review = await reviewCollection.create({
    userId,
    productId,
    rating,
    comment,
    userName,
  });

  const reviews = await reviewCollection.find({ productId });
  const totalRating = reviews.reduce((acc, curr) => acc + curr.rating, 0);
  const avgRating = totalRating / reviews.length;

  product.averageReview = avgRating;
  await product.save();

  new ApiResponse(res, 201, "Review added successfully", review).send(res);
});

const getProductReviews = expressAsyncHandler(async (req, res, next) => {
  const reviews = await reviewCollection.find({ productId: req.params.id }).populate({
    path: "userId productId",
    select: "email userName image title brand -_id",
  });
  if (reviews.length === 0) return next(new ErrorHandler("No reviews found", 404));
  new ApiResponse(true, "Reviews fetched successfully", reviews, 200).send(res);
});

module.exports = { addProductReview, getProductReviews };
