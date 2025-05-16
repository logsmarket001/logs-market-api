//@ts-nocheck
import express from "express";
import { verifyPayment } from "../services/paymentVerificationService";
import { authenticate, isAdmin } from "../middleware/auth";
import Deposit from "../models/Deposit";

const router = express.Router();

// Manual trigger for payment verification
router.post(
  "/payment-verification",
  authenticate,
  isAdmin,
  async (req, res, next) => {
    if (req.method !== "GET") {
      return res.status(405).json({
        success: false,
        message: "Method not allowed",
      });
    }
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const pendingDeposits = await Deposit.find({
        status: "pending",
        createdAt: { $gte: twentyFourHoursAgo },
      });

      console.log(`Found ${pendingDeposits.length} pending deposits to verify`);

      const results = [];
      for (const deposit of pendingDeposits) {
        try {
          await verifyPayment(deposit.transactionId);
          results.push({
            transactionId: deposit.transactionId,
            status: "processed",
          });
        } catch (error) {
          results.push({
            transactionId: deposit.transactionId,
            status: "failed",
            error: error.message,
          });
        }
      }

      res.status(200).json({
        success: true,
        message: `Processed ${pendingDeposits.length} pending deposits`,
        results,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
