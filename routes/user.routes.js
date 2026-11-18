import express from "express";
import {
  getMe,
  updateProfile,
  getAllUsers,
  updateUserRole,
  issueDevToken,
} from "../controllers/user.controller.js";
import {
  verifyToken,
  verifyAdmin,
} from "../middlewares/auth.js";

const router = express.Router();

// Development/Testing token generator
router.post("/token", issueDevToken);

// User profile routes
router.get("/me", verifyToken, getMe);
router.put("/profile", verifyToken, updateProfile);

// Admin-only user management routes
router.get("/", verifyToken, verifyAdmin, getAllUsers);
router.patch("/:id/role", verifyToken, verifyAdmin, updateUserRole);

export default router;
