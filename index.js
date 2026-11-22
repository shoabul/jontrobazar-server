import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { connectDB, getDb } from "./config/db.js";
import userRoutes from "./routes/user.routes.js";
import equipmentRoutes from "./routes/equipment.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import favoritesRoutes from "./routes/favorites.routes.js";
import bookingsRoutes from "./routes/bookings.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import { stripeWebhook } from "./controllers/payments.controller.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const isProduction = process.env.NODE_ENV === "production";

// CORS Configuration
const allowedOrigins = [CLIENT_URL, "http://localhost:3000", "http://127.0.0.1:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      // In production, require a valid origin (no null/empty origin)
      if (isProduction && (!origin || origin === "null")) {
        return callback(new Error("CORS error: Origin required in production"));
      }
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // Increased limit from 100 to 500
});
app.use("/api/", limiter);

app.use(express.json());

// Health check route
app.get("/api/health", async (req, res) => {
  let dbStatus = "disconnected";
  let errorMessage = null;

  try {
    const db = await connectDB();
    if (db) {
      await db.command({ ping: 1 });
      dbStatus = "connected";
    }
  } catch (error) {
    dbStatus = "error";
    errorMessage = error.message || "Unknown error";
  }

  res.json({
    status: "ok",
    uptime: process.uptime(),
    database: dbStatus,
    databaseError: dbStatus === "error" ? errorMessage : null,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/analytics", analyticsRoutes);

// Stripe webhook (raw body needed)
app.post("/api/webhook/stripe", stripeWebhook);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// Start Server & Connect Database
const startServer = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.warn("⚠️ Server started without active DB connection. Please verify MONGO_URI in .env");
  }

  app.listen(PORT, () => {
    console.log(`🚀 JontroBazar Server running on port ${PORT}`);
    console.log(`📡 Health check available at: http://localhost:${PORT}/api/health`);
  });
};

startServer();

export default app;