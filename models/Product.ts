
import mongoose, { Schema, Document } from "mongoose";

export interface IBaseProduct extends Document {
  mainType: string;
  subType: string;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IBaseProduct>(
  {
    mainType: {
      type: String,
      required: true,
      enum: [
        "bank-log",
        "cc-log",
        "spamming-tools",
        "checkbook",
        "page",
        "made-bank",
        "direct-deposit"
      ],
    },
    subType: {
      type: String,
      required: true,
      enum: [
        "online-access",
        "calling-log",
        "bill-pay-log",
        "logs",
        "smtp",
        "rdp",
        "leads",
        "mail-wire-check",
        "check-sample",
        "mail-checkbook",
        "office-page",
        "other-page",
        "greendot",
        "go2bank",
        "5k",
        "10k",
        "20k",
        "30k",
        "45k"

      ],
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model<IBaseProduct>("Product", ProductSchema);

export default Product;
