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

// Token exchange endpoint — public in ALL environments
// Used by client to exchange BetterAuth session for Express JWT
// Validation ensures only legitimate user data can generate tokens
router.post("/token", validate(schemas.devToken), issueDevToken);

// User profile routes
router.get("/me", verifyToken, getMe);
router.put("/profile", verifyToken, validate(schemas.updateProfile), updateProfile);

// Admin-only user management routes
router.get("/", verifyToken, verifyAdmin, getAllUsers);
router.patch("/:id/role", verifyToken, verifyAdmin, validate(schemas.updateUserRole), updateUserRole);

export default router;
