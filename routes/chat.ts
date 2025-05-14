import express from "express";
import Chat from "../models/Chat";
import Order from "../models/Order";
import { authenticate, isAdmin } from "../middleware/auth";
import { notifyWebhooks } from "../services/webhookService";
import { IChatMessage } from "../models/Chat";

const router = express.Router();

// ===============================
// ADMIN ROUTES
// ===============================

// GET ALL CHATS — Admin
router.post("/admin", authenticate, isAdmin, async (req, res, next) => {
  try {
    const { issueType } = req.body;

    const query = issueType ? { issueType } : {};

    const chats = await Chat.find(query)
      .populate("userId", "username email")
      .populate("orderId");
    res.json(chats);
  } catch (err) {
    next(err);
  }
});

// GET CHAT BY ORDER ID — Admin
router.post(
  "/admin/order-get/:orderId",
  authenticate,
  isAdmin,
  async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const { issueType } = req.body;

      const query = {
        orderId,
        ...(issueType ? { issueType } : {}),
      };

      const chat = await Chat.findOne(query)
        .populate("userId", "username email")
        .populate("orderId");

      if (!chat) return res.status(404).json({ message: "Chat not found" });

      // Mark all user messages as read
      const updated = chat.messages.map((msg) => {
        if (msg.sender === "user") {
          msg.read = true;
        }
        return msg;
      });
      chat.messages = updated;
      await chat.save();

      res.json(chat);
    } catch (err) {
      next(err);
    }
  }
);

// UPDATE CHAT BY ORDER ID — Admin
router.post(
  "/admin/order/:orderId",
  authenticate,
  isAdmin,
  async (req, res, next) => {

    try {

      const { orderId } = req.params;
      const { message, issueType } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const query = {
        orderId,
        ...(issueType ? { issueType } : {}),
      };

      const chat = await Chat.findOne(query);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      const newMessage: IChatMessage = {
        sender: "admin",
        message,
        read: false,
      };

      
      chat.messages.push(newMessage);
      await chat.save();

      res.json(chat);
    } catch (err) {
      next(err);
    }
  }
);

// Get unread message counts for all orders - Admin
router.post("/unread/admin", authenticate, isAdmin, async (req, res, next) => {
  try {
    const { issueType } = req.body;

    const query = issueType ? { issueType } : {};

    const chats = await Chat.find(query);

    const unreadCounts = chats
      .map((chat) => {
        const unreadCount = chat.messages.filter(
          (msg) => msg.sender === "user" && !msg.read
        ).length;

        return {
          orderId: chat.orderId,
          issueType: chat.issueType,
          unreadCount,
        };
      })
      .filter((item) => item.unreadCount > 0);

    res.json(unreadCounts);
  } catch (err) {
    next(err);
  }
});

// ===============================
// USER ROUTES
// ===============================

// GET CHAT BY ORDER ID — User
router.post(
  "/order/:orderId/get",
  authenticate,
  async (req: any, res, next) => {
    try {
      if (!req.user?._id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { orderId } = req.params;
      const { issueType } = req.body;

      const query = {
        userId: req.user._id,
        orderId,
        ...(issueType ? { issueType } : {}),
      };

      const chat = await Chat.findOne(query).populate("orderId");

      if (!chat) return res.status(404).json({ message: "Chat not found" });

      // Mark all admin messages as read
      const updated = chat.messages.map((msg) => {
        if (msg.sender === "admin") {
          msg.read = true;
        }
        return msg;
      });
      chat.messages = updated;
      await chat.save();

      res.json(chat);
    } catch (err) {
      next(err);
    }
  }
);

// UPDATE CHAT BY ORDER ID — User
router.post(
  "/order/:orderId",
  authenticate,
  async (req: any, res, next) => {
        console.log("was called user");
    try {
      if (!req.user?._id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { orderId } = req.params;
      const { message, issueType } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      if (!issueType) {
        return res.status(400).json({ message: "Issue type is required" });
      }

      let chat = await Chat.findOne({
        userId: req.user._id,
        orderId,
        issueType,
      });

      const newMessage: IChatMessage = { sender: "user", message, read: false };

      if (chat) {
        // Append to existing chat
        chat.messages.push(newMessage);
        await chat.save();
      } else {
        // Create new chat
        chat = new Chat({
          userId: req.user._id,
          orderId,
          issueType,
          messages: [newMessage],
        });
        await chat.save();
      }

      // Notify webhooks
      await notifyWebhooks(
        req.user._id.toString(),
        orderId,
        newMessage,
        chat.issueType
      );

      res.status(200).json(chat);
    } catch (err) {
      next(err);
    }
  }
);

// Get unread message counts for user's orders
router.post("/unread/user", authenticate, async (req: any, res, next) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { issueType } = req.body;

    const query = {
      userId: req.user._id,
      ...(issueType ? { issueType } : {}),
    };

    const chats = await Chat.find(query);

    const unreadCounts = chats
      .map((chat) => {
        const unreadCount = chat.messages.filter(
          (msg) => msg.sender === "admin" && !msg.read
        ).length;

        return {
          orderId: chat.orderId,
          issueType: chat.issueType,
          unreadCount,
        };
      })
      .filter((item) => item.unreadCount > 0);

    res.json(unreadCounts);
  } catch (err) {
    next(err);
  }
});

export default router;
