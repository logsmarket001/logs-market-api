import mongoose, { type Document, Schema } from "mongoose"

export interface IDeposit extends Document {
  userId: mongoose.Types.ObjectId
  amount: number
  transactionId: string
  senderUsername: string
  senderWalletAddress: string
  paidCryptoAmount: number;
  pointOfError:string
  status: "success" | "failed" | "pending"
  createdAt: Date
  updatedAt: Date
}

const DepositSchema = new Schema<IDeposit>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    transactionId: {
      type: String,
      required: true,
    },
    senderUsername: {
      type: String,
      required: true,
    },
    paidCryptoAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "failed", "success"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IDeposit>("Deposit", DepositSchema)
