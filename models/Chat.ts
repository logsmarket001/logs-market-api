//@ts-nocheck

import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage {
  sender: "user" | "admin";
  message: string;
  sentAt?: Date;
  read: boolean;
}

export interface IChat extends Document {
  userId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  issueType: "order" | "deposit";
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new Schema<IChat>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    issueType: {
      type: String,
      enum: ["order", "deposit"],
      required: true,
    },
    messages: [
      {
        sender: { type: String, enum: ["user", "admin"], required: true },
        message: { type: String, required: true },
        sentAt: { type: Date, default: Date.now },
        read: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<IChat>("Chat", ChatSchema);
