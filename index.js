import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB, getDb } from "./config/db.js";
import userRoutes from "./routes/user.routes.js";
import equipmentRoutes from "./routes/equipment.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import favoritesRoutes from "./routes/favorites.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// CORS Configuration
const allowedOrigins = [CLIENT_URL, "http://localhost:3000", "http://127.0.0.1:3000"];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman) or matched origins
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS error: Origin ${origin} not allowed.`));
    },
    credentials: true,
  })
);

// Body parser
app.use(express.json());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/favorites", favoritesRoutes);

// Basic health check route
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    name: "JontroBazar API Server",
    version: "1.0.0",
    docs: "/docs/api-spec.md",
  });
});

// Detailed health check route
app.get("/api/health", async (req, res) => {
  const db = getDb();
  let dbStatus = "disconnected";

  if (db) {
    try {
      await db.command({ ping: 1 });
      dbStatus = "connected";
    } catch {
      dbStatus = "error";
    }
  }

  res.json({
    status: "ok",
    uptime: process.uptime(),
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

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
