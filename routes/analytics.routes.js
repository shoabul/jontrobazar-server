import express from "express";
import {
  getOwnerAnalytics,
  getAdminAnalytics,
} from "../controllers/analytics.controller.js";
import { verifyToken, verifyOwner, verifyAdmin } from "../middlewares/auth.js";

const router = express.Router();

// Owner analytics - only for equipment owners
router.get("/owner", verifyToken, verifyOwner, getOwnerAnalytics);  // GET /api/analytics/owner

// Admin analytics - platform-wide
router.get("/admin", verifyToken, verifyAdmin, getAdminAnalytics);  // GET /api/analytics/admin

export default router;