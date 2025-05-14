// @ts-nocheck
import express from "express";
import mongoose from "mongoose";
import Order from "../models/Order";
import Product from "../models/Product";
import User from "../models/User";
import { authenticate, isAdmin } from "../middleware/auth";

const router = express.Router();

// ✅ USER: Create order
router.post("/", authenticate, async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { productId, status, data } = req.body;

 
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!productId)
      return res.status(400).json({ message: "Product ID is required" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

   
    const user = await User.findById(req.user?._id);
    if (!user) return res.status(404).json({ message: "User not found" });

  
    if (user.balance < parseFloat(product.data.price)) {
       return res.status(400).json({ message: "Insufficient balance" });
    } 
      user.balance -= parseFloat(product.data.price);
  

    const productSnapshot = {
      subType: product.subType,
      mainType: product.mainType,
      data: product.data,
    };

    const order = new Order({
      userId: req?.user._id,
      status,
      productId,
      productSnapshot,
      data: data || {},
    });

    await order.save({ session });

    await user.save()
    await session.commitTransaction();

  
    res.status(201).json(order);
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
});

// ✅ USER: Get own orders
router.get("/my-orders", authenticate, async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req?.user._id }).populate(
      "productId"
    );

    const processedOrders = orders.map((order) => {
      const populatedProduct = order.productId;

      return {
        ...order.toObject(),
        productId: populatedProduct || order.productSnapshot, // fallback to snapshot if product is deleted
      };
    });
    res.json(processedOrders);
  } catch (error) {
    next(error);
  }
});

// ✅ USER: Delete own order
router.delete("/my-orders/:id", authenticate, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.userId.toString() !== req?.user?._id.toString()) {
      return res.status(403).json({ message: "Forbidden: Not your order" });
    }

    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// ✅ ADMIN: Get all orders
router.get("/admin", authenticate, isAdmin, async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate("productId userId")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/order-count/admin",
  authenticate,
  isAdmin,
  async (req, res, next) => {
  
    try {
      const orders = await Order.find()
        .populate("productId userId")
        .sort({ createdAt: -1 });

      res.json({ totalOrders: orders.length });
    } catch (error) {
      next(error);
    }
  }
);

// ✅ ADMIN: Update any user's order and set status to completed + add trackingID
router.put("/:id", authenticate, isAdmin, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const { trackingID } = req.body;

    if (!trackingID) {
      return res.status(400).json({ message: "trackingID is required" });
    }

    // Update order status and trackingID
    order.status = "completed";
    order.data = { ...order.data, trackingID };

    await order.save();
    res.json({ message: "Order updated successfully", order });
  } catch (error) {
    next(error);
  }
});

router.put(
  "/update-user-order/admin/:id",
  authenticate,
  isAdmin,
  async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ message: "Order not found" });
console.log(req.body);
      const { trackingID, pageLink ,status,RdpDetails} = req.body;

   
      if (!trackingID && !pageLink && !status && !RdpDetails) {
        return res
          .status(400)
          .json({ message: "trackingID, pageLink , RdpDetails, or status is required" });
      }

      // Ensure `order.data` is an object
      order.data = order.data || {};

      if (trackingID) {
        order.data = { ...order.data, trackingID };
      }

      if (pageLink) {
        order.data = { ...order.data, pageLink };
      }
 if (RdpDetails) {
   order.data = { ...order.data, RdpDetails };
 }
      if (status) {
        order.status = status
      }

      order.status = "completed";
      await order.save();

      res.json({ message: "Order updated successfully", order });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
