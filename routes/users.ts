//@ts-nocheck
import express from "express";
import User from "../models/User";
import { authenticate, isAdmin } from "../middleware/auth";

const router = express.Router();

// Get current user
// router.get("/me", authenticate, async (req, res, next) => {
//   try {
//     const user = await User.findById(req.user?._id).select("-password")

//     if (!user) {
//       return res.status(404).json({ message: "User not found" })
//     }

//     res.json(user)
//   } catch (error) {
//     next(error)
//   }
// })

router.get("/me", authenticate, async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await User.findById(req.user._id)
      .select("-password")
      .lean()
      .exec();

    // 3) Handle not found
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

router.get("/me/balance", authenticate, async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await User.findById(req.user._id, "balance pendingBalance")
      .lean()
      .exec();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 3) Send both balances
    res.status(200).json({
      balance: user.balance,
      pendingBalance: user.pendingBalance,
    });
  } catch (err) {
    next(err);
  }
});

// Update user profile
router.put("/me", authenticate, async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findById(req.user?._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (email) user.email = email;

    await user.save();

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      balance: user.balance,
      pendingBalance: user.pendingBalance,
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Get all users
router.get("/admin", authenticate, isAdmin, async (req, res, next) => {
  try {
    const users = await User.find().select("-password");

    const customers = users.filter((user) => user.role === "customer");

    res.json(customers);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/user-count/admin",
  authenticate,
  isAdmin,
  async (req, res, next) => {
    try {
      const users = await User.find().select("-password");

      const customers = users.filter((user) => user.role === "customer");

      res.json({ totalUsers: customers.length });
    } catch (error) {
      next(error);
    }
  }
);

// Admin: Get user by ID
router.get("/:id", authenticate, isAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    next(error);
  }
});

// Admin: Update user
router.put("/:id", authenticate, isAdmin, async (req, res, next) => {
  try {
    const { email, balance, pendingBalance, role } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (email) user.email = email;
    if (balance !== undefined) user.balance = balance;
    if (pendingBalance !== undefined) user.pendingBalance = pendingBalance;
    if (role) user.role = role;

    await user.save();

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      balance: user.balance,
      pendingBalance: user.pendingBalance,
      role: user.role,
    });
  } catch (error) {
    next(error);
  }
});

router.delete(
  "/admin/delete-user/:id",
  authenticate,
  isAdmin,
  async (req, res, next) => {
    try {
      const userId = req.params.id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await User.findByIdAndDelete(userId);

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
