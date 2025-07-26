const orderCollection = require("../../models/order.model");
const productCollection = require("../../models/product.model");
const userCollection = require("../../models/user.model");
const expressAsyncHandler = require("express-async-handler");
const ErrorHandler = require("../../utils/ErrorHandler.utils");
const ApiResponse = require("../../utils/ApiResponse.utils");

const fetchAllOrders = expressAsyncHandler(async (req, res) => {
  const orders = await orderCollection.find();
  if (orders.length === 0) return next(new ErrorHandler("No orders found", 404));
  new ApiResponse(true, "Orders fetched successfully", orders, 200).send(res);
});

const fetchOrder = expressAsyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const order = await orderCollection.findOne({ _id: orderId });
  if (!order) return next(new ErrorHandler("Order not found", 404));
  new ApiResponse(true, "Order fetched successfully", order, 200).send(res);
});

const updateOrderStatus = expressAsyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const order = await orderCollection.findOne({ _id: orderId });
  if (!order) return next(new ErrorHandler("Order not found", 404));

  await orderCollection.updateOne({ _id: orderId }, { $set: { status: req.body.status } });
  new ApiResponse(true, "Order status updated successfully", order, 200).send(res);
});

module.exports = { fetchAllOrders, fetchOrder, updateOrderStatus };
