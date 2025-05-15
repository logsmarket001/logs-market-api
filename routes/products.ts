//@ts-nocheck
import express from "express";
import Product from "../models/Product";
import Order from "../models/Order";
import { authenticate, isAdmin } from "../middleware/auth";

const router = express.Router();

// Get all products
router.get("/", authenticate, async (req, res, next) => {
  try {
    // Get all products
    const products = await Product.find();

    // If user is not authenticated, return all products
    if (!req.user?._id) {
      return res.json(products);
    }

    // Get user's purchased products
    const userOrders = await Order.find({
      userId: req.user._id,
      status: { $in: ["pending", "completed"] },
    });

    const purchasedProductIds = userOrders.map((order) =>
      order.productId.toString()
    );

    // Filter out products that user has already purchased
    const filteredProducts = products.filter(
      (product) => !purchasedProductIds.includes(product._id.toString())
    );

    res.json(filteredProducts);
  } catch (error) {
    next(error);
  }
});

// Get products by mainType or subType
router.get("/type/:type", authenticate, async (req, res, next) => {
  try {
    const { type } = req.params;
    const products = await Product.find({ mainType: type });

    // If user is not authenticated, return all products
    if (!req.user?._id) {
      return res.json(products);
    }

    // Get user's purchased products
    const userOrders = await Order.find({
      userId: req.user._id,
      status: { $in: ["pending", "completed"] },
    });

    const purchasedProductIds = userOrders.map((order) =>
      order.productId.toString()
    );

    // Filter out products that user has already purchased
    const filteredProducts = products.filter(
      (product) => !purchasedProductIds.includes(product._id.toString())
    );

    res.json(filteredProducts);
  } catch (error) {
    next(error);
  }
});

router.get("/admin/admin-type/:type", authenticate, async (req, res, next) => {
  try {
    const { type } = req.params;
    const products = await Product.find({ mainType: type });

    // If user is not authenticated, return all products
    if (!req.user?._id) {
      return res.json(products);
    }

    // Get user's purchased products
    const userOrders = await Order.find({
      userId: req.user._id,
      status: { $in: ["pending", "completed"] },
    });

    const purchasedProductIds = userOrders.map((order) =>
      order.productId.toString()
    );

    // Filter out products that user has already purchased
    const filteredProducts = products.filter(
      (product) => !purchasedProductIds.includes(product._id.toString())
    );

    res.json(filteredProducts);
  } catch (error) {
    next(error);
  }
});


// Get product by ID
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // If user is not authenticated, return the product
    if (!req.user?._id) {
      return res.json(product);
    }

    // Check if user has already purchased this product
    const existingOrder = await Order.findOne({
      userId: req.user._id,
      productId: product._id,
      status: { $in: ["pending", "completed"] },
    });

    if (existingOrder) {
      return res
        .status(400)
        .json({ message: "You have already purchased this product" });
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
});

router.post("/admin", authenticate, isAdmin, async (req, res, next) => {
  const { subType } = req.body;

  // Check if subType is one of the types that needs to be unique
  // if (subType === "mail-checkbook" || subType === "other-page") {
  //   try {
  //     const existingProduct = await Product.findOne({ subType });

  //     if (existingProduct) {
  //       return res
  //         .status(400)
  //         .json({
  //           message: `You already have a product with subType ${subType}`,
  //         });
  //     }
  //   } catch (err) {
  //     return next(err);
  //   }
  // }

  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

// Admin: Update product
router.put("/:id/admin", authenticate, isAdmin, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// Admin: Delete product
router.delete("/:id/admin", authenticate, isAdmin, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
