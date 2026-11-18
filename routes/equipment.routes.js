import express from "express";
import {
  getAllEquipment,
  getFeaturedEquipment,
  getEquipmentById,
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

// ─── Owner routes (before /:id to avoid wildcard conflict) ───────────────────
router.get("/owner/my-equipment", verifyOwner, getMyEquipment);    // GET /api/equipment/owner/my-equipment
router.post("/", verifyOwner, addEquipment);                       // POST /api/equipment
router.put("/:id", verifyOwner, updateEquipment);                  // PUT /api/equipment/:id
router.delete("/:id", verifyOwner, deleteEquipment);               // DELETE /api/equipment/:id

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.patch("/:id/status", verifyAdmin, updateEquipmentStatus);   // PATCH /api/equipment/:id/status

// ─── Auth required single item (last to avoid conflicts with named segments) ──
router.get("/:id", verifyToken, getEquipmentById);                 // GET /api/equipment/:id

export default router;
