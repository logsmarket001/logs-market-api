import mongoose, { Schema, Document } from "mongoose";

export interface IWebhook extends Document {
  userId: mongoose.Types.ObjectId;
  url: string;
  events: string[];
  isAdmin: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookSchema = new Schema<IWebhook>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    url: { type: String, required: true },
    events: [{ type: String, enum: ["new_message"], required: true }],
    isAdmin: { type: Boolean, default: false },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Ensure URL is valid
WebhookSchema.path('url').validate(function(url: string) {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
}, 'Invalid webhook URL');

export default mongoose.model<IWebhook>("Webhook", WebhookSchema); 