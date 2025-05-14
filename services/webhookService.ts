import axios from "axios";
import Webhook from "../models/Webhook";
import { IChatMessage } from "../models/Chat";

export async function notifyWebhooks(
  userId: string,
  orderId: string,
  message: IChatMessage,
  issueType: "order" | "deposit"
) {
  try {
    // Find all active webhooks for this user or admin webhooks
    const webhooks = await Webhook.find({
      $or: [
        { userId: userId, active: true },
        { isAdmin: true, active: true }, // For admin notifications
      ],
      events: "new_message",
    });

    // Send notifications in parallel
    const notifications = webhooks.map((webhook) => {
      const payload = {
        event: "new_message",
        data: {
          orderId,
          issueType,
          message: {
            sender: message.sender,
            message: message.message,
            sentAt: message.sentAt,
          },
        },
      };

      return axios.post(webhook.url, payload).catch((error) => {
        console.error(
          `Failed to send webhook to ${webhook.url}:`,
          error.message
        );
        // If the webhook fails consistently, you might want to deactivate it
        // or implement a retry mechanism
      });
    });

    await Promise.allSettled(notifications);
  } catch (error) {
    console.error("Error sending webhooks:", error);
  }
}
