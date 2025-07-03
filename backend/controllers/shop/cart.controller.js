const expressAsyncHandler = require("express-async-handler");
const cartCollection = require("../../models/cart.model");
const productCollection = require("../../models/product.model");
const ApiResponse = require("../../utils/ApiResponse.utils");
const ErrorHandler = require("../../utils/ErrorHandler.utils");

const addToCart = expressAsyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId, quantity } = req.body;

  let product = await productCollection.findById(productId);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  let cart = await cartCollection.findOne({ userId });
  if (!cart) {
    cart = await cartCollection.create({ userId, items: [] });
  }

  const index = cart.items.findIndex((item) => item.productId.toString() === productId);
  if (index === -1) {
    cart.items.push({ productId, quantity });
  } else {
    cart.items[index].quantity += quantity;
  }

  await cart.save();
  new ApiResponse(true, "Product added to cart successfully", cart, 200).send(res);
});

const fetchCartItems = expressAsyncHandler(async (req, res) => {
  const userId = req.user._id;
  const cart = await cartCollection.findOne({ userId }).populate({
    path: "items.productId",
    select: "image title price salePrice",
  });
  if (!cart) return next(new ErrorHandler("Cart not found", 404));

  const validItems = cart.items.filter((item) => item.productId);
  if (validItems.length < cart.items.length) {
    cart.items = validItems;
    await cart.save();
  }

  const populateCartItems = validItems.map((item) => ({
    productId: item.productId._id,
    quantity: item.quantity,
    title: item.productId.title,
    image: item.productId.image,
    price: item.productId.price,
    salePrice: item.productId.salePrice,
  }));

  let cartItems = { ...cart.toObject(), items: populateCartItems };

  new ApiResponse(true, "Cart fetched successfully", cartItems, 200).send(res);
});

const updateCartItems = expressAsyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId, quantity } = req.body;

  const cart = await cartCollection.findOne({ userId });
  if (!cart) return next(new ErrorHandler("Cart not found", 404));

  const index = cart.items.findIndex((item) => item.productId.toString() === productId);
  if (index === -1) {
    return next(new ErrorHandler("Product not found in cart", 404));
  }

  cart.items[index].quantity = quantity;
  await cart.save();

  await cart.populate({
    path: "items.productId",
    select: "image title price salePrice",
  });

  const populateCartItems = validItems.map((item) => ({
    productId: item.productId ? item.productId._id : null,
    quantity: item.quantity ? item.quantity : 0,
    title: item.productId ? item.productId.title : "Product not found",
    image: item.productId ? item.productId.image : null,
    price: item.productId ? item.productId.price : 0,
    salePrice: item.productId ? item.productId.salePrice : 0,
  }));

  let cartItems = { ...cart.toObject(), items: populateCartItems };

  new ApiResponse(true, "Cart updated successfully", cartItems, 200).send(res);
});

const deleteCartItem = expressAsyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.body; // Assuming you're sending the productId in the request body

  const cart = await cartCollection.findOne({ userId }).populate({
    path: "items.productId",
    select: "image title price salePrice",
  });
  if (!cart) return next(new ErrorHandler("Cart not found", 404));

  const index = cart.items.findIndex((item) => item.productId.toString() === productId);
  if (index === -1) {
    return next(new ErrorHandler("Product not found in cart", 404));
  }

  cart.items.splice(index, 1);
  await cart.save();

  await cart.populate({
    path: "items.productId",
    select: "image title price salePrice",
  });

  const populateCartItems = validItems.map((item) => ({
    productId: item.productId ? item.productId._id : null,
    quantity: item.quantity ? item.quantity : 0,
    title: item.productId ? item.productId.title : "Product not found",
    image: item.productId ? item.productId.image : null,
    price: item.productId ? item.productId.price : 0,
    salePrice: item.productId ? item.productId.salePrice : 0,
  }));

  let cartItems = { ...cart.toObject(), items: populateCartItems };

  new ApiResponse(true, "Product removed from cart successfully", cartItems, 200).send(res);
});

module.exports = { addToCart, fetchCartItems, updateCartItems, deleteCartItem };
