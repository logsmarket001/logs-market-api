//@ts-nocheck

import cron from "node-cron";
import { verifyPendingPayments } from "./paymentVerificationService";

// export function startCronJobs() {
//   // Run every 30 minutes
//   cron.schedule("*/30 * * * *", async () => {
//     console.log("Running payment verification cron job...");
//     await verifyPendingPayments();
//     console.log("Payment verification cron job completed");
//   });
// }

export function startCronJobs() {
  // Old: "*/30 * * * *"
  cron.schedule("*/30 * * * *", async () => {
    console.log("Running payment verification cron job...");
    await verifyPendingPayments();
    console.log("Payment verification cron job completed");
  });
}

// // cronJob.ts
// import cron from "node-cron";
// import { verifyPendingPayments } from "./paymentVerificationService";

// let isVerifying = false; // In-memory lock

// export function startCronJobs() {
//   // Run every 30 minutes
//   cron.schedule("*/30 * * * *", async () => {
//     if (isVerifying) {
//       console.log("Previous verification still running. Skipping this cycle.");
//       return;
//     }

//     try {
//       isVerifying = true;
//       console.log("Running payment verification cron job...");
//       await verifyPendingPayments();
//       console.log("Payment verification cron job completed.");
//     } catch (error) {
//       console.error("Error running payment verification job:", error);
//     } finally {
//       isVerifying = false; // Unlock after completion
//     }
//   });
// }
