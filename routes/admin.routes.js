import express from "express";
import {
  getAllEquipmentAdmin,
  adminDeleteEquipment,
  adminUpdateEquipment,
} from "../controllers/equipment.controller.js";
import { verifyToken, verifyAdmin } from "../middlewares/auth.js";
import { validate, schemas } from "../middlewares/validate.js";

const router = express.Router();

// All routes here are admin-only
router.get("/equipment", verifyToken, verifyAdmin, validate(schemas.adminEquipmentQuery), getAllEquipmentAdmin); // GET  /api/admin/equipment
router.put("/equipment/:id", verifyToken, verifyAdmin, adminUpdateEquipment);    // PUT  /api/admin/equipment/:id
router.delete("/equipment/:id", verifyToken, verifyAdmin, adminDeleteEquipment); // DELETE /api/admin/equipment/:id

export default router;
