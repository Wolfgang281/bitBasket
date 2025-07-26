const orderCollection = require("../../models/order.model");
const cartCollection = require("../../models/cart.model");
const addressCollection = require("../../models/address.model");
const productCollection = require("../../models/product.model");
const paypal = require("../../config/paypal.config");
const expressAsyncHandler = require("express-async-handler");
const ErrorHandler = require("../../utils/ErrorHandler.utils");
const ApiResponse = require("../../utils/ApiResponse.utils");

const createOrder = expressAsyncHandler(async (req, res, next) => {
  // ✅ Step 1: Get the logged-in user's ID from the request (after auth middleware has added req.user)
  const userId = req.user._id;

  // ✅ Step 2: Get cartId, addressId, and paymentMethod from the request body (coming from frontend)
  const { cartId, addressId, paymentMethod } = req.body;

  // ✅ Step 3: Validate if all required inputs are present
  if (!cartId || !addressId || !paymentMethod) {
    return next(new ErrorHandler("Missing required fields", 400)); // Throw error if any field is missing
  }

  // ✅ Step 4: Fetch the cart details from the database using cartId
  const cart = await cartCollection.findById(cartId);

  // ✅ Step 5: Check if the cart exists and belongs to the logged-in user (userId)
  if (!cart || cart.userId.toString() !== userId.toString()) {
    return next(new ErrorHandler("Invalid or unauthorized cart", 404)); // Cart not found or unauthorized access
  }

  // ✅ Step 6: Fetch the delivery address details using addressId
  const address = await addressCollection.findById(addressId);

  // ✅ Step 7: Validate the address belongs to the logged-in user
  if (!address || address.userId.toString() !== userId.toString()) {
    return next(new ErrorHandler("Invalid or unauthorized address", 404));
  }

  // ✅ Step 8: Initialize variables to calculate total amount and prepare cart item details
  let totalAmount = 0;
  const cartItems = [];

  // ✅ Step 9: Loop through each item in the cart
  for (const item of cart.items) {
    // Fetch the product details using the product ID in each cart item
    const product = await productCollection.findById(item.productId);

    // If product not found in DB, return error
    if (!product) {
      return next(new ErrorHandler(`Product ${item.productId} not found`, 400));
    }

    // Add the product price * quantity to the total amount
    totalAmount += product.price * item.quantity;

    // Prepare the cart item object to store in the order
    cartItems.push({
      productId: product._id,
      title: product.title,
      image: product.image,
      price: product.price,
      quantity: item.quantity,
    });
  }

  // ✅ Step 10: Format the address details to store inside the order
  const addressInfo = {
    addressId: address._id,
    address: address.address,
    city: address.city,
    pincode: address.pincode,
    phone: address.phone,
    notes: address.notes || "", // Optional notes like "leave at gate"
  };

  // ✅ Step 11: Handle Online Payment using PayPal
  if (paymentMethod === "Online") {
    // Step 11.1: Create a payment request JSON as required by PayPal API
    const create_payment_json = {
      intent: "sale", // "sale" means PayPal will charge immediately
      payer: { payment_method: "paypal" }, // Payment method used: PayPal
      redirect_urls: {
        return_url: `http://localhost:5173/shop/paypal-return`, // On payment success, redirect here
        cancel_url: `http://localhost:5173/shop/paypal-cancel`, // On payment cancel, redirect here
      },
      transactions: [
        {
          // Send the list of cart items to PayPal
          item_list: {
            items: cartItems.map((item) => ({
              name: item.title, // Product title
              sku: item.productId.toString(), // Product ID as Stock Keeping Unit
              price: item.price.toFixed(2), // Price (2 decimal places)
              currency: "USD", // Currency used
              quantity: item.quantity, // Quantity purchased
            })),
          },
          amount: {
            currency: "USD", // Total amount currency
            total: totalAmount.toFixed(2), // Total order value
          },
          description: "Order payment", // Custom description
        },
      ],
    };

    // Step 11.2: Create the PayPal payment session
    paypal.payment.create(create_payment_json, async (error, payment) => {
      if (error) {
        console.error("PayPal error:", error); // Log PayPal error
        return next(new ErrorHandler("Payment creation failed", 500));
      }

      try {
        // Step 11.3: Get the approval URL from PayPal response to redirect user
        const approvalLink = payment.links.find((link) => link.rel === "approval_url")?.href;

        if (!approvalLink) {
          return next(new ErrorHandler("Approval link not received", 500));
        }

        // Step 11.4: Now create the order in DB with status pending
        const order = await orderCollection.create({
          userId,
          cartId,
          cartItems,
          addressInfo,
          paymentMethod,
          totalAmount,
          paymentId: payment.id, // Save PayPal payment ID
          paymentStatus: "Pending", // Payment is not yet done
          orderStatus: "Pending", // Delivery has not started
        });

        // Step 11.5: Send success response with PayPal payment approval link
        return new ApiResponse(true, "Order created successfully", {
          orderId: order._id,
          paymentLink: approvalLink, // Frontend will redirect user to this link
        }).send(res);
      } catch (dbError) {
        console.error("Order creation failed:", dbError);
        return next(new ErrorHandler("Order save failed after payment creation", 500));
      }
    });
  }

  // ✅ Step 12: Handle COD (Cash On Delivery) flow
  else {
    try {
      // Create the order directly in the database (no PayPal needed)
      const order = await orderCollection.create({
        userId,
        cartId,
        cartItems,
        addressInfo,
        paymentMethod,
        totalAmount,
        orderStatus: "Pending", // Delivery will be done later
        paymentStatus: "Pending", // Cash will be collected at time of delivery
      });

      // Return success response to frontend
      return new ApiResponse(true, "Order placed successfully (COD)", {
        orderId: order._id,
      }).send(res);
    } catch (err) {
      return next(new ErrorHandler("COD order creation failed", 500));
    }
  }
});

const capturePayment = expressAsyncHandler(async (req, res, next) => {
  const paymentId = req.params.id;
  const payerId = req.body.payerID;

  if (!paymentId || !payerId) {
    return next(new ErrorHandler("Missing required fields", 400));
  }

  paypal.payment.execute(paymentId, { payer_id: payerId }, async (error, payment) => {
    if (error) {
      console.error("PayPal error:", error);
      return next(new ErrorHandler("Payment execution failed", 500));
    }

    try {
      const order = await orderCollection.findOne({ paymentId }); // ✅ FIXED

      if (!order) {
        return next(new ErrorHandler("Order not found", 404));
      }

      if (order.paymentStatus === "Paid") {
        return next(new ErrorHandler("Payment already captured", 400));
      }

      if (payment.state !== "approved") {
        return next(new ErrorHandler("Payment not approved", 400));
      }

      order.paymentStatus = "Paid";
      order.orderStatus = "Placed";
      order.payerId = payerId; // ✅ FIXED
      await order.save();

      for (let item of order.cartItems) {
        const product = await productCollection.findById(item.productId);
        if (!product) {
          return next(new ErrorHandler(`Product ${item.productId} not found`, 400));
        }
        product.stock -= item.quantity;
        await product.save();
      }

      await cartCollection.findByIdAndDelete(order.cartId);

      return new ApiResponse(true, "Payment captured successfully", {
        orderId: order._id,
      }).send(res);
    } catch (dbError) {
      console.error("Order update failed:", dbError);
      return next(new ErrorHandler("Order update failed", 500));
    }
  });
});

//& http://localhost:5173/shop/paypal-return?paymentId=PAYID-NBXZQ3Y03754305D2021510L&token=EC-2XL95869YX805761W&PayerID=EE2GHZBHKH65C

const getOrders = expressAsyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const orders = await orderCollection.find({ userId });
  if (orders.length === 0) return next(new ErrorHandler("No orders found", 404));
  new ApiResponse(true, "Orders fetched successfully", orders, 200).send(res);
});

const getOrder = expressAsyncHandler(async (req, res, next) => {
  const orderId = req.params.id;
  const userId = req.user._id;

  const order = await orderCollection.findOne({ _id: orderId, userId });
  if (!order) return next(new ErrorHandler("Order not found", 404));

  new ApiResponse(true, "Order fetched successfully", order, 200).send(res);
});

// TODO: cancelOrder, refund, // and other order management functionalities like updating status, etc.
// Note: The cancelOrder function is commented out as it requires additional logic for handling refunds and
//       order status updates which are not implemented yet. Uncomment and implement when ready.

// const cancelOrder = expressAsyncHandler(async (req, res, next) => {
//   const orderId = req.params.id;
//   const userId = req.user._id;

//   const order = await orderCollection.findOne({ _id: orderId, userId });
//   if (!order) return next(new ErrorHandler("Order not found", 404));

//   if (order.orderStatus === "Cancelled") {
//     return next(new ErrorHandler("Order already cancelled", 400));
//   }

//   if (order.paymentMethod === "Online" && order.paymentStatus === "Paid") {
//     // TODO: Implement refund logic here
//     return next(new ErrorHandler("Online payment refund not implemented yet", 501));
//   }

//   order.orderStatus = "Cancelled";
//   await order.save();

//   new ApiResponse(true, "Order cancelled successfully", order, 200).send(res);
// });

module.exports = { createOrder, capturePayment, getOrders, getOrder };
