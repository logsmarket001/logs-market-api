//@ts-nocheck
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import productRoutes from "./routes/products";
import orderRoutes from "./routes/orders";
import depositRoutes from "./routes/deposits";
import { errorHandler } from "./middleware/errorHandler";
import chatRoutes from "./routes/chat";
import webhookRoutes from "./routes/webhook";
import bodyParser from "body-parser";
import { startCronJobs } from "./services/cronService";
// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/deposits", depositRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/webhook", webhookRoutes);

app.get("/api", (req: Request, res: Response) => {
  res.json({ message: "SmartRecruit API is running" });
});

// Error handling middleware
app.use(errorHandler);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => {
    console.log("Connected to MongoDB");

    // Start cron jobs after database connection is established
    startCronJobs();
    console.log("Cron jobs started");
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
