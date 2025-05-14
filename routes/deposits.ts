//@ts-nocheck

import express from "express";
import mongoose from "mongoose";
import { authenticate, isAdmin } from "../middleware/auth";
import crypto from "crypto";
import Deposit, { IDeposit } from "../models/Deposit";
import User, { IUser } from "../models/User";
import PaymentWebhook from "../models/PaymentWebhook";

const router = express.Router();

// Create a new deposit
// router.post("/", authenticate, async (req, res, next) => {
//   try {
//     const { amount, transactionId, senderUsername ,status,pointOfError} = req.body

//     // Validate input
//     if (!amount || !transactionId || !senderUsername) {
//       return res
//         .status(400)
//         .json({ message: "Amount, transaction ID, sender username, are required" })
//     }

//     // Create deposit
//     const deposit = new Deposit({
//       userId: req.user?._id,
//       amount,
//       transactionId,
//       senderUsername,
//       status,
// pointOfError
//     })

//     await deposit.save()

//     // Update user's pending balance
//     const user = await User.findById(req.user?._id)
//     if (user) {
//    if (pointOfError) {
//      user.pendingBalance += amount;
//      await user.save();
//    } else {
//      user.balance += amount;
//    }
// }

//     res.status(201).json(deposit)
//   } catch (error) {
//     next(error)
//   }
// })
// router.post("/", authenticate, async (req, res, next) => {
//   try {
//     const { amount, transactionId, senderUsername, status, pointOfError } =
//       req.body;

//     if (!amount || !transactionId || !senderUsername) {
//       return res.status(400).json({ message: "Required fields are missing." });
//     }

//     const deposit = new Deposit({
//       userId: req.user?._id,
//       amount,
//       transactionId,
//       senderUsername,
//       status,
//       pointOfError,
//     });

//     await deposit.save();

//     const user = await User.findById(req.user?._id);
//     if (user) {
//       if (status === "success") {
//         user.balance += amount;
//       } else {
//         console.log("i reflected here")
//         user.pendingBalance += amount;
//       }
//       await user.save();
//     }

//     res.status(201).json(deposit);
//   } catch (error) {
//     next(error);
//   }
// });

router.post("/", authenticate, async (req, res, next) => {
  try {
    const { amount, transactionId, senderUsername, paidCryptoAmount, status } =
      req.body;

    if (!amount || !transactionId || !senderUsername) {
      return res.status(400).json({ message: "Required fields are missing." });
    }

    const existing = await Deposit.findOne({ transactionId });
    if (existing) {
      return res.status(409).json({ message: "Transaction already exists." });
    }

    const deposit = new Deposit({
      userId: req.user?._id,
      amount,
      transactionId,
      senderUsername,
      paidCryptoAmount,
      status: "pending",
    });

    await deposit.save();

    const user = await User.findById(req.user?._id);
    if (user) {
      user.pendingBalance += amount;
      await user.save();
    }

    res.status(201).json(deposit);
  } catch (error) {
    next(error);
  }
});

router.post("/update-status", async (req, res, next) => {
  try {
    const { paymentId, status, paidCryptoAmount, amount } = req.body;

    if (!paymentId || !status) {
      return res
        .status(400)
        .json({ message: "Payment ID and status are required." });
    }

    let deposit = await Deposit.findOne({ transactionId: paymentId });
    let user;

    // If deposit doesn't exist and we have the required data, create it
    if (!deposit && amount && paidCryptoAmount) {
      user = await User.findById(req.body.userId);

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      deposit = new Deposit({
        userId: user._id,
        amount,
        transactionId: paymentId,
        senderUsername: user.username || "Unknown",
        paidCryptoAmount,
        status: "pending",
      });

      await deposit.save();
    } else if (deposit) {
      // If deposit exists, get the associated user
      user = await User.findById(deposit.userId);
    }

    if (!user || !deposit) {
      return res.status(404).json({ message: "User or deposit not found." });
    }

    // ✅ CASE: SUCCESS
    if (status === "success") {
      if (deposit.status === "success") {
        return res.status(409).json({
          message: "This payment has already been processed successfully.",
        });
      }

      user.balance += deposit.amount;

      if (user.pendingBalance >= deposit.amount) {
        user.pendingBalance -= deposit.amount;
      }

      await user.save();
      deposit.status = "success";
      await deposit.save();

      return res.status(200).json({
        success: true,
        message: "User balance updated successfully.",
      });
    }

    // ❌ CASE: FAILED
    if (status === "failed") {
      deposit.status = "failed";
      await deposit.save();

      return res.status(200).json({
        message: `Deposit marked as failed. Balance not modified.`,
      });
    }

    // 🔁 CASE: PENDING or OTHER STATUSES
    if (user.pendingBalance < deposit.amount) {
      user.pendingBalance += deposit.amount;
      await user.save();
    }

    deposit.status = status;
    await deposit.save();

    return res.status(200).json({
      message: `Deposit status updated to "${status}". Pending balance updated if necessary.`,
    });
  } catch (error) {
    next(error);
  }
});

// Get user deposits
router.get("/my-deposits", authenticate, async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const deposits = await Deposit.find({ userId }).sort({ createdAt: -1 });
    return res.status(200).json(deposits);
  } catch (error) {
    next(error);
  }
});

// Admin: Get all deposits
router.get(
  "/admin/all-deposits",
  authenticate,
  isAdmin,
  async (req, res, next) => {
    try {
      const deposits = await Deposit.find()
        .populate("userId", "username email")
        .sort({ createdAt: -1 });
      res.json(deposits);
    } catch (error) {
      next(error);
    }
  }
);

// Admin: Approve or reject deposit
router.put("/:id", authenticate, isAdmin, async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status } = req.body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Valid status (approved/rejected) is required" });
    }

    const deposit = await Deposit.findById(req.params.id).session(session);

    if (!deposit) {
      return res.status(404).json({ message: "Deposit not found" });
    }

    if (deposit.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Deposit has already been processed" });
    }

    deposit.status = status;

    // Update user balance if approved
    if (status === "approved") {
      const user = await User.findById(deposit.userId).session(session);

      if (user) {
        user.pendingBalance -= deposit.amount;
        user.balance += deposit.amount;
        await user.save({ session });
      }
    } else if (status === "rejected") {
      // Remove from pending balance if rejected
      const user = await User.findById(deposit.userId).session(session);

      if (user) {
        user.pendingBalance -= deposit.amount;
        await user.save({ session });
      }
    }

    await deposit.save({ session });

    await session.commitTransaction();

    res.json(deposit);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
});

const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET!;

router.post("/ipn", express.json(), async (req, res) => {
  // 1) Verify signature
  const payload = JSON.stringify(req.body);
  const signature = req.headers["x-nowpayments-sig"] as string;
  const expectedHmac = crypto
    .createHmac("sha512", IPN_SECRET)
    .update(payload)
    .digest("hex");
  if (!signature || signature !== expectedHmac) {
    return res.status(401).end();
  }

  // 2) Store full webhook for debugging
  await PaymentWebhook.create({
    paymentId: req.body.payment_id,
    data: req.body,
  });

  // 3) Extract both fiat and crypto amounts
  const {
    payment_id: paymentId,
    payment_status: status,
    actually_paid: cryptoPaidStr,
    price_amount: fiatAmountStr,
  } = req.body as {
    payment_id: string;
    payment_status: string;
    actually_paid: string;
    price_amount: string;
  };

  const paidCryptoAmount = parseFloat(cryptoPaidStr);
  const callbackUsdAmount = parseFloat(fiatAmountStr);
  // └─ this is the USD price you originally set when creating the payment :contentReference[oaicite:0]{index=0}

  // 4) Find your existing Deposit (amount in USD is already stored on creation)
  const deposit = (await Deposit.findOne({
    transactionId: paymentId,
  })) as IDeposit | null;
  if (!deposit) {
    return res.status(404).end();
  }

  // 5) Decide new status
  let newStatus: IDeposit["status"] = "pending";
  if (status === "finished") newStatus = "success";
  else if (status === "failed") newStatus = "failed";

  // 6) Update deposit record
  deposit.status = newStatus;
  deposit.paidCryptoAmount = paidCryptoAmount; // optional, track crypto separately
  // deposit.amount (USD) stays as the original fiat amount you took from user
  await deposit.save();

  // 7) If successful, credit the user by USD amount
  if (newStatus === "success") {
    const user = (await User.findById(deposit.userId)) as IUser | null;
    if (user) {
      // Use deposit.amount (your stored USD) — not the crypto-paid field :contentReference[oaicite:1]{index=1}
      const creditUsd = deposit.amount;
      user.balance += creditUsd;
      user.pendingBalance = Math.max(0, user.pendingBalance - creditUsd);
      await user.save();
    }
  }

  // 8) Acknowledge IPN
  res.status(200).end();
});

// Development seed endpoint - DO NOT USE IN PRODUCTION
router.get("/seed-test-deposit", async (req, res, next) => {
  try {
    const testDeposit = new Deposit({
      userId: "6820727d332f6c9248a0e453",
      amount: 40,
      transactionId: "4976112760", // Add timestamp to make it unique
      senderUsername: "Admin",
      paidCryptoAmount: 0.00038554,
      status: "pending",
    });

    await testDeposit.save();

    const user = await User.findById("6820727d332f6c9248a0e453");
    if (user) {
      user.pendingBalance += testDeposit.amount;
      await user.save();
    }

    res.status(201).json({
      message: "Test deposit created successfully",
      deposit: testDeposit,
    });
    console.log("Test deposit created successfully");
  } catch (error) {
    next(error);
  }
});

// // Development delete test deposit endpoint - DO NOT USE IN PRODUCTION
// router.get("/delete-test-deposit", async (req, res, next) => {
//   try {
//     const deposit = await Deposit.findOne({
//       userId: "6820727d332f6c9248a0e453",
//       transactionId: { $regex: "4976112760" },
//     });

//     if (!deposit) {
//       return res.status(404).json({ message: "Test deposit not found" });
//     }

//     // Reduce the pending balance from user
//     const user = await User.findById("6820727d332f6c9248a0e453");
//     if (user && deposit.status === "pending") {
//       user.pendingBalance = Math.max(0, user.pendingBalance - deposit.amount);
//       await user.save();
//     }

//     await Deposit.deleteOne({ _id: deposit._id });
//     console.log("Test deposit deleted successfully");

//     res.status(200).json({
//       message: "Test deposit deleted successfully",
//       deletedDeposit: deposit,
//     });
//   } catch (error) {
//     next(error);
//   }
// });

export default router;
