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
import { validate, schemas } from "../middlewares/validate.js";

const router = express.Router();

// Development/Testing token generator — PROTECTED: admin only in production
// In development (NODE_ENV !== 'production'), allow for testing
const isDev = process.env.NODE_ENV !== "production";
if (isDev) {
  router.post("/token", validate(schemas.devToken), issueDevToken);
} else {
  router.post("/token", verifyToken, verifyAdmin, validate(schemas.devToken), issueDevToken);
}

// User profile routes
router.get("/me", verifyToken, getMe);
router.put("/profile", verifyToken, validate(schemas.updateProfile), updateProfile);

// Admin-only user management routes
router.get("/", verifyToken, verifyAdmin, getAllUsers);
router.patch("/:id/role", verifyToken, verifyAdmin, validate(schemas.updateUserRole), updateUserRole);

export default router;
