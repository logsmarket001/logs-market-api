//@ts-nocheck
// models/PaymentWebhook.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IPaymentWebhook extends Document {
  paymentId: string;
  data: Record<string, any>;
}

const PaymentWebhookSchema = new Schema<IPaymentWebhook>(
  {
    paymentId: { type: String, required: true, unique: true },
    data: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IPaymentWebhook>(
  "PaymentWebhook",
  PaymentWebhookSchema
);
