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
import { verifyToken, verifyOwner, verifyAdmin, optionalVerifyToken } from "../middlewares/auth.js";
import { validate, schemas } from "../middlewares/validate.js";

const router = express.Router();

// ─── Public routes (no auth) ──────────────────────────────────────────────────
router.get("/featured", getFeaturedEquipment);                              // GET /api/equipment/featured
router.get("/categories", getCategories);                                   // GET /api/equipment/categories
router.get("/", validate(schemas.equipmentQuery, "query"), getAllEquipment); // GET /api/equipment

// ─── Owner routes (BEFORE /:id to avoid wildcard conflict) ───────────────────
router.get("/owner/my-equipment", verifyToken, verifyOwner, getMyEquipment); // GET /api/equipment/owner/my-equipment
router.post("/", verifyToken, verifyOwner, validate(schemas.addEquipment), addEquipment);        // POST /api/equipment
router.put("/:id", verifyToken, verifyOwner, validate(schemas.updateEquipment), updateEquipment); // PUT /api/equipment/:id
router.delete("/:id", verifyToken, verifyOwner, deleteEquipment);           // DELETE /api/equipment/:id

// ─── Public routes with params (AFTER owner routes to avoid conflicts) ────────
router.get("/:id/availability", validate(schemas.availabilityCheck), checkAvailability); // GET /api/equipment/:id/availability
// Detail page — public, but authenticated owners/admins see all statuses
router.get("/:id", optionalVerifyToken, getEquipmentById);                  // GET /api/equipment/:id

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.patch("/:id/status", verifyToken, verifyAdmin, validate(schemas.equipmentStatus), updateEquipmentStatus); // PATCH /api/equipment/:id/status

export default router;
