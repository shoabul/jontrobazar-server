import express from "express";
import {
  getAllEquipment,
  getFeaturedEquipment,
  getEquipmentById,
  checkAvailability,
  addEquipment,
  getMyEquipment,
  updateEquipment,
  deleteEquipment,
  updateEquipmentStatus,
  getCategories,
} from "../controllers/equipment.controller.js";
import { verifyToken, verifyOwner, verifyAdmin } from "../middlewares/auth.js";

const router = express.Router();

// ─── Public routes (no auth) ──────────────────────────────────────────────────
router.get("/featured", getFeaturedEquipment);                     // GET /api/equipment/featured
router.get("/categories", getCategories);                          // GET /api/equipment/categories
router.get("/", getAllEquipment);                                   // GET /api/equipment

// ─── Owner routes (BEFORE /:id to avoid wildcard conflict) ───────────────────
router.get("/owner/my-equipment", verifyToken, verifyOwner, getMyEquipment); // GET /api/equipment/owner/my-equipment
router.post("/", verifyToken, verifyOwner, addEquipment);                    // POST /api/equipment
router.put("/:id", verifyToken, verifyOwner, updateEquipment);               // PUT /api/equipment/:id
router.delete("/:id", verifyToken, verifyOwner, deleteEquipment);            // DELETE /api/equipment/:id

// ─── Public routes with params (AFTER owner routes to avoid conflicts) ────────
router.get("/:id/availability", checkAvailability);                // GET /api/equipment/:id/availability
router.get("/:id", getEquipmentById);                              // GET /api/equipment/:id (public - shows approved only for non-owners)

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.patch("/:id/status", verifyToken, verifyAdmin, updateEquipmentStatus);   // PATCH /api/equipment/:id/status

export default router;
