//@ts-nocheck
import express from "express";
import {
  verifyPayment,
  verifyPendingPayments,
} from "../services/paymentVerificationService";
import { authenticate, isAdmin } from "../middleware/auth";
import Deposit from "../models/Deposit";

const router = express.Router();

router.get("/payment-verification", async (req, res, next) => {
  console.log("Payment verification endpoint hit");

  try {
    // Use the same function that the cron job uses
    await verifyPendingPayments();

    res.status(200).json({
      success: true,
      message: "Payment verification completed successfully",
    });
  } catch (error) {
    console.error("Error in payment verification:", error);
    res.status(500).json({
      success: false,
      message: "Error processing payments",
      error: error.message,
    });
  }
});

export default router;
