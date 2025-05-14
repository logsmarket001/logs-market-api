import { Request, Response } from "express";
import Deposit from "../../models/Deposit";
import User from "../../models/User";
import axios from "axios";
import dotenv from "dotenv";
import type { NextApiRequest, NextApiResponse } from "next";
dotenv.config();
const API_KEY = process.env.API_KEY;
const API_BASE = process.env.API_BASE;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// === Original Production Handler (Commented) ===
/*
export default async function handler(req: Request, res: Response) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pendingDeposits = await Deposit.find({
      status: "pending",
      createdAt: { $gte: twentyFourHoursAgo },
    });

    console.log(`Found ${pendingDeposits.length} pending deposits to verify`);
    type VerificationResult = {
      transactionId: string;
      status: "success" | "failed" | "pending" | "error";
      paidAmount?: number;
      error?: string;
    };
    const results: VerificationResult[] = [];

    for (const deposit of pendingDeposits) {
      try {
        const url = `${API_BASE}/payment/${deposit.transactionId}`;
        const response = await axios.get(url, {
          headers: { "x-api-key": API_KEY },
        });

        const {
          payment_status: status,
          actually_paid: cryptoPaidStr,
        } = response.data;

        const paidCryptoAmount = parseFloat(cryptoPaidStr);

        let newStatus: "success" | "failed" | "pending" = "pending";
        if (status === "finished") newStatus = "success";
        else if (status === "failed") newStatus = "failed";

        deposit.status = newStatus;
        deposit.paidCryptoAmount = paidCryptoAmount;
        await deposit.save();

        if (newStatus === "success") {
          const user = await User.findById(deposit.userId);
          if (user) {
            const creditUsd = deposit.amount;
            user.balance += creditUsd;
            user.pendingBalance = Math.max(0, user.pendingBalance - creditUsd);
            await user.save();
          }
        }

        results.push({
          transactionId: deposit.transactionId,
          status: newStatus,
          paidAmount: paidCryptoAmount,
        });

        await sleep(5000);
      } catch (error) {
        console.error(`Error processing deposit ${deposit.transactionId}:`, error);
        results.push({
          transactionId: deposit.transactionId,
          status: "error",
          error: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      processedDeposits: results.length,
      results,
    });
  } catch (error) {
    console.error("Error in payment verification endpoint:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
}
*/

// === Test Handler with Special Payment ID Handling ===
export default async function handler(req: Request, res: Response) {
  console.log("Confirming payment cron job started");
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pendingDeposits = await Deposit.find({
      status: "pending",
      createdAt: { $gte: twentyFourHoursAgo },
    });

    console.log(`Found ${pendingDeposits.length} pending deposits to verify`);
    type VerificationResult = {
      transactionId: string;
      status: "success" | "failed" | "pending" | "error";
      paidAmount?: number;
      error?: string;
    };
    const results: VerificationResult[] = [];

    for (const deposit of pendingDeposits) {
      try {
        let status = "pending";
        let paidCryptoAmount = deposit.paidCryptoAmount;

        if (deposit.transactionId === "4845873354") {
          console.log("Test payment ID detected - forcing success status");
          status = "finished";
        } else {
          const url = `${API_BASE}/payment/${deposit.transactionId}`;
          const response = await axios.get(url, {
            headers: { "x-api-key": API_KEY },
          });
          status = response.data.payment_status;
          paidCryptoAmount = parseFloat(response.data.actually_paid);
        }

        let newStatus: "success" | "failed" | "pending" = "pending";
        if (status === "finished") newStatus = "success";
        else if (status === "failed") newStatus = "failed";

        deposit.status = newStatus;
        deposit.paidCryptoAmount = paidCryptoAmount;
        await deposit.save();

        if (newStatus === "success") {
          const user = await User.findById(deposit.userId);
          if (user) {
            const creditUsd = deposit.amount;
            user.balance += creditUsd;
            user.pendingBalance = Math.max(0, user.pendingBalance - creditUsd);
            await user.save();
          }
        }

        results.push({
          transactionId: deposit.transactionId,
          status: newStatus,
          paidAmount: paidCryptoAmount,
        });

        await sleep(5000);
      } catch (error) {
        console.error(
          `Error processing deposit ${deposit.transactionId}:`,
          error
        );
        results.push({
          transactionId: deposit.transactionId,
          status: "error",
          error: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      processedDeposits: results.length,
      results,
    });
  } catch (error) {
    console.error("Error in payment verification endpoint:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
}
