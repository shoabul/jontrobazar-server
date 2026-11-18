import express from "express";
import {
  getAllEquipmentAdmin,
  adminDeleteEquipment,
  adminUpdateEquipment,
} from "../controllers/equipment.controller.js";
import { verifyAdmin } from "../middlewares/auth.js";

const router = express.Router();

// All routes here are admin-only
router.get("/equipment", verifyAdmin, getAllEquipmentAdmin);         // GET  /api/admin/equipment
router.put("/equipment/:id", verifyAdmin, adminUpdateEquipment);    // PUT  /api/admin/equipment/:id
router.delete("/equipment/:id", verifyAdmin, adminDeleteEquipment); // DELETE /api/admin/equipment/:id

export default router;
