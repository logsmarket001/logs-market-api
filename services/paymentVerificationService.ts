//@ts-nocheck

import axios from "axios";
import Deposit from "../models/Deposit";
import User from "../models/User";
import dotenv from "dotenv";
dotenv.config();
const API_KEY = process.env.API_KEY;
const API_BASE = process.env.API_BASE;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// === Original Production Handler (Commented) ===
export async function verifyPayment(paymentId: string): Promise<void> {
  try {
    const url = `${API_BASE}/payment/${paymentId}`;
    const response = await axios.get(url, {
      headers: { "x-api-key": API_KEY },
    });

    const { payment_status: status, actually_paid: cryptoPaidStr } =
      response.data;

    const paidCryptoAmount = +cryptoPaidStr || 0;

    // Find the deposit
    const deposit = await Deposit.findOne({ transactionId: paymentId });
    if (!deposit) {
      console.log(`Deposit not found for payment ID: ${paymentId}`);
      return;
    }

    // Determine new status
    let newStatus: "success" | "failed" | "pending" = "pending";
    if (status === "finished") newStatus = "success";
    else if (status === "failed") newStatus = "failed";

    // Update deposit record
    deposit.status = newStatus;
    deposit.paidCryptoAmount = paidCryptoAmount;
    await deposit.save();

    // If successful, credit the user
    if (newStatus === "success") {
      const user = await User.findById(deposit.userId);
      if (user) {
        // Convert all values to numbers explicitly using Number()
        const currentBalance = Number(user.balance) || 0;
        const currentPendingBalance = Number(user.pendingBalance) || 0;
        const depositAmount = Number(deposit.amount) || 0;

        console.log("Before update:", {
          currentBalance,
          currentPendingBalance,
          depositAmount,
          types: {
            balance: typeof currentBalance,
            pending: typeof currentPendingBalance,
            deposit: typeof depositAmount,
          },
        });

        // Perform numeric operations with explicitly converted numbers
        user.balance = Number(currentBalance + depositAmount);
        user.pendingBalance = Number(
          Math.max(0, currentPendingBalance - depositAmount)
        );

        console.log("After update:", {
          newBalance: user.balance,
          newPendingBalance: user.pendingBalance,
        });

        await user.save();
      }
    }
  } catch (error) {
    console.error(`Error verifying payment ${paymentId}:`, error);
  }
}

// === Test Handler with Special Payment ID Handling ===
// export async function verifyPendingPayments(): Promise<void> {
//   try {
//     const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
//     const pendingDeposits = await Deposit.find({
//       status: "pending",
//       createdAt: { $gte: twentyFourHoursAgo },
//     });

//     console.log(`Found ${pendingDeposits.length} pending deposits to verify`);

//     for (const deposit of pendingDeposits) {
//       try {
//         let status = "pending";
//         let paidCryptoAmount = +deposit.paidCryptoAmount || 0;

//         if (deposit.transactionId === "5666195823") {
//           console.log("Test payment ID detected - forcing success status");
//           status = "finished";
//         } else {
//           const url = `${API_BASE}/payment/${deposit.transactionId}`;
//           const response = await axios.get(url, {
//             headers: { "x-api-key": API_KEY },
//           });
//           status = response.data.payment_status;
//           paidCryptoAmount = +response.data.actually_paid || 0;
//         }

//         let newStatus: "success" | "failed" | "pending" = "pending";
//         if (status === "finished") newStatus = "success";
//         else if (status === "failed") newStatus = "failed";

//         deposit.status = newStatus;
//         deposit.paidCryptoAmount = paidCryptoAmount;
//         await deposit.save();

//         if (newStatus === "success") {
//           const user = await User.findById(deposit.userId);
//           if (user) {
//             // Convert all values to numbers and perform numeric operations
//             const currentBalance = +user.balance || 0;
//             const currentPendingBalance = +user.pendingBalance || 0;
//             const depositAmount = +deposit.amount || 0;

//             console.log("Before update:", {
//               currentBalance,
//               currentPendingBalance,
//               depositAmount,
//               types: {
//                 balance: typeof currentBalance,
//                 pending: typeof currentPendingBalance,
//                 deposit: typeof depositAmount,
//               },
//             });

//             // Perform numeric operations
//             user.balance = currentBalance + depositAmount;
//             user.pendingBalance = Math.max(
//               0,
//               currentPendingBalance - depositAmount
//             );

//             console.log("After update:", {
//               newBalance: user.balance,
//               newPendingBalance: user.pendingBalance,
//             });

//             await user.save();
//           }
//         }

//         await sleep(5000);
//       } catch (error) {
//         console.error(
//           `Error processing deposit ${deposit.transactionId}:`,
//           error
//         );
//       }
//     }
//   } catch (error) {
//     console.error("Error in verifyPendingPayments:", error);
//   }
// }
