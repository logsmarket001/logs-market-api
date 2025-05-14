
import mongoose, { Document, Schema } from "mongoose"

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  status: string;
  data: Record<string, any>;
  productSnapshot: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productSnapshot: { type: Object },
    status: {
      type: String,
      required: true,
      enum: ["pending","completed","failed"]
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
      required: true,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model<IOrder>("Order", OrderSchema)
export default Order
