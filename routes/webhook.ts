import express from "express";
import { authenticate, isAdmin } from "../middleware/auth";
import Webhook from "../models/Webhook";

const router = express.Router();

// Create a webhook
router.post("/", authenticate, async (req: any, res) => {
  try {
    const { url, events } = req.body;

    if (!url || !events || !Array.isArray(events)) {
      return res
        .status(400)
        .json({ message: "URL and events array are required" });
    }

    const webhook = new Webhook({
      userId: req.user._id,
      url,
      events,
      isAdmin: req.user.isAdmin || false,
    });

    await webhook.save();
    res.status(201).json(webhook);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating webhook", error: error.message });
  }
});

// Get all webhooks for the authenticated user
router.get("/", authenticate, async (req: any, res) => {
  try {
    const webhooks = await Webhook.find({ userId: req.user._id });
    res.json(webhooks);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching webhooks", error: error.message });
  }
});

// Update a webhook
router.put("/:webhookId", authenticate, async (req: any, res) => {
  try {
    const { webhookId } = req.params;
    const { url, events, active } = req.body;

    const webhook = await Webhook.findOne({
      _id: webhookId,
      userId: req.user._id,
    });

    if (!webhook) {
      return res.status(404).json({ message: "Webhook not found" });
    }

    if (url) webhook.url = url;
    if (events) webhook.events = events;
    if (typeof active === "boolean") webhook.active = active;

    await webhook.save();
    res.json(webhook);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating webhook", error: error.message });
  }
});

// Delete a webhook
router.delete("/:webhookId", authenticate, async (req: any, res) => {
  try {
    const { webhookId } = req.params;

    const webhook = await Webhook.findOneAndDelete({
      _id: webhookId,
      userId: req.user._id,
    });

    if (!webhook) {
      return res.status(404).json({ message: "Webhook not found" });
    }

    res.json({ message: "Webhook deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting webhook", error: error.message });
  }
});

export default router;
